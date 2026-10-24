import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'
import { cozinhaService } from '@domain/services/cozinhaService'
import { receitasQueFechamODia } from '@domain/rules/cozinha'
import { temaDoMomento } from '@domain/rules/temasSazonais'
import { localidadeAtual } from '@data/localidadeAtual'
import { CATEGORIAS_RECEITA, CATEGORIA_META, type CategoriaReceita, type Receita, type ReceitaCriada } from '@domain/entities/receita'
import type { Macros } from '@domain/entities/food'
import type { Profile } from '@domain/entities/profile'
import { CardReceita } from './CardReceita'
import { CategoryIcon } from './CategoryIcon'

/** Alterna o favorito no servidor e devolve a lista atualizada. */
export async function alternarFavorito(lista: Receita[], r: Receita): Promise<Receita[]> {
  if (r.favoritada) await cozinhaService.desfavoritar(r.id)
  else await cozinhaService.favoritar(r.id)
  return lista.map((x) => (x.id === r.id ? { ...x, favoritada: !x.favoritada } : x))
}

/**
 * Cozinha ATHOS embutida na Dieta (spec: COZINHA_DIRECTIVE.md): receitas
 * que cabem no que falta do dia, a vitrine por
 * categoria e as criações salvas. Bloqueio premium já vem pronto de
 * `cozinhaService.listar()` — a UI não decide acesso.
 */
export function CozinhaSecao(props: {
  profile: Pick<Profile, 'plano' | 'trialExpira'>
  /** O que falta do dia (só faz sentido olhando Hoje). null = não sugerir. */
  restante: Macros | null
}) {
  const { m } = useI18n()
  const t = m.cozinha
  const navigate = useNavigate()
  const [receitas, setReceitas] = useState<Receita[] | null>(null)
  const [erro, setErro] = useState(false)
  const [criacoes, setCriacoes] = useState<ReceitaCriada[]>([])
  const [filtro, setFiltro] = useState<CategoriaReceita | 'todos'>('todos')

  function carregar() {
    setErro(false)
    setReceitas(null)
    void cozinhaService
      .listar(props.profile)
      .then(setReceitas)
      .catch((e) => {
        console.error('cozinha listar falhou:', e)
        setErro(true)
      })
    // Antes da migração v2 a tabela não existe — a fileira só não aparece.
    void cozinhaService.listarCriacoes().then(setCriacoes).catch(() => setCriacoes([]))
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const abrir = (id: string) => navigate(`/dieta/cozinha/${id}`)
  const favoritar = (r: Receita) =>
    receitas && void alternarFavorito(receitas, r).then(setReceitas).catch((e) => console.error('favoritar falhou:', e))

  // Época de festa: expositor com as receitas marcadas pro tema (natal, páscoa...).
  const tema = temaDoMomento(new Date(), localidadeAtual().pais)
  const tematicas = tema && receitas ? receitas.filter((r) => r.temas.includes(tema)) : []
  const sugestoes = receitas && props.restante ? receitasQueFechamODia(receitas, props.restante) : []
  // Sugestões e expositor já aparecem acima: o catálogo não repete as mesmas (relatório do APK).
  const sugeridas = new Set([...sugestoes, ...tematicas].map((r) => r.id))
  const filtradas = receitas
    ? (filtro === 'todos' ? receitas : receitas.filter((r) => r.categoria === filtro)).filter((r) => !sugeridas.has(r.id))
    : []

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-base font-bold text-content-hi">{t.titulo}</h2>
        <button type="button" onClick={() => navigate('/dieta/cozinha')} className="-mr-2 min-h-11 px-2 text-sm font-bold text-brand active:opacity-70">
          {t.verTodas} ›
        </button>
      </div>


      {receitas === null && !erro && <p className="py-6 text-center text-micro text-content-low">{t.carregando}</p>}
      {erro && (
        <div className="py-6 text-center">
          <p className="mb-2 text-micro text-content-low">{t.erroCarregar}</p>
          <button type="button" onClick={carregar} className="min-h-11 px-3 text-sm font-bold text-brand active:opacity-70">{t.tentarDeNovo}</button>
        </div>
      )}

      {tema && tematicas.length > 0 && (
        <div className="rounded-2xl border border-accent-gold/40 bg-accent-gold/10 p-3">
          <h3 className="px-1 text-sm font-bold text-content-hi">{t.temas[tema].titulo}</h3>
          <p className="mb-2 px-1 text-micro text-content-mid">{t.temas[tema].sub}</p>
          <div className="flex gap-3 overflow-x-auto sem-barra pb-1">
            {tematicas.map((r) => (
              <CardReceita key={r.id} receita={r} onAbrir={() => abrir(r.id)} onFavoritar={() => favoritar(r)} />
            ))}
          </div>
        </div>
      )}

      {sugestoes.length > 0 && props.restante && (
        <div>
          <h3 className="px-1 text-sm font-bold text-content-hi">{t.fechamDia}</h3>
          <p className="mb-2 px-1 text-micro text-content-low">
            {t.fechamDiaSub(Math.round(props.restante.calorias), Math.round(props.restante.proteina))}
          </p>
          <div className="flex gap-3 overflow-x-auto sem-barra pb-1">
            {sugestoes.map((r) => (
              <CardReceita key={r.id} receita={r} onAbrir={() => abrir(r.id)} onFavoritar={() => favoritar(r)} />
            ))}
          </div>
        </div>
      )}

      {receitas && receitas.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto sem-barra pb-1">
            <Chip ativo={filtro === 'todos'} onClick={() => setFiltro('todos')}>{t.todas}</Chip>
            {CATEGORIAS_RECEITA.map((cat) => (
              <Chip key={cat} ativo={filtro === cat} cor={CATEGORIA_META[cat].cor} onClick={() => setFiltro(cat)}>
                <span className="inline-flex items-center gap-2"><CategoryIcon categoria={cat} />{t.categorias[cat]}</span>
              </Chip>
            ))}
          </div>
          <div className="flex gap-3 overflow-x-auto sem-barra pb-1">
            {filtradas.map((r) => (
              <CardReceita key={r.id} receita={r} onAbrir={() => abrir(r.id)} onFavoritar={() => favoritar(r)} />
            ))}
          </div>
        </div>
      )}

      {criacoes.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 text-sm font-bold text-content-hi">{t.minhasCriacoes}</h3>
          <div className="flex gap-3 overflow-x-auto sem-barra pb-1">
            {criacoes.map((c) => (
              <CardCriacao key={c.id} criacao={c} onAbrir={() => navigate(`/dieta/cozinha/criacao/${c.id}`)} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export function Chip(props: { ativo: boolean; cor?: string; onClick: () => void; children: ReactNode }) {
  const cor = props.cor
  return (
    <button
      type="button"
      onClick={props.onClick}
      aria-pressed={props.ativo}
      className={`min-h-11 flex-none rounded-pill px-4 text-sm font-bold transition-colors active:scale-95 ${
        props.ativo ? (cor ? '' : 'bg-brand text-brand-ink') : 'border border-surface-4 bg-surface-2 text-content-mid'
      }`}
      style={props.ativo && cor ? { backgroundColor: cor, color: '#04120a' } : !props.ativo && cor ? { color: cor } : undefined}
    >
      {props.children}
    </button>
  )
}

export function CardCriacao(props: { criacao: ReceitaCriada; onAbrir: () => void; largo?: boolean }) {
  const { m } = useI18n()
  const t = m.cozinha
  const { criacao } = props
  return (
    <button
      type="button"
      onClick={props.onAbrir}
      className={`flex-none overflow-hidden rounded-2xl border border-surface-4 bg-surface-2 text-left active:scale-[0.98] ${props.largo ? 'w-full' : 'w-40'}`}
    >
      <div className="relative flex h-24 items-center justify-center bg-gradient-to-br from-brand/20 to-transparent">
        {criacao.fotoUrl ? (
          <img src={criacao.fotoUrl} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <img src="/life/chef.webp" alt="" className="h-20 w-auto" draggable={false} />
        )}
        {criacao.feitaEm && (
          <span className="absolute left-2 top-2 rounded-pill bg-black/60 px-2 py-0.5 text-micro font-bold text-white">
            ✓ {t.feita}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="mb-1.5 line-clamp-2 min-h-[2.4em] text-micro font-bold leading-snug text-content-hi">{criacao.receita.titulo}</div>
        <span className="rounded-pill bg-brand/15 px-2 py-0.5 text-micro font-bold text-brand">
          {criacao.receita.macros.calorias} {t.kcal}
        </span>
      </div>
    </button>
  )
}
