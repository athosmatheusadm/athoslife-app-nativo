import { lerComandoPeso, type ComandoPeso } from '../../../../supabase/functions/_shared/pesoComando'
import { pesoRepository } from '@data/repositories/pesoRepository'
import { profileRepository } from '@data/repositories/profileRepository'
import { valeTentarRede } from '@data/offline/conexao'
import { formatarPeso } from '@domain/entities/weight'
import { dataDeISO, dataLocalISO } from '@domain/rules/datas'
import type { Mensagens } from '@/i18n/mensagens/tipo'

/**
 * Peso contado ao Life no chat, resolvido no próprio app (mesmo leitor de
 * frases do servidor, em supabase/functions/_shared/pesoComando.ts):
 *  - só um número ("82", "80 kg") → o Life pergunta antes de anotar;
 *  - sem internet → anota/consulta pela cópia local e a fila sobe depois.
 * Com rede, os outros comandos seguem pro servidor (que também não gasta
 * mensagem nem IA).
 */
export { lerComandoPeso, type ComandoPeso }

export function resolverNoApp(cmd: ComandoPeso | null): boolean {
  return cmd !== null && (cmd.tipo === 'confirmar' || !valeTentarRede())
}

const dia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

/** Executa o comando com os repositórios (funciona offline). Devolve a resposta do Life. */
export async function executarPesoNoApp(cmd: ComandoPeso, t: Mensagens['lifeChat']['peso']): Promise<string> {
  const linhas = await pesoRepository.linhas()
  const ultima = linhas[linhas.length - 1] ?? null
  const semRede = valeTentarRede() ? '' : ` ${t.offline}`

  switch (cmd.tipo) {
    case 'confirmar':
      return t.confirmar(formatarPeso(cmd.kg))
    case 'registrar':
      await pesoRepository.registrar(cmd.kg)
      return t.anotado(formatarPeso(cmd.kg)) + semRede
    case 'variar': {
      if (!ultima) return t.semBase
      const kg = Math.round((Number(ultima.peso_kg) + cmd.deltaKg) * 10) / 10
      await pesoRepository.registrar(kg)
      return t.anotado(formatarPeso(kg)) + semRede
    }
    case 'corrigir':
      // Corrige a última pesagem; sem nenhuma, vale como a de hoje.
      if (ultima && ultima.data !== dataLocalISO()) {
        await pesoRepository.excluir(dataDeISO(ultima.data))
      }
      await pesoRepository.registrar(cmd.kg)
      return t.corrigido(formatarPeso(cmd.kg)) + semRede
    case 'meta': {
      await profileRepository.atualizarObjetivoPeso(
        ultima ? (cmd.kg < Number(ultima.peso_kg) - 0.5 ? 'emagrecer' : cmd.kg > Number(ultima.peso_kg) + 0.5 ? 'massa' : 'manter') : null,
        cmd.kg,
      )
      return t.metaNova(formatarPeso(cmd.kg)) + semRede
    }
    case 'apagar':
      if (!ultima) return t.semHistorico
      await pesoRepository.excluir(dataDeISO(ultima.data))
      return t.apagado(dia(ultima.data), formatarPeso(Number(ultima.peso_kg))) + semRede
    case 'historico':
      if (linhas.length === 0) return t.semHistorico
      return `${t.historico}\n${linhas
        .slice(-8)
        .map((p) => `• ${dia(p.data)} · ${formatarPeso(Number(p.peso_kg))} kg`)
        .join('\n')}`
  }
}
