/**
 * Ícones de exercício em SVG — substituem os emojis.
 *
 * Por que SVG e não emoji: emoji renderiza diferente em cada aparelho, fica
 * infantil e a gente não controla a cor. SVG fica idêntico em todo lugar,
 * na cor da marca (verde), combinando com a estética da arte.
 *
 * Cada ícone é uma silhueta simples de traço. `chave` mapeia o tipo; se não
 * houver correspondência, usa um ícone genérico de halter.
 */

type Props = { chave?: string | null; className?: string }

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function Halter() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10" />
    </svg>
  )
}
function Flexao() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="5" cy="8" r="1.6" />
      <path d="M2 18h20M4 18l4-4h6l4 4M8 14l2-3h4" />
    </svg>
  )
}
function Agachamento() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="12" cy="5" r="1.8" />
      <path d="M12 7v5l-3 4M12 12l3 4M9 16h6M7 20h4M13 20h4" />
    </svg>
  )
}
function Prancha() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="4" cy="9" r="1.4" />
      <path d="M2 15h18M4 15l3-3h11M9 12v3M14 12v3" />
    </svg>
  )
}
function Abdomen() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <circle cx="7" cy="7" r="1.6" />
      <path d="M4 18l4-2 3-5M8 16h8a2 2 0 0 0 2-2M11 11l3 3" />
    </svg>
  )
}
function Peito() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M12 4v16M6 8c-2 0-3 2-3 4s1 4 3 4M18 8c2 0 3 2 3 4s-1 4-3 4" />
    </svg>
  )
}
function Costas() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M12 3v18M8 6l-4 3 4 3M16 6l4 3-4 3M9 20h6" />
    </svg>
  )
}
function Perna() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M9 3v7l-2 5 3 4M15 3v7l2 5-3 4M9 10h6" />
    </svg>
  )
}
function Biceps() {
  return (
    <svg viewBox="0 0 24 24" {...stroke}>
      <path d="M6 20v-6a4 4 0 0 1 4-4h2a3 3 0 0 0 3-3V4M6 14c3 0 5 1 6 3" />
    </svg>
  )
}

const MAPA: Record<string, () => JSX.Element> = {
  flexao: Flexao,
  agachamento: Agachamento,
  prancha: Prancha,
  abdominal: Abdomen,
  core: Abdomen,
  peito: Peito,
  costas: Costas,
  perna: Perna,
  biceps: Biceps,
  corpo: Halter,
}

export function ExerciseIcon({ chave, className }: Props) {
  const Icone = (chave && MAPA[chave]) || Halter
  return (
    <span className={className}>
      <Icone />
    </span>
  )
}

/** Adivinha a chave do ícone a partir do nome do exercício. */
export function chaveIconePorNome(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('flex')) return 'flexao'
  if (n.includes('agacha')) return 'agachamento'
  if (n.includes('prancha')) return 'prancha'
  if (n.includes('abdom') || n.includes('supra')) return 'abdominal'
  if (n.includes('supino') || n.includes('crucifixo') || n.includes('cross')) return 'peito'
  if (n.includes('remada') || n.includes('puxada') || n.includes('costas')) return 'costas'
  if (n.includes('rosca') || n.includes('biceps') || n.includes('bíceps')) return 'biceps'
  if (n.includes('agacha') || n.includes('leg') || n.includes('perna') || n.includes('afundo')) return 'perna'
  return 'corpo'
}
