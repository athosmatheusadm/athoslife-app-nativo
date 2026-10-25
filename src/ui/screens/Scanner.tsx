import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { AiProxyError, cotaIaHoje, estimarAlimento } from '@data/ai/aiProxy'
import { ehFalhaDeRede, valeTentarRede } from '@data/offline/conexao'
import { CameraNegadaError, capturarFoto, type FotoCapturada, type OrigemFoto } from '@data/ai/photoCapture'
import type { RefeicaoAlvo } from '@data/repositories/itensRefeicaoRepository'
import { produtoCodigoBarrasRepository, type ProdutoRotulo } from '@data/repositories/produtoCodigoBarrasRepository'
import { leitorDisponivel } from '@data/native/codigoBarras'
import { foodCaptureService } from '@domain/services/foodCaptureService'
import { reescalarItem } from '@domain/rules/foodReconciliation'
import { atualizarItemScan } from '@domain/rules/scanCalculo'
import { temAcessoPremium } from '@domain/rules/access'
import { refeicaoPeloHorario } from '@domain/rules/cozinha'
import type { ItemRascunho, RefeicaoRascunho } from '@domain/entities/food'
import { LifeMascote } from '@ui/components/LifeMascote'
import { ActivityIcon } from '@ui/components/ActivityIcon'
import { useI18n } from '@/i18n/I18nProvider'
import type { Mensagens } from '@/i18n/mensagens/tipo'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { avisar, vibrar } from '@ui/feedback'
import { PlanoParaEstimar, fimDaEstimativaGratis, mensagemErroEstimar } from '@ui/screens/diet/InlineFoodSearch'
import { CameraCodigo } from '@ui/screens/scanner/CameraCodigo'
import { RevisaoScanner } from '@ui/screens/scanner/RevisaoScanner'
import { CadastroRotulo } from '@ui/screens/scanner/CadastroRotulo'

/**
 * Scanner — foto do prato -> Gemini estima -> a pessoa revisa -> vira
 * alimento da refeição escolhida na Dieta (mesma lista, dá pra excluir e
 * copiar depois). Nada entra no diário sem passar pela revisão.
 *
 * Entrada pela Dieta ("Escanear comida"): a refeição e o dia vêm em
 * `location.state`. Chegando direto por /scanner (câmera do widget), a tela
 * abre já na escolha foto × código e a refeição sai do horário — dá pra
 * trocar no topo ou na revisão, antes de salvar (dono, 25/10: escolher a
 * refeição antes travava a agilidade do scanner). Dia = hoje.
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

const FIXAS = [
  { tipo: 'cafe' },
  { tipo: 'almoco' },
  { tipo: 'lanche' },
  { tipo: 'jantar' },
] as const

function mensagemDeErro(e: unknown, t: Mensagens['scanner']['erros'], semRede: string): string {
  if (ehFalhaDeRede(e)) return semRede
  if (e instanceof AiProxyError) {
    switch (e.info.tipo) {
      case 'premium_required':
        return t.premium
      case 'limit_reached':
        return e.info.proximoReset ? t.limite(e.info.proximoReset) : t.limiteSemHora
      case 'rate_limited':
        return t.rapido
      case 'image_too_large':
        return t.grande
      case 'indisponivel':
        return t.pausado
      case 'not_authenticated':
        return t.sessao
      case 'proxy_error':
        if (e.info.detalhe === 'no_food') return t.semComida
        break
      default:
        break
    }
  }
  return t.foto
}

export function Scanner() {
  const { profile } = useSession()
  const navigate = useNavigate()
  const entrada = (useLocation().state ?? {}) as EstadoEntrada

  const { m } = useI18n()
  const [alvo, setAlvo] = useState<RefeicaoAlvo>(() => entrada.alvo ?? { tipo: refeicaoPeloHorario() })
  const [nomeRefeicao, setNomeRefeicao] = useState(() =>
    entrada.alvo ? (entrada.nomeRefeicao ?? '') : m.dieta.refeicoes[refeicaoPeloHorario()],
  )
  // Refeição escolhida pelo horário: mostra "pelo horário" e deixa trocar.
  const [pelaHora, setPelaHora] = useState(!entrada.alvo)
  const [trocando, setTrocando] = useState(false)
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
  // Código que nenhuma base conhece (ou sem tabela): copiar o rótulo ou o Life estima pelo nome.
  const [faltando, setFaltando] = useState<{
    codigo: string
    nome: string
    marca: string | null
    imagemUrl: string | null
    semTabela: boolean
  } | null>(null)
  const semBase = faltando !== null
  const [nomeProduto, setNomeProduto] = useState('')
  const [estimando, setEstimando] = useState(false)
  // Grátis sem a estimativa da semana: convite pro plano no lugar do botão.
  const [pedirPlano, setPedirPlano] = useState(false)
  const [camera, setCamera] = useState(false)

  const pago = profile ? temAcessoPremium(profile) : false
  const t = m.scanner

  function escolherRefeicao(tipo: (typeof FIXAS)[number]['tipo']) {
    setAlvo({ tipo })
    setNomeRefeicao(m.dieta.refeicoes[tipo])
    setPelaHora(false)
    setTrocando(false)
  }
  // Limite vem do servidor (antes o texto dizia "5" fixo).
  const [limite, setLimite] = useState<number | null>(null)

  useEffect(() => {
    if (!pago) return
    void cotaIaHoje('vision').then((c) => {
      if (!c) return
      setRestantes(Math.max(c.limite - c.usados, 0))
      setLimite(c.limite)
    })
  }, [pago])

  // Voltar do Android na revisão: 1º toque avisa, 2º descarta (a análise já
  // gastou um scan da cota — sair sem querer jogava ela fora).
  const avisouVoltar = useRef(0)
  function sairDaRevisao() {
    if (Date.now() - avisouVoltar.current > 3000) {
      avisouVoltar.current = Date.now()
      avisar.ok(t.voltarDescarta)
      return
    }
    setRascunho(null)
    setFoto(null)
    setEtapa('captura')
  }
  useFecharNoVoltar(etapa === 'revisao', sairDaRevisao)

  function lerCodigo() {
    setErro(null)
    if (!leitorDisponivel) {
      // Navegador: sem leitor de câmera, digita o número de baixo do código.
      setDigitando(true)
      return
    }
    setCamera(true)
  }

  async function buscarProduto(codigo: string) {
    setErro(null)
    setOrigem('codigo')
    setFoto(null)
    setEtapa('analisando')
    try {
      const r = await produtoCodigoBarrasRepository.buscar(codigo)
      if (r.tipo !== 'achado') {
        setFaltando(
          r.tipo === 'semTabela'
            ? { codigo: r.codigo, nome: r.nome, marca: r.marca, imagemUrl: r.imagemUrl, semTabela: true }
            : { codigo: r.codigo, nome: '', marca: null, imagemUrl: null, semTabela: false },
        )
        if (r.tipo === 'semTabela') setNomeProduto(r.marca ? `${r.nome} ${r.marca}` : r.nome)
        setDigitando(false)
        setEtapa('captura')
        return
      }
      abrirRevisaoDoProduto(r.produto)
    } catch (e) {
      if (ehFalhaDeRede(e)) {
        setErro(m.offline.precisaInternet)
        setEtapa('captura')
        return
      }
      setErro(t.erros.buscaProduto)
      setEtapa('captura')
    }
  }

  function abrirRevisaoDoProduto(produto: ProdutoRotulo) {
    setFaltando(null)
    setImagemProduto(produto.imagemUrl)
    setRascunho(foodCaptureService.rascunhoDeProduto(produto, t.rotuloSemPorcao))
    setDigitando(false)
    setCodigoDigitado('')
    setEtapa('revisao')
  }

  async function cadastrarRotulo(produto: ProdutoRotulo) {
    setOrigem('codigo')
    abrirRevisaoDoProduto(produto)
    const naBase = await produtoCodigoBarrasRepository.cadastrarPeloRotulo(produto)
    if (!naBase) avisar.ok(t.rotulo2.soNoCelular)
  }

  async function estimarProduto() {
    const nome = nomeProduto.trim()
    if (nome.length < 2) return
    setErro(null)
    setEstimando(true)
    try {
      const e = await estimarAlimento(nome)
      if (!e) {
        setErro(m.dieta.busca.estimar.naoReconhecido)
        return
      }
      setOrigem('codigo')
      setImagemProduto(null)
      setRascunho({
        descricao: e.nome,
        confianca: e.confianca,
        observacao: m.dieta.busca.estimar.nota,
        itens: [
          {
            id: `estimado-${Date.now()}`,
            nome: e.nome,
            quantidadeG: e.porcaoG,
            alimentoBaseId: null,
            fonte: 'ia',
            incluir: true,
            calorias: e.calorias,
            proteina: e.proteina,
            carboidrato: e.carboidrato,
            gordura: e.gordura,
          },
        ],
      })
      setFaltando(null)
      setNomeProduto('')
      setDigitando(false)
      setCodigoDigitado('')
      setEtapa('revisao')
    } catch (err) {
      if (fimDaEstimativaGratis(err, pago)) setPedirPlano(true)
      else setErro(mensagemErroEstimar(err, m.dieta.busca.estimar, m.offline.precisaInternet))
    } finally {
      setEstimando(false)
    }
  }

  async function fotografar(origem: OrigemFoto) {
    setErro(null)
    setOrigem('foto')
    setImagemProduto(null)
    // Sem rede a foto não teria pra onde ir: avisa antes de abrir a câmera.
    if (!valeTentarRede()) {
      setErro(m.offline.precisaInternet)
      return
    }
    let f: FotoCapturada | null
    try {
      f = await capturarFoto(origem)
    } catch (e) {
      if (e instanceof CameraNegadaError) setErro(m.comum.cameraNegada)
      return
    }
    if (!f) return
    setFoto(f)
    setEtapa('analisando')
    try {
      const r = await foodCaptureService.capturar(f.base64, f.mime)
      if (r.itens.length === 0) {
        setErro(t.erros.semComida)
        setEtapa('captura')
        return
      }
      setRascunho(r)
      setEtapa('revisao')
      setRestantes((n) => (n === null ? n : Math.max(n - 1, 0)))
    } catch (e) {
      setErro(mensagemDeErro(e, t.erros, m.offline.precisaInternet))
      setEtapa('captura')
    }
  }

  function mudarGramas(i: ItemRascunho, gramas: number): ItemRascunho {
    return i.scan ? atualizarItemScan(i, { gramas: Math.max(0, gramas) }) : reescalarItem(i, gramas)
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
      vibrar.sucesso()
      avisar.ok(t.adicionados(incluidos, nomeRefeicao))
      navigate('/dieta', { replace: true })
    } catch {
      setErro(t.erros.salvar)
      setEtapa('revisao')
    }
  }

  const blocoCodigo = (
    <div className="mt-2 space-y-2">
      <button
        onClick={lerCodigo}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] border border-surface-4 bg-surface-2 py-3 pl-3 pr-3.5 text-left transition-colors active:bg-surface-3"
      >
        <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-brand/15 text-brand">
          <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 8v8M10 8v8M13.5 8v8M17 8v8" strokeWidth="1.6" />
          </svg>
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="text-[15px] font-bold text-content-hi">{t.lerCodigo}</span>
          <span className="text-micro text-content-low">{t.vidro.lerSub}</span>
        </span>
        <span className="rounded-pill bg-brand px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-ink">{t.vidro.gratis}</span>
      </button>
      {leitorDisponivel && !digitando && (
        <button onClick={() => setDigitando(true)} className="min-h-10 w-full text-[13px] font-semibold text-content-low underline underline-offset-4">
          {t.vidro.prefereDigitar}
        </button>
      )}
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
            enterKeyHint="search"
            placeholder={t.numeroCodigo}
            aria-label={t.numeroAria}
            className="min-h-12 min-w-0 flex-1 rounded-card border border-surface-4 bg-surface-2 px-3 font-mono text-base text-content-hi placeholder:font-sans placeholder:text-content-low focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={codigoDigitado.length < 8}
            className="min-h-12 rounded-pill bg-brand px-5 text-sm font-bold text-surface-1 active:scale-95 disabled:opacity-50"
          >
            {t.buscar}
          </button>
        </form>
      )}
      {faltando && (
        <CadastroRotulo
          key={faltando.codigo}
          codigo={faltando.codigo}
          nomeInicial={faltando.nome}
          marcaInicial={faltando.marca}
          imagemUrl={faltando.imagemUrl}
          semTabela={faltando.semTabela}
          onPronto={(p) => void cadastrarRotulo(p)}
        />
      )}
      {semBase && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void estimarProduto()
          }}
          className="rounded-card border border-surface-4 bg-surface-2 p-3"
        >
          <p className="text-sm text-content-mid">{t.rotulo2.estimarTitulo}</p>
          <input
            type="text"
            autoFocus
            value={nomeProduto}
            onChange={(e) => setNomeProduto(e.target.value.slice(0, 80))}
            enterKeyHint="send"
            placeholder={t.nomeProduto}
            aria-label={t.nomeProduto}
            className="mt-2 min-h-12 w-full rounded-card border border-surface-4 bg-surface-1 px-3 text-base text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
          />
          {pedirPlano ? (
            <PlanoParaEstimar />
          ) : (
            <>
              <button
                type="submit"
                disabled={estimando || nomeProduto.trim().length < 2}
                className="mt-2 min-h-12 w-full rounded-pill bg-brand px-4 text-sm font-bold text-surface-1 active:scale-[0.98] disabled:opacity-50"
              >
                {estimando ? m.dieta.busca.estimar.estimando : m.dieta.busca.estimar.botao(nomeProduto.trim() || '…')}
              </button>
              <p className="mt-1 text-center text-micro text-content-low">
                {pago ? m.dieta.busca.estimar.custoPago : m.dieta.busca.estimar.custoGratis}
              </p>
            </>
          )}
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
          aria-label={t.voltar}
          className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-surface-4 text-content-mid active:bg-content-hi/5"
        >
          ←
        </button>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold text-content-hi">{t.titulo}</h1>
          <button
            onClick={() => setTrocando((x) => !x)}
            aria-expanded={trocando}
            aria-label={t.trocarRefeicao}
            className="flex max-w-full items-center gap-1 truncate text-sm text-content-low"
          >
            <span className="truncate">
              {t.vaiPra(nomeRefeicao)}
              {pelaHora && alvo.tipo !== 'extra' && ` · ${t.pelaHora}`}
            </span>
            <span aria-hidden="true" className={`text-brand transition-transform ${trocando ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
        </div>
      </header>

      {trocando && etapa === 'captura' && (
        <SeletorRefeicao atual={alvo} nomes={m.dieta.refeicoes} onEscolher={escolherRefeicao} />
      )}

      {!pago && etapa === 'captura' && (
        <section className="rounded-card border border-accent-gold/40 bg-surface-2 p-5 text-center">
          <ActivityIcon icone="cadeado" tile={false} cor="inherit" className="mx-auto h-9 w-9 text-accent-gold" />
          <p className="mt-2 font-semibold text-content-hi">{t.pagoTitulo}</p>
          <p className="mt-1 text-sm text-content-low">{t.pagoTexto}</p>
          <button
            onClick={() => navigate('/perfil/plano')}
            className="mt-4 min-h-12 w-full rounded-pill bg-brand text-sm font-bold text-surface-1 active:scale-[0.98]"
          >
            {t.verPlanos}
          </button>
        </section>
      )}
      {!pago && etapa === 'captura' && (
        <section className="mt-4">
          <p className="text-center text-sm text-content-low">{t.codigoGratis}</p>
          {erro && <p role="alert" className="mt-2 text-center text-sm font-medium text-accent-danger">{erro}</p>}
          {blocoCodigo}
        </section>
      )}

      {pago && etapa === 'captura' && (
        <section className="flex flex-1 flex-col">
          <div className="flex flex-1 flex-col items-center justify-center rounded-card border border-dashed border-brand/40 bg-surface-2 p-6 text-center">
            <ActivityIcon icone="almoco" className="h-16 w-16" />
            <p className="mt-3 font-semibold text-content-hi">{t.dicaTitulo}</p>
            <p className="mt-1 max-w-xs text-sm text-content-low">{t.dicaTexto}</p>
          </div>
          {erro && <p role="alert" className="mt-3 text-center text-sm font-medium text-accent-danger">{erro}</p>}
          <div className="mt-4 space-y-2">
            <button
              onClick={() => void fotografar('camera')}
              disabled={restantes === 0}
              className="min-h-14 w-full rounded-pill bg-brand text-base font-bold text-surface-1 active:scale-[0.98] disabled:opacity-50"
            >
              {t.tirarFoto}
            </button>
            <button
              onClick={() => void fotografar('galeria')}
              disabled={restantes === 0}
              className="min-h-12 w-full rounded-pill border border-surface-4 text-sm font-semibold text-content-hi active:bg-content-hi/5 disabled:opacity-50"
            >
              {t.galeria}
            </button>
            {blocoCodigo}
            {restantes !== null && (
              <p className="text-center text-micro text-content-low">
                {restantes === 0 ? t.semScans : t.restantes(restantes, limite ?? restantes)}
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
          <LifeMascote humor="chef" className="mb-3 h-28" />
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-surface-4 border-t-brand" />
          <p className="mt-4 font-semibold text-content-hi" role="status">
            {origem === 'codigo' ? t.buscandoProduto : t.olhando}
          </p>
          <p className="mt-1 text-sm text-content-low">{t.segundinhos}</p>
        </section>
      )}

      {(etapa === 'revisao' || etapa === 'salvando') && rascunho && total && (
        <RevisaoScanner
          rascunho={rascunho}
          origem={origem}
          fotoPrato={foto?.dataUrl ?? null}
          imagemProduto={imagemProduto}
          nomeRefeicao={nomeRefeicao}
          seletorRefeicao={<SeletorRefeicao atual={alvo} nomes={m.dieta.refeicoes} onEscolher={escolherRefeicao} vidro />}
          total={total}
          incluidos={incluidos}
          salvando={etapa === 'salvando'}
          erro={erro}
          onMudarItem={mudarItem}
          mudarGramas={mudarGramas}
          onSalvar={() => void salvar()}
          onRefazer={() => {
            setRascunho(null)
            setFoto(null)
            setEtapa('captura')
            if (origem === 'codigo') lerCodigo()
          }}
          onVoltar={sairDaRevisao}
        />
      )}

      {camera && (
        <CameraCodigo
          nomeRefeicao={nomeRefeicao}
          onCodigo={(codigo) => {
            setCamera(false)
            void buscarProduto(codigo)
          }}
          onDigitar={() => {
            setCamera(false)
            setDigitando(true)
          }}
          onFechar={() => setCamera(false)}
          onErro={(msg) => {
            setCamera(false)
            setErro(msg)
            setDigitando(true)
          }}
        />
      )}
    </main>
  )
}

/** As 4 refeições fixas, pra trocar o destino do scanner. */
function SeletorRefeicao(props: {
  atual: RefeicaoAlvo
  nomes: Mensagens['dieta']['refeicoes']
  onEscolher: (tipo: (typeof FIXAS)[number]['tipo']) => void
  vidro?: boolean
}) {
  return (
    <div className="mb-4 grid grid-cols-4 gap-2">
      {FIXAS.map((f) => {
        const ativo = props.atual.tipo === f.tipo
        return (
          <button
            key={f.tipo}
            onClick={() => props.onEscolher(f.tipo)}
            aria-pressed={ativo}
            className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-center transition-colors ${
              props.vidro ? 'vidro' : 'border border-surface-4 bg-surface-2 active:bg-surface-3'
            } ${ativo ? '!border-brand ring-1 ring-brand' : ''}`}
          >
            <ActivityIcon icone={f.tipo} className="h-8 w-8" />
            <span className={`text-micro font-semibold ${props.vidro ? '' : 'text-content-hi'}`}>{props.nomes[f.tipo]}</span>
          </button>
        )
      })}
    </div>
  )
}
