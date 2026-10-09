import { useI18n } from '@/i18n/I18nProvider'
import { CATEGORIA_META, type Receita } from '@domain/entities/receita'
import { estruturarConteudo } from '@domain/rules/cozinha'
import { FotoReceita } from './CardReceita'
import { ReceitaView } from './ReceitaView'
import { CabecalhoCozinha } from './CabecalhoCozinha'

/**
 * "Tela da receita" (spec: COZINHA_DIRECTIVE.md). O `conteudo` é texto
 * livre — `estruturarConteudo` separa sobre o prato, ingredientes, preparo, montagem e Dica do Life
 * pra tela ter checklist e porções. Nunca chega aqui com `conteudo` de uma
 * receita bloqueada: quem decide isso é o servidor (RPC) + `cozinhaService`.
 */
export function ReceitaDetalheScreen(props: {
  receita: Receita | null
  carregando: boolean
  onVoltar: () => void
  onToggleFavorito: () => void
  onIrParaPlano: () => void
}) {
  const { m } = useI18n()
  const t = m.cozinha
  const { receita, carregando } = props

  return (
    <main className="min-h-full pb-24 pt-safe-t">
      <CabecalhoCozinha titulo={t.titulo} onVoltar={props.onVoltar} />

      {carregando && <p className="px-4 py-10 text-center text-micro text-content-low">{t.carregando}</p>}
      {!carregando && !receita && <p className="px-4 py-10 text-center text-micro text-content-low">{t.naoEncontrada}</p>}

      {receita && (receita.bloqueada || !receita.conteudo) && (
        <div className="px-4">
          <FotoReceita receita={receita} className="mb-4 h-44 rounded-2xl" emojiClassName="text-6xl" />
          <h2 className="mb-1 text-xl font-bold text-content-hi">{receita.titulo}</h2>
          {receita.subtitulo && <p className="mb-4 text-sm text-content-low">{receita.subtitulo}</p>}
          {receita.bloqueada ? (
            <div className="rounded-2xl border border-surface-4 bg-surface-2 p-6 text-center">
              <div className="mb-2 text-3xl">🔒</div>
              <p className="mb-4 text-sm text-content-mid">{t.exclusivo}</p>
              <button
                type="button"
                onClick={props.onIrParaPlano}
                className="rounded-pill bg-brand px-5 py-2.5 text-sm font-bold text-brand-ink"
              >
                {t.verPlanos}
              </button>
            </div>
          ) : (
            <p className="text-sm text-content-low">{t.conteudoVazio}</p>
          )}
        </div>
      )}

      {receita && !receita.bloqueada && receita.conteudo && (
        <ReceitaView
          titulo={receita.titulo}
          subtitulo={receita.subtitulo}
          corTema={receita.corTema}
          capa={<FotoReceita receita={receita} className="mb-4 h-48 rounded-2xl" emojiClassName="text-6xl" />}
          acaoTitulo={
            <button
              type="button"
              onClick={props.onToggleFavorito}
              aria-label={receita.favoritada ? t.desfavoritar : t.favoritar}
              aria-pressed={receita.favoritada}
              className={`flex-none text-2xl ${receita.favoritada ? 'text-[#f43f5e]' : 'text-content-dim'}`}
            >
              {receita.favoritada ? '♥' : '♡'}
            </button>
          }
          selos={
            <span
              className="rounded-pill px-3 py-1 text-micro font-bold"
              style={{ backgroundColor: `${receita.corTema}22`, color: receita.corTema }}
            >
              {CATEGORIA_META[receita.categoria].emoji} {t.categorias[receita.categoria]}
            </span>
          }
          macrosPorPorcao={receita.macros}
          tempoMin={receita.tempoPreparoMin}
          estrutura={estruturarConteudo(receita.conteudo)}
        />
      )}
    </main>
  )
}
