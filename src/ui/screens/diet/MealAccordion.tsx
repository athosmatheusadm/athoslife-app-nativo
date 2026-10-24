import { ActivityIcon } from '@ui/components/ActivityIcon'
import { fmtKcal } from '@domain/rules/formatoNumero'
import { macrosRefeicao, resumoRefeicao, type Refeicao } from '@domain/entities/meal'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Linha de refeição na lista da Dieta.
 *
 * Decisão do usuário (2026-09-24): não expande mais inline — tocar abre
 * direto o MealSheet (bottom sheet, renderizado pela tela-mãe) com os
 * itens já registrados + o menu de ações. Isso substituiu o acordeão
 * antigo (grid-rows 0fr->1fr) que vivia aqui — regra antiga de "nada sai
 * do card" foi revogada de propósito, ver MealSheet.tsx.
 *
 * Linha BURRA: só mostra nome/resumo/kcal/status, quem abre o sheet é a
 * tela-mãe.
 */
export function MealAccordion(props: {
  refeicao: Refeicao
  /**
   * Plano de referência de dieta com a refeição ainda vazia: o resumo e as
   * kcal aparecem apagados, e o ✓ do card registra o do plano e conclui.
   */
  sugestaoPlano?: { resumo: string; kcal: number } | null
  onAbrir: () => void
  onToggleConcluida: () => void
}) {
  const { refeicao } = props
  const { m } = useI18n()
  const totalKcal = macrosRefeicao(refeicao.itens).calorias

  // UI/UX (09/10): o ✓ era um span de 24px DENTRO do botão da linha
  // (alvo pequeno e controle aninhado, que leitor de tela não anuncia).
  // Agora linha, puxador e ✓ são irmãos, cada um com ≥ 48px.
  return (
    <div className="flex items-stretch overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
      <button
        type="button"
        onClick={props.onAbrir}
        className={`flex min-h-16 min-w-0 flex-1 items-center gap-3 py-3 text-left transition-colors active:bg-content-hi/5 pl-4`}
      >
        <ActivityIcon icone={refeicao.icone ?? refeicao.tipo} />

        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-content-hi">{refeicao.nome}</span>
          {props.sugestaoPlano ? (
            <span className="block truncate text-micro italic text-content-low"><ActivityIcon icone="brilho" tile={false} cor="inherit" className="mr-1 inline-flex h-3.5 w-3.5 align-[-2px]" />{props.sugestaoPlano.resumo}</span>
          ) : (
            <span className="block truncate text-micro text-content-low">{refeicao.itens.length ? resumoRefeicao(refeicao.itens) : m.dieta.linhaVazia}</span>
          )}
        </span>

        {props.sugestaoPlano ? (
          <span className="flex-none text-sm font-semibold tabular-nums text-content-low">~{fmtKcal(props.sugestaoPlano.kcal)} kcal</span>
        ) : (
          <span className="flex-none text-sm font-bold tabular-nums text-content-mid">{fmtKcal(totalKcal)} kcal</span>
        )}
      </button>

      <button
        type="button"
        role="checkbox"
        aria-checked={refeicao.concluida}
        aria-label={m.dieta.marcarFeita(refeicao.nome)}
        onClick={props.onToggleConcluida}
        className="flex w-14 flex-none items-center justify-center active:bg-content-hi/5"
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-colors ${
            refeicao.concluida ? 'border-brand bg-brand text-brand-ink' : 'border-content-dim'
          }`}
        >
          {refeicao.concluida && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
          )}
        </span>
      </button>
    </div>
  )
}
