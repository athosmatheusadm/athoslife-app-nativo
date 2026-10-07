import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nProvider'
import { cozinhaService } from '@domain/services/cozinhaService'
import { estruturarGerada } from '@domain/rules/cozinha'
import type { ReceitaCriada } from '@domain/entities/receita'
import { capturarFoto, type OrigemFoto } from '@data/ai/photoCapture'
import { CabecalhoCozinha } from './CabecalhoCozinha'
import { ReceitaView } from './ReceitaView'

/**
 * Uma receita de "Minhas criações". Aqui a pessoa diz "Fiz!" e põe a foto
 * do prato (bucket privado, só ela vê), ou exclui a criação.
 */
export function CriacaoScreen() {
  const { m } = useI18n()
  const t = m.cozinha
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [criacao, setCriacao] = useState<ReceitaCriada | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [escolhendo, setEscolhendo] = useState(false)
  const [estadoFoto, setEstadoFoto] = useState<'parado' | 'enviando' | 'ok' | 'erro'>('parado')

  useEffect(() => {
    if (!id) return
    let ativo = true
    void cozinhaService
      .buscarCriacao(id)
      .then((c) => ativo && setCriacao(c))
      .catch(() => ativo && setCriacao(null))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [id])

  async function porFoto(origem: OrigemFoto) {
    if (!criacao) return
    setEscolhendo(false)
    const foto = await capturarFoto(origem)
    if (!foto) return
    setEstadoFoto('enviando')
    try {
      const url = await cozinhaService.definirFotoCriacao(criacao.id, foto)
      setCriacao({ ...criacao, fotoUrl: url ?? foto.dataUrl, feitaEm: new Date() })
      setEstadoFoto('ok')
    } catch (e) {
      console.error('foto da criação falhou:', e)
      setEstadoFoto('erro')
    }
  }

  async function excluir() {
    if (!criacao || !window.confirm(t.confirmarExcluir)) return
    try {
      await cozinhaService.excluirCriacao(criacao.id)
      navigate(-1)
    } catch (e) {
      console.error('excluir criação falhou:', e)
    }
  }

  const r = criacao?.receita

  return (
    <main className="min-h-full pb-24 pt-safe-t">
      <CabecalhoCozinha
        titulo={t.minhasCriacoes}
        onVoltar={() => navigate(-1)}
        direita={
          criacao && (
            <button type="button" onClick={() => void excluir()} className="text-micro font-bold text-[#f43f5e]">
              {t.excluir}
            </button>
          )
        }
      />

      {carregando && <p className="px-4 py-10 text-center text-micro text-content-low">{t.carregando}</p>}
      {!carregando && !criacao && <p className="px-4 py-10 text-center text-micro text-content-low">{t.naoEncontrada}</p>}

      {criacao && r && (
        <ReceitaView
          titulo={r.titulo}
          subtitulo={r.subtitulo || null}
          corTema="#22c55e"
          capa={
            criacao.fotoUrl ? (
              <div className="relative mb-4 overflow-hidden rounded-2xl">
                <img src={criacao.fotoUrl} alt={r.titulo} className="h-56 w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-pill bg-black/60 px-2.5 py-1 text-micro font-bold text-white">
                  ✓ {t.feita}
                </span>
              </div>
            ) : (
              <div className="mb-4 flex h-40 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/20 to-transparent">
                <img src="/life/chef.webp" alt="" className="h-32 w-auto" draggable={false} />
              </div>
            )
          }
          selos={<span className="rounded-pill bg-brand/15 px-3 py-1 text-micro font-bold text-brand">👨‍🍳 {t.criadaPeloLife}</span>}
          macrosPorPorcao={r.macros}
          tempoMin={r.tempoMin}
          estrutura={estruturarGerada(r)}
          aviso={t.aproximado}
          acoes={
            <>
              {estadoFoto === 'enviando' && <p className="text-center text-micro text-content-low">{t.enviandoFoto}</p>}
              {estadoFoto === 'ok' && <p className="text-center text-micro font-bold text-brand">{t.fotoGuardada}</p>}
              {estadoFoto === 'erro' && <p className="text-center text-micro text-[#f43f5e]">{t.erroFoto}</p>}
              {escolhendo ? (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => void porFoto('camera')} className="rounded-pill bg-brand py-3 text-sm font-bold text-[#04120a]">
                    📷 {t.tirarFoto}
                  </button>
                  <button type="button" onClick={() => void porFoto('galeria')} className="rounded-pill border border-brand py-3 text-sm font-bold text-brand">
                    🖼 {t.galeria}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={estadoFoto === 'enviando'}
                  onClick={() => setEscolhendo(true)}
                  className="w-full rounded-pill border border-brand py-3 text-sm font-bold text-brand disabled:opacity-60"
                >
                  📸 {criacao.fotoUrl ? t.trocarFoto : t.fizFoto}
                </button>
              )}
            </>
          }
        />
      )}
    </main>
  )
}
