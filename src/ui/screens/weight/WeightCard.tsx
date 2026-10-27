import { pedirAbrirLife } from '@app/eventosLife'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { pesoRepository } from '@data/repositories/pesoRepository'
import { aoRegistrarNoDia } from '@data/registroDoDia'
import {
  corVariacao,
  filtrarPeriodo,
  formatarPeso,
  formatarPesoUnidade,
  unidadePeso,
  formatarVariacao,
  progressoMeta,
  resumirPesos,
  type RegistroPeso,
} from '@domain/entities/weight'
import { EnergiaPesoGrafico, type PeriodoEnergiaPeso } from '@ui/screens/home/EnergiaPesoCard'
import { useI18n } from '@/i18n/I18nProvider'

// Variação "contra o objetivo" fica neutra, nunca vermelha: peso não é erro
// e vermelho leria como bronca (Humane By Design). A favor = verde da marca.
const COR = { brand: 'text-brand', danger: 'text-content-mid', neutral: 'text-content-mid' }

/**
 * Card "Meu peso" da Home — o gráfico é 100% o que a pessoa registrou.
 *
 *  - Gráfico "Energia e peso" (calorias + peso, 14/30 dias) com a linha-guia
 *    da meta. A meta vem do onboarding.
 *  - Objetivo + peso-meta: "faltam X kg", e a cor da variação segue o objetivo
 *    (emagrecer: perder é verde; ganhar massa: ganhar é verde; manter: neutro).
 *  - Sem botões: registrar, mudar meta e histórico é pelo chat do Life
 *    (ai-proxy/peso.ts, sem IA e sem cota).
 */
export function WeightCard() {
  const { profile } = useSession()
  const [todos, setTodos] = useState<RegistroPeso[]>([])
  const [carregando, setCarregando] = useState(true)
  const [periodo, setPeriodo] = useState<PeriodoEnergiaPeso>(30)
  const { m } = useI18n()
  const t = m.home.peso

  const carregar = useCallback(async () => {
    try {
      setTodos(await pesoRepository.historico())
    } catch {
      setTodos([])
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
    // Pesagem feita pelo chat do Life chega por aqui.
    return aoRegistrarNoDia(() => void carregar())
  }, [carregar])

  const registros = useMemo(() => filtrarPeriodo(todos, periodo), [todos, periodo])
  const resumo = useMemo(() => resumirPesos(registros), [registros])
  const pesoMeta = profile?.pesoMeta ?? null

  if (carregando) {
    return (
      <section className="rounded-card border border-surface-4 bg-surface-2 p-5">
        <p className="text-micro text-content-low">{t.carregando}</p>
      </section>
    )
  }

  const objetivoAtual = profile?.objetivo ?? null
  const temDados = registros.length > 0
  const atual = todos[todos.length - 1]?.pesoKg ?? 0
  const cor = corVariacao(resumo.variacao, objetivoAtual)
  const falta = progressoMeta(atual, pesoMeta, objetivoAtual)

  return (
    <section className="rounded-card border border-surface-4 bg-surface-2 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="mb-0.5 text-micro font-semibold text-content-low">{t.titulo}</h2>
          <div>
            <span className="text-4xl font-bold tabular-nums text-content-hi">{atual > 0 ? formatarPeso(atual) : '—'}</span>
            <span className="text-lg text-content-low"> {unidadePeso()}</span>
          </div>
          {falta && (
            <div className={`mt-0.5 text-micro font-semibold ${falta.atingida ? 'text-brand' : 'text-content-low'}`}>
              {falta.atingida ? t.atingida(formatarPesoUnidade(pesoMeta!)) : t.faltam(formatarPesoUnidade(falta.faltaKg))}
            </div>
          )}
        </div>
        {temDados && resumo.variacao !== 0 && (
          <span className={`rounded-pill bg-surface-3 px-3 py-1 text-sm font-bold tabular-nums ${COR[cor]}`}>
            {formatarVariacao(resumo.variacao)} {unidadePeso()}
          </span>
        )}
      </div>

      {/* Gráfico novo (calorias + peso no mesmo eixo) no lugar da linha antiga. */}
      <EnergiaPesoGrafico periodo={periodo} onPeriodo={setPeriodo} />

      {!temDados && (
        <p className="mb-3 mt-2 text-center text-micro text-content-low">{t.vazio}</p>
      )}

      {temDados && registros.length > 1 && (
        <div className="mb-3 flex text-center">
          <div className="flex-1">
            <div className="text-micro text-content-low">{t.inicio}</div>
            <div className="text-sm font-bold text-content-hi">{formatarPesoUnidade(resumo.inicial)}</div>
          </div>
          <div className="flex-1 border-x border-surface-3">
            <div className="text-micro text-content-low">{t.atual}</div>
            <div className={`text-sm font-bold ${COR[cor]}`}>{formatarPesoUnidade(resumo.atual)}</div>
          </div>
          <div className="flex-1">
            <div className="text-micro text-content-low">{pesoMeta ? t.meta : t.variacao}</div>
            <div className={`text-sm font-bold ${pesoMeta ? 'text-accent-gold' : COR[cor]}`}>
              {pesoMeta ? formatarPesoUnidade(pesoMeta) : `${formatarVariacao(resumo.variacao)} ${unidadePeso()}`}
            </div>
          </div>
        </div>
      )}

      {/* Registrar, mudar a meta e ver o histórico é pedindo ao Life no chat
          (resposta fixa, sem IA e sem gastar mensagem). O botão só abre o chat
          com "Pesei  kg" escrito — a pessoa completa o número (relatório do APK). */}
      <button
        type="button"
        onClick={() => pedirAbrirLife(t.rascunhoChat)}
        className="mt-1 flex min-h-11 w-full items-center justify-center gap-2 rounded-pill border border-brand/40 bg-brand/10 text-sm font-semibold text-brand active:scale-[0.98]"
      >
        {t.contarAoLife}
      </button>
      <p className="mt-1.5 text-center text-micro text-content-low">{t.dicaChat}</p>
    </section>
  )
}
