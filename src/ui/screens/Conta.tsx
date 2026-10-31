import { useEffect, useState } from 'react'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useSession } from '@app/SessionProvider'
import { pesoRepository } from '@data/repositories/pesoRepository'
import { profileRepository } from '@data/repositories/profileRepository'
import type { Sexo } from '@domain/entities/profile'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar, vibrar } from '@ui/feedback'

const SEXOS: readonly Sexo[] = ['feminino', 'masculino', 'outro', 'prefiro_nao_dizer']

/**
 * Sub-página "Conta" do Perfil — nome, foto, e-mail (só leitura, vem da
 * autenticação), sexo, altura, idade, peso.
 *
 * Cada campo salva sozinho ao perder o foco (mesmo padrão do
 * NomeExtraInput da Dieta) — sem botão "Salvar" único, sem modal.
 * `useSession().refresh()` depois de cada salvamento pra ProfileAvatar e
 * o cabeçalho do Perfil pegarem o dado novo na hora.
 */
export function Conta() {
  const { profile, refresh } = useSession()
  const [email, setEmail] = useState<string | null>(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState(false)
  const { m } = useI18n()
  const t = m.perfil.conta

  /** Salva, avisa e recarrega o perfil — antes um erro passava calado. */
  const salvar = (acao: Promise<unknown>) =>
    acao
      .then(() => {
        vibrar.leve()
        avisar.ok(m.perfil.salvo)
        return refresh()
      })
      .catch(() => avisar.erro(m.perfil.erroSalvar))

  useEffect(() => {
    void profileRepository.emailAtual().then(setEmail)
  }, [])

  if (!profile) return null

  async function trocarFoto() {
    setErroFoto(false)
    try {
      const foto = await Camera.getPhoto({
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        quality: 70,
        width: 512,
      })
      if (!foto.dataUrl) return
      setEnviandoFoto(true)
      const blob = await (await fetch(foto.dataUrl)).blob()
      await profileRepository.atualizarAvatar(blob)
      await refresh()
      vibrar.sucesso()
    } catch (e) {
      // Usuário cancelando o seletor de foto também cai aqui (rejeita a promise) — não é erro de verdade.
      const msg = e instanceof Error ? e.message : ''
      if (!/cancel/i.test(msg)) setErroFoto(true)
    } finally {
      setEnviandoFoto(false)
    }
  }

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <section className="flex flex-col items-center gap-2 px-5 pb-6 pt-2">
        <button
          type="button"
          onClick={() => void trocarFoto()}
          disabled={enviandoFoto}
          aria-label={t.trocarFoto}
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-brand-dark text-3xl font-bold text-brand-ink ring-2 ring-brand/35 disabled:opacity-60"
        >
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (profile.nome ?? '?').trim().charAt(0).toUpperCase() || '?'
          )}
          <span className="absolute bottom-0 flex h-7 w-full items-center justify-center bg-black/60 text-xs font-semibold text-white">
            {enviandoFoto ? '...' : '📷'}
          </span>
        </button>
        {erroFoto && <p role="alert" className="text-micro text-accent-danger">{t.erroFoto}</p>}
      </section>

      <div className="space-y-4 px-5">
        <CampoTexto
          rotulo={t.nome}
          valorInicial={profile.nome ?? ''}
          placeholder={t.seuNome}
          onSalvar={(v) => salvar(profileRepository.atualizarNome(v))}
        />

        <div>
          <p className="mb-1 block text-micro font-bold uppercase tracking-wide text-content-low">{t.email}</p>
          <p className="break-all rounded-xl border border-surface-4 bg-surface-2 px-3.5 py-3 text-sm text-content-mid">
            {email ?? '—'}
          </p>
        </div>

        <div>
          <p className="mb-1.5 block text-micro font-bold uppercase tracking-wide text-content-low">{t.sexo}</p>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.sexo}>
            {SEXOS.map((sx) => (
              <button
                key={sx}
                type="button"
                aria-pressed={profile.sexo === sx}
                onClick={() => {
                  void salvar(profileRepository.atualizarDadosPessoais('sexo', sx))
                }}
                className={`min-h-11 rounded-pill px-4 text-sm font-bold transition-colors active:scale-95 ${
                  profile.sexo === sx
                    ? 'bg-brand text-brand-ink'
                    : 'border border-surface-4 bg-surface-2 text-content-mid'
                }`}
              >
                {t.sexos[sx]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <CampoNumero
            rotulo={t.altura}
            valorInicial={profile.alturaCm}
            onSalvar={(v) => salvar(profileRepository.atualizarDadosPessoais('altura_cm', v))}
          />
          <CampoNumero
            rotulo={t.idade}
            valorInicial={profile.idade}
            onSalvar={(v) => salvar(profileRepository.atualizarDadosPessoais('idade', v))}
          />
          <CampoNumero
            rotulo={t.peso}
            valorInicial={profile.pesoAtual}
            decimal
            // Vira a pesagem de hoje (registros_peso + perfil): antes só mudava o
            // perfil e o card "Meu peso" continuava com o número antigo.
            onSalvar={(v) => salvar(v === null ? Promise.resolve() : pesoRepository.registrar(v))}
          />
        </div>
      </div>
    </main>
  )
}

function CampoTexto(props: {
  rotulo: string
  valorInicial: string
  placeholder?: string
  onSalvar: (valor: string) => unknown
}) {
  const [valor, setValor] = useState(props.valorInicial)
  const id = `conta-${props.rotulo}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-micro font-bold uppercase tracking-wide text-content-low">
        {props.rotulo}
      </label>
      <input
        id={id}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          const limpo = valor.trim()
          if (limpo && limpo !== props.valorInicial) props.onSalvar(limpo)
        }}
        placeholder={props.placeholder}
        className="min-h-12 w-full rounded-xl border border-surface-4 bg-surface-2 px-3.5 text-base font-semibold text-content-hi placeholder:font-normal placeholder:text-content-low focus:border-brand focus:outline-none"
      />
    </div>
  )
}

function CampoNumero(props: {
  rotulo: string
  valorInicial: number | null
  decimal?: boolean
  onSalvar: (valor: number | null) => unknown
}) {
  const [valor, setValor] = useState(props.valorInicial?.toString() ?? '')
  const id = `conta-${props.rotulo}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-micro font-bold uppercase tracking-wide text-content-low">
        {props.rotulo}
      </label>
      <input
        id={id}
        type="number"
        inputMode={props.decimal ? 'decimal' : 'numeric'}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          const numero = valor.trim() === '' ? null : Number(valor)
          if (numero !== null && (Number.isNaN(numero) || numero <= 0)) return
          if (numero !== props.valorInicial) props.onSalvar(numero)
        }}
        className="min-h-12 w-full rounded-xl border border-surface-4 bg-surface-2 px-2 text-center text-base font-semibold tabular-nums text-content-hi focus:border-brand focus:outline-none"
      />
    </div>
  )
}
