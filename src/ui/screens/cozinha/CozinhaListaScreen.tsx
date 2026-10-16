import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { useI18n } from '@/i18n/I18nProvider'
import { cozinhaService } from '@domain/services/cozinhaService'
import { CATEGORIAS_RECEITA, CATEGORIA_META, type CategoriaReceita, type Receita, type ReceitaCriada } from '@domain/entities/receita'
import { CabecalhoCozinha } from './CabecalhoCozinha'
import { CardReceita } from './CardReceita'
import { CategoryIcon } from './CategoryIcon'
import { CardCriacao, Chip, alternarFavorito } from './CozinhaSecao'

type Filtro = CategoriaReceita | 'todos' | 'favoritas' | 'criacoes'

/** "Ver todas" — a Cozinha inteira em grade, com favoritas e criações. */
export function CozinhaListaScreen() {
  const { m } = useI18n()
  const t = m.cozinha
  const navigate = useNavigate()
  const { profile } = useSession()
  const [receitas, setReceitas] = useState<Receita[] | null>(null)
  const [criacoes, setCriacoes] = useState<ReceitaCriada[]>([])
  const [erro, setErro] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todos')

  function carregar() {
    if (!profile) return
    setErro(false)
    setReceitas(null)
    void cozinhaService.listar(profile).then(setReceitas).catch(() => setErro(true))
    void cozinhaService.listarCriacoes().then(setCriacoes).catch(() => setCriacoes([]))
  }

  useEffect(() => {
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  if (!profile) return null

  const favoritar = (r: Receita) =>
    receitas && void alternarFavorito(receitas, r).then(setReceitas).catch((e) => console.error('favoritar falhou:', e))

  const lista =
    !receitas ? [] :
    filtro === 'todos' ? receitas :
    filtro === 'favoritas' ? receitas.filter((r) => r.favoritada) :
    filtro === 'criacoes' ? [] :
    receitas.filter((r) => r.categoria === filtro)

  return (
    <main className="min-h-full pb-24 pt-safe-t">
      <CabecalhoCozinha titulo={t.titulo} onVoltar={() => navigate(-1)} />

      <div className="flex gap-2 overflow-x-auto sem-barra px-4 pb-3">
        <Chip ativo={filtro === 'todos'} onClick={() => setFiltro('todos')}>{t.todas}</Chip>
        <Chip ativo={filtro === 'favoritas'} cor="#f43f5e" onClick={() => setFiltro('favoritas')}>♥ {t.favoritas}</Chip>
        {criacoes.length > 0 && (
          <Chip ativo={filtro === 'criacoes'} onClick={() => setFiltro('criacoes')}>👨‍🍳 {t.minhasCriacoes}</Chip>
        )}
        {CATEGORIAS_RECEITA.map((cat) => (
          <Chip key={cat} ativo={filtro === cat} cor={CATEGORIA_META[cat].cor} onClick={() => setFiltro(cat)}>
            <span className="inline-flex items-center gap-2"><CategoryIcon categoria={cat} />{t.categorias[cat]}</span>
          </Chip>
        ))}
      </div>

      <div className="px-4">
        {receitas === null && !erro && <p className="py-10 text-center text-micro text-content-low">{t.carregando}</p>}
        {erro && (
          <div className="py-10 text-center">
            <p className="mb-2 text-micro text-content-low">{t.erroCarregar}</p>
            <button type="button" onClick={carregar} className="text-micro font-bold text-brand">{t.tentarDeNovo}</button>
          </div>
        )}

        {filtro === 'criacoes' ? (
          criacoes.length === 0 ? (
            <p className="py-10 text-center text-micro text-content-low">{t.semCriacoes}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {criacoes.map((c) => (
                <CardCriacao key={c.id} criacao={c} largo onAbrir={() => navigate(`/dieta/cozinha/criacao/${c.id}`)} />
              ))}
            </div>
          )
        ) : (
          receitas && (
            lista.length === 0 ? (
              <p className="py-10 text-center text-micro text-content-low">{filtro === 'favoritas' ? t.semFavoritas : t.vazio}</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {lista.map((r) => (
                  <CardReceita key={r.id} receita={r} largo onAbrir={() => navigate(`/dieta/cozinha/${r.id}`)} onFavoritar={() => favoritar(r)} />
                ))}
              </div>
            )
          )
        )}
      </div>
    </main>
  )
}
