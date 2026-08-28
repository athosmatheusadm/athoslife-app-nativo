import { CATEGORIA_META, formatarConteudo, type Receita } from '@domain/entities/receita'

/**
 * "Tela da receita" (spec: COZINHA_DIRECTIVE.md). Renderiza `conteudo` de
 * forma tolerante — o texto real das 25 receitas não segue 100% o mesmo
 * formato por seção (ver `formatarConteudo`). Nunca chega aqui com
 * `conteudo` de uma receita bloqueada: quem decide isso é `cozinhaService`.
 */
export function ReceitaDetalheScreen(props: {
  receita: Receita | null
  carregando: boolean
  onVoltar: () => void
  onToggleFavorito: () => void
  onIrParaPlano: () => void
}) {
  const { receita, carregando } = props

  return (
    <main className="min-h-full pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button type="button" onClick={props.onVoltar} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-lg font-bold text-content-hi">Cozinha ATHOS</h1>
      </header>

      {carregando && <p className="px-4 py-10 text-center text-micro text-content-low">Carregando…</p>}

      {!carregando && !receita && (
        <p className="px-4 py-10 text-center text-micro text-content-low">Receita não encontrada.</p>
      )}

      {receita && (
        <div className="px-4">
          <div
            className="mb-4 flex h-32 items-center justify-center rounded-2xl text-5xl"
            style={{ background: `linear-gradient(135deg, ${receita.corTema}33, transparent)` }}
          >
            {CATEGORIA_META[receita.categoria].emoji}
          </div>

          <div className="mb-1 flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-content-hi">{receita.titulo}</h2>
            {!receita.bloqueada && (
              <button
                type="button"
                onClick={props.onToggleFavorito}
                aria-label={receita.favoritada ? 'Desfavoritar' : 'Favoritar'}
                className={`flex-none text-2xl ${receita.favoritada ? 'text-[#f43f5e]' : 'text-content-dim'}`}
              >
                {receita.favoritada ? '♥' : '♡'}
              </button>
            )}
          </div>
          {receita.subtitulo && <p className="mb-3 text-sm text-content-low">{receita.subtitulo}</p>}

          <div className="mb-4 flex flex-wrap gap-2">
            <span
              className="rounded-pill px-3 py-1 text-micro font-bold"
              style={{ backgroundColor: `${receita.corTema}22`, color: receita.corTema }}
            >
              {CATEGORIA_META[receita.categoria].rotulo}
            </span>
            <span className="rounded-pill bg-surface-2 px-3 py-1 text-micro font-semibold text-content-mid">
              {receita.macros.calorias} kcal
            </span>
            <span className="rounded-pill bg-surface-2 px-3 py-1 text-micro font-semibold text-content-mid">
              {receita.macros.proteina}g prot
            </span>
            <span className="rounded-pill bg-surface-2 px-3 py-1 text-micro font-semibold text-content-mid">
              {receita.macros.carboidrato}g carb
            </span>
            {receita.tempoPreparoMin != null && (
              <span className="rounded-pill bg-surface-2 px-3 py-1 text-micro font-semibold text-content-mid">
                ⏱ {receita.tempoPreparoMin}min
              </span>
            )}
          </div>

          {receita.bloqueada ? (
            <div className="rounded-2xl border border-surface-4 bg-surface-2 p-6 text-center">
              <div className="mb-2 text-3xl">🔒</div>
              <p className="mb-4 text-sm text-content-mid">
                Essa receita é exclusiva pra assinantes ATHOSlife.
              </p>
              <button
                type="button"
                onClick={props.onIrParaPlano}
                className="rounded-pill bg-brand px-5 py-2.5 text-sm font-bold text-[#04120a]"
              >
                Ver planos
              </button>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              {receita.conteudo ? (
                formatarConteudo(receita.conteudo).map((bloco, i) => (
                  <div key={i}>
                    {bloco.rotulo && (
                      <div className="mb-1 text-micro font-extrabold uppercase tracking-wide text-brand">
                        {bloco.rotulo}
                      </div>
                    )}
                    <div className="whitespace-pre-line text-sm leading-relaxed text-content-hi">
                      {bloco.texto}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-content-low">Conteúdo dessa receita ainda não foi cadastrado.</p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
