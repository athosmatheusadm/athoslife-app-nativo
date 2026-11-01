// Testes da memória em camadas (funções puras). Rodar: deno test -A supabase/functions/ai-proxy/memoria.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import { blocoMemoriaCamadas, PEDE_LEMBRANCAS, promptExtracao, validarOps, valeExtrair } from './memoria.ts'
import { memoriaPermitida } from './life.ts'

const HOJE = '2026-11-01'

Deno.test('extração: o teste de 31/10 vira várias memórias de uma vez', () => {
  const ops = validarOps({ ops: [
    { faz: 'criar', nivel: 'fato', categoria: 'gosto', chave: 'comida.nao_gosta.atum', texto: 'Não gosta de atum', importancia: 3 },
    { faz: 'corrigir', nivel: 'fato', categoria: 'rotina', chave: 'rotina.curso_dias', texto: 'Curso quarta e sexta à noite; chega 22h com uns 10 min' },
    { faz: 'criar', nivel: 'evento', categoria: 'evento', chave: 'evento.frustracao_servico', texto: 'Dia frustrante no serviço', data_referencia: '2026-10-31', estado: 'aberto', retomar_em: '2026-11-02' },
    { faz: 'criar', nivel: 'contexto', categoria: 'contexto', chave: 'contexto.servico_puxado', texto: 'Fase puxada no serviço' },
    { faz: 'criar', nivel: 'fragmento', categoria: 'fragmento', chave: 'fragmento.esforco_infinito', texto: "Chamou o que sente de 'sensação de esforço infinito'" },
    { faz: 'criar', nivel: 'estilo', categoria: 'estilo', chave: 'estilo.registro', texto: 'Informal, frases curtas', confianca: 0.6 },
  ] }, HOJE)
  igual(ops.length, 6)
  igual(ops[2].estado, 'aberto')
  igual(ops[3].expira_em, '2026-11-08') // contexto sem prazo ganha 7 dias
})

Deno.test('extração: barra o que não pode e o que vem torto', () => {
  const ops = validarOps({ ops: [
    { faz: 'criar', nivel: 'fato', categoria: 'gosto', chave: 'x', texto: 'Toma sertralina toda manhã' },
    { faz: 'criar', nivel: 'fato', categoria: 'contexto', chave: 'contato.email', texto: 'Email é fulano@x.com' },
    { faz: 'criar', nivel: 'fato', categoria: 'inventada', texto: 'Algo' },
    { faz: 'apagar_tudo', chave: 'a.b' },
    { faz: 'criar', nivel: 'evento', categoria: 'evento', chave: 'evento.prova', texto: 'Prova', data_referencia: '31/10' },
    { faz: 'criar', nivel: 'fragmento', categoria: 'fragmento', texto: 'Momento um marcante' },
    { faz: 'criar', nivel: 'fragmento', categoria: 'fragmento', texto: 'Momento dois marcante' },
    { faz: 'fechar', chave: 'Evento.Prova_10km' },
  ] }, HOJE)
  igual(ops.map((o) => o.faz + ':' + (o.texto ?? o.chave)), [
    'criar:Prova', 'criar:Momento um marcante', 'fechar:evento.prova_10km',
  ])
  igual(ops[0].data_referencia, HOJE) // data torta → hoje (evento precisa de data)
  igual(validarOps('lixo', HOJE), [])
  igual(validarOps({ ops: 'x' }, HOJE), [])
})

Deno.test('filtro: palavra solta passa, dado de contato não', () => {
  ok(memoriaPermitida({ categoria: 'rotina', texto: 'Corre na rua de manhã', data: null }))
  ok(memoriaPermitida({ categoria: 'rotina', texto: 'Manda email pro chefe cedo', data: null }))
  ok(!memoriaPermitida({ categoria: 'contexto', texto: 'Meu endereço é perto do centro', data: null }))
})

Deno.test('quando vale extrair e quando pede tudo', () => {
  ok(!valeExtrair('sim'))
  ok(!valeExtrair('kkkkkkkkkkkkk'))
  ok(valeExtrair('Não gosto de atum, viu'))
  ok(PEDE_LEMBRANCAS.test('o que voce lembra da minha rotina'))
  ok(PEDE_LEMBRANCAS.test('what do you remember about me'))
  ok(!PEDE_LEMBRANCAS.test('lembra de beber agua'))
})

Deno.test('bloco por camada: núcleo sempre, evento com quando, regra do "lembra"', () => {
  const b = blocoMemoriaCamadas([
    { texto: 'Trabalha das 8h às 17h', categoria: 'rotina', data_referencia: null, fixada: false, nivel: 'nucleo' },
    { texto: 'Não gosta de atum', categoria: 'gosto', data_referencia: null, fixada: false, nivel: 'fato' },
    { texto: 'Prova de 10 km', categoria: 'evento', data_referencia: '2026-11-02', fixada: false, nivel: 'evento' },
    { texto: 'Dia frustrante no serviço', categoria: 'evento', data_referencia: '2026-10-31', fixada: false, nivel: 'evento', estado: 'aberto' },
    { texto: 'Fixada pela pessoa', categoria: 'gosto', data_referencia: null, fixada: true, nivel: 'fato' },
  ], HOJE, true)
  ok(b.includes('QUEM ELA É') && b.indexOf('Fixada pela pessoa') < b.indexOf('FATOS'))
  ok(b.includes('Prova de 10 km (amanhã)'))
  ok(b.includes('(ontem) — ficou em aberto'))
  ok(b.includes('Ela perguntou o que você lembra'))
  ok(blocoMemoriaCamadas([], HOJE, false).includes('(nada ainda)'))
})

Deno.test('prompt da extração leva o guardado e a conversa', () => {
  const p = promptExtracao({
    agora: 'Agora: domingo, 01/11/2026 15:30 (America/Sao_Paulo).',
    guardadas: [{ chave: 'rotina.curso_dias', nivel: 'fato', texto: 'Curso terça e quinta' }],
    troca: [{ autor: 'usuario', texto: 'Te passei errado, o curso é quarta e sexta' }],
  })
  ok(p.includes('rotina.curso_dias | fato | Curso terça e quinta'))
  ok(p.includes('PESSOA: Te passei errado'))
})

Deno.test('lembrança que já passou: aniversário e "há X"', () => {
  const b = blocoMemoriaCamadas([
    { texto: 'Fim de semana no resort com a família', categoria: 'evento', data_referencia: '2025-11-01', fixada: false, nivel: 'evento', estado: 'fechado' },
    { texto: 'Formatura da irmã', categoria: 'evento', data_referencia: '2026-10-01', fixada: false, nivel: 'evento', estado: 'fechado' },
  ], HOJE, false)
  ok(b.includes('LEMBRANÇAS QUE JÁ PASSARAM'))
  ok(b.includes('resort com a família (faz 1 ano por estes dias)'), b)
  ok(b.includes('Formatura da irmã (há 31 dias)'), b)
  ok(!b.includes('EVENTOS:'))
})

Deno.test('prompt da extração explica importância de evento', () => {
  const p = promptExtracao({ agora: 'Agora: x', guardadas: [], troca: [] })
  ok(p.includes('3 = marcante') && p.includes('1 = passageiro'))
})
