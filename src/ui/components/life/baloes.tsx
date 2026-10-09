import type { ReactNode } from 'react'

/** Peças de conversa dos roteiros do Life no chat (check de saúde, montar planos). */

export function BalaoLife(props: { children: ReactNode }) {
  return (
    <div className="max-w-[85%] rounded-2xl border border-surface-4 bg-surface-2 p-3.5 text-sm leading-relaxed text-content-mid">
      {props.children}
    </div>
  )
}

export function BalaoPessoa(props: { children: ReactNode }) {
  return <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-brand p-3 text-sm font-semibold text-brand-ink">{props.children}</div>
}

export function Opcao(props: { onClick: () => void; children: ReactNode; ativa?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      aria-pressed={props.ativa}
      onClick={props.onClick}
      className={`min-h-11 rounded-pill border px-4 text-sm font-semibold active:scale-[0.97] disabled:opacity-40 ${
        props.ativa ? 'border-brand bg-brand text-brand-ink' : 'border-brand/60 bg-brand/10 text-brand'
      }`}
    >
      {props.children}
    </button>
  )
}

/** Linha de opções alinhada à direita (lado de quem responde). */
export function Opcoes(props: { children: ReactNode }) {
  return <div className="flex flex-wrap justify-end gap-2">{props.children}</div>
}

/** Pergunta já respondida — fica na conversa. */
export interface Resposta {
  readonly pergunta: string
  readonly resposta: string
}

export function Historico(props: { itens: readonly Resposta[] }) {
  return (
    <>
      {props.itens.map((r, i) => (
        <div key={i} className="space-y-3">
          <BalaoLife>{r.pergunta}</BalaoLife>
          <BalaoPessoa>{r.resposta}</BalaoPessoa>
        </div>
      ))}
    </>
  )
}
