// Testes das regras do Life adaptativo (funções puras). Rodar: deno test -A supabase/functions/ai-proxy/life.test.ts
import { deepStrictEqual as igual, ok } from 'node:assert'
import {
  blocoMemoria, blocoPadroes, diasFirme, escolherAbertura, estiloDaPessoa, extrairMarcasMemoria, memoriaPermitida,
  respostaCheckinPadrao, resumoCheckin, validarCheckin, type DadosAbertura,
} from './life.ts'

Deno.test('marcas de memória saem do texto e viram lembranças', () => {
  const r = extrairMarcasMemoria('Boa! Prova de 10 km é demais 🏃\n[[LEMBRAR: evento | Prova de 10 km do bairro | 2026-10-20]]')
  igual(r.texto, 'Boa! Prova de 10 km é demais 🏃')
  igual(r.lembrar, [{ categoria: 'evento', texto: 'Prova de 10 km do bairro', data: '2026-10-20' }])
  const e = extrairMarcasMemoria('Pronto, esqueci. [[ESQUECER: coentro]]')
  igual([e.texto, e.esquecer], ['Pronto, esqueci.', ['coentro']])
})

Deno.test('marca com categoria inválida é descartada, mas some do texto', () => {
  const r = extrairMarcasMemoria('Ok [[LEMBRAR: senha | 1234]] [[LEMBRAR quebrada]]')
  igual(r.texto, 'Ok')
  igual(r.lembrar.length, 0)
})

Deno.test('no máximo 2 lembranças por resposta', () => {
  const r = extrairMarcasMemoria('[[LEMBRAR: gosto | a1 x]] [[LEMBRAR: gosto | a2 x]] [[LEMBRAR: gosto | a3 x]]')
  igual(r.lembrar.length, 2)
})

Deno.test('memória sensível não é guardada', () => {
  const m = (texto: string) => memoriaPermitida({ categoria: 'contexto', texto, data: null })
  ok(m('Gosta de treinar de manhã cedo'))
  ok(m('Tem uma filha de 3 anos'))
  ok(!m('Toma fluoxetina todo dia'))
  ok(!m('Tem diagnóstico de depressão'))
  ok(!m('É evangélica e vai à igreja'))
  ok(!m('Mora na Rua das Flores'))
  ok(!m('O CPF é 12345678900'))
  ok(!m('Está grávida de 3 meses'))
  ok(!m('Takes medication for anxiety'))
})

Deno.test('bloco de memória: desligada avisa o modelo para não prometer', () => {
  ok(blocoMemoria([], false).includes('desligada por esta pessoa'))
  ok(blocoMemoria([], null).includes('ainda não decidiu') && blocoMemoria([], null).includes('NUNCA diga que vai lembrar'))
  const b = blocoMemoria([{ texto: 'Prova de 10 km do bairro', categoria: 'evento', data_referencia: '2026-10-20', fixada: false }], true)
  ok(b.includes('- Prova de 10 km do bairro (data: 2026-10-20)'))
  igual(blocoPadroes([]), '')
})

Deno.test('jeito de falar: curto, sem emoji, com humor', () => {
  igual(estiloDaPessoa(['oi', 'tudo bem']), null) // poucas mensagens
  const curto = estiloDaPessoa(['oi', 'blz kkkk', 'treinei hj', 'tô cansado', 'kkkkk vdd', 'sim'])!
  ok(curto.includes('escreve curto') && curto.includes('evite emoji') && curto.includes('humor leve'), curto)
  const emoji = estiloDaPessoa(['bom dia ☀️', 'treino feito 💪', 'amei 😍', 'comi salada 🥗', 'boa noite 🌙'])!
  ok(emoji.includes('1 emoji combina'), emoji)
})

Deno.test('check-in: vocabulário fixo, energia vem do servidor, etiquetas filtradas', () => {
  const c = validarCheckin({ palavra: 'Ansioso', etiquetas: ['trabalho', 'trabalho', 'hackear'], nota: '  prova amanhã  ', energia: 4 }, 8)!
  igual([c.palavra, c.energia, c.agradavel, c.momento, c.etiquetas, c.nota], ['ansioso', 3, 2, 'manha', ['trabalho'], 'prova amanhã'])
  igual(validarCheckin({ palavra: 'em paz' }, 21)!.momento, 'noite')
  igual(validarCheckin({ palavra: 'em paz' }, 21)!.palavra, 'em_paz')
  igual(validarCheckin({ palavra: 'qualquer' }, 8), null)
  igual(resumoCheckin(c), 'Check-in da manhã: ansioso · trabalho ou estudo')
  igual(resumoCheckin(c, 'en'), 'Morning check-in: anxious · work or study')
})

Deno.test('resposta pronta do check-in combina com o sentimento', () => {
  const pesado = validarCheckin({ palavra: 'esgotado' }, 9)!
  ok(respostaCheckinPadrao(pesado, 'pt-BR').includes('Tô por aqui'))
  const bom = validarCheckin({ palavra: 'animado' }, 9)!
  ok(respostaCheckinPadrao(bom, 'pt-BR').includes('energia'))
  ok(respostaCheckinPadrao(bom, 'en').includes('energy'))
})

const base: DadosAbertura = {
  hoje: '2026-10-16', idioma: 'pt-BR', nome: 'Matheus Silva', pausadoHoje: false, puxarConversa: true, jaFalouHoje: false,
  motivosRecentes: [], eventos: [], habitos: [], agradavelUltimosDias: [], ultimaAtividade: '2026-10-15',
}

Deno.test('abertura: respeita pausa, preferência e uma por dia', () => {
  const ev = { ...base, eventos: [{ texto: 'Prova de 10 km do bairro', data: '2026-10-16' }] }
  ok(escolherAbertura(ev))
  igual(escolherAbertura({ ...ev, pausadoHoje: true }), null)
  igual(escolherAbertura({ ...ev, puxarConversa: false }), null)
  igual(escolherAbertura({ ...ev, jaFalouHoje: true }), null)
})

Deno.test('abertura: evento hoje, amanhã e "como foi?" no dia seguinte', () => {
  igual(escolherAbertura({ ...base, eventos: [{ texto: 'Prova de 10 km do bairro', data: '2026-10-16' }] })!.texto,
    'Hoje é o dia: prova de 10 km do bairro! Tô torcendo por você 🍀')
  ok(escolherAbertura({ ...base, eventos: [{ texto: 'Viagem para a praia', data: '2026-10-17' }] })!.texto.startsWith('Amanhã é o dia: viagem'))
  const depois = escolherAbertura({ ...base, eventos: [{ texto: 'Prova de 10 km do bairro', data: '2026-10-15' }] })!
  igual(depois.texto, 'E aí, como foi ontem (prova de 10 km do bairro)? Quero saber!')
  igual(escolherAbertura({ ...base, eventos: [{ texto: 'Prova de 10 km do bairro', data: '2026-10-15' }], motivosRecentes: [{ motivo: depois.motivo, dia: '2026-10-16' }], jaFalouHoje: false }), null)
})

Deno.test('abertura: marco de hábito, dias pesados e volta depois de sumiço', () => {
  ok(escolherAbertura({ ...base, habitos: [{ nome: 'Sem doce', dias: 30 }] })!.texto.startsWith('30 dias firme em "Sem doce"'))
  igual(escolherAbertura({ ...base, habitos: [{ nome: 'Sem doce', dias: 31 }] }), null)
  const pesado = escolherAbertura({ ...base, agradavelUltimosDias: [{ data: '2026-10-15', agradavel: 1 }, { data: '2026-10-16', agradavel: 2 }] })!
  igual(pesado.motivo, 'pesado')
  igual(escolherAbertura({ ...base, agradavelUltimosDias: [{ data: '2026-10-15', agradavel: 1 }, { data: '2026-10-16', agradavel: 4 }] }), null)
  igual(escolherAbertura({ ...base, ultimaAtividade: '2026-10-10' })!.texto, 'Matheus, que bom te ver por aqui! Sem cobrança: bora começar leve hoje?')
  igual(escolherAbertura({ ...base, ultimaAtividade: '2026-10-10', motivosRecentes: [{ motivo: 'voltou', dia: '2026-10-12' }] }), null)
})

Deno.test('dias firmes: mesma regra do contexto do Life', () => {
  igual(diasFirme({ nome: 'Ler', categoria: 'leitura', streak_atual: 14, ultimo_checkin: '2026-10-15', criado_em: '2026-09-01T00:00:00Z', ultima_recaida: null }, '2026-10-16'), 14)
  igual(diasFirme({ nome: 'Ler', categoria: 'leitura', streak_atual: 14, ultimo_checkin: '2026-10-10', criado_em: '2026-09-01T00:00:00Z', ultima_recaida: null }, '2026-10-16'), 0)
  igual(diasFirme({ nome: 'Doce', categoria: 'doce', streak_atual: 0, ultimo_checkin: null, criado_em: '2026-09-01T00:00:00Z', ultima_recaida: '2026-09-16T10:00:00Z' }, '2026-10-16'), 30)
})
