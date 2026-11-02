import { useEffect, useState } from 'react'

/**
 * O Life cozinhando (vídeo do dono, 27/10) — a espera enquanto a IA olha a
 * foto, busca o código de barras ou estima um alimento.
 *
 * O vídeo tem fundo preto (tirar o preto apagava a frigideira e o rabo,
 * que também são quase pretos), então ele fica num quadro arredondado.
 * Sem som, em loop; com "reduzir movimento" fica o 1º quadro parado.
 */
export function LifeCozinhando({ className = 'h-36' }: { className?: string }) {
  const [parado] = useState(() => {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  })
  const [falhou, setFalhou] = useState(false)
  // Alguns WebViews ignoram o autoPlay depois de trocar de tela: insiste uma vez.
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  useEffect(() => {
    if (video && !parado) void video.play().catch(() => undefined)
  }, [video, parado])

  const caixa = `aspect-[420/380] flex-none overflow-hidden rounded-3xl bg-black ${className}`
  if (parado || falhou) return <img src="/life/cozinhando.jpg" alt="" aria-hidden="true" className={`${caixa} object-cover`} />
  return (
    <video
      ref={setVideo}
      src="/life/cozinhando.mp4"
      poster="/life/cozinhando.jpg"
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      aria-hidden="true"
      onError={() => setFalhou(true)}
      className={`${caixa} object-cover`}
    />
  )
}
