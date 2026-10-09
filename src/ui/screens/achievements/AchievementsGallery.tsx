import { useState } from 'react'
import {
  corCategoria,
  corNivel,
  resumoAcervo,
  type CategoriaConquista,
  type Conquista,
} from '@domain/entities/conquista'
import { LifeMascote } from '@ui/components/LifeMascote'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'


/**
 * Acervo de conquistas — a galeria que abre da gaveta lateral.
 *
 * Mostra tudo: desbloqueadas (coloridas) e bloqueadas (apagadas, com o que
 * falta). Agrupado por categoria. É o lugar de CONSULTAR — a celebração já
 * aconteceu na hora (Life dourado). Aqui a pessoa revisita o que conquistou.
 */
export function AchievementsGallery({
  conquistas,
  estado,
  onVoltar,
}: {
  conquistas: readonly Conquista[]
  estado: 'carregando' | 'ok' | 'erro'
  onVoltar: () => void
}) {
  const { desbloqueadas, total } = resumoAcervo(conquistas)
  const t = useI18n().m.perfil.conquistas

  const categorias = Array.from(
    new Set(conquistas.map((c) => c.categoria)),
  ) as CategoriaConquista[]

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina
        titulo={t.titulo}
        subtitulo={estado === 'ok' ? t.progresso(desbloqueadas, total) : undefined}
        onVoltar={onVoltar}
        direita={<LifeMascote humor="conquista" alt="" className="h-20 flex-none" />}
      />

      {estado === 'carregando' && <p className="py-10 text-center text-micro text-content-low">{t.carregando}</p>}
      {estado === 'erro' && <p className="mx-4 rounded-xl bg-surface-2 p-4 text-center text-sm text-content-mid">{t.erro}</p>}

      {/* Barra de progresso geral */}
      {estado === 'ok' && (
        <div className="mx-4 mb-5 mt-2">
          <div className="h-2 overflow-hidden rounded-full bg-surface-4">
            <div
              className="h-full w-full origin-left rounded-full bg-accent-gold transition-transform duration-500 ease-athos"
              style={{ transform: `scaleX(${total ? desbloqueadas / total : 0})` }}
            />
          </div>
        </div>
      )}

      {categorias.map((cat) => {
        const doGrupo = conquistas.filter((c) => c.categoria === cat)
        return (
          <section key={cat} className="mb-5">
            <h2 className="mb-2 px-4 text-micro font-bold uppercase tracking-wide text-content-low">
              {t.categorias[cat]}
            </h2>
            <div className="grid grid-cols-3 gap-3 px-4">
              {doGrupo.map((c) => (
                <ConquistaCell key={c.id} conquista={c} />
              ))}
            </div>
          </section>
        )
      })}
    </main>
  )
}

/**
 * Toca pra expandir — só visualização (descrição completa, nível por
 * extenso, e data de desbloqueio ou % de progresso), nada clicável dentro.
 * A célula cresce dentro da própria grade (grid-auto-rows acomoda),
 * sem sair pra um sheet — pedido do usuário, mais simples de bater o olho.
 */
function ConquistaCell({ conquista: c }: { conquista: Conquista }) {
  const cor = corCategoria(c.categoria)
  const [aberto, setAberto] = useState(false)
  const { m, idioma } = useI18n()
  const t = m.perfil.conquistas

  return (
    <button
      type="button"
      onClick={() => setAberto((v) => !v)}
      aria-expanded={aberto}
      aria-label={c.desbloqueada ? c.titulo : `${c.titulo} — ${t.bloqueada}`}
      className={`relative flex min-h-28 flex-col items-center rounded-2xl border p-3 text-center transition-colors active:scale-[0.98] ${
        c.desbloqueada ? 'border-surface-4 bg-surface-2' : 'border-surface-4/50 bg-surface-1'
      } ${aberto ? 'col-span-3' : ''}`}
    >
      {c.desbloqueada && (
        <span
          className="absolute right-2 top-2 h-2 w-2 rounded-full"
          style={{ backgroundColor: corNivel(c.nivel) }}
          aria-hidden="true"
        />
      )}
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
          c.desbloqueada ? '' : 'grayscale'
        }`}
        style={c.desbloqueada ? { backgroundColor: `${cor}22` } : undefined}
        aria-hidden="true"
      >
        {c.desbloqueada ? c.icone : '🔒'}
      </span>
      <span
        className={`mt-1.5 text-micro font-semibold leading-tight ${
          c.desbloqueada ? 'text-content-hi' : 'text-content-low'
        }`}
      >
        {c.titulo}
      </span>
      {!c.desbloqueada && !aberto && c.progresso > 0 && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-4">
          <div className="h-full rounded-full" style={{ width: `${c.progresso}%`, backgroundColor: cor }} />
        </div>
      )}

      {aberto && (
        <div className="mt-2 w-full border-t border-surface-4/50 pt-2 text-left">
          <p className="text-micro leading-snug text-content-mid">{c.descricao}</p>
          <p className="mt-1.5 text-micro font-semibold" style={{ color: corNivel(c.nivel) }}>
            {t.nivel(t.niveis[c.nivel])}
          </p>
          {c.desbloqueada && c.desbloqueadaEm ? (
            <p className="mt-1 text-micro text-content-low">
              {t.desbloqueadaEm(c.desbloqueadaEm.toLocaleDateString(idioma, { day: '2-digit', month: 'long', year: 'numeric' }))}
            </p>
          ) : (
            <>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-4">
                <div className="h-full rounded-full" style={{ width: `${c.progresso}%`, backgroundColor: cor }} />
              </div>
              <p className="mt-1 text-micro text-content-low">{t.completo(c.progresso)}</p>
            </>
          )}
        </div>
      )}
    </button>
  )
}
