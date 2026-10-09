import { useEffect, useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { habitosRepository } from '@data/repositories/habitosRepository'
import { profileRepository } from '@data/repositories/profileRepository'
import { cancelarLembrete } from '@data/notifications/habitReminders'
import type { Habito } from '@domain/entities/habito'
import { LifeMascote } from '@ui/components/LifeMascote'
import { useI18n } from '@/i18n/I18nProvider'
import { HabitsScreen } from './habits/HabitsScreen'
import { avisar, vibrar } from '@ui/feedback'

export function Habitos() {
  const { profile, refresh } = useSession()
  const { m } = useI18n()
  const [habitos, setHabitos] = useState<Habito[]>([])
  const [carregando, setCarregando] = useState(true)
  const autorizado = profile?.consentimentoHabitos ?? false

  function recarregar() {
    void habitosRepository
      .listar()
      .then(setHabitos)
      .catch(() => avisar.erro(m.habitos.erroSalvar))
      .finally(() => setCarregando(false))
  }

  useEffect(() => {
    if (autorizado) recarregar()
  }, [autorizado])

  if (!profile) return null

  // Consentimento de hábitos é opcional no aceite inicial — sem ele a tela
  // não abre (o banco também recusa criar hábito; ver validar_habito).
  if (!autorizado) return <PedirConsentimento onAutorizar={async () => {
    await profileRepository.definirConsentimentoHabitos(true)
    await refresh()
  }} m={m} />

  return (
    <HabitsScreen
      habitos={habitos}
      carregando={carregando}
      maiorStreak={profile.maiorStreak}
      insightIA={null}
      onRegistrarTropeco={(habitoId) => {
        void habitosRepository
          .registrarRecaida({ habitoId, gatilho: null, contexto: null })
          .then(() => {
            vibrar.leve()
            avisar.ok(m.habitos.tropecoOk)
            recarregar()
          })
          .catch(() => avisar.erro(m.habitos.erroSalvar))
      }}
      onRegistrarCheckin={(habitoId) => {
        const nome = habitos.find((h) => h.id === habitoId)?.nome ?? ''
        void habitosRepository
          .registrarCheckin(habitoId)
          .then(() => {
            vibrar.sucesso()
            avisar.ok(m.habitos.feitoOk(nome))
            recarregar()
          })
          .catch(() => avisar.erro(m.habitos.erroSalvar))
      }}
      onExcluirHabito={async (habitoId) => {
        await habitosRepository.excluir(habitoId)
        // Lembrete local some junto (no navegador o plugin falha — ignorado).
        await cancelarLembrete(habitoId).catch(() => {})
        recarregar()
      }}
      onCriarHabito={async (params) => {
        await habitosRepository.criar(params)
        recarregar()
      }}
    />
  )
}

function PedirConsentimento(props: { onAutorizar: () => Promise<void>; m: ReturnType<typeof useI18n>['m'] }) {
  const h = props.m.habitos
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(false)

  return (
    <main className="flex min-h-full flex-col items-center px-6 pb-24 pt-safe-t text-center">
      <LifeMascote humor="calmo" className="mt-10 h-36" />
      <h1 className="mt-5 text-2xl font-extrabold text-content-hi">{h.consentTitulo}</h1>
      <p className="mt-2 text-sm leading-relaxed text-content-low">{h.consentLead}</p>
      <p className="mt-4 text-micro leading-relaxed text-content-low">{h.aviso}</p>
      <button
        type="button"
        disabled={salvando}
        onClick={() => {
          setSalvando(true)
          setErro(false)
          props.onAutorizar().catch(() => {
            setErro(true)
            setSalvando(false)
          })
        }}
        className="mt-6 min-h-14 w-full rounded-2xl bg-brand font-bold text-brand-ink active:scale-[0.98] disabled:opacity-60"
      >
        {h.consentBotao}
      </button>
      <p className="mt-2 text-micro text-content-low">{h.consentNota}</p>
      {erro && <p className="mt-2 text-sm text-accent-danger">{props.m.comum.erroGenerico}</p>}
    </main>
  )
}
