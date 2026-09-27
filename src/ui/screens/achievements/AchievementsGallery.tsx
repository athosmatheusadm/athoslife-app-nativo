import { useState } from 'react'
import {
  corCategoria,
  corNivel,
  resumoAcervo,
  type CategoriaConquista,
  type Conquista,
} from '@domain/entities/conquista'

const NOME_NIVEL: Record<Conquista['nivel'], string> = {
  bronze: 'Bronze',
  prata: 'Prata',
  ouro: 'Ouro',
  diamante: 'Diamante',
  lendario: 'Lendário',
}

const NOME_CATEGORIA: Record<CategoriaConquista, string> = {
  streak: 'Sequência',
  treino: 'Treino',
  dieta: 'Dieta',
  hidratacao: 'Hidratação',
  peso: 'Peso',
}

/**
 * Acervo de conquistas — a galeria que abre da gaveta lateral.
 *
 * Mostra tudo: desbloqueadas (coloridas) e bloqueadas (apagadas, com o que
 * falta). Agrupado por categoria. É o lugar de CONSULTAR — a celebração já
 * aconteceu na hora (Life dourado). Aqui a pessoa revisita o que conquistou.
 */
export function AchievementsGallery({
  conquistas,
  onVoltar,
}: {
  conquistas: readonly Conquista[]
  onVoltar: () => void
}) {
  const { desbloqueadas, total } = resumoAcervo(conquistas)

  const categorias = Array.from(
    new Set(conquistas.map((c) => c.categoria)),
  ) as CategoriaConquista[]

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={onVoltar} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-content-hi">
            🏆 Conquistas
          </h1>
          <p className="text-micro text-content-low">
            {desbloqueadas} de {total} desbloqueadas
          </p>
        </div>
      </header>

      {/* Barra de progresso geral */}
      <div className="mx-4 mb-5 mt-2">
        <div className="h-2 overflow-hidden rounded-full bg-surface-4">
          <div
            className="h-full rounded-full bg-accent-gold transition-all duration-500 ease-athos"
            style={{ width: `${total ? (desbloqueadas / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {categorias.map((cat) => {
        const doGrupo = conquistas.filter((c) => c.categoria === cat)
        return (
          <section key={cat} className="mb-5">
            <h2 className="mb-2 px-4 text-micro font-bold uppercase tracking-wide text-content-dim">
              {NOME_CATEGORIA[cat]}
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

  return (
    <button
      type="button"
      onClick={() => setAberto((v) => !v)}
      aria-expanded={aberto}
      className={`relative flex flex-col items-center rounded-2xl border p-3 text-center transition-colors ${
        c.desbloqueada ? 'border-surface-4 bg-surface-2' : 'border-surface-4/50 bg-surface-1'
      } ${aberto ? 'col-span-3' : ''}`}
    >
      {c.desbloqueada && (
        <span
          className="absolute right-2 top-2 h-2 w-2 rounded-full"
          style={{ backgroundColor: corNivel(c.nivel) }}
          aria-label={`Nível ${c.nivel}`}
          title={c.nivel}
        />
      )}
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full text-2xl ${
          c.desbloqueada ? '' : 'grayscale'
        }`}
        style={c.desbloqueada ? { backgroundColor: `${cor}22` } : { backgroundColor: '#1a1a1a' }}
      >
        {c.desbloqueada ? c.icone : '🔒'}
      </span>
      <span
        className={`mt-1.5 text-[11px] font-semibold leading-tight ${
          c.desbloqueada ? 'text-content-hi' : 'text-content-dim'
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
            Nível {NOME_NIVEL[c.nivel]}
          </p>
          {c.desbloqueada && c.desbloqueadaEm ? (
            <p className="mt-1 text-micro text-content-dim">
              Desbloqueada em{' '}
              {c.desbloqueadaEm.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          ) : (
            <>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-4">
                <div className="h-full rounded-full" style={{ width: `${c.progresso}%`, backgroundColor: cor }} />
              </div>
              <p className="mt-1 text-micro text-content-dim">{c.progresso}% completo</p>
            </>
          )}
        </div>
      )}
    </button>
  )
}
