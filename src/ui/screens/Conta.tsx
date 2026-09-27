import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'
import type { Sexo } from '@domain/entities/profile'

const SEXOS: readonly { valor: Sexo; rotulo: string }[] = [
  { valor: 'feminino', rotulo: 'Feminino' },
  { valor: 'masculino', rotulo: 'Masculino' },
  { valor: 'outro', rotulo: 'Outro' },
  { valor: 'prefiro_nao_dizer', rotulo: 'Prefiro não dizer' },
]

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
  const navigate = useNavigate()
  const { profile, refresh } = useSession()
  const [email, setEmail] = useState<string | null>(null)
  const [enviandoFoto, setEnviandoFoto] = useState(false)
  const [erroFoto, setErroFoto] = useState<string | null>(null)

  useEffect(() => {
    void profileRepository.emailAtual().then(setEmail)
  }, [])

  if (!profile) return null

  async function trocarFoto() {
    setErroFoto(null)
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
    } catch (e) {
      // Usuário cancelando o seletor de foto também cai aqui (rejeita a promise) — não é erro de verdade.
      const msg = e instanceof Error ? e.message : ''
      if (!/cancel/i.test(msg)) setErroFoto('Não deu pra trocar a foto agora.')
    } finally {
      setEnviandoFoto(false)
    }
  }

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-content-hi">Conta</h1>
      </header>

      <section className="flex flex-col items-center gap-2 px-5 pb-6 pt-2">
        <button
          type="button"
          onClick={() => void trocarFoto()}
          disabled={enviandoFoto}
          aria-label="Trocar foto de perfil"
          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand to-brand-dark text-3xl font-bold text-[#04120a] ring-2 ring-brand/35 disabled:opacity-60"
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
        {erroFoto && <p className="text-[11px] text-accent-danger">{erroFoto}</p>}
      </section>

      <div className="space-y-4 px-5">
        <CampoTexto
          rotulo="Nome"
          valorInicial={profile.nome ?? ''}
          placeholder="Seu nome"
          onSalvar={(v) => profileRepository.atualizarNome(v).then(refresh)}
        />

        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-content-dim">
            E-mail
          </label>
          <p className="rounded-xl border border-surface-4 bg-surface-2 px-3.5 py-3 text-sm text-content-mid">
            {email ?? '—'}
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-content-dim">
            Sexo
          </label>
          <div className="flex flex-wrap gap-2">
            {SEXOS.map((s) => (
              <button
                key={s.valor}
                type="button"
                onClick={() => {
                  void profileRepository.atualizarDadosPessoais('sexo', s.valor).then(refresh)
                }}
                className={`rounded-pill px-3.5 py-1.5 text-micro font-bold transition-colors ${
                  profile.sexo === s.valor
                    ? 'bg-brand text-[#04120a]'
                    : 'border border-surface-4 bg-surface-2 text-content-mid'
                }`}
              >
                {s.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <CampoNumero
            rotulo="Altura (cm)"
            valorInicial={profile.alturaCm}
            onSalvar={(v) => profileRepository.atualizarDadosPessoais('altura_cm', v).then(refresh)}
          />
          <CampoNumero
            rotulo="Idade"
            valorInicial={profile.idade}
            onSalvar={(v) => profileRepository.atualizarDadosPessoais('idade', v).then(refresh)}
          />
          <CampoNumero
            rotulo="Peso (kg)"
            valorInicial={profile.pesoAtual}
            decimal
            onSalvar={(v) => profileRepository.atualizarDadosPessoais('peso_atual', v).then(refresh)}
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
  onSalvar: (valor: string) => void
}) {
  const [valor, setValor] = useState(props.valorInicial)
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-content-dim">
        {props.rotulo}
      </label>
      <input
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          const limpo = valor.trim()
          if (limpo && limpo !== props.valorInicial) props.onSalvar(limpo)
        }}
        placeholder={props.placeholder}
        className="w-full rounded-xl border border-surface-4 bg-surface-2 px-3.5 py-3 text-sm font-semibold text-content-hi placeholder:font-normal placeholder:text-content-dim focus:border-brand focus:outline-none"
      />
    </div>
  )
}

function CampoNumero(props: {
  rotulo: string
  valorInicial: number | null
  decimal?: boolean
  onSalvar: (valor: number | null) => void
}) {
  const [valor, setValor] = useState(props.valorInicial?.toString() ?? '')
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-content-dim">
        {props.rotulo}
      </label>
      <input
        type="number"
        inputMode={props.decimal ? 'decimal' : 'numeric'}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={() => {
          const numero = valor.trim() === '' ? null : Number(valor)
          if (numero !== null && (Number.isNaN(numero) || numero <= 0)) return
          if (numero !== props.valorInicial) props.onSalvar(numero)
        }}
        className="w-full rounded-xl border border-surface-4 bg-surface-2 px-3 py-3 text-center text-sm font-semibold text-content-hi focus:border-brand focus:outline-none"
      />
    </div>
  )
}
