import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { habitosRepository } from '@data/repositories/habitosRepository'
import { agendarLembrete, buscarLembrete, cancelarLembrete } from '@data/notifications/habitReminders'
import type { Habito } from '@domain/entities/habito'

/**
 * Sub-página "Notificações" do Perfil.
 *
 * Só lista o que já existe de verdade: os lembretes locais por hábito
 * "construir" (Camada 1 — ver habitReminders.ts), num lugar central em
 * vez de espalhado card por card em Hábitos. "Modo resgate" e WhatsApp
 * aparecem como em breve — nenhum dos dois tem qualquer código funcionando
 * ainda (sem Firebase, sem integração de WhatsApp), fingir toggle aqui
 * seria enganar o usuário.
 */
export function Notificacoes() {
  const navigate = useNavigate()
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
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-content-hi">Notificações</h1>
      </header>

      <section className="mx-5 mt-2">
        <h2 className="mb-1 text-sm font-bold text-content-hi">Lembretes de hábitos</h2>
        <p className="mb-3 text-micro text-content-low">
          Um aviso local no seu aparelho, no horário que você escolher — só funciona no app
          instalado, não aqui no navegador.
        </p>

        {habitosConstruir === null && <p className="text-micro text-content-dim">Carregando…</p>}

        {habitosConstruir?.length === 0 && (
          <p className="rounded-xl border border-surface-4 bg-surface-2 p-3.5 text-micro text-content-low">
            Nenhum hábito do tipo "construir" ainda (ex.: Leitura). Crie um em Hábitos pra ver o
            lembrete aqui.
          </p>
        )}

        <div className="space-y-2.5">
          {habitosConstruir?.map((h) => (
            <LinhaLembrete key={h.id} habito={h} />
          ))}
        </div>
      </section>

      <section className="mx-5 mt-8">
        <h2 className="mb-1 text-sm font-bold text-content-hi">Modo resgate e WhatsApp</h2>
        <p className="rounded-xl border border-surface-4 bg-surface-2 p-3.5 text-micro text-content-low">
          Em breve — ainda não existe integração de push (Firebase) nem de WhatsApp no app.
          Nenhuma dessas notificações funciona hoje.
        </p>
      </section>
    </main>
  )
}

function LinhaLembrete({ habito }: { habito: Habito }) {
  const [lembrete, setLembrete] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [hora, setHora] = useState('19:00')

  useEffect(() => {
    let ativo = true
    buscarLembrete(habito.id)
      .then((v) => {
        if (!ativo) return
        setLembrete(v)
        if (v) setHora(v)
      })
      .catch(() => ativo && setErro('Só funciona no app instalado.'))
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
    } catch {
      setErro('Não deu pra agendar — checa a permissão de notificação do app.')
    }
  }

  async function remover() {
    setErro(null)
    try {
      await cancelarLembrete(habito.id)
      setLembrete(null)
    } catch {
      setErro('Não deu pra remover agora.')
    }
  }

  return (
    <div className="rounded-xl border border-surface-4 bg-surface-2 p-3.5">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{habito.emoji}</span>
        <span className="flex-1 truncate text-sm font-semibold text-content-hi">{habito.nome}</span>
      </div>

      {carregando ? (
        <p className="mt-2 text-micro text-content-dim">Carregando…</p>
      ) : lembrete ? (
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-sm text-content-mid">Todo dia às {lembrete}</span>
          <button onClick={() => void remover()} className="text-micro font-bold text-accent-danger">
            Remover
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="rounded-lg border border-surface-4 bg-surface-3 px-2 py-1.5 text-sm text-content-hi"
          />
          <button
            onClick={() => void salvar()}
            className="flex-1 rounded-lg bg-brand py-1.5 text-sm font-bold text-[#04120a]"
          >
            Lembrar
          </button>
        </div>
      )}
      {erro && <p className="mt-1.5 text-[11px] text-accent-danger">{erro}</p>}
    </div>
  )
}
