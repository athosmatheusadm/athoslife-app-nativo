import { assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { tabelaDoPais } from './tabelaNutricional.ts'

Deno.test('cada país usa a tabela oficial dele', () => {
  assertStringIncludes(tabelaDoPais('BR'), 'TACO')
  assertStringIncludes(tabelaDoPais('US'), 'USDA')
  assertStringIncludes(tabelaDoPais('pt'), 'INSA')
  assertStringIncludes(tabelaDoPais('GB'), 'CoFID')
  assertStringIncludes(tabelaDoPais('ES'), 'BEDCA')
  assertStringIncludes(tabelaDoPais('FR'), 'Ciqual')
  assertStringIncludes(tabelaDoPais('IN'), 'IFCT')
  assertStringIncludes(tabelaDoPais('MX'), 'SMAE')
})

Deno.test('sem país: pt-BR fica na TACO, outro idioma não presume Brasil', () => {
  assertStringIncludes(tabelaDoPais(null, 'pt-BR'), 'TACO')
  assertStringIncludes(tabelaDoPais(null, 'pt-PT'), 'INSA')
  assertStringIncludes(tabelaDoPais(null, 'en'), 'nacional')
  assertEquals(tabelaDoPais('KE'), tabelaDoPais('XX'))
})
