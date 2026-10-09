import { useState, type ReactNode } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import type { Macros } from '@domain/entities/food'
import { escalarIngrediente, escalarMacros, type ReceitaEstruturada } from '@domain/rules/cozinha'
import { RegistrarReceitaSheet } from './RegistrarReceitaSheet'

const OPCOES_PORCOES = [1, 2, 3, 4, 6] as const

/**
 * O corpo de uma receita — o mesmo pra receita curada e pra criação do Life.
 *
 * Porções: os ingredientes são recalculados pro número escolhido e os
 * macros mostram o total do que a receita rende. O "Registrar na refeição"
 * é separado (a pessoa cozinha 4 porções e come 1).
 */
export function ReceitaView(props: {
  titulo: string
  subtitulo: string | null
  corTema: string
  /** Topo (foto, Life…). */
  capa: ReactNode
  /** Ao lado do título (favoritar). */
  acaoTitulo?: ReactNode
  /** Selos extras antes dos macros (categoria, "Criada pelo Life"…). */
  selos?: ReactNode
  macrosPorPorcao: Macros
  tempoMin: number | null
  estrutura: ReceitaEstruturada
  /** Botões depois do preparo (salvar, foto…). */
  acoes?: ReactNode
  aviso?: string
}) {
  const { m } = useI18n()
  const t = m.cozinha
  const { estrutura } = props

  const [porcoes, setPorcoes] = useState<number>(OPCOES_PORCOES.includes(estrutura.porcoesBase as 1) ? estrutura.porcoesBase : 1)
  const [marcados, setMarcados] = useState<ReadonlySet<number>>(new Set())
  const [registrando, setRegistrando] = useState(false)

  const fatorIngredientes = porcoes / estrutura.porcoesBase
  const macrosTotais = escalarMacros(props.macrosPorPorcao, porcoes)

  function alternar(i: number) {
    setMarcados((atual) => {
      const novo = new Set(atual)
      if (novo.has(i)) novo.delete(i)
      else novo.add(i)
      return novo
    })
  }

  return (
    <div className="px-4">
      {props.capa}

      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="text-xl font-bold text-content-hi">{props.titulo}</h2>
        {props.acaoTitulo}
      </div>
      {props.subtitulo && <p className="mb-3 text-sm text-content-low">{props.subtitulo}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        {props.selos}
        {props.tempoMin != null && props.tempoMin > 0 && (
          <span className="rounded-pill bg-surface-2 px-3 py-1 text-micro font-semibold text-content-mid">
            ⏱ {t.minutos(props.tempoMin)}
          </span>
        )}
      </div>

      {estrutura.porque && estrutura.porque !== props.subtitulo && (
        <Secao icone="🍽" titulo={t.sobrePrato}>
          <p className="text-sm leading-relaxed text-content-mid">{estrutura.porque}</p>
        </Secao>
      )}

      {/* Porções + macros do total */}
      <section className="mb-5 rounded-2xl border border-surface-4 bg-surface-2 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-content-hi">{t.porcoes}</span>
          <div className="flex gap-1.5" role="radiogroup" aria-label={t.porcoes}>
            {OPCOES_PORCOES.map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={porcoes === n}
                onClick={() => setPorcoes(n)}
                className={`h-8 min-w-8 rounded-full px-2 text-sm font-bold transition-colors ${
                  porcoes === n ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <Macro valor={macrosTotais.calorias} rotulo={t.kcal} cor={props.corTema} />
          <Macro valor={`${macrosTotais.proteina}g`} rotulo={t.prot} cor="#f43f5e" />
          <Macro valor={`${macrosTotais.carboidrato}g`} rotulo={t.carb} cor="#3b82f6" />
          <Macro valor={`${macrosTotais.gordura}g`} rotulo={t.gord} cor="#fbbf24" />
        </div>
        <p className="mt-2 text-center text-[10px] text-content-dim">
          {t.macrosDe(String(porcoes))}
          {estrutura.porcoesBase !== 1 || estrutura.unidadePorcao !== 'porção'
            ? ` · ${t.rendimentoBase(estrutura.porcoesBase, estrutura.unidadePorcao)}`
            : ''}
          {props.aviso ? ` · ${props.aviso}` : ''}
        </p>
      </section>

      <button
        type="button"
        onClick={() => setRegistrando(true)}
        className="mb-6 w-full rounded-pill bg-brand py-3 text-sm font-bold text-brand-ink active:opacity-90"
      >
        🍽 {t.registrar}
      </button>

      {estrutura.ingredientes.length > 0 && (
        <Secao icone="🧺" titulo={t.ingredientes}>
          <ul className="space-y-1">
            {estrutura.ingredientes.map((ing, i) => {
              const feito = marcados.has(i)
              return (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl px-1 py-1.5 active:bg-white/5">
                    <input
                      type="checkbox"
                      checked={feito}
                      onChange={() => alternar(i)}
                      className="mt-0.5 h-5 w-5 flex-none accent-[#22c55e]"
                    />
                    <span className={`text-sm leading-snug ${feito ? 'text-content-dim line-through' : 'text-content-hi'}`}>
                      {escalarIngrediente(ing, fatorIngredientes)}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        </Secao>
      )}

      {estrutura.preparo.length > 0 && (
        <Secao icone="🔥" titulo={t.preparo}>
          <Passos passos={estrutura.preparo} />
        </Secao>
      )}

      {estrutura.montagem.length > 0 && (
        <Secao icone="🥄" titulo={t.montagem}>
          <Passos passos={estrutura.montagem} />
        </Secao>
      )}

      {estrutura.extras.map((bloco, i) => (
        <Secao key={i} titulo={bloco.rotulo}>
          <p className="whitespace-pre-line text-sm leading-relaxed text-content-hi">{bloco.texto}</p>
        </Secao>
      ))}

      {estrutura.dica && (
        <section className="mb-6 flex items-start gap-3 rounded-2xl border border-brand/30 bg-brand/10 p-3">
          <img src="/life/chef.webp" alt="" className="h-14 w-auto flex-none" draggable={false} />
          <div>
            <div className="mb-0.5 text-micro font-extrabold uppercase tracking-wide text-brand">{t.dicaLife}</div>
            <p className="text-sm leading-relaxed text-content-hi">{estrutura.dica}</p>
          </div>
        </section>
      )}

      {props.acoes && <div className="space-y-2 pb-6">{props.acoes}</div>}

      {registrando && (
        <RegistrarReceitaSheet
          titulo={props.titulo}
          macrosPorPorcao={props.macrosPorPorcao}
          onFechar={() => setRegistrando(false)}
        />
      )}
    </div>
  )
}

/** Cada parte da receita no seu cartão — ingrediente não se mistura com preparo. */
function Secao(props: { icone?: string; titulo: string | null; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border border-surface-4 bg-surface-2 p-4">
      {props.titulo && (
        <h3 className="mb-3 flex items-center gap-2 border-b border-surface-4 pb-2 text-micro font-extrabold uppercase tracking-wide text-brand">
          {props.icone && <span aria-hidden="true">{props.icone}</span>}
          {props.titulo}
        </h3>
      )}
      {props.children}
    </section>
  )
}

function Passos(props: { passos: readonly string[] }) {
  return (
    <ol className="space-y-3">
      {props.passos.map((passo, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-surface-3 text-micro font-bold text-content-hi">
            {i + 1}
          </span>
          <span className="text-sm leading-relaxed text-content-hi">{passo}</span>
        </li>
      ))}
    </ol>
  )
}

function Macro(props: { valor: number | string; rotulo: string; cor: string }) {
  return (
    <div className="rounded-xl bg-surface-1 py-2">
      <div className="text-base font-extrabold" style={{ color: props.cor }}>{props.valor}</div>
      <div className="text-[10px] font-semibold uppercase text-content-dim">{props.rotulo}</div>
    </div>
  )
}
