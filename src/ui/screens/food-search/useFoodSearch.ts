import { useEffect, useRef, useState } from 'react'
import { alimentosRepository } from '@data/repositories/alimentosRepository'
import type { AlimentoBase } from '@domain/entities/food'

interface UseFoodSearchResult {
  readonly termo: string
  readonly setTermo: (t: string) => void
  readonly resultados: readonly AlimentoBase[]
  readonly buscando: boolean
  readonly erro: string | null
}

/**
 * Busca de alimentos com debounce.
 *
 * Debounce (espera 300ms depois da última tecla) evita disparar uma query
 * a cada letra digitada — economiza banco e deixa a digitação fluida.
 */
export function useFoodSearch(): UseFoodSearchResult {
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<readonly AlimentoBase[]>([])
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)

    const t = termo.trim()
    if (t.length < 2) {
      setResultados([])
      setBuscando(false)
      return
    }

    setBuscando(true)
    timer.current = setTimeout(() => {
      void alimentosRepository
        .buscar(t)
        .then((lista) => {
          setResultados(lista)
          setErro(null)
        })
        .catch(() => setErro('Não consegui buscar agora. Tenta de novo.'))
        .finally(() => setBuscando(false))
    }, 300)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [termo])

  return { termo, setTermo, resultados, buscando, erro }
}
