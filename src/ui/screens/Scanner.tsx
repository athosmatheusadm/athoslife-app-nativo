import { ProfileAvatar } from '@ui/components/ProfileAvatar'

/**
 * Placeholder honesto: a UI do Scanner (câmera + tela de revisão) ainda
 * não foi construída — domínio e dados já estão prontos e validados
 * (ver docs/SCANNER_DIRECTIVE.md). Esta é a próxima página da fila.
 */
export function Scanner() {
  return (
    <main className="flex min-h-full flex-col px-4 pb-24 pt-safe-t">
      <header className="flex items-center justify-between pt-3">
        <div>
          <div className="text-micro font-bold uppercase tracking-[3px] text-brand">Athos</div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-content-hi">
            📷 Scanner IA
          </h1>
          <p className="text-sm text-content-low">Identifique qualquer refeição por foto</p>
        </div>
        <ProfileAvatar />
      </header>

      <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-surface-4 bg-surface-2 p-8 text-center">
        <span className="text-4xl" aria-hidden="true">🚧</span>
        <p className="font-semibold text-content-hi">Em construção</p>
        <p className="max-w-xs text-micro text-content-low">
          Foto → Gemini Vision estima os macros → você revisa e confirma.
          A captura e a tela de revisão entram na próxima etapa.
        </p>
      </div>
    </main>
  )
}
