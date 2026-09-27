import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { alimentosRepository } from '@data/repositories/alimentosRepository'
import { escalarMacros } from '@domain/rules/foodReconciliation'
import { FavoritoStar, MacroChips } from './InlineFoodSearch'
import type { AlimentoBase } from '@domain/entities/food'
import type { ItemRefeicao } from '@domain/entities/meal'

interface Grupo {
  nome: string
  itens: AlimentoBase[]
}

/**
 * Agrupa por tipo (Whey, Creatina...) em vez de listar toda marca solta —
 * a base tem ~20 variantes só de Whey (Growth/Max Titanium/Integralmedica/
 * Dux...), listar cada uma como card próprio no carrossel deixava
 * repetitivo. Heurística por palavra-chave (mesma disciplina do
 * emojiGrupo abaixo): sem coluna de "tipo" na tabela `alimentos`, então
 * isso é aproximado — cai no nome inteiro quando não reconhece nada.
 */
function grupoDe(nome: string): string {
  const n = nome.toLowerCase()
  if (n.startsWith('whey')) return 'Whey Protein'
  if (n.startsWith('creatina')) return 'Creatina'
  if (n.startsWith('albumina')) return 'Albumina'
  if (n.startsWith('bcaa')) return 'BCAA'
  if (n.startsWith('beta alanina')) return 'Beta Alanina'
  if (n.startsWith('maltodextrina')) return 'Maltodextrina'
  if (n.startsWith('dextrose')) return 'Dextrose'
  if (n.startsWith('palatinose')) return 'Palatinose'
  if (n.startsWith('hipercal')) return 'Hipercalórico'
  if (n.startsWith('glutamina')) return 'Glutamina'
  if (n.startsWith('pré-treino') || n.startsWith('pre-treino')) return 'Pré-treino'
  if (n.startsWith('multivitamínico') || n.startsWith('multivitaminico')) return 'Multivitamínico'
  if (n.startsWith('ômega') || n.startsWith('omega')) return 'Ômega 3'
  if (n.startsWith('colágeno') || n.startsWith('colageno')) return 'Colágeno'
  if (n.startsWith('zma')) return 'ZMA'
  if (n.startsWith('cafeína') || n.startsWith('cafeina')) return 'Cafeína'
  return nome
}

function agrupar(lista: readonly AlimentoBase[]): Grupo[] {
  const mapa = new Map<string, AlimentoBase[]>()
  for (const a of lista) {
    const chave = grupoDe(a.nome)
    const atual = mapa.get(chave) ?? []
    atual.push(a)
    mapa.set(chave, atual)
  }
  return Array.from(mapa.entries())
    .map(([nome, itens]) => ({ nome, itens }))
    .sort((a, b) => a.nome.localeCompare(b.nome))
}

/**
 * "Registrar suplemento" — carrossel por TIPO (Whey/Creatina/BCAA...), sem
 * tabela nova: busca em `alimentos` filtrado por categoria='suplemento'
 * (~30 itens já cadastrados). Grupo com uma variante só pula direto pro
 * ajuste de porção; grupo com várias (ex. Whey) abre uma lista pra
 * escolher a marca/tipo específico. A porção final reaproveita o mesmo
 * PorcaoInline da busca normal — inclusive a ⭐ de favoritar.
 */
export function SupplementSheet(props: {
  onAdicionar: (item: ItemRefeicao) => void
  onFechar: () => void
}) {
  const [suplementos, setSuplementos] = useState<AlimentoBase[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [indice, setIndice] = useState(0)
  const [termo, setTermo] = useState('')
  const [grupoAberto, setGrupoAberto] = useState<Grupo | null>(null)
  const [termoGrupo, setTermoGrupo] = useState('')
  const [escolhido, setEscolhido] = useState<AlimentoBase | null>(null)

  useEffect(() => {
    let ativo = true
    alimentosRepository
      .porCategoria('suplemento')
      .then((lista) => ativo && setSuplementos(lista))
      .catch(() => ativo && setErro('Não deu pra carregar os suplementos agora.'))
    return () => {
      ativo = false
    }
  }, [])

  const grupos = useMemo(() => (suplementos ? agrupar(suplementos) : []), [suplementos])

  const gruposFiltrados = useMemo(() => {
    const t = termo.trim().toLowerCase()
    if (!t) return grupos
    return grupos.filter((g) => g.nome.toLowerCase().includes(t))
  }, [grupos, termo])

  useEffect(() => {
    setIndice(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gruposFiltrados])

  const grupoAtual = gruposFiltrados[indice] ?? null

  function trocar(dir: 1 | -1) {
    if (gruposFiltrados.length === 0) return
    setIndice((i) => (i + dir + gruposFiltrados.length) % gruposFiltrados.length)
  }

  function abrirGrupo(g: Grupo) {
    if (g.itens.length === 1) {
      setEscolhido(g.itens[0]!)
    } else {
      setGrupoAberto(g)
      setTermoGrupo('')
    }
  }

  const itensDoGrupoFiltrados = useMemo(() => {
    if (!grupoAberto) return []
    const t = termoGrupo.trim().toLowerCase()
    if (!t) return grupoAberto.itens
    return grupoAberto.itens.filter((a) => a.nome.toLowerCase().includes(t))
  }, [grupoAberto, termoGrupo])

  if (escolhido) {
    return (
      <Casca onFechar={props.onFechar} titulo="Registrar suplemento">
        <DoseSuplemento
          alimento={escolhido}
          onVoltar={() => setEscolhido(null)}
          onConfirmar={(item) => {
            props.onAdicionar(item)
            setEscolhido(null)
          }}
        />
      </Casca>
    )
  }

  if (grupoAberto) {
    return (
      <Casca onFechar={props.onFechar} titulo={grupoAberto.nome}>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGrupoAberto(null)}
            aria-label="Voltar aos tipos de suplemento"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-surface-4 text-2xl leading-none text-content-hi"
          >
            ‹
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-surface-4 bg-surface-3 px-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={termoGrupo}
              onChange={(e) => setTermoGrupo(e.target.value)}
              placeholder={`Pesquisar em ${grupoAberto.nome}…`}
              autoFocus
              className="min-h-10 flex-1 bg-transparent text-sm text-content-hi placeholder:text-content-dim focus:outline-none"
            />
          </div>
        </div>

        <ul className="mt-2 max-h-72 overflow-y-auto">
          {itensDoGrupoFiltrados.map((a) => (
            <li key={a.id}>
              <button
                onClick={() => setEscolhido(a)}
                className="flex w-full items-center justify-between gap-3 border-t border-surface-3 py-2.5 text-left first:border-t-0"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-content-hi">{a.nome}</span>
                  <span className="block text-micro text-content-low">{a.porcaoG}g de referência</span>
                </span>
                <span className="flex-none text-right">
                  <span className="block text-sm font-bold text-brand">{a.calorias} kcal</span>
                  <span className="block text-micro text-content-dim">{a.proteina}g prot</span>
                </span>
              </button>
            </li>
          ))}
          {itensDoGrupoFiltrados.length === 0 && (
            <li className="py-3 text-center text-micro text-content-low">Nada encontrado.</li>
          )}
        </ul>
      </Casca>
    )
  }

  return (
    <Casca onFechar={props.onFechar} titulo="Registrar suplemento">
      {erro && <p className="mt-4 text-sm text-accent-danger">{erro}</p>}
      {!erro && !suplementos && <p className="mt-6 text-center text-sm text-content-low">Carregando…</p>}
      {!erro && suplementos && suplementos.length === 0 && (
        <p className="mt-6 text-center text-sm text-content-low">Nenhum suplemento cadastrado na base ainda.</p>
      )}

      {grupoAtual && (
        <>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-surface-4 bg-surface-3 px-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4-4" />
            </svg>
            <input
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Pesquisar tipo de suplemento…"
              className="min-h-10 flex-1 bg-transparent text-sm text-content-hi placeholder:text-content-dim focus:outline-none"
            />
          </div>

          <div className="mt-5 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => trocar(-1)}
              aria-label="Tipo anterior"
              disabled={gruposFiltrados.length <= 1}
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-surface-4 text-2xl text-content-hi disabled:opacity-30"
            >
              ‹
            </button>
            <div className="min-w-0 flex-1 text-center">
              <span className="text-5xl">{emojiGrupo(grupoAtual.nome)}</span>
              <h3 className="mt-2 truncate text-lg font-extrabold text-content-hi">{grupoAtual.nome}</h3>
            </div>
            <button
              type="button"
              onClick={() => trocar(1)}
              aria-label="Próximo tipo"
              disabled={gruposFiltrados.length <= 1}
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full border border-surface-4 text-2xl text-content-hi disabled:opacity-30"
            >
              ›
            </button>
          </div>

          <button
            type="button"
            onClick={() => abrirGrupo(grupoAtual)}
            className="mt-5 w-full rounded-2xl bg-brand py-4 font-bold text-[#04120a] transition-transform active:scale-[0.98]"
          >
            {grupoAtual.itens.length === 1 ? 'Continuar' : 'Ver opções'}
          </button>
        </>
      )}
    </Casca>
  )
}

/** Casca compartilhada do bottom sheet (fundo + título + fechar). */
function Casca(props: { titulo: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={props.titulo}>
      <button
        aria-label="Fechar"
        onClick={props.onFechar}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm motion-safe:animate-[fadeIn_0.2s_ease]"
      />
      <div className="relative w-full max-w-md rounded-t-3xl border-t border-surface-4 bg-surface-1 p-6 pb-safe-b motion-safe:animate-[slideUp_0.3s_cubic-bezier(0.22,1,0.36,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-surface-4" aria-hidden="true" />
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-content-hi">{props.titulo}</h2>
          <button onClick={props.onFechar} aria-label="Fechar" className="text-2xl text-content-dim">×</button>
        </div>
        {props.children}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>
    </div>
  )
}

/**
 * Tela final de dose — própria do suplemento, não reaproveita o
 * PorcaoInline da busca de comida (tinha ficado com cara de "Adicionar à
 * refeição" genérico; o usuário pediu de volta a identidade do mockup
 * original: categoria, "Registrar consumo", dose habitual). Só a ⭐
 * (FavoritoStar) é compartilhada com a busca normal — favoritar é a mesma
 * ideia nos dois lugares.
 */
function DoseSuplemento(props: {
  alimento: AlimentoBase
  onVoltar: () => void
  onConfirmar: (item: ItemRefeicao) => void
}) {
  const { alimento } = props
  const [gramas, setGramas] = useState(alimento.porcaoG)
  const m = escalarMacros(alimento, gramas)
  const hoje = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2">
        <button
          onClick={props.onVoltar}
          aria-label="Voltar aos tipos de suplemento"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-lg border border-surface-4 text-2xl leading-none text-content-hi"
        >
          ‹
        </button>
        <span className="flex-1" />
        <FavoritoStar alimentoId={alimento.id} />
      </div>

      <div className="mt-2 text-center">
        <span className="text-5xl">{emojiGrupo(grupoDe(alimento.nome))}</span>
        <p className="mt-2 text-micro font-bold uppercase tracking-wide text-content-dim">Suplemento</p>
        <h3 className="mt-1 text-2xl font-extrabold text-content-hi">{alimento.nome}</h3>
      </div>

      <div className="mt-2 flex justify-center">
        <MacroChips m={m} />
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={gramas}
          onChange={(e) => setGramas(Math.max(0, Number(e.target.value) || 0))}
          className="w-24 rounded-xl border border-surface-4 bg-surface-3 px-3 py-2.5 text-center font-bold text-content-hi focus:border-brand focus:outline-none"
        />
        <span className="text-sm font-semibold text-content-low">g</span>
        <span className="ml-3 text-sm font-bold text-brand">{m.calorias} kcal</span>
      </div>

      <button
        type="button"
        onClick={() =>
          props.onConfirmar({ id: `item-${Date.now()}`, nome: alimento.nome, quantidade: `${gramas} g`, ...m })
        }
        disabled={gramas <= 0}
        className="mt-4 w-full rounded-2xl bg-brand py-4 font-bold text-[#04120a] transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        Registrar consumo
      </button>

      <p className="mt-2 text-center text-micro text-content-dim">
        Dose habitual: {alimento.porcaoG} g • hoje, {hoje}
      </p>
    </div>
  )
}

/** Emoji por palavra-chave do nome do grupo — a base não tem coluna de ícone. */
function emojiGrupo(nome: string): string {
  const n = nome.toLowerCase()
  if (n.includes('whey') || n.includes('albumina')) return '🥛'
  if (n.includes('creatina') || n.includes('glutamina')) return '💊'
  if (n.includes('bcaa') || n.includes('alanina')) return '🧪'
  if (n.includes('hipercal')) return '🥤'
  if (n.includes('malto') || n.includes('dextrose') || n.includes('palatinose')) return '⚡'
  if (n.includes('pré-treino') || n.includes('pre-treino')) return '⚡'
  if (n.includes('multivitamínico') || n.includes('multivitaminico')) return '🌡️'
  if (n.includes('ômega') || n.includes('omega')) return '🐟'
  if (n.includes('colágeno') || n.includes('colageno')) return '✨'
  if (n.includes('zma')) return '🌙'
  if (n.includes('cafeína') || n.includes('cafeina')) return '☕'
  return '💊'
}
