import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'

/**
 * Sub-página "Metas" do Perfil — as metas diárias que alimentam os discos
 * da Home e a régua de macros da Dieta (`profile.metas`). Cada campo salva
 * sozinho ao sair do foco, mesmo padrão de Conta.
 */
export function Metas() {
  const navigate = useNavigate()
  const { profile, refresh } = useSession()

  if (!profile) return null
  const { metas } = profile

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-content-hi">Metas</h1>
      </header>

      <p className="px-5 pb-4 text-sm text-content-low">
        Essas metas alimentam os discos da Home e a régua de macros da Dieta.
      </p>

      <div className="space-y-4 px-5">
        <CampoMeta
          rotulo="Calorias"
          sufixo="kcal"
          valorInicial={metas.kcal}
          onSalvar={(v) => profileRepository.atualizarMeta('kcal_meta', v).then(refresh)}
        />
        <div className="grid grid-cols-3 gap-3">
          <CampoMeta
            rotulo="Proteína"
            sufixo="g"
            valorInicial={metas.proteina}
            onSalvar={(v) => profileRepository.atualizarMeta('prot_meta', v).then(refresh)}
          />
          <CampoMeta
            rotulo="Carboidrato"
            sufixo="g"
            valorInicial={metas.carboidrato}
            onSalvar={(v) => profileRepository.atualizarMeta('carbo_meta', v).then(refresh)}
          />
          <CampoMeta
            rotulo="Gordura"
            sufixo="g"
            valorInicial={metas.gordura}
            onSalvar={(v) => profileRepository.atualizarMeta('gord_meta', v).then(refresh)}
          />
        </div>
        <CampoMeta
          rotulo="Água"
          sufixo="ml"
          valorInicial={metas.aguaMl}
          onSalvar={(v) => profileRepository.atualizarMetaAgua(v).then(refresh)}
        />
        <CampoMeta
          rotulo="Passos"
          sufixo="passos/dia"
          valorInicial={metas.passos}
          onSalvar={(v) => profileRepository.atualizarMeta('passos_meta', v).then(refresh)}
        />
      </div>
    </main>
  )
}

function CampoMeta(props: {
  rotulo: string
  sufixo: string
  valorInicial: number
  onSalvar: (valor: number) => void
}) {
  const [valor, setValor] = useState(String(props.valorInicial))
  return (
    <div>
      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-content-dim">
        {props.rotulo}
      </label>
      <div className="flex items-center gap-2 rounded-xl border border-surface-4 bg-surface-2 px-3.5 py-3">
        <input
          type="number"
          inputMode="numeric"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={() => {
            const numero = Number(valor)
            if (Number.isNaN(numero) || numero <= 0) {
              setValor(String(props.valorInicial))
              return
            }
            if (numero !== props.valorInicial) props.onSalvar(numero)
          }}
          className="w-full bg-transparent text-sm font-semibold text-content-hi focus:outline-none"
        />
        <span className="flex-none text-micro text-content-dim">{props.sufixo}</span>
      </div>
    </div>
  )
}
