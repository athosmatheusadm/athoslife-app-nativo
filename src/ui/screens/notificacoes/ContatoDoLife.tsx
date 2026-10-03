import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import {
  contatoRepository,
  MOMENTOS_LIFE,
  type MomentoLife,
  type PreferenciasContato,
} from '@data/repositories/contatoRepository'
import { Cartao, Chave, Linha } from './LembretesDoDia'

/**
 * "Life puxa conversa" em Perfil > Notificações: a pessoa escolhe se o Life
 * pode puxar conversa no chat e em que momentos. Começa desligado; cada
 * mudança vai pro servidor, que guarda o aceite com data. Ainda não envia
 * nada — a tela diz isso.
 */
export function ContatoDoLife() {
  const { m } = useI18n()
  const t = m.contato
  const [prefs, setPrefs] = useState<PreferenciasContato | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let ativo = true
    contatoRepository
      .buscar()
      .then((p) => ativo && setPrefs(p))
      .catch(() => ativo && setErro(t.erroCarregar))
    return () => {
      ativo = false
    }
  }, [t.erroCarregar])

  if (!prefs) {
    return <p className="mx-5 mt-8 text-micro text-content-dim">{erro ?? '…'}</p>
  }

  async function salvar(nova: PreferenciasContato) {
    const anterior = prefs
    setPrefs(nova)
    setErro(null)
    try {
      await contatoRepository.salvar(nova)
    } catch {
      setPrefs(anterior)
      setErro(t.erroSalvar)
    }
  }

  function trocarMomento(mo: MomentoLife, v: boolean) {
    if (!prefs) return
    const lista = v ? [...prefs.lifeMomentos, mo] : prefs.lifeMomentos.filter((x) => x !== mo)
    void salvar({ ...prefs, lifeMomentos: lista })
  }

  return (
    <section className="mx-5 mt-8">
      <h2 className="mb-1 text-sm font-bold text-content-hi">{t.secao}</h2>
      <p className="mb-3 text-micro text-content-low">{t.intro}</p>

      <Cartao>
        <Linha
          titulo={`💬 ${t.lifeTitulo}`}
          subtitulo={t.lifeSub}
          ativo={prefs.lifeLigado}
          onMudar={(v) =>
            void salvar({
              lifeLigado: v,
              // Ligar pela 1ª vez já marca os 3 momentos; a pessoa tira o que não quiser.
              lifeMomentos: v && prefs.lifeMomentos.length === 0 ? [...MOMENTOS_LIFE] : prefs.lifeMomentos,
            })
          }
        />
        {prefs.lifeLigado && (
          <div className="mt-2 divide-y divide-surface-4">
            {MOMENTOS_LIFE.map((mo) => (
              <div key={mo} className="flex items-center gap-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-content-hi">{t.momentos[mo]}</span>
                  <span className="block text-micro text-content-low">{t.momentosSub[mo]}</span>
                </span>
                <Chave
                  ativo={prefs.lifeMomentos.includes(mo)}
                  onMudar={(v) => trocarMomento(mo, v)}
                  rotulo={t.momentos[mo]}
                />
              </div>
            ))}
          </div>
        )}
      </Cartao>

      {erro && <p className="mt-1.5 text-micro text-accent-danger">{erro}</p>}
      <p className="mt-2 text-micro text-accent-gold">{t.emBreve}</p>
    </section>
  )
}
