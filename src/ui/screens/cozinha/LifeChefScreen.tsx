import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { cozinhaService } from '@domain/services/cozinhaService'
import { temAcessoPremium } from '@domain/rules/access'
import { estruturarGerada, macrosRestantes } from '@domain/rules/cozinha'
import type { ReceitaGerada } from '@domain/entities/receita'
import type { Macros } from '@domain/entities/food'
import { profileRepository } from '@data/repositories/profileRepository'
import { macrosRepository } from '@data/repositories/macrosRepository'
import { AiProxyError } from '@data/ai/aiProxy'
import { CabecalhoCozinha } from './CabecalhoCozinha'
import { ReceitaView } from './ReceitaView'

type Momento = 'qualquer' | 'cafe' | 'principal' | 'lanche' | 'doce'
const MOMENTOS: readonly Momento[] = ['qualquer', 'cafe', 'principal', 'lanche', 'doce']
const MAX_INGREDIENTES = 25

/**
 * Life-chef: a pessoa diz o que tem em casa e o Life monta UMA receita
 * (handler `recipe` do ai-proxy, cota diária no servidor). Aberto pra todos
 * — sem cadeado (decisão do dono): grátis 1 receita/SEMANA; o pago destrava
 * 10/dia, "Outra ideia" e mirar no que ainda cabe no dia. Leva junto o que
 * a pessoa não come (onboarding). Salvar leva pra tela da criação, onde ela
 * põe a foto do prato que fez.
 */
export function LifeChefScreen() {
  const { m } = useI18n()
  const t = m.cozinha
  const navigate = useNavigate()
  const { profile } = useSession()

  const [ingredientes, setIngredientes] = useState<string[]>([])
  const [texto, setTexto] = useState('')
  const [momento, setMomento] = useState<Momento>('qualquer')
  const [evitar, setEvitar] = useState<string[]>([])
  const [restante, setRestante] = useState<Macros | null>(null)
  const [fase, setFase] = useState<'pergunta' | 'montando' | 'resultado'>('pergunta')
  const [receita, setReceita] = useState<ReceitaGerada | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [acabouGratis, setAcabouGratis] = useState(false)

  useEffect(() => {
    if (!profile) return
    void profileRepository.preferenciasAlimentares().then((p) => setEvitar(p.evitar)).catch(() => setEvitar([]))
    void macrosRepository
      .doDia()
      .then((c) =>
        setRestante(
          macrosRestantes(
            { calorias: profile.metas.kcal, proteina: profile.metas.proteina, carboidrato: profile.metas.carboidrato, gordura: profile.metas.gordura },
            { calorias: c.kcal, proteina: c.proteina, carboidrato: c.carboidrato, gordura: c.gordura },
          ),
        ),
      )
      .catch(() => setRestante(null))
  }, [profile])

  if (!profile) return null
  const premium = temAcessoPremium(profile)

  function adicionar(bruto: string) {
    const novos = bruto
      .split(/[,;\n]/)
      .map((x) => x.trim())
      .filter((x) => x.length > 0 && x.length <= 60)
    if (novos.length === 0) return
    setIngredientes((atual) => {
      const vistos = new Set(atual.map((x) => x.toLowerCase()))
      const lista = [...atual]
      for (const n of novos) {
        if (!vistos.has(n.toLowerCase()) && lista.length < MAX_INGREDIENTES) {
          vistos.add(n.toLowerCase())
          lista.push(n)
        }
      }
      return lista
    })
    setTexto('')
    setErro(null)
  }

  async function montar() {
    if (!profile) return
    const lista = texto.trim() ? [...ingredientes, texto.trim()] : ingredientes
    if (texto.trim()) adicionar(texto)
    if (lista.length === 0) {
      setErro(t.erros.semIngrediente)
      return
    }
    setErro(null)
    setFase('montando')
    try {
      const r = await cozinhaService.montarComLife({
        profile,
        ingredientesDisponiveis: lista,
        restricoes: evitar,
        objetivo: profile.objetivo,
        macrosRestantes: restante ?? { calorias: 0, proteina: 0, carboidrato: 0, gordura: 0 },
        categoriaDesejada: momento === 'qualquer' ? null : t.momentos[momento],
      })
      setReceita(r)
      setFase('resultado')
    } catch (e) {
      console.error('life-chef falhou:', e)
      setErro(mensagemErro(e))
      setFase(receita ? 'resultado' : 'pergunta')
    }
  }

  function mensagemErro(e: unknown): string {
    if (e instanceof AiProxyError) {
      switch (e.info.tipo) {
        case 'limit_reached':
          if (premium) return t.erros.limite
          setAcabouGratis(true)
          return t.erros.limiteGratis
        // Servidor antigo (antes da cota grátis) ainda responde assim.
        case 'premium_required':
          setAcabouGratis(true)
          return t.erros.limiteGratis
        case 'rate_limited': return t.erros.rapido
        case 'indisponivel': return t.erros.indisponivel
        default: return t.erros.geral
      }
    }
    return t.erros.geral
  }

  async function salvar() {
    if (!receita) return
    setSalvando(true)
    try {
      const id = await cozinhaService.salvarCriacao(receita)
      navigate(`/dieta/cozinha/criacao/${id}`, { replace: true })
    } catch (e) {
      console.error('salvar criação falhou:', e)
      const limite = !!e && typeof e === 'object' && 'message' in e && String(e.message).includes('limite_criacoes')
      setErro(limite ? t.limiteCriacoes : t.erroSalvar)
      setSalvando(false)
    }
  }

  return (
    <main className="min-h-full pb-24 pt-safe-t">
      <CabecalhoCozinha titulo={t.lifeChefTitulo} onVoltar={() => navigate(-1)} />

      {fase === 'montando' && (
        <div className="px-4 pt-16 text-center">
          <img src="/life/chef.webp" alt="" className="mx-auto mb-4 h-36 w-auto motion-safe:animate-bounce" draggable={false} />
          <p className="text-sm font-semibold text-content-mid">{t.montando}</p>
        </div>
      )}

      {fase === 'pergunta' && (
        <div className="space-y-5 px-4">
          <div className="flex items-end gap-3 pt-2">
            <img src="/life/chef.webp" alt="" className="h-24 w-auto flex-none" draggable={false} />
            <div className="mb-3 rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-3 text-sm font-semibold text-content-hi">
              {t.lifeChefPergunta}
            </div>
          </div>

          <div>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                adicionar(texto)
              }}
            >
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={t.ingredientePlaceholder}
                maxLength={120}
                enterKeyHint="done"
                className="min-w-0 flex-1 rounded-xl border border-surface-4 bg-surface-2 px-3 py-2.5 text-sm text-content-hi placeholder:text-content-dim focus:border-brand focus:outline-none"
              />
              <button type="submit" className="flex-none rounded-xl bg-surface-3 px-4 text-sm font-bold text-content-hi">
                {t.adicionar}
              </button>
            </form>

            {ingredientes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {ingredientes.map((ing) => (
                  <button
                    key={ing}
                    type="button"
                    onClick={() => setIngredientes((a) => a.filter((x) => x !== ing))}
                    aria-label={t.remover(ing)}
                    className="rounded-pill bg-brand/15 px-3 py-1.5 text-micro font-bold text-brand"
                  >
                    {ing} ✕
                  </button>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {t.sugestoes
                .filter((s) => !ingredientes.some((x) => x.toLowerCase() === s.toLowerCase()))
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => adicionar(s)}
                    className="rounded-pill border border-surface-4 px-3 py-1.5 text-micro font-semibold text-content-mid"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-semibold text-content-mid">{t.momento}</div>
            <div className="flex flex-wrap gap-2">
              {MOMENTOS.map((mo) => (
                <button
                  key={mo}
                  type="button"
                  onClick={() => setMomento(mo)}
                  aria-pressed={momento === mo}
                  className={`rounded-pill px-3 py-1.5 text-micro font-bold ${
                    momento === mo ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
                  }`}
                >
                  {t.momentos[mo]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1 rounded-2xl bg-surface-2 p-3 text-micro text-content-mid">
            {evitar.length > 0 && <p>🚫 {t.deixarDeFora(evitar.join(', '))}</p>}
            {premium && restante && restante.calorias > 0 && <p>🎯 {t.cabeNoDia(Math.round(restante.calorias))}</p>}
            {!premium && <p>✨ {t.gratisHoje}</p>}
          </div>

          {erro && <p className="text-center text-micro text-[#f43f5e]">{erro}</p>}
          {acabouGratis && <LinkPlanos />}

          <button
            type="button"
            onClick={() => void montar()}
            className="w-full rounded-pill bg-brand py-3.5 text-sm font-bold text-brand-ink active:opacity-90"
          >
            👨‍🍳 {t.montar}
          </button>
        </div>
      )}

      {fase === 'resultado' && receita && (
        <ReceitaView
          key={receita.titulo}
          titulo={receita.titulo}
          subtitulo={receita.subtitulo || null}
          corTema="#22c55e"
          capa={
            <div className="mb-4 flex items-end gap-3">
              <img src="/life/chef.webp" alt="" className="h-24 w-auto flex-none" draggable={false} />
              {receita.rendimento && (
                <div className="mb-3 rounded-2xl rounded-bl-sm bg-surface-2 px-4 py-3 text-sm text-content-hi">
                  🍽 {receita.rendimento}
                </div>
              )}
            </div>
          }
          selos={
            <span className="rounded-pill bg-brand/15 px-3 py-1 text-micro font-bold text-brand">👨‍🍳 {t.criadaPeloLife}</span>
          }
          macrosPorPorcao={receita.macros}
          tempoMin={receita.tempoMin}
          estrutura={estruturarGerada(receita)}
          aviso={t.aproximado}
          acoes={
            <>
              {erro && <p className="text-center text-micro text-[#f43f5e]">{erro}</p>}
              {(acabouGratis || (!premium && erro === t.limiteCriacoes)) && <LinkPlanos />}
              <button
                type="button"
                disabled={salvando}
                onClick={() => void salvar()}
                className="w-full rounded-pill border border-brand py-3 text-sm font-bold text-brand disabled:opacity-60"
              >
                {salvando ? t.salvando : `💾 ${t.salvar}`}
              </button>
              {premium && (
                <button
                  type="button"
                  onClick={() => void montar()}
                  className="w-full rounded-pill border border-surface-4 py-3 text-sm font-bold text-content-mid"
                >
                  🔄 {t.outraIdeia}
                </button>
              )}
            </>
          }
        />
      )}
    </main>
  )
}

/** Convite discreto pro pago — só aparece quando a cota grátis acabou. */
function LinkPlanos() {
  const { m } = useI18n()
  const navigate = useNavigate()
  return (
    <p className="text-center text-micro text-content-mid">
      {m.cozinha.querMais}{' '}
      <button type="button" onClick={() => navigate('/perfil/plano')} className="font-bold text-brand">
        {m.cozinha.verPlanos} ›
      </button>
    </p>
  )
}
