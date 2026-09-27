import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  definirAltoContraste,
  definirReduzirAnimacoes,
  definirTamanhoTexto,
  lerAltoContraste,
  lerReduzirAnimacoes,
  lerTamanhoTexto,
  type TamanhoTexto,
} from '@ui/theme/preferenciasAcessibilidade'

const TAMANHOS: readonly { valor: TamanhoTexto; rotulo: string; amostra: string }[] = [
  { valor: 'normal', rotulo: 'Normal', amostra: 'text-sm' },
  { valor: 'grande', rotulo: 'Grande', amostra: 'text-base' },
  { valor: 'extra', rotulo: 'Extra grande', amostra: 'text-lg' },
]

/**
 * Sub-página "Acessibilidade" do Perfil — três preferências reais
 * (aplicadas na hora, guardadas no aparelho): tamanho do texto, reduzir
 * animações, alto contraste. Ver preferenciasAcessibilidade.ts pro porquê
 * de não serem sincronizadas com o banco.
 */
export function Acessibilidade() {
  const navigate = useNavigate()
  const [tamanho, setTamanho] = useState<TamanhoTexto>(lerTamanhoTexto)
  const [reduzirAnimacoes, setReduzirAnimacoes] = useState(lerReduzirAnimacoes)
  const [altoContraste, setAltoContraste] = useState(lerAltoContraste)

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-content-hi">Acessibilidade</h1>
      </header>

      <section className="mx-5 mt-2">
        <h2 className="mb-2 text-sm font-bold text-content-hi">Tamanho do texto</h2>
        <div className="flex gap-2">
          {TAMANHOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => {
                setTamanho(t.valor)
                definirTamanhoTexto(t.valor)
              }}
              className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${
                tamanho === t.valor ? 'border-brand text-brand' : 'border-surface-4 text-content-mid'
              }`}
            >
              <span className={t.amostra}>Aa</span>
              <span className="mt-1 block text-[10px]">{t.rotulo}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mx-5 mt-6 space-y-1">
        <Toggle
          titulo="Reduzir animações"
          subtitulo="Desliga transições e efeitos de movimento no app inteiro"
          ativo={reduzirAnimacoes}
          onMudar={(v) => {
            setReduzirAnimacoes(v)
            definirReduzirAnimacoes(v)
          }}
        />
        <Toggle
          titulo="Alto contraste"
          subtitulo="Clareia os textos mais apagados pra facilitar a leitura"
          ativo={altoContraste}
          onMudar={(v) => {
            setAltoContraste(v)
            definirAltoContraste(v)
          }}
        />
      </section>

      <p className="mx-5 mt-6 text-micro text-content-dim">
        Essas preferências ficam salvas neste aparelho — se você trocar de celular, precisa ajustar de
        novo.
      </p>
    </main>
  )
}

function Toggle(props: {
  titulo: string
  subtitulo: string
  ativo: boolean
  onMudar: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => props.onMudar(!props.ativo)}
      className="flex w-full items-center gap-3 rounded-xl border border-surface-4 bg-surface-2 p-3.5 text-left"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-content-hi">{props.titulo}</span>
        <span className="mt-0.5 block text-micro text-content-low">{props.subtitulo}</span>
      </span>
      <span
        className={`relative h-6 w-11 flex-none rounded-full transition-colors ${
          props.ativo ? 'bg-brand' : 'bg-surface-4'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            props.ativo ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  )
}
