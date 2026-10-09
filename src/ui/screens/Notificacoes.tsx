import { useEffect, useState } from 'react'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'
import { vibrar } from '@ui/feedback'
import { habitosRepository } from '@data/repositories/habitosRepository'
import { agendarLembrete, buscarLembrete, cancelarLembrete } from '@data/notifications/habitReminders'
import type { Habito } from '@domain/entities/habito'
import { LembretesDoDia } from './notificacoes/LembretesDoDia'
import { ContatoDoLife } from './notificacoes/ContatoDoLife'

/**
 * Sub-página "Notificações" do Perfil.
 *
 * Só lista o que já existe de verdade: os lembretes do dia do Life (água,
 * refeições, treino, pesagem — ver LembretesDoDia) e os lembretes locais
 * por hábito "construir" (Camada 1 — ver habitReminders.ts), num lugar
 * central em vez de espalhado card por card em Hábitos. Por último, "Life puxa
 * conversa" (ContatoDoLife): a pessoa escolhe se aceita o Life puxar conversa
 * no chat. A escolha fica guardada no servidor, mas ainda não envia nada — a
 * tela avisa "em breve". WhatsApp ficou pra uma versão futura.
 */
export function Notificacoes() {
  const t = useI18n().m.perfil.notificacoes
  const [habitosConstruir, setHabitosConstruir] = useState<Habito[] | null>(null)

  useEffect(() => {
    let ativo = true
    habitosRepository
      .listar()
      .then((lista) => ativo && setHabitosConstruir(lista.filter((h) => h.tipo === 'construir')))
      .catch(() => ativo && setHabitosConstruir([]))
    return () => {
      ativo = false
    }
  }, [])

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <LembretesDoDia />

      <section className="mx-5 mt-8">
        <h2 className="mb-1 text-sm font-bold text-content-hi">{t.habitosTitulo}</h2>
        <p className="mb-3 text-micro text-content-low">{t.habitosTexto}</p>

        {habitosConstruir === null && <p className="text-micro text-content-low">{t.carregando}</p>}

        {habitosConstruir?.length === 0 && (
          <p className="rounded-xl border border-surface-4 bg-surface-2 p-3.5 text-micro text-content-low">{t.semHabitos}</p>
        )}

        <div className="space-y-2.5">
          {habitosConstruir?.map((h) => (
            <LinhaLembrete key={h.id} habito={h} />
          ))}
        </div>
      </section>

      <ContatoDoLife />
    </main>
  )
}

function LinhaLembrete({ habito }: { habito: Habito }) {
  const [lembrete, setLembrete] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [hora, setHora] = useState('19:00')
  const { m } = useI18n()
  const t = m.perfil.notificacoes
  const tc = m.habitos.card

  useEffect(() => {
    let ativo = true
    buscarLembrete(habito.id)
      .then((v) => {
        if (!ativo) return
        setLembrete(v)
        if (v) setHora(v)
      })
      .catch(() => ativo && setErro(t.soApp))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [habito.id])

  async function salvar() {
    setErro(null)
    try {
      await agendarLembrete({ habitoId: habito.id, nomeHabito: habito.nome, horaMinuto: hora })
      setLembrete(hora)
      vibrar.leve()
    } catch {
      setErro(t.erroAgendar)
    }
  }

  async function remover() {
    setErro(null)
    try {
      await cancelarLembrete(habito.id)
      setLembrete(null)
    } catch {
      setErro(t.erroRemover)
    }
  }

  return (
    <div className="rounded-xl border border-surface-4 bg-surface-2 p-3.5">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{habito.emoji}</span>
        <span className="flex-1 truncate text-sm font-semibold text-content-hi">{habito.nome}</span>
      </div>

      {carregando ? (
        <p className="mt-2 text-micro text-content-low">{t.carregando}</p>
      ) : lembrete ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm text-content-mid">{tc.todoDia(lembrete)}</span>
          <button onClick={() => void remover()} className="-mr-2 min-h-11 px-3 text-sm font-bold text-content-mid active:text-content-hi">
            {tc.remover}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            aria-label={tc.horaAria}
            className="min-h-11 rounded-lg border border-surface-4 bg-surface-3 px-2 text-base text-content-hi"
          />
          <button
            onClick={() => void salvar()}
            className="min-h-11 flex-1 rounded-lg bg-brand text-sm font-bold text-brand-ink active:scale-[0.98]"
          >
            {tc.lembrar}
          </button>
        </div>
      )}
      {erro && <p role="alert" className="mt-1.5 text-micro text-accent-danger">{erro}</p>}
    </div>
  )
}
