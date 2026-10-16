export interface CopoWidget {
  id: string
  ml: number
  data: string
  em: number
}

/** Confirmar somente depois de persistir. Se uma etapa falhar, a fila restante
 * continua no Android; o id estável permite repetir o envio sem duplicar. */
export async function sincronizarCoposWidget(deps: {
  listar: () => Promise<CopoWidget[]>
  gravar: (copo: CopoWidget) => Promise<void>
  confirmar: (ids: string[]) => Promise<void>
}): Promise<number> {
  const copos = await deps.listar()
  let gravados = 0
  for (const copo of copos) {
    await deps.gravar(copo)
    await deps.confirmar([copo.id])
    gravados++
  }
  return gravados
}

export function rotaDoWidget(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.protocol !== 'athoslife:' || u.hostname !== 'abrir') return null
    return new Set(['/home', '/scanner', '/dieta', '/treinos', '/habitos']).has(u.pathname) ? u.pathname : null
  } catch { return null }
}
