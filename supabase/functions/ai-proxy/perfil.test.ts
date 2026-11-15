import { assert, assertEquals, assertStringIncludes } from 'jsr:@std/assert@1'
import { linhasPerfil, linhaTratamento } from './perfil.ts'

Deno.test('tratamento: homem, mulher e não informado', () => {
  assertStringIncludes(linhaTratamento('masculino'), 'homem')
  assertStringIncludes(linhaTratamento('masculino'), 'cansado')
  assertStringIncludes(linhaTratamento('feminino'), 'mulher')
  assertStringIncludes(linhaTratamento('feminino'), 'cansada')
  for (const s of ['prefiro_nao_dizer', 'outro', null, undefined, 'xyz']) {
    assertStringIncludes(linhaTratamento(s), 'não presuma')
  }
})

Deno.test('perfil completo do onboarding v2', () => {
  const l = linhasPerfil({
    sexo: 'feminino', idade: 31, altura_cm: 165, peso_meta: 60,
    onboarding_respostas: {
      versao: 2, objetivos: ['perder_gordura'], ao_acordar: 'cansado',
      frequencia_treino: '2-3x', locais_treino: ['academia', 'ar_livre'],
      refeicoes_por_dia: 'sem_rotina', onde_come: ['casa', 'restaurante'],
    },
  })
  const tudo = l.map((x) => x.t).join('\n')
  assertStringIncludes(tudo, 'mulher')
  assertStringIncludes(tudo, '31 anos')
  assertStringIncludes(tudo, 'quer: perder gordura')
  assertStringIncludes(tudo, 'como acorda: com cansaço')
  assertStringIncludes(tudo, 'altura 165 cm')
  assertStringIncludes(tudo, 'peso que quer chegar 60 kg')
  assertStringIncludes(tudo, 'treinava 2-3x por semana')
  assertStringIncludes(tudo, 'onde: academia, ar livre')
  assertStringIncludes(tudo, 'refeições sem horário certo')
  assertStringIncludes(tudo, 'come em casa, em restaurante')
  // sexo e "sobre a pessoa" vão em toda conversa; o resto só no assunto.
  assertEquals(l[0].a, null)
  assertEquals(l.find((x) => x.t.startsWith('Treino'))?.a, ['treino'])
  assertEquals(l.find((x) => x.t.startsWith('Corpo'))?.a, ['peso', 'comida'])
})

Deno.test('onboarding v1 (tipos de treino e rotina)', () => {
  const tudo = linhasPerfil({
    sexo: 'masculino', idade: '28',
    onboarding_respostas: { objetivos: ['ganhar_massa', 'melhorar_habitos'], tipos_treino: ['musculacao', 'cardio'], rotina: ['trabalho_estudo'] },
  }).map((x) => x.t).join('\n')
  assertStringIncludes(tudo, 'homem')
  assertStringIncludes(tudo, '28 anos')
  assertStringIncludes(tudo, 'ganhar massa, melhorar hábitos')
  assertStringIncludes(tudo, 'gosta de musculação, cardio')
  assertStringIncludes(tudo, 'rotina de trabalho/estudo')
})

Deno.test('objetivo "outro" usa o texto dela, limpo e curto', () => {
  const tudo = linhasPerfil({ onboarding_respostas: { objetivos: ['outro'], objetivo_texto: 'correr\na maratona "SP"' } })
    .map((x) => x.t).join('\n')
  assertStringIncludes(tudo, 'quer: correr a maratona SP')
  assert(!tudo.includes('\n a maratona'))
})

Deno.test('perfil vazio ou estranho: só a linha de tratamento neutra', () => {
  const l = linhasPerfil({ idade: 400, altura_cm: 'abc', peso_meta: -1, onboarding_respostas: 'lixo' })
  assertEquals(l.length, 1)
  assertStringIncludes(l[0].t, 'não presuma')
})
