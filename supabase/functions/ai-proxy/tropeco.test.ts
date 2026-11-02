// Testes do tropeço pelo chat. Rodar: deno test -A supabase/functions/ai-proxy/tropeco.test.ts
import { deepStrictEqual as igual } from 'node:assert'
import { acharHabito, lerHora } from './tropeco.ts'

const doce = { id: '1', nome: 'Parar com doce', categoria: 'doce' }
const refri = { id: '2', nome: 'Menos refrigerante', categoria: 'refrigerante' }

Deno.test('acha o hábito pelo nome, pela categoria ou por ser o único', () => {
  igual(acharHabito('doce', [doce, refri])?.id, '1')
  igual(acharHabito('Parar com doce', [doce, refri])?.id, '1')
  igual(acharHabito('refrigerante', [doce, refri])?.id, '2')
  igual(acharHabito('', [doce])?.id, '1') // só um: é ele
  igual(acharHabito('cigarro', [doce, refri]), null) // nenhum: pergunta
  igual(acharHabito('', [doce, refri]), null) // ambíguo: pergunta
  igual(acharHabito('doce', []), null)
})

Deno.test('hora: HH:MM ou 15h; o resto vira null', () => {
  igual(lerHora('15:30'), '15:30')
  igual(lerHora('9:05'), '09:05')
  igual(lerHora('15h'), '15:00')
  igual(lerHora('15h20'), '15:20')
  igual(lerHora('25:00'), null)
  igual(lerHora('de tarde'), null)
  igual(lerHora(''), null)
})
