import { DESENHOS, DESENHOS_UI } from './phosphorDuotone'
import { useI18n } from '@/i18n/I18nProvider'
import { IDIOMAS } from '@domain/rules/localidade'

export type ActivityIconKey = keyof typeof DESENHOS
export type UiIconKey = keyof typeof DESENHOS_UI
const TODOS = { ...DESENHOS, ...DESENHOS_UI }
export function activityIconKey(valor?: string | null): ActivityIconKey | UiIconKey {
  return valor && Object.prototype.hasOwnProperty.call(TODOS, valor) ? valor as ActivityIconKey | UiIconKey : 'outro'
}

export function ActivityIcon({ icone, className = 'h-12 w-12', tile = true, cor = 'brand' }: {
  icone?: string | null
  className?: string
  tile?: boolean
  cor?: 'brand' | 'inherit'
}) {
  return <span aria-hidden="true" className={`inline-flex flex-none items-center justify-center ${cor === 'brand' ? 'text-brand' : ''} ${tile ? 'rounded-xl bg-brand/10 p-2.5' : ''} ${className}`}>
    {TODOS[activityIconKey(icone)]}
  </span>
}

/** Na ordem de IDIOMAS (pt-BR, en, es, fr). */
const NOMES: Record<ActivityIconKey, readonly [string, string, string, string]> = {
  cafe: ['Café', 'Breakfast', 'Desayuno', 'Petit-déj'], almoco: ['Almoço', 'Lunch', 'Almuerzo', 'Déjeuner'],
  lanche: ['Lanche', 'Snack', 'Merienda', 'Goûter'], jantar: ['Jantar', 'Dinner', 'Cena', 'Dîner'],
  colacao: ['Colação', 'Morning snack', 'Media mañana', 'Collation du matin'], pre_treino: ['Pré-treino', 'Pre-workout', 'Preentreno', 'Avant la séance'],
  pos_treino: ['Pós-treino', 'Post-workout', 'Postentreno', 'Après la séance'], ceia: ['Ceia', 'Late snack', 'Colación nocturna', 'Collation du soir'],
  cha: ['Chá', 'Tea', 'Té', 'Thé'], sanduiche: ['Sanduíche', 'Sandwich', 'Sándwich', 'Sandwich'], shake: ['Shake', 'Shake', 'Batido', 'Shake'],
  salada: ['Salada', 'Salad', 'Ensalada', 'Salade'], tigela: ['Tigela', 'Bowl', 'Bol', 'Bol'], ovos: ['Ovos', 'Eggs', 'Huevos', 'Œufs'],
  sobremesa: ['Sobremesa', 'Dessert', 'Postre', 'Dessert'], pao: ['Pão', 'Bread', 'Pan', 'Pain'],
  doce: ['Doce', 'Sweets', 'Dulces', 'Sucré'], fast_food: ['Fast food', 'Fast food', 'Comida rápida', 'Fast-food'],
  refrigerante: ['Refrigerante', 'Soda', 'Refresco', 'Soda'], leitura: ['Leitura', 'Reading', 'Lectura', 'Lecture'],
  agua: ['Água', 'Water', 'Agua', 'Eau'], sono: ['Sono', 'Sleep', 'Sueño', 'Sommeil'], meditar: ['Meditar', 'Meditation', 'Meditar', 'Méditation'],
  celular: ['Menos celular', 'Less screen time', 'Menos celular', 'Moins d’écran'], caminhar: ['Caminhar', 'Walking', 'Caminar', 'Marche'],
  verduras: ['Verduras', 'Vegetables', 'Verduras', 'Légumes'], outro: ['Outro', 'Other', 'Otro', 'Autre'],
}
export const MEAL_ICONS: readonly ActivityIconKey[] = ['colacao', 'pre_treino', 'pos_treino', 'ceia', 'cha', 'sanduiche', 'shake', 'salada', 'tigela', 'ovos', 'sobremesa', 'pao', 'cafe', 'almoco', 'lanche', 'jantar']
export const HABIT_ICONS: readonly ActivityIconKey[] = ['doce', 'fast_food', 'refrigerante', 'leitura', 'agua', 'sono', 'meditar', 'celular', 'caminhar', 'verduras', 'outro']

export function ActivityIconPicker({ valor, opcoes, onChange, disabled = false }: {
  valor: string
  opcoes: readonly ActivityIconKey[]
  onChange: (icone: ActivityIconKey) => void
  disabled?: boolean
}) {
  const { idioma } = useI18n()
  const indice = Math.max(0, IDIOMAS.indexOf(idioma))
  return <fieldset className="mt-4" disabled={disabled}>
    <legend className="text-micro font-bold uppercase tracking-wide text-content-low">{['Escolha o ícone', 'Choose an icon', 'Elige el icono', 'Choisis l’icône'][indice]}</legend>
    <div className="mt-2 grid grid-cols-4 gap-2">
      {opcoes.map((icone) => <button key={icone} type="button" aria-pressed={icone === valor} onClick={() => onChange(icone)}
        className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-1 text-center disabled:opacity-50 ${icone === valor ? 'border-brand bg-brand/10' : 'border-surface-4'}`}>
        <ActivityIcon icone={icone} className="h-9 w-9" tile={false} />
        <span className="text-micro text-content-mid">{NOMES[icone][indice]}</span>
      </button>)}
    </div>
  </fieldset>
}
