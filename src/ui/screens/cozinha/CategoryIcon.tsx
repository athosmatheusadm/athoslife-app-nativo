import type { CategoriaReceita } from '@domain/entities/receita'
import { ActivityIcon, type ActivityIconKey } from '@ui/components/ActivityIcon'

const ICONES: Record<CategoriaReceita, ActivityIconKey> = {
  emagrecimento: 'salada',
  massa: 'pos_treino',
  vegano: 'verduras',
  habitos: 'doce',
  shakes: 'shake',
  chas: 'cha',
}

/** Mesmo duotone das refeições; nos filtros, acompanha a cor do rótulo. */
export function CategoryIcon({ categoria, grande = false }: { categoria: CategoriaReceita; grande?: boolean }) {
  return <ActivityIcon icone={ICONES[categoria]} tile={false} cor={grande ? 'brand' : 'inherit'} className={grande ? 'h-16 w-16' : 'h-5 w-5'} />
}
