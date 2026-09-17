import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ProfileAvatar } from '@ui/components/ProfileAvatar'
import { MealAccordion } from './MealAccordion'
import type { ItemRefeicao, Refeicao } from '@domain/entities/meal'
import { itensRefeicaoRepository, type RefeicaoAlvo } from '@data/repositories/itensRefeicaoRepository'
import { macrosRepository } from '@data/repositories/macrosRepository'
import type { TipoRefeicao } from '@data/repositories/refeicoesRepository'
import { calcularProgresso, type Metas, type Profile } from '@domain/entities/profile'
import { gerarTiraDias, tituloDia } from '@domain/entities/diaDieta'
import { cozinhaService } from '@domain/services/cozinhaService'
import { CATEGORIAS_RECEITA, CATEGORIA_META, type CategoriaReceita, type Receita } from '@domain/entities/receita'

type TipoFixo = 'cafe' | 'almoco' | 'lanche' | 'jantar'

const BASE_REFEICOES: readonly { tipo: TipoFixo; nome: string; emoji: string; ordem: number }[] = [
  { tipo: 'cafe', nome: 'Café', emoji: '☕', ordem: 10 },
  { tipo: 'almoco', nome: 'Almoço', emoji: '🍽️', ordem: 20 },
  { tipo: 'lanche', nome: 'Lanche', emoji: '🍎', ordem: 30 },
  { tipo: 'jantar', nome: 'Jantar', emoji: '🌙', ordem: 40 },
]

/** Vira o alvo que o repositório entende (fixo por tipo, ou extra por id). */
function paraAlvo(r: Refeicao): RefeicaoAlvo {
  return r.tipo === 'extra' && r.id ? { tipo: 'extra', extraId: r.id } : { tipo: r.tipo as TipoFixo }
}

/**
 * Tela Dieta ("Meu Plano") — um DIÁRIO alimentar.
 *
 * Decisão de UX validada: os outros dias viram uma TIRA horizontal no topo
 * (padrão: Hoje). Some a confusão do "por que tem Terça empilhada aqui".
 * Consultar ontem / planejar amanhã = deslizar. O foco é sempre Hoje.
 *
 * As 4 refeições fixas (Café/Almoço/Lanche/Jantar) sempre existem, em ordem
 * fixa. "Refeições extras" (Colação, Ceia, Pós-treino...) são criadas pelo
 * usuário sob demanda — pode haver quantas quiser no dia — e podem ser
 * arrastadas pra qualquer posição da lista (só elas são arrastáveis; as 4
 * fixas não se movem).
 *
 * A tela-mãe guarda: qual refeição está aberta (uma por vez, por CHAVE
 * única — não por tipo, já que várias extras compartilham tipo='extra'), se
 * a busca (ou o "copiar de"/edição) está aberta, e qual dia está
 * selecionado — e é ela quem busca os dados de verdade toda vez que o dia
 * muda.
 */
export function DietScreen(props: {
  profile: Pick<Profile, 'metas' | 'plano' | 'trialExpira'>
  /** Refeição fixa que deve chegar já aberta (ex.: veio do Home tocando em "Almoço"). */
  abrirRefeicao?: TipoFixo | null
  /** Veio do "+" da Home: cria uma refeição extra nova assim que a tela monta. */
  criarNovaAoAbrir?: boolean
  /** Avisa o pai (Dieta.tsx) que já pode limpar o `?novaExtra=1` da URL. */
  onNovaExtraCriada?: () => void
}) {
  const { profile } = props
  const metas: Metas = profile.metas
  const navigate = useNavigate()

  const [abertaChave, setAbertaChave] = useState<string | null>(props.abrirRefeicao ?? 'cafe')
  const [buscaChave, setBuscaChave] = useState<string | null>(null)
  const [clonandoChave, setClonandoChave] = useState<string | null>(null)

  const tira = useMemo(() => gerarTiraDias(), [])
  const [diaSel, setDiaSel] = useState<Date>(() => new Date())

  const [refeicoes, setRefeicoes] = useState<Refeicao[]>(
    BASE_REFEICOES.map((b) => ({ chave: b.tipo, id: null, tipo: b.tipo, nome: b.nome, emoji: b.emoji, ordem: b.ordem, itens: [], concluida: false })),
  )
  const [consumido, setConsumido] = useState({ kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 })
  const [erroExtra, setErroExtra] = useState<string | null>(null)

  async function carregarDia(dia: Date) {
    try {
      const [{ fixos, extras: itensExtras }, statusFixos, listaExtras, macros] = await Promise.all([
        itensRefeicaoRepository.doDia(dia),
        itensRefeicaoRepository.statusDoDia(dia),
        itensRefeicaoRepository.listarExtras(dia),
        macrosRepository.doDia(dia),
      ])

      const fixas: Refeicao[] = BASE_REFEICOES.map((b) => ({
        chave: b.tipo,
        id: null,
        tipo: b.tipo,
        nome: b.nome,
        emoji: b.emoji,
        ordem: b.ordem,
        itens: fixos.get(b.tipo) ?? [],
        concluida: statusFixos.get(b.tipo) ?? false,
      }))

      const extras: Refeicao[] = listaExtras.map((e) => ({
        chave: e.id,
        id: e.id,
        tipo: 'extra' as TipoRefeicao,
        nome: e.nome,
        emoji: '➕',
        ordem: e.ordem,
        itens: itensExtras.get(e.id) ?? [],
        concluida: e.concluida,
      }))

      setRefeicoes([...fixas, ...extras].sort((a, b) => a.ordem - b.ordem))
      setConsumido({
        kcal: macros.kcal,
        proteina: macros.proteina,
        carboidrato: macros.carboidrato,
        gordura: macros.gordura,
      })
    } catch (e) {
      // Falha silenciosa pro usuário (mesmo padrão do resto do app: mantém o
      // que já tinha na tela) — mas loga, porque essa é a causa mais comum
      // de "salvei e não mudou nada visualmente".
      console.error('carregarDia falhou:', e)
    }
  }

  useEffect(() => {
    void carregarDia(diaSel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaSel])

  // Veio do "+" da Home: cria a extra, abre ela, e avisa o pai pra limpar a URL.
  useEffect(() => {
    if (!props.criarNovaAoAbrir) return
    let ativo = true
    void (async () => {
      try {
        const nova = await itensRefeicaoRepository.criarExtra(diaSel)
        if (!ativo) return
        await carregarDia(diaSel)
        setAbertaChave(nova.id)
      } catch (e) {
        console.error('criarExtra (via Home) falhou:', e)
      } finally {
        if (ativo) props.onNovaExtraCriada?.()
      }
    })()
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.criarNovaAoAbrir])

  async function criarExtraInline() {
    try {
      const nova = await itensRefeicaoRepository.criarExtra(diaSel)
      await carregarDia(diaSel)
      setAbertaChave(nova.id)
    } catch (e) {
      console.error('criarExtra falhou:', e)
    }
  }

  async function adicionarItem(r: Refeicao, item: ItemRefeicao) {
    const { id: _idTemporario, ...semId } = item
    await itensRefeicaoRepository.adicionar(paraAlvo(r), diaSel, semId)
    await carregarDia(diaSel)
  }

  async function removerItem(itemId: string) {
    await itensRefeicaoRepository.removerItem(itemId)
    await carregarDia(diaSel)
  }

  async function excluirRefeicao(r: Refeicao) {
    if (r.tipo === 'extra' && r.id) {
      if (!window.confirm(`Excluir "${r.nome}" e todos os alimentos dela hoje?`)) return
      await itensRefeicaoRepository.excluirExtra(r.id)
    } else {
      if (!window.confirm('Excluir todos os alimentos desta refeição hoje?')) return
      await itensRefeicaoRepository.removerTodosDoTipo(r.tipo as TipoFixo, diaSel)
    }
    await carregarDia(diaSel)
  }

  async function alternarConcluida(r: Refeicao) {
    if (r.tipo === 'extra' && r.id) {
      await itensRefeicaoRepository.definirConcluidaExtra(r.id, !r.concluida)
    } else {
      await itensRefeicaoRepository.definirConcluida(r.tipo as TipoFixo, diaSel, !r.concluida)
    }
    await carregarDia(diaSel)
  }

  async function clonarDe(origem: Refeicao, destino: Refeicao) {
    await itensRefeicaoRepository.clonar(paraAlvo(origem), paraAlvo(destino), diaSel)
    setClonandoChave(null)
    await carregarDia(diaSel)
  }

  async function renomearExtra(r: Refeicao, nome: string) {
    if (!r.id) return
    const limpo = nome.trim()
    if (!limpo) return
    try {
      setErroExtra(null)
      await itensRefeicaoRepository.renomearExtraPorId(r.id, limpo)
      await carregarDia(diaSel)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não deu pra salvar o nome.'
      setErroExtra(msg)
      console.error('renomearExtra falhou:', e)
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const ativa = refeicoes.find((r) => r.chave === active.id)
    if (!ativa || ativa.tipo !== 'extra' || !ativa.id) return // só extras arrastam

    const oldIndex = refeicoes.findIndex((r) => r.chave === active.id)
    const newIndex = refeicoes.findIndex((r) => r.chave === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordenada = arrayMove(refeicoes, oldIndex, newIndex)
    const idx = reordenada.findIndex((r) => r.chave === active.id)
    const anterior = reordenada[idx - 1]
    const proxima = reordenada[idx + 1]
    const novaOrdem =
      anterior && proxima
        ? (anterior.ordem + proxima.ordem) / 2
        : anterior
          ? anterior.ordem + 10
          : proxima
            ? proxima.ordem - 10
            : 10

    setRefeicoes(reordenada.map((r) => (r.chave === active.id ? { ...r, ordem: novaOrdem } : r)))

    const extraId = ativa.id
    void itensRefeicaoRepository.reordenarExtra(extraId, novaOrdem).catch((e) => {
      console.error('reordenarExtra falhou:', e)
      void carregarDia(diaSel)
    })
  }

  return (
    <main className="space-y-4 px-4 pb-24 pt-safe-t">
      <header className="flex items-center justify-between pt-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🥗</span>
          <h1 className="text-xl font-bold text-content-hi">Meu Plano</h1>
        </div>
        <ProfileAvatar />
      </header>

      {/* Cards de macro — kcal já mora no disco da Home; aqui o foco é
          mapear os 3 macros de verdade (proteína, carbo, gordura). */}
      <div className="flex gap-2">
        <MacroBar valor={`${consumido.proteina}g`} label="proteína" pct={calcularProgresso(consumido.proteina, metas.proteina)} cor="#f43f5e" />
        <MacroBar valor={`${consumido.carboidrato}g`} label="carbo" pct={calcularProgresso(consumido.carboidrato, metas.carboidrato)} cor="#3b82f6" />
        <MacroBar valor={`${consumido.gordura}g`} label="gordura" pct={calcularProgresso(consumido.gordura, metas.gordura)} cor="#fbbf24" />
      </div>

      {/* TIRA DE DIAS — padrão Hoje */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tira.map((d) => {
          const sel = d.data.toDateString() === diaSel.toDateString()
          return (
            <button
              key={d.data.toISOString()}
              onClick={() => setDiaSel(d.data)}
              className={`flex-none rounded-xl px-4 py-2 text-center transition-colors ${
                sel ? 'bg-brand text-[#04120a]' : 'border border-surface-4 text-content-mid'
              }`}
            >
              <span className="block text-sm font-bold">{d.rotulo}</span>
              <span className="block text-[10px] opacity-80">{String(d.data.getDate()).padStart(2, '0')}</span>
            </button>
          )
        })}
      </div>

      {/* Cabeçalho do dia */}
      <div className="flex items-center gap-2 px-1">
        <span>📅</span>
        <div>
          <div className="font-semibold text-content-hi">{tituloDia(diaSel)}</div>
          <div className="text-micro text-content-low">{consumido.kcal} kcal registradas</div>
        </div>
      </div>

      {/* Refeições em acordeão — as 4 fixas + as extras do usuário, arrastáveis */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={refeicoes.map((r) => r.chave)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {refeicoes.map((r) => {
              const outras = refeicoes.filter((x) => x.chave !== r.chave && x.itens.length > 0)

              return (
                <SortableMealRow key={r.chave} chave={r.chave} draggable={r.tipo === 'extra'}>
                  {(handle) => (
                    <MealAccordion
                      refeicao={r}
                      aberto={abertaChave === r.chave}
                      buscaAberta={buscaChave === r.chave}
                      clonando={clonandoChave === r.chave}
                      outrasRefeicoes={outras.map((x) => ({ chave: x.chave, nome: x.nome }))}
                      dragHandleProps={handle}
                      onToggle={() => {
                        setAbertaChave((atual) => (atual === r.chave ? null : r.chave))
                        setBuscaChave(null)
                        setClonandoChave(null)
                      }}
                      onAbrirBusca={() => {
                        setBuscaChave(r.chave)
                        setClonandoChave(null)
                      }}
                      onFecharBusca={() => setBuscaChave(null)}
                      onAdicionarItem={(item) => void adicionarItem(r, item)}
                      onRemoverItem={(itemId) => void removerItem(itemId)}
                      onExcluir={() => void excluirRefeicao(r)}
                      onToggleConcluida={() => void alternarConcluida(r)}
                      onAbrirClonar={() => {
                        setClonandoChave(r.chave)
                        setBuscaChave(null)
                      }}
                      onFecharClonar={() => setClonandoChave(null)}
                      onClonarDe={(origemChave) => {
                        const origem = refeicoes.find((x) => x.chave === origemChave)
                        if (origem) void clonarDe(origem, r)
                      }}
                      {...(r.tipo === 'extra'
                        ? { onRenomear: (nome: string) => void renomearExtra(r, nome), erroRenomear: erroExtra }
                        : {})}
                    />
                  )}
                </SortableMealRow>
              )
            })}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={() => void criarExtraInline()}
        className="w-full rounded-2xl border border-dashed border-surface-4 py-3.5 text-sm font-semibold text-content-mid transition-colors active:bg-white/5"
      >
        + Nova refeição
      </button>

      {/* Cozinha ATHOS — embutida na tela do dia, não uma aba separada. */}
      <div>
        <h2 className="mb-2 flex items-center gap-1.5 px-1 text-base font-bold text-content-hi">
          🍳 Cozinha Athos
        </h2>
        <CozinhaTab profile={profile} onAbrirReceita={(id) => navigate(`/dieta/cozinha/${id}`)} />
      </div>
    </main>
  )
}

/** Wrapper arrastável (dnd-kit) de cada linha da lista. Fixas participam do reflow mas `draggable=false` trava o arraste delas. */
function SortableMealRow(props: {
  chave: string
  draggable: boolean
  children: (handle: { attributes: DraggableAttributes; listeners: DraggableSyntheticListeners } | null) => ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.chave,
    disabled: !props.draggable,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }
  return (
    <div ref={setNodeRef} style={style}>
      {props.children(props.draggable ? { attributes, listeners } : null)}
    </div>
  )
}

function MacroBar({ valor, label, pct, cor }: { valor: string; label: string; pct: number; cor: string }) {
  return (
    <div className="flex-1 rounded-xl border border-surface-4 bg-surface-2 p-3">
      <div className="text-center text-lg font-bold" style={{ color: cor }}>{valor}</div>
      <div className="mb-2 text-center text-micro text-content-dim">{label}</div>
      <div className="h-1 overflow-hidden rounded-full bg-surface-4">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} />
      </div>
    </div>
  )
}

/**
 * "Cozinha" — o mini e-book de receitas (spec: COZINHA_DIRECTIVE.md).
 * Grade filtrável por categoria, com cadeado nas receitas premium (usuário
 * sem acesso) e favoritar direto no card. Toda a decisão de bloqueio já
 * vem pronta de `cozinhaService.listar()` — a UI não decide acesso.
 */
function CozinhaTab({
  profile,
  onAbrirReceita,
}: {
  profile: Pick<Profile, 'plano' | 'trialExpira'>
  onAbrirReceita: (id: string) => void
}) {
  const [receitas, setReceitas] = useState<Receita[] | null>(null)
  const [filtro, setFiltro] = useState<CategoriaReceita | 'todos'>('todos')

  useEffect(() => {
    let ativo = true
    void cozinhaService
      .listar(profile)
      .then((todas) => {
        if (!ativo) return
        setReceitas(todas)
      })
      .catch(() => ativo && setReceitas([]))
    return () => {
      ativo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function alternarFavorito(r: Receita) {
    if (r.favoritada) await cozinhaService.desfavoritar(r.id)
    else await cozinhaService.favoritar(r.id)
    setReceitas((atual) => atual?.map((x) => (x.id === r.id ? { ...x, favoritada: !x.favoritada } : x)) ?? atual)
  }

  if (receitas === null) {
    return <p className="py-10 text-center text-micro text-content-low">Carregando…</p>
  }
  if (receitas.length === 0) {
    return <p className="py-10 text-center text-micro text-content-low">A Cozinha ATHOS aparece aqui em breve.</p>
  }

  const filtradas = filtro === 'todos' ? receitas : receitas.filter((r) => r.categoria === filtro)

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setFiltro('todos')}
          className={`flex-none rounded-pill px-3.5 py-1.5 text-micro font-bold transition-colors ${filtro === 'todos' ? 'bg-brand text-[#04120a]' : 'border border-surface-4 bg-surface-2 text-content-mid'}`}
        >
          Todos
        </button>
        {CATEGORIAS_RECEITA.map((cat) => {
          const meta = CATEGORIA_META[cat]
          const ativo = filtro === cat
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFiltro(cat)}
              className={`flex-none rounded-pill px-3.5 py-1.5 text-micro font-bold transition-colors ${ativo ? '' : 'border border-surface-4 bg-surface-2'}`}
              style={ativo ? { backgroundColor: meta.cor, color: '#04120a' } : { color: meta.cor }}
            >
              {meta.emoji} {meta.rotulo}
            </button>
          )
        })}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {filtradas.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onAbrirReceita(r.id)}
            className={`w-40 flex-none overflow-hidden rounded-2xl border border-surface-4 bg-surface-2 text-left transition-transform active:scale-[0.98] ${r.bloqueada ? 'opacity-60' : ''}`}
          >
            <div
              className="flex h-24 items-center justify-center text-4xl"
              style={{ background: `linear-gradient(135deg, ${r.corTema}33, transparent)` }}
            >
              {CATEGORIA_META[r.categoria].emoji}
            </div>
            <div className="p-2.5">
              <div className="mb-1.5 line-clamp-2 text-micro font-bold leading-snug text-content-hi">
                {r.titulo}
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                <span
                  className="rounded-pill px-2 py-0.5 text-[9px] font-bold"
                  style={{ backgroundColor: `${r.corTema}22`, color: r.corTema }}
                >
                  {r.macros.calorias} kcal
                </span>
                <span className="rounded-pill bg-[#f43f5e22] px-2 py-0.5 text-[9px] font-bold text-[#f43f5e]">
                  {r.macros.proteina}g prot
                </span>
                <span className="rounded-pill bg-[#3b82f622] px-2 py-0.5 text-[9px] font-bold text-[#3b82f6]">
                  {r.macros.carboidrato}g carb
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-content-dim">
                  {r.tempoPreparoMin != null ? `⏱ ${r.tempoPreparoMin}min` : ''}
                </span>
                {r.bloqueada ? (
                  <span aria-label="Receita premium" className="flex-none text-content-dim">🔒</span>
                ) : (
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.stopPropagation()
                      void alternarFavorito(r)
                    }}
                    aria-label={r.favoritada ? 'Desfavoritar' : 'Favoritar'}
                    className={`flex-none text-sm ${r.favoritada ? 'text-[#f43f5e]' : 'text-content-dim'}`}
                  >
                    {r.favoritada ? '♥' : '♡'}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
