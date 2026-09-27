import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { AiProxyError, cotaIaHoje } from '@data/ai/aiProxy'
import { capturarFoto, type FotoCapturada, type OrigemFoto } from '@data/ai/photoCapture'
import type { RefeicaoAlvo } from '@data/repositories/itensRefeicaoRepository'
import { produtoCodigoBarrasRepository } from '@data/repositories/produtoCodigoBarrasRepository'
import { leitorDisponivel, lerCodigoBarras } from '@data/native/codigoBarras'
import { foodCaptureService } from '@domain/services/foodCaptureService'
import { reescalarItem } from '@domain/rules/foodReconciliation'
import { temAcessoPremium } from '@domain/rules/access'
import type { ItemRascunho, RefeicaoRascunho } from '@domain/entities/food'

/**
 * Scanner — foto do prato -> Gemini estima -> a pessoa revisa -> vira
 * alimento da refeição escolhida na Dieta (mesma lista, dá pra excluir e
 * copiar depois). Nada entra no diário sem passar pela revisão.
 *
 * Entrada normal: menu da refeição na Dieta ("Escanear comida"), que manda
 * a refeição e o dia em `location.state`. Chegando direto por /scanner, a
 * pessoa escolhe a refeição aqui (dia = hoje).
 *
 * Plano: foto com IA é recurso pago (5/dia) — o servidor é quem barra de
 * verdade; aqui só evitamos a pessoa tirar foto à toa. Código de barras é
 * pra todos: não usa IA, só o rótulo do produto (Open Food Facts).
 */

interface EstadoEntrada {
  alvo?: RefeicaoAlvo
  nomeRefeicao?: string
  dataISO?: string
}

type Etapa = 'captura' | 'analisando' | 'revisao' | 'salvando'

const FIXAS: ReadonlyArray<{ alvo: RefeicaoAlvo; nome: string; emoji: string }> = [
  { alvo: { tipo: 'cafe' }, nome: 'Café da manhã', emoji: '☕' },
  { alvo: { tipo: 'almoco' }, nome: 'Almoço', emoji: '🍽️' },
  { alvo: { tipo: 'lanche' }, nome: 'Lanche', emoji: '🥪' },
  { alvo: { tipo: 'jantar' }, nome: 'Jantar', emoji: '🌙' },
]

function mensagemDeErro(e: unknown): string {
  if (e instanceof AiProxyError) {
    switch (e.info.tipo) {
      case 'premium_required':
        return 'O scanner é do plano pago. No grátis dá pra buscar e adicionar os alimentos à mão.'
      case 'limit_reached':
        return `Você usou os 5 scans de hoje. Renova em ${e.info.proximoReset || 'algumas horas'}.`
      case 'rate_limited':
        return 'Muitas tentativas seguidas. Espera um minutinho.'
      case 'image_too_large':
        return 'A foto ficou grande demais. Tenta de novo, um pouco mais de longe.'
      case 'indisponivel':
        return 'O scanner está pausado por hoje. Volta amanhã.'
      case 'not_authenticated':
        return 'Sua sessão expirou. Entra de novo.'
      default:
        break
    }
  }
  return 'Não consegui analisar essa foto. Tenta de novo com o prato bem iluminado e inteiro na imagem.'
}

export function Scanner() {
  const { profile } = useSession()
  const navigate = useNavigate()
  const entrada = (useLocation().state ?? {}) as EstadoEntrada

  const [alvo, setAlvo] = useState<RefeicaoAlvo | null>(entrada.alvo ?? null)
  const [nomeRefeicao, setNomeRefeicao] = useState(entrada.nomeRefeicao ?? '')
  const data = useMemo(() => (entrada.dataISO ? new Date(entrada.dataISO) : new Date()), [entrada.dataISO])

  const [etapa, setEtapa] = useState<Etapa>('captura')
  const [foto, setFoto] = useState<FotoCapturada | null>(null)
  const [rascunho, setRascunho] = useState<RefeicaoRascunho | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [restantes, setRestantes] = useState<number | null>(null)
  const [origem, setOrigem] = useState<'foto' | 'codigo'>('foto')
  const [imagemProduto, setImagemProduto] = useState<string | null>(null)
  const [digitando, setDigitando] = useState(false)
  const [codigoDigitado, setCodigoDigitado] = useState('')

  const pago = profile ? temAcessoPremium(profile) : false

  useEffect(() => {
    if (!pago) return
    void cotaIaHoje('vision').then((c) => c && setRestantes(Math.max(c.limite - c.usados, 0)))
  }, [pago])

  async function lerCodigo() {
    setErro(null)
    if (!leitorDisponivel) {
      // Navegador: sem leitor de câmera, digita o número de baixo do código.
      setDigitando(true)
      return
    }
    try {
      const codigo = await lerCodigoBarras()
      if (codigo) await buscarProduto(codigo)
    } catch (e) {
      setErro(
        String(e).includes('modulo_baixando')
          ? 'Baixando o leitor do Google pela primeira vez… tenta de novo em alguns segundos.'
          : 'Não consegui abrir o leitor. Tenta de novo ou digita o número do código.',
      )
      setDigitando(true)
    }
  }

  async function buscarProduto(codigo: string) {
    setErro(null)
    setOrigem('codigo')
    setFoto(null)
    setEtapa('analisando')
    try {
      const produto = await produtoCodigoBarrasRepository.buscar(codigo)
      if (!produto) {
        setErro('Não achei esse produto na base pública. Tenta pela foto ou adiciona pela busca na refeição.')
        setEtapa('captura')
        return
      }
      setImagemProduto(produto.imagemUrl)
      setRascunho(foodCaptureService.rascunhoDeProduto(produto))
      setDigitando(false)
      setCodigoDigitado('')
      setEtapa('revisao')
    } catch {
      setErro('Não consegui buscar o produto agora. Confere a internet e tenta de novo.')
      setEtapa('captura')
    }
  }

  async function fotografar(origem: OrigemFoto) {
    setErro(null)
    setOrigem('foto')
    setImagemProduto(null)
    const f = await capturarFoto(origem)
    if (!f) return
    setFoto(f)
    setEtapa('analisando')
    try {
      const r = await foodCaptureService.capturar(f.base64, f.mime)
      if (r.itens.length === 0) {
        setErro('Não reconheci comida nessa foto. Tenta de novo com o prato mais perto.')
        setEtapa('captura')
        return
      }
      setRascunho(r)
      setEtapa('revisao')
      setRestantes((n) => (n === null ? n : Math.max(n - 1, 0)))
    } catch (e) {
      setErro(mensagemDeErro(e))
      setEtapa('captura')
    }
  }

  function mudarItem(id: string, fn: (i: ItemRascunho) => ItemRascunho) {
    setRascunho((r) => (r ? { ...r, itens: r.itens.map((i) => (i.id === id ? fn(i) : i)) } : r))
  }

  async function salvar() {
    if (!rascunho || !alvo) return
    setEtapa('salvando')
    setErro(null)
    try {
      await foodCaptureService.confirmar({ rascunho, alvo, data, origem })
      navigate('/dieta', { replace: true })
    } catch {
      setErro('Não deu pra salvar. Confere a internet e tenta de novo.')
      setEtapa('revisao')
    }
  }

  const blocoCodigo = (
    <div className="mt-2 space-y-2">
      <button
        onClick={() => void lerCodigo()}
        className="w-full rounded-pill border border-brand/40 py-3 text-sm font-semibold text-brand"
      >
        ▮▯▮ Ler código de barras
      </button>
      {digitando && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void buscarProduto(codigoDigitado)
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            inputMode="numeric"
            autoFocus
            value={codigoDigitado}
            onChange={(e) => setCodigoDigitado(e.target.value.replace(/\D/g, '').slice(0, 14))}
            placeholder="Número embaixo do código"
            aria-label="Número do código de barras"
            className="min-w-0 flex-1 rounded-card border border-surface-4 bg-surface-2 px-3 py-2.5 font-mono text-content-hi placeholder:font-sans placeholder:text-content-dim focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={codigoDigitado.length < 8}
            className="rounded-pill bg-brand px-4 text-sm font-bold text-surface-1 disabled:opacity-50"
          >
            Buscar
          </button>
        </form>
      )}
    </div>
  )

  const total = rascunho ? foodCaptureService.totalAtual(rascunho) : null
  const incluidos = rascunho?.itens.filter((i) => i.incluir).length ?? 0

  return (
    <main className="flex min-h-full flex-col px-4 pb-28 pt-safe-t">
      <header className="flex items-center gap-3 py-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-surface-4 text-content-mid"
        >
          ←
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-content-hi">📷 Escanear comida</h1>
          <p className="truncate text-sm text-content-low">
            {alvo ? `Vai pra: ${nomeRefeicao}` : 'Escolha a refeição'}
          </p>
        </div>
      </header>

      {!alvo && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          {FIXAS.map((f) => (
            <button
              key={f.alvo.tipo}
              onClick={() => {
                setAlvo(f.alvo)
                setNomeRefeicao(f.nome)
              }}
              className="rounded-2xl border border-surface-4 bg-surface-2 p-4 text-left"
            >
              <div className="text-2xl">{f.emoji}</div>
              <div className="mt-1 text-sm font-semibold text-content-hi">{f.nome}</div>
            </button>
          ))}
        </div>
      )}

      {alvo && !pago && etapa === 'captura' && (
        <section className="rounded-card border border-accent-gold/40 bg-surface-2 p-5 text-center">
          <div className="text-3xl">🔒</div>
          <p className="mt-2 font-semibold text-content-hi">Scanner é do plano pago</p>
          <p className="mt-1 text-sm text-content-low">
            Tira foto do prato e a IA estima os alimentos e macros — até 5 por dia. No grátis, dá pra
            buscar e adicionar os alimentos à mão na refeição.
          </p>
          <button
            onClick={() => navigate('/perfil/plano')}
            className="mt-4 w-full rounded-pill bg-brand py-3 text-sm font-bold text-surface-1"
          >
            Ver planos
          </button>
        </section>
      )}
      {alvo && !pago && etapa === 'captura' && (
        <section className="mt-4">
          <p className="text-center text-sm text-content-low">Produto embalado? Lê o código de barras — é grátis.</p>
          {erro && <p className="mt-2 text-center text-sm font-medium text-accent-danger">{erro}</p>}
          {blocoCodigo}
        </section>
      )}

      {alvo && pago && etapa === 'captura' && (
        <section className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center rounded-card border border-dashed border-brand/40 bg-surface-2 p-6 text-center">
            <div className="text-5xl">🍽️</div>
            <p className="mt-3 font-semibold text-content-hi">Fotografe o prato inteiro, de cima</p>
            <p className="mt-1 max-w-xs text-sm text-content-low">
              Boa luz ajuda. A IA sugere os alimentos e as quantidades — você confere e ajusta antes de salvar.
            </p>
          </div>
          {erro && <p className="mt-3 text-center text-sm font-medium text-accent-danger">{erro}</p>}
          <div className="mt-4 space-y-2">
            <button
              onClick={() => void fotografar('camera')}
              disabled={restantes === 0}
              className="w-full rounded-pill bg-brand py-3.5 text-base font-bold text-surface-1 active:scale-[0.98] disabled:opacity-50"
            >
              📸 Tirar foto
            </button>
            <button
              onClick={() => void fotografar('galeria')}
              disabled={restantes === 0}
              className="w-full rounded-pill border border-surface-4 py-3 text-sm font-semibold text-content-hi disabled:opacity-50"
            >
              Escolher da galeria
            </button>
            {blocoCodigo}
            {restantes !== null && (
              <p className="text-center text-micro text-content-low">
                {restantes === 0 ? 'Sem scans hoje — renova à meia-noite.' : `${restantes} de 5 scans restantes hoje`}
              </p>
            )}
          </div>
        </section>
      )}

      {etapa === 'analisando' && (
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          {foto && (
            <img src={foto.dataUrl} alt="" className="mb-5 h-48 w-48 rounded-3xl object-cover opacity-80" />
          )}
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-4 border-t-brand" />
          <p className="mt-4 font-semibold text-content-hi">
            {origem === 'codigo' ? 'Buscando o produto…' : 'O Life está olhando seu prato…'}
          </p>
          <p className="mt-1 text-sm text-content-low">Leva uns segundinhos.</p>
        </section>
      )}

      {(etapa === 'revisao' || etapa === 'salvando') && rascunho && total && (
        <section>
          <div className="flex gap-3 rounded-card border border-surface-4 bg-surface-2 p-3">
            {(foto?.dataUrl ?? imagemProduto) && (
              <img
                src={foto?.dataUrl ?? imagemProduto ?? undefined}
                alt=""
                className="h-20 w-20 flex-none rounded-xl bg-white object-contain"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-content-hi">{rascunho.descricao || 'Seu prato'}</p>
              {origem === 'foto' ? (
                <p className="mt-0.5 text-micro text-content-low">
                  Confiança da IA: <span className="font-semibold text-content-mid">{Math.round(rascunho.confianca)}%</span>
                </p>
              ) : (
                <p className="mt-0.5 text-micro text-content-low">Números do rótulo do produto</p>
              )}
              {rascunho.observacao && <p className="mt-1 text-micro text-content-low">{rascunho.observacao}</p>}
            </div>
          </div>

          <p className="mb-2 mt-4 text-micro text-content-low">
            {origem === 'codigo'
              ? 'Ajuste a quantidade que você comeu (g ou ml).'
              : 'Confira cada item. Desmarque o que a IA errou e ajuste as gramas.'}
          </p>
          <ul className="space-y-2">
            {rascunho.itens.map((item) => (
              <li
                key={item.id}
                className={`rounded-2xl border p-3 ${item.incluir ? 'border-surface-4 bg-surface-2' : 'border-surface-3 opacity-50'}`}
              >
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => mudarItem(item.id, (i) => ({ ...i, incluir: !i.incluir }))}
                    aria-label={item.incluir ? `Tirar ${item.nome}` : `Incluir ${item.nome}`}
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 text-xs font-bold ${
                      item.incluir ? 'border-brand bg-brand text-[#04120a]' : 'border-surface-4 text-transparent'
                    }`}
                  >
                    ✓
                  </button>
                  <input
                    value={item.nome}
                    onChange={(e) => mudarItem(item.id, (i) => ({ ...i, nome: e.target.value }))}
                    aria-label="Nome do alimento"
                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-content-hi focus:outline-none"
                  />
                  <span
                    className={`flex-none rounded-pill px-2 py-0.5 text-[10px] font-semibold ${
                      item.fonte === 'ia' ? 'bg-surface-3 text-content-low' : 'bg-brand/15 text-brand'
                    }`}
                  >
                    {item.fonte === 'base' ? 'conferido na base' : item.fonte === 'rotulo' ? 'rótulo do produto' : 'estimativa da IA'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => mudarItem(item.id, (i) => reescalarItem(i, i.quantidadeG - 10))}
                      aria-label="Menos 10 gramas"
                      className="h-8 w-8 rounded-full border border-surface-4 text-content-hi"
                    >
                      −
                    </button>
                    <span className="w-16 text-center font-mono text-sm text-content-hi">{item.quantidadeG} g</span>
                    <button
                      onClick={() => mudarItem(item.id, (i) => reescalarItem(i, i.quantidadeG + 10))}
                      aria-label="Mais 10 gramas"
                      className="h-8 w-8 rounded-full border border-surface-4 text-content-hi"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-right text-micro text-content-low">
                    <span className="font-semibold text-content-hi">{item.calorias} kcal</span> · P {item.proteina} · C{' '}
                    {item.carboidrato} · G {item.gordura}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid grid-cols-4 gap-1.5 rounded-card border border-surface-4 bg-surface-2 p-3 text-center">
            {(
              [
                ['kcal', Math.round(total.calorias)],
                ['prot', `${Math.round(total.proteina)}g`],
                ['carb', `${Math.round(total.carboidrato)}g`],
                ['gord', `${Math.round(total.gordura)}g`],
              ] as const
            ).map(([r, v]) => (
              <div key={r}>
                <div className="text-micro text-content-dim">{r}</div>
                <div className="font-mono text-sm font-bold text-content-hi">{v}</div>
              </div>
            ))}
          </div>

          {erro && <p className="mt-3 text-center text-sm font-medium text-accent-danger">{erro}</p>}

          <div className="mt-4 space-y-2">
            <button
              onClick={() => void salvar()}
              disabled={incluidos === 0 || etapa === 'salvando'}
              className="w-full rounded-pill bg-brand py-3.5 text-base font-bold text-surface-1 active:scale-[0.98] disabled:opacity-50"
            >
              {etapa === 'salvando'
                ? 'Salvando…'
                : `Adicionar ${incluidos} ${incluidos === 1 ? 'item' : 'itens'} em ${nomeRefeicao}`}
            </button>
            <button
              onClick={() => {
                setRascunho(null)
                setFoto(null)
                setEtapa('captura')
              }}
              disabled={etapa === 'salvando'}
              className="w-full py-2.5 text-sm font-semibold text-content-mid"
            >
              {origem === 'codigo' ? 'Ler outro código' : 'Tirar outra foto'}
            </button>
          </div>
        </section>
      )}
    </main>
  )
}
