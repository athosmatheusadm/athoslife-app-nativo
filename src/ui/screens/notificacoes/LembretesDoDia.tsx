import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useSession } from '@app/SessionProvider'
import { useI18n } from '@/i18n/I18nProvider'
import {
  lerConfigLembretes,
  nativo,
  pedirPermissaoLembretes,
  replanejarLembretes,
  salvarConfigLembretes,
} from '@data/notifications/lembretesDiarios'
import { treinoPlanoRepository } from '@data/repositories/treinoPlanoRepository'
import type { DiaSemana } from '@domain/entities/treino'
import {
  dentroDoHorarioAcordado,
  INTERVALOS_AGUA_MIN,
  MAX_POR_DIA,
  minutosDe,
  type ConfigLembretes,
  type TipoRefeicaoLembrete,
} from '@domain/rules/lembretesDiarios'

const DIAS: readonly DiaSemana[] = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
const REFEICOES: readonly TipoRefeicaoLembrete[] = ['cafe', 'almoco', 'lanche', 'jantar']

/**
 * "Lembretes do dia" em Perfil > Notificações: água, refeições, treino e
 * pesagem, com chave geral e horário de silêncio. A regra mora em
 * domain/rules/lembretesDiarios.ts; aqui só se escolhe.
 */
export function LembretesDoDia() {
  const { m } = useI18n()
  const t = m.lembretes.tela
  const { profile } = useSession()
  const metaMl = profile?.metas.aguaMl ?? 2500
  const [config, setConfig] = useState<ConfigLembretes | null>(null)
  const [diasTreino, setDiasTreino] = useState<ReadonlySet<DiaSemana>>(new Set())
  const [erro, setErro] = useState<string | null>(null)
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let ativo = true
    void lerConfigLembretes().then((c) => ativo && setConfig(c))
    void treinoPlanoRepository
      .diasComExercicio()
      .then((d) => ativo && setDiasTreino(d))
      .catch(() => {})
    return () => {
      ativo = false
      if (espera.current) clearTimeout(espera.current)
    }
  }, [])

  if (!config) return <p className="mx-5 mt-2 text-micro text-content-dim">…</p>

  // Salva logo e replaneja um pouco depois (o relógio do campo de hora muda a cada giro).
  function mudar(nova: ConfigLembretes) {
    setConfig(nova)
    setErro(null)
    if (espera.current) clearTimeout(espera.current)
    espera.current = setTimeout(() => {
      salvarConfigLembretes(nova)
        .then(() => replanejarLembretes(metaMl))
        .catch(() => setErro(t.erroSalvar))
    }, 600)
  }

  async function ligarGeral(v: boolean) {
    if (!config) return
    if (v && nativo && !(await pedirPermissaoLembretes())) {
      setErro(t.semPermissao)
      return
    }
    mudar({ ...config, ligado: v })
  }

  const acordar = minutosDe(config.acordar) ?? 0
  const dormir = minutosDe(config.dormir) ?? 0
  const noSilencio = (hora: string) => {
    const min = minutosDe(hora)
    return min !== null && !dentroDoHorarioAcordado(min, acordar, dormir)
  }
  const rotulosTreino = DIAS.filter((d) => diasTreino.has(d)).map((d) => t.dias[d])

  return (
    <section className="mx-5 mt-2">
      <h2 className="mb-1 text-sm font-bold text-content-hi">{t.secao}</h2>
      <p className="mb-3 text-micro text-content-low">{t.intro}</p>
      {!nativo && <p className="mb-3 text-micro text-accent-gold">{t.soNoApp}</p>}

      <Cartao>
        <Linha titulo={t.geral} subtitulo={t.geralSub} ativo={config.ligado} onMudar={(v) => void ligarGeral(v)} />
      </Cartao>
      {erro && <p className="mt-1.5 text-micro text-accent-danger">{erro}</p>}

      {config.ligado && (
        <div className="mt-2.5 space-y-2.5">
          <Cartao>
            <p className="text-sm font-semibold text-content-hi">{t.silencio}</p>
            <p className="mt-0.5 text-micro text-content-low">{t.silencioSub}</p>
            <div className="mt-2.5 flex gap-3">
              <CampoHora rotulo={t.acordo} valor={config.acordar} onMudar={(v) => mudar({ ...config, acordar: v })} />
              <CampoHora rotulo={t.durmo} valor={config.dormir} onMudar={(v) => mudar({ ...config, dormir: v })} />
            </div>
          </Cartao>

          <Cartao>
            <Linha
              titulo={`💧 ${t.agua}`}
              subtitulo={t.aguaSub}
              ativo={config.agua.ligado}
              onMudar={(v) => mudar({ ...config, agua: { ...config.agua, ligado: v } })}
            />
            {config.agua.ligado && (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-micro text-content-low">{t.aCada}</span>
                {INTERVALOS_AGUA_MIN.map((min) => (
                  <button
                    key={min}
                    type="button"
                    onClick={() => mudar({ ...config, agua: { ...config.agua, intervaloMin: min } })}
                    className={`flex-1 rounded-lg border py-1.5 text-micro font-semibold ${
                      config.agua.intervaloMin === min ? 'border-brand text-brand' : 'border-surface-4 text-content-mid'
                    }`}
                  >
                    {t.intervalo(min)}
                  </button>
                ))}
              </div>
            )}
          </Cartao>

          <Cartao>
            <p className="text-sm font-semibold text-content-hi">🍽️ {t.refeicoes}</p>
            <p className="mt-0.5 text-micro text-content-low">{t.refeicoesSub}</p>
            <div className="mt-2 divide-y divide-surface-4">
              {REFEICOES.map((tipo) => {
                const r = config.refeicoes[tipo]
                const trocar = (novo: Partial<typeof r>) =>
                  mudar({ ...config, refeicoes: { ...config.refeicoes, [tipo]: { ...r, ...novo } } })
                return (
                  <div key={tipo} className="py-2">
                    <div className="flex items-center gap-3">
                      <span className="flex-1 text-sm text-content-hi">{t[tipo]}</span>
                      {r.ligado && <CampoHora valor={r.hora} onMudar={(v) => trocar({ hora: v })} />}
                      <Chave ativo={r.ligado} onMudar={(v) => trocar({ ligado: v })} />
                    </div>
                    {r.ligado && noSilencio(r.hora) && <AvisoSilencio texto={t.noSilencio} />}
                  </div>
                )
              })}
            </div>
          </Cartao>

          <Cartao>
            <Linha
              titulo={`💪 ${t.treino}`}
              subtitulo={rotulosTreino.length > 0 ? t.treinoDias(rotulosTreino.join(', ')) : t.treinoSemDias}
              ativo={config.treino.ligado}
              onMudar={(v) => mudar({ ...config, treino: { ...config.treino, ligado: v } })}
            />
            {config.treino.ligado && (
              <div className="mt-2.5">
                <CampoHora valor={config.treino.hora} onMudar={(v) => mudar({ ...config, treino: { ...config.treino, hora: v } })} />
                {noSilencio(config.treino.hora) && <AvisoSilencio texto={t.noSilencio} />}
              </div>
            )}
          </Cartao>

          <Cartao>
            <Linha
              titulo={`⚖️ ${t.pesagem}`}
              subtitulo={t.pesagemSub}
              ativo={config.pesagem.ligado}
              onMudar={(v) => mudar({ ...config, pesagem: { ...config.pesagem, ligado: v } })}
            />
            {config.pesagem.ligado && (
              <div className="mt-2.5">
                <div className="flex gap-1">
                  {DIAS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => mudar({ ...config, pesagem: { ...config.pesagem, dia: d } })}
                      className={`flex-1 rounded-lg border py-1.5 text-micro font-semibold ${
                        config.pesagem.dia === d ? 'border-brand text-brand' : 'border-surface-4 text-content-mid'
                      }`}
                    >
                      {t.dias[d]}
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <CampoHora
                    valor={config.pesagem.hora}
                    onMudar={(v) => mudar({ ...config, pesagem: { ...config.pesagem, hora: v } })}
                  />
                </div>
                {noSilencio(config.pesagem.hora) && <AvisoSilencio texto={t.noSilencio} />}
              </div>
            )}
          </Cartao>

          <p className="text-micro text-content-dim">{t.teto(MAX_POR_DIA)}</p>
        </div>
      )}
    </section>
  )
}

function Cartao({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-surface-4 bg-surface-2 p-3.5">{children}</div>
}

function Linha(props: { titulo: string; subtitulo: string; ativo: boolean; onMudar: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-content-hi">{props.titulo}</span>
        <span className="mt-0.5 block text-micro text-content-low">{props.subtitulo}</span>
      </span>
      <Chave ativo={props.ativo} onMudar={props.onMudar} rotulo={props.titulo} />
    </div>
  )
}

function Chave(props: { ativo: boolean; onMudar: (v: boolean) => void; rotulo?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={props.ativo}
      aria-label={props.rotulo}
      onClick={() => props.onMudar(!props.ativo)}
      className={`relative h-6 w-11 flex-none rounded-full transition-colors ${props.ativo ? 'bg-brand' : 'bg-surface-4'}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          props.ativo ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function CampoHora(props: { rotulo?: string; valor: string; onMudar: (v: string) => void }) {
  return (
    <label className={props.rotulo ? 'flex-1' : ''}>
      {props.rotulo && <span className="mb-1 block text-micro text-content-low">{props.rotulo}</span>}
      <input
        type="time"
        value={props.valor}
        onChange={(e) => e.target.value && props.onMudar(e.target.value)}
        className="w-full rounded-lg border border-surface-4 bg-surface-3 px-2 py-1.5 text-sm text-content-hi"
      />
    </label>
  )
}

function AvisoSilencio({ texto }: { texto: string }) {
  return <p className="mt-1 text-micro text-accent-gold">{texto}</p>
}
