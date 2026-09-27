import { useCallback, useEffect, useState } from 'react'
import { aguaRepository } from '@data/repositories/aguaRepository'
import { widgetAgua } from '@data/native/widgetAgua'
import { dataLocalISO } from '@domain/rules/datas'
import { EVENTO_AGUA_MUDOU } from '@app/IntegracoesNativas'
import type { AguaDoDia } from '@domain/entities/water'

interface UseAguaResult {
  readonly estado: AguaDoDia | null
  readonly carregando: boolean
  readonly erro: string | null
  readonly adicionar: (ml: number) => Promise<void>
  readonly desfazerUltimo: () => Promise<void>
  readonly recarregar: () => Promise<void>
}

/**
 * Estado da água do dia para o card da Home.
 *
 * A meta vem de fora (do profile já carregado) para não duplicar leitura.
 * Usa atualização otimista: o número sobe na hora, e a gente reconcilia
 * com o servidor depois — card de água tem que responder instantâneo ao
 * toque, senão parece travado.
 */
export function useAgua(metaMl: number): UseAguaResult {
  const [estado, setEstado] = useState<AguaDoDia | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    try {
      setErro(null)
      const dia = await aguaRepository.aguaDoDia(metaMl)
      setEstado(dia)
      // Widget da tela inicial sempre com o mesmo número do app.
      void widgetAgua.atualizar({ data: dataLocalISO(), totalMl: dia.totalMl, metaMl })
    } catch {
      setErro('Não consegui carregar sua hidratação agora.')
    } finally {
      setCarregando(false)
    }
  }, [metaMl])

  useEffect(() => {
    void recarregar()
    // Copo tocado no widget e já gravado pelo IntegracoesNativas.
    const aoMudar = () => void recarregar()
    window.addEventListener(EVENTO_AGUA_MUDOU, aoMudar)
    return () => window.removeEventListener(EVENTO_AGUA_MUDOU, aoMudar)
  }, [recarregar])

  const adicionar = useCallback(
    async (ml: number) => {
      try {
        await aguaRepository.adicionar(ml)
        await recarregar()
      } catch {
        setErro('Não consegui registrar agora. Tenta de novo.')
      }
    },
    [recarregar],
  )

  const desfazerUltimo = useCallback(async () => {
    const ultimo = estado?.registros[0]
    if (!ultimo) return
    try {
      await aguaRepository.remover(ultimo.id)
      await recarregar()
    } catch {
      setErro('Não consegui desfazer agora.')
    }
  }, [estado, recarregar])

  return { estado, carregando, erro, adicionar, desfazerUltimo, recarregar }
}
