import { useEffect, useRef } from 'react'

/**
 * Pilha de "camadas" abertas por cima da tela (sheet, modal, busca dentro do
 * sheet). O botão Voltar do Android fecha a de cima antes de navegar — sem
 * isso, na Dieta (tela raiz) o Voltar minimizava o app com o sheet aberto.
 * useAndroidBackButton consulta isto primeiro.
 */
const pilha: { fechar: () => void }[] = []

/** Fecha a camada de cima. Devolve false se não tinha nenhuma aberta. */
export function fecharCamadaDoTopo(): boolean {
  const topo = pilha[pilha.length - 1]
  if (!topo) return false
  topo.fechar()
  return true
}

/**
 * Enquanto `aberto`, o Voltar chama `fechar`. Camadas abertas depois ficam
 * por cima (ex.: busca dentro do sheet fecha antes do sheet).
 */
export function useFecharNoVoltar(aberto: boolean, fechar: () => void): void {
  const ref = useRef(fechar)
  ref.current = fechar

  useEffect(() => {
    if (!aberto) return
    const camada = { fechar: () => ref.current() }
    pilha.push(camada)
    return () => {
      const i = pilha.lastIndexOf(camada)
      if (i !== -1) pilha.splice(i, 1)
    }
  }, [aberto])
}
