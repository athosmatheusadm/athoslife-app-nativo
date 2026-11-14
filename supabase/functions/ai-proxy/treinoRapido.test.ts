// Testes do treino de uma parte do corpo. Rodar: deno test -A supabase/functions/ai-proxy/treinoRapido.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { escolherTreinoRapido, lerParte, listar, QTD_NORMAL, QTD_RAPIDO, TETO_SERIES, TXT_PARTE, type ExercicioDoGrupo } from './treinoRapido.ts'

let n = 0
const ex = (nome: string, grupo: string, extra: Partial<ExercicioDoGrupo> = {}): ExercicioDoGrupo => ({
  id: String(++n), nome, grupo_muscular: grupo, nivel_minimo: 'iniciante', ordem: n, ambientes: ['academia'],
  series_padrao: 3, repeticoes_padrao: 12, medida: 'reps', segundos_padrao: null, traducoes: null, ...extra,
})
const CAT = [
  ex('Supino Reto com Barra', 'peito'),
  ex('Rosca Direta com Barra', 'bracos'),
  ex('Rosca Alternada com Halteres', 'bracos', { ambientes: ['academia', 'casa'] }),
  ex('Rosca Martelo', 'bracos', { ambientes: ['academia', 'casa'] }),
  ex('Rosca Scott', 'bracos'),
  ex('Tríceps na Polia', 'bracos'),
  ex('Tríceps Testa', 'bracos'),
  ex('Mergulho nas Paralelas', 'bracos', { nivel_minimo: 'intermediario' }),
  ex('Rosca Concentrada', 'bracos', { ambientes: ['academia', 'casa'] }),
  ex('Agachamento Livre', 'pernas'),
]
const nomes = (l: { nome: string }[]) => l.map((i) => i.nome)
const base = { local: 'academia' as const, nivel: 'iniciante' as const }

Deno.test('parte do corpo: do jeito que a pessoa fala, em vários idiomas', () => {
  igual(lerParte('bíceps'), 'biceps')
  igual(lerParte('treino só de bicepis'), 'biceps') // erro de digitação comum
  igual(lerParte('Biceps'), 'biceps')
  igual(lerParte('braço'), 'bracos')
  igual(lerParte('treino dos ombros'), 'ombro')
  igual(lerParte('perna'), 'pernas')
  igual(lerParte('legs'), 'pernas')
  igual(lerParte('espalda'), 'costas')
  igual(lerParte('dos'), 'costas')
  igual(lerParte('abdômen'), 'abdominal')
  igual(lerParte('glúteo'), 'gluteos')
  igual(lerParte(''), null)
  igual(lerParte('corpo todo'), null)
})

Deno.test('bíceps rápido: só rosca, 3 exercícios, nada de tríceps nem peito', () => {
  const r = escolherTreinoRapido(CAT, 'biceps', { ...base, rapido: true })
  igual(nomes(r), ['Rosca Direta com Barra', 'Rosca Alternada com Halteres', 'Rosca Martelo'])
  igual(r.length, QTD_RAPIDO)
  ok(r.every((i) => i.series.every((s) => s.carga_kg === null)), 'carga nunca')
})

Deno.test('sem "rápido": 4 exercícios e o total de séries fica no teto', () => {
  const r = escolherTreinoRapido(CAT, 'biceps', { ...base, rapido: false })
  igual(r.length, QTD_NORMAL)
  igual(r.map((i) => i.series.length), [3, 3, 2, 2])
  ok(r.reduce((t, i) => t + i.series.length, 0) <= TETO_SERIES)
})

Deno.test('em casa só entra o que dá pra fazer em casa', () => {
  const r = escolherTreinoRapido(CAT, 'biceps', { local: 'casa', nivel: 'iniciante', rapido: false })
  igual(nomes(r), ['Rosca Alternada com Halteres', 'Rosca Martelo', 'Rosca Concentrada'])
})

Deno.test('nível: iniciante não recebe exercício de intermediário', () => {
  const ini = escolherTreinoRapido(CAT, 'triceps', { ...base, rapido: false })
  igual(nomes(ini), ['Tríceps na Polia', 'Tríceps Testa'])
  const inter = escolherTreinoRapido(CAT, 'triceps', { ...base, nivel: 'intermediario', rapido: false })
  ok(nomes(inter).includes('Mergulho nas Paralelas'))
})

Deno.test('braço inteiro alterna bíceps e tríceps', () => {
  const r = escolherTreinoRapido(CAT, 'bracos', { ...base, rapido: false })
  igual(nomes(r), ['Rosca Direta com Barra', 'Tríceps na Polia', 'Rosca Alternada com Halteres', 'Tríceps Testa'])
})

Deno.test('pula o que já está na ficha do dia; "outra opção" troca a seleção', () => {
  const ja = new Set([CAT[1].id])
  igual(nomes(escolherTreinoRapido(CAT, 'biceps', { ...base, rapido: true, jaNoDia: ja }))[0], 'Rosca Alternada com Halteres')
  const a = nomes(escolherTreinoRapido(CAT, 'biceps', { ...base, rapido: true }))
  const b = nomes(escolherTreinoRapido(CAT, 'biceps', { ...base, rapido: true, variante: 2 }))
  ok(a.join() !== b.join())
  igual(new Set(b).size, b.length)
  igual(escolherTreinoRapido(CAT, 'panturrilha', { ...base, rapido: true }), [])
})

Deno.test('a fala só tem nomes: nada de séries, repetições ou carga em número', () => {
  for (const idioma of ['pt-BR', 'en', 'es', 'fr', 'hi'] as const) {
    const fala = TXT_PARTE[idioma].confira('bíceps', listar(['Rosca Direta', 'Rosca Martelo', 'Rosca Scott'], idioma), 'sábado', 'da academia', true)
    ok(!/\d/.test(fala), `${idioma}: ${fala}`)
    ok(fala.includes('Rosca Martelo'))
  }
})
