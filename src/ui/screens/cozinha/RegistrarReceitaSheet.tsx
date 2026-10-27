import { useState } from 'react'
import { fmtG, fmtKcal } from '@domain/rules/formatoNumero'
import { useI18n } from '@/i18n/I18nProvider'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import type { Macros } from '@domain/entities/food'
import { escalarMacros, refeicaoPeloHorario } from '@domain/rules/cozinha'
import { itensRefeicaoRepository } from '@data/repositories/itensRefeicaoRepository'

type TipoFixo = 'cafe' | 'almoco' | 'lanche' | 'jantar'

const QUANTIDADES: readonly { valor: number; rotulo: string }[] = [
  { valor: 0.5, rotulo: '½' },
  { valor: 1, rotulo: '1' },
  { valor: 1.5, rotulo: '1½' },
  { valor: 2, rotulo: '2' },
]

const TIPOS: readonly TipoFixo[] = ['cafe', 'almoco', 'lanche', 'jantar']

/**
 * "Registrar na refeição": a receita vira UM item no diário de hoje, com os
 * macros da quantidade que a pessoa comeu. Refeição já vem escolhida pelo
 * horário.
 */
export function RegistrarReceitaSheet(props: {
  titulo: string
  macrosPorPorcao: Macros
  onFechar: () => void
}) {
  const { m } = useI18n()
  const t = m.cozinha
  const [qtd, setQtd] = useState(1)
  const [tipo, setTipo] = useState<TipoFixo>(() => refeicaoPeloHorario())
  const [estado, setEstado] = useState<'pronto' | 'salvando' | 'feito' | 'erro'>('pronto')
  useFecharNoVoltar(true, props.onFechar)

  const rotuloQtd = QUANTIDADES.find((q) => q.valor === qtd)?.rotulo ?? String(qtd)
  const macros = escalarMacros(props.macrosPorPorcao, qtd)

  async function registrar() {
    setEstado('salvando')
    try {
      await itensRefeicaoRepository.adicionar({ tipo }, new Date(), {
        nome: props.titulo,
        quantidade: t.porcoesComidas(rotuloQtd),
        ...macros,
      })
      setEstado('feito')
      setTimeout(props.onFechar, 1400)
    } catch (e) {
      console.error('registrar receita falhou:', e)
      setEstado('erro')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t.registrarTitulo}>
      <button
        aria-label={t.voltar}
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />
      <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-1 p-6 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-4" aria-hidden="true" />
        <h2 className="text-xl font-bold text-content-hi">{t.registrarTitulo}</h2>
        <p className="mt-1 line-clamp-1 text-sm text-content-low">{props.titulo}</p>

        <div className="mt-5 text-sm font-semibold text-content-mid">{t.quantoComeu}</div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {QUANTIDADES.map((q) => (
            <button
              key={q.valor}
              type="button"
              onClick={() => setQtd(q.valor)}
              className={`rounded-xl border py-2.5 text-sm font-bold transition-colors ${
                qtd === q.valor ? 'border-brand bg-brand/10 text-brand' : 'border-surface-4 text-content-mid'
              }`}
            >
              {q.rotulo}
            </button>
          ))}
        </div>

        <div className="mt-5 text-sm font-semibold text-content-mid">{t.qualRefeicao}</div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {TIPOS.map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => setTipo(tp)}
              className={`rounded-xl border py-2.5 text-micro font-bold transition-colors ${
                tipo === tp ? 'border-brand bg-brand/10 text-brand' : 'border-surface-4 text-content-mid'
              }`}
            >
              {t.refeicoes[tp]}
            </button>
          ))}
        </div>

        <p className="mt-5 text-center text-micro text-content-low">
          {fmtKcal(macros.calorias)} {t.kcal} · {fmtG(macros.proteina)} g {t.prot} · {fmtG(macros.carboidrato)} g {t.carb} · {fmtG(macros.gordura)} g {t.gord}
        </p>

        {estado === 'feito' ? (
          <p className="mt-4 rounded-pill bg-brand/15 py-3 text-center text-sm font-bold text-brand">
            ✓ {t.registrado(t.refeicoes[tipo])}
          </p>
        ) : (
          <button
            type="button"
            disabled={estado === 'salvando'}
            onClick={() => void registrar()}
            className="mt-4 w-full rounded-pill bg-brand py-3 text-sm font-bold text-brand-ink disabled:opacity-60"
          >
            {t.confirmarRegistro}
          </button>
        )}
        {estado === 'erro' && <p className="mt-2 text-center text-micro text-[#f43f5e]">{t.erroRegistrar}</p>}
      </div>
    </div>
  )
}
