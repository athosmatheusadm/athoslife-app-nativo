import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { localidadeAtual } from '@data/localidadeAtual'
import { aguaRepository } from '@data/repositories/aguaRepository'
import { itensRefeicaoRepository } from '@data/repositories/itensRefeicaoRepository'
import { pesoRepository } from '@data/repositories/pesoRepository'
import { profileRepository } from '@data/repositories/profileRepository'
import { refeicoesRepository } from '@data/repositories/refeicoesRepository'
import { treinoHistoricoRepository } from '@data/repositories/treinoHistoricoRepository'
import { treinoPlanoRepository } from '@data/repositories/treinoPlanoRepository'
import { dataLocalISO } from '@domain/rules/datas'
import {
  normalizarConfig,
  planejarLembretes,
  type ConfigLembretes,
  type FeitoHoje,
  type TipoLembrete,
  type TipoRefeicaoLembrete,
} from '@domain/rules/lembretesDiarios'
import { ptBR } from '@/i18n/mensagens/pt-BR'
import { en } from '@/i18n/mensagens/en'
import { es } from '@/i18n/mensagens/es'
import type { Mensagens } from '@/i18n/mensagens/tipo'

/**
 * Agenda no aparelho os lembretes do dia calculados em
 * domain/rules/lembretesDiarios.ts. A configuração mora neste aparelho
 * (Preferences), igual aos lembretes de hábito: o aviso é local, então quem
 * manda é o aparelho. Acordar/dormir também vão pro perfil, pro servidor.
 *
 * Faixa de ids própria (920000–929999): o replanejamento apaga só os
 * daqui — o aviso do descanso do treino (910001) e os de hábito ficam.
 */
const CHAVE = 'athoslife:lembretes-diarios'
const ID_BASE = 920_000
const ID_FIM = 930_000

const DICIONARIOS: Record<string, Mensagens> = { 'pt-BR': ptBR, en, es }

const ROTA: Record<TipoLembrete, string> = {
  agua: '/home',
  cafe: '/dieta',
  almoco: '/dieta',
  lanche: '/dieta',
  jantar: '/dieta',
  treino: '/treinos',
  pesagem: '/home',
}

export const nativo = Capacitor.isNativePlatform()

export async function lerConfigLembretes(): Promise<ConfigLembretes> {
  try {
    const { value } = await Preferences.get({ key: CHAVE })
    return normalizarConfig(value ? JSON.parse(value) : null)
  } catch {
    return normalizarConfig(null)
  }
}

export async function salvarConfigLembretes(config: ConfigLembretes): Promise<void> {
  await Preferences.set({ key: CHAVE, value: JSON.stringify(config) })
  // Espelho no perfil: best-effort, o aviso local não depende disso.
  void profileRepository
    .atualizarRotinaLembretes({
      acordar: config.acordar,
      dormir: config.dormir,
      lembreteAgua: config.ligado && config.agua.ligado,
      lembreteTreino: config.ligado && config.treino.ligado,
    })
    .catch(() => {})
}

/** Pede a permissão do SO (Android 13+ pergunta; antes disso já vem liberada). */
export async function pedirPermissaoLembretes(): Promise<boolean> {
  if (!nativo) return false
  const status = await LocalNotifications.checkPermissions()
  if (status.display === 'granted') return true
  const pedido = await LocalNotifications.requestPermissions()
  return pedido.display === 'granted'
}

/** O que já foi feito hoje. Sem rede: trata como "não feito" (avisar a mais é melhor que calar). */
async function feitoHoje(metaAguaMl: number): Promise<FeitoHoje> {
  const hoje = new Date()
  const [agua, porTipo, status, treinou, concluiu, pesos] = await Promise.allSettled([
    aguaRepository.aguaDoDia(metaAguaMl),
    refeicoesRepository.doDia(),
    itensRefeicaoRepository.statusDoDia(hoje),
    treinoHistoricoRepository.treinouHoje(),
    treinoPlanoRepository.concluiuAlgoHoje(),
    pesoRepository.historico(),
  ])

  const refeicoes = new Set<TipoRefeicaoLembrete>()
  const fixo = (t: string): t is TipoRefeicaoLembrete => t === 'cafe' || t === 'almoco' || t === 'lanche' || t === 'jantar'
  if (porTipo.status === 'fulfilled') for (const r of porTipo.value) if (r.kcal > 0 && fixo(r.tipo)) refeicoes.add(r.tipo)
  if (status.status === 'fulfilled') for (const [tipo, ok] of status.value) if (ok) refeicoes.add(tipo)

  const limitePeso = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 2)
  const ultimoPeso = pesos.status === 'fulfilled' ? pesos.value[pesos.value.length - 1] : undefined

  return {
    aguaMetaBatida: agua.status === 'fulfilled' && metaAguaMl > 0 && agua.value.totalMl >= metaAguaMl,
    refeicoes,
    treino: (treinou.status === 'fulfilled' && treinou.value) || (concluiu.status === 'fulfilled' && concluiu.value),
    pesouRecente: !!ultimoPeso && ultimoPeso.data.getTime() >= limitePeso.getTime(),
  }
}

/** Mesma frase o dia todo pra cada tipo, mas muda de um dia pro outro. */
function escolherTexto(lista: readonly string[], quando: Date, indice: number): string {
  const dia = dataLocalISO(quando)
  let h = indice
  for (let i = 0; i < dia.length; i++) h = (h * 31 + dia.charCodeAt(i)) | 0
  return lista[Math.abs(h) % lista.length] ?? lista[0] ?? ''
}

async function cancelarTodos(): Promise<void> {
  const { notifications } = await LocalNotifications.getPending()
  const nossos = notifications.filter((n) => n.id >= ID_BASE && n.id < ID_FIM).map((n) => ({ id: n.id }))
  if (nossos.length > 0) await LocalNotifications.cancel({ notifications: nossos })
}

async function replanejarAgora(metaAguaMl: number): Promise<void> {
  const config = await lerConfigLembretes()
  await cancelarTodos()
  if (!config.ligado) return
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return

  const [feito, dias] = await Promise.all([
    feitoHoje(metaAguaMl),
    treinoPlanoRepository.diasComExercicio().catch(() => new Set<never>()),
  ])
  const planejados = planejarLembretes({ config, feitoHoje: feito, diasComTreino: dias, agora: new Date() })
  if (planejados.length === 0) return

  const m = DICIONARIOS[localidadeAtual().idioma] ?? ptBR
  // Água repete várias vezes no dia: cada horário pega uma frase diferente.
  const contagem = new Map<TipoLembrete, number>()
  await LocalNotifications.schedule({
    notifications: planejados.map((p, i) => {
      const n = contagem.get(p.tipo) ?? 0
      contagem.set(p.tipo, n + 1)
      return {
        id: ID_BASE + i,
        title: m.lembretes.titulo,
        body: escolherTexto(m.lembretes.textos[p.tipo], p.quando, n),
        schedule: { at: p.quando, allowWhileIdle: true },
        extra: { rota: ROTA[p.tipo] },
      }
    }),
  })
}

let fila: Promise<void> = Promise.resolve()

/**
 * Refaz a lista inteira. Chamado ao abrir/voltar pro app, ao mudar a
 * configuração e depois de qualquer registro do dia. Em fila: dois
 * replanejamentos ao mesmo tempo apagariam os avisos um do outro.
 */
export function replanejarLembretes(metaAguaMl: number): Promise<void> {
  if (!nativo) return Promise.resolve()
  fila = fila.then(() => replanejarAgora(metaAguaMl)).catch((e: unknown) => {
    console.warn('lembretes do dia: replanejamento falhou', e)
  })
  return fila
}
