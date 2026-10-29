import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'
import { pesoRepository } from '@data/repositories/pesoRepository'
import { normalizarIdioma } from '@domain/rules/localidade'
import { localidadeAtualDoAparelho, useI18n } from '@/i18n/I18nProvider'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { paraDadosOnboarding, type RespostasNovo } from './onboarding/respostasNovo'

/**
 * Onboarding definitivo (aprovado pelo dono em 29/10/2026): o HTML dele,
 * em public/onboarding/, roda inteiro num iframe — CSS, Life vivo e
 * animações como ele fez. Esta tela só conversa com a página (ponte.js):
 * passa idioma/unidades/nome, troca o idioma do app quando a pessoa troca
 * na órbita e, no "Concluir e entrar no app", grava tudo e abre a Home.
 *
 * `previa`: rota /previa/onboarding (só no `npm run dev`): sem conta, não
 * grava nada; no fim recarrega a página.
 */

/** Fundo da página do onboarding (--ob-bg do HTML do dono): emenda com a barra de status. */
const FUNDO_ONBOARDING = '#12191d'

type MensagemPagina =
  | { origem: 'athos-onboarding'; tipo: 'pronto' | 'sair' }
  | { origem: 'athos-onboarding'; tipo: 'idioma'; idioma: string }
  | { origem: 'athos-onboarding'; tipo: 'concluir'; dados: RespostasNovo }

export function OnboardingNovo({ previa = false }: { previa?: boolean } = {}) {
  const { profile, refresh } = useSession()
  const { m, idioma, trocarIdioma } = useI18n()
  const navigate = useNavigate()
  const frame = useRef<HTMLIFrameElement>(null)
  const salvando = useRef(false)

  // O endereço da página não muda depois de aberta (trocar recarregaria tudo).
  const src = useRef(
    (() => {
      const q = new URLSearchParams({ idioma, unidades: localidadeAtualDoAparelho().unidades === 'imperial' ? 'imperial' : 'metric' })
      if (!previa && profile?.nome) q.set('nome', profile.nome)
      return `/onboarding/index.html?${q.toString()}`
    })(),
  ).current

  const enviar = (msg: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(msg, location.origin)

  // Voltar do Android volta uma tela dentro do onboarding.
  useFecharNoVoltar(true, () => enviar({ tipo: 'voltar' }))

  // Lê sempre o valor atual (idioma muda durante o onboarding).
  const atual = useRef({ idioma, m, refresh })
  atual.current = { idioma, m, refresh }

  useEffect(() => {
    async function concluir(respostas: RespostasNovo) {
      if (salvando.current) return
      const { idioma: idiomaAgora, m: textos } = atual.current
      const dados = paraDadosOnboarding(respostas, { ...localidadeAtualDoAparelho(), idioma: idiomaAgora })
      if (!dados) {
        enviar({ tipo: 'erro', texto: textos.onboarding.voce.erroIdade })
        return
      }
      if (previa) {
        console.info('[onboarding prévia] respostas', dados)
        frame.current?.contentWindow?.location.reload()
        return
      }
      salvando.current = true
      enviar({ tipo: 'salvando', texto: textos.onboarding.confirmar.salvando })
      try {
        await profileRepository.concluirOnboarding(dados)
        // Primeiro ponto do gráfico de peso da Home.
        await pesoRepository.registrar(dados.pesoKg).catch(() => {})
        await atual.current.refresh()
        navigate('/home', { replace: true })
      } catch (err) {
        console.error('onboarding: falhou ao salvar', err)
        salvando.current = false
        const semRede =
          !navigator.onLine || err instanceof TypeError || /failed to fetch|network/i.test(String((err as { message?: string })?.message ?? ''))
        enviar({ tipo: 'erro', texto: semRede ? textos.onboarding.confirmar.erroSalvar : textos.onboarding.confirmar.erroServidor })
      }
    }

    function receber(e: MessageEvent) {
      if (e.origin !== location.origin || e.source !== frame.current?.contentWindow) return
      const msg = e.data as MensagemPagina
      if (!msg || msg.origem !== 'athos-onboarding') return
      if (msg.tipo === 'idioma') trocarIdioma(normalizarIdioma(msg.idioma))
      else if (msg.tipo === 'concluir') void concluir(msg.dados)
    }
    window.addEventListener('message', receber)
    return () => window.removeEventListener('message', receber)
  }, [navigate, previa, trocarIdioma])

  return (
    <main className="fixed inset-0 flex flex-col pb-safe-b pt-safe-t" style={{ background: FUNDO_ONBOARDING }}>
      <iframe ref={frame} src={src} title="ATHOSlife" className="w-full flex-1 border-0" />
    </main>
  )
}
