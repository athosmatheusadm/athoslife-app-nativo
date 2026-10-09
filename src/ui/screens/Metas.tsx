import { useState } from 'react'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar, vibrar } from '@ui/feedback'

/**
 * Sub-página "Metas" do Perfil — as metas diárias que alimentam os discos
 * da Home e a régua de macros da Dieta (`profile.metas`). Cada campo salva
 * sozinho ao sair do foco, mesmo padrão de Conta.
 */
export function Metas() {
  const { profile, refresh } = useSession()
  const { m } = useI18n()
  const t = m.perfil.metas

  if (!profile) return null
  const { metas } = profile

  /** Salva, avisa e recarrega o perfil — antes um erro passava calado. */
  const salvar = (acao: Promise<unknown>) =>
    acao
      .then(() => {
        vibrar.leve()
        avisar.ok(m.perfil.salvo)
        return refresh()
      })
      .catch(() => avisar.erro(m.perfil.erroSalvar))

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <p className="px-5 pb-4 text-sm text-content-low">
        {t.lead}
      </p>

      <div className="space-y-4 px-5">
        <CampoMeta
          rotulo={t.calorias}
          sufixo="kcal"
          valorInicial={metas.kcal}
          onSalvar={(v) => salvar(profileRepository.atualizarMeta('kcal_meta', v))}
        />
        <div className="grid grid-cols-3 gap-3">
          <CampoMeta
            rotulo={t.proteina}
            sufixo="g"
            valorInicial={metas.proteina}
            onSalvar={(v) => salvar(profileRepository.atualizarMeta('prot_meta', v))}
          />
          <CampoMeta
            rotulo={t.carbo}
            sufixo="g"
            valorInicial={metas.carboidrato}
            onSalvar={(v) => salvar(profileRepository.atualizarMeta('carbo_meta', v))}
          />
          <CampoMeta
            rotulo={t.gordura}
            sufixo="g"
            valorInicial={metas.gordura}
            onSalvar={(v) => salvar(profileRepository.atualizarMeta('gord_meta', v))}
          />
        </div>
        <CampoMeta
          rotulo={t.agua}
          sufixo="ml"
          valorInicial={metas.aguaMl}
          onSalvar={(v) => salvar(profileRepository.atualizarMetaAgua(v))}
        />
        <CampoMeta
          rotulo={t.passos}
          sufixo={t.passosDia}
          valorInicial={metas.passos}
          onSalvar={(v) => salvar(profileRepository.atualizarMeta('passos_meta', v))}
        />
      </div>
    </main>
  )
}

function CampoMeta(props: {
  rotulo: string
  sufixo: string
  valorInicial: number
  onSalvar: (valor: number) => unknown
}) {
  const [valor, setValor] = useState(String(props.valorInicial))
  const id = `meta-${props.rotulo}`
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-micro font-bold uppercase tracking-wide text-content-low">
        {props.rotulo}
      </label>
      <div className="flex min-h-12 items-center gap-2 rounded-xl border border-surface-4 bg-surface-2 px-3.5 focus-within:border-brand">
        <input
          id={id}
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
          className="min-w-0 w-full bg-transparent text-base font-semibold tabular-nums text-content-hi focus:outline-none"
        />
        <span className="flex-none text-micro text-content-low">{props.sufixo}</span>
      </div>
    </div>
  )
}
