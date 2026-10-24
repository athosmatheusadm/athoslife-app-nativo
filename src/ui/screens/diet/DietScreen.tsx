import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fmtG } from '@domain/rules/formatoNumero'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ProfileAvatar } from '@ui/components/ProfileAvatar'
import { BotaoStory } from '@ui/components/story/BotaoStory'
import { ActivityIcon } from '@ui/components/ActivityIcon'
import { useI18n } from '@/i18n/I18nProvider'
import { MealAccordion } from './MealAccordion'
import { MealSheet } from './MealSheet'
import { SupplementSheet } from './SupplementSheet'
import type { ItemRefeicao, Refeicao } from '@domain/entities/meal'
import { itensRefeicaoRepository, type RefeicaoAlvo } from '@data/repositories/itensRefeicaoRepository'
import { macrosRepository } from '@data/repositories/macrosRepository'
import type { TipoRefeicao } from '@data/repositories/refeicoesRepository'
import { calcularProgresso, type Metas, type Profile } from '@domain/entities/profile'
import { gerarTiraDias } from '@domain/entities/diaDieta'
import { avisar, vibrar } from '@ui/feedback'
import { CozinhaSecao } from '@ui/screens/cozinha/CozinhaSecao'
import { macrosRestantes } from '@domain/rules/cozinha'
import { LifeFlutuante } from '@ui/components/life/LifeFlutuante'
import { aoAplicarPlano } from '@app/eventosLife'
import { planosRepository, type PlanoDietaSalvo } from '@data/repositories/planosRepository'
import { quantidade } from '@ui/components/life/MontarPlanoNoLife'

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
 * A tela-mãe guarda: qual refeição tem o MealSheet aberto (uma por vez, por
 * CHAVE única — não por tipo, já que várias extras compartilham
 * tipo='extra'), o clipboard de copiar/colar (um item, entre refeições —
 * decisão do usuário de 2026-09-24, substituiu o antigo "copiar de outra
 * refeição" que clonava a refeição inteira via lista de origem), e qual dia
 * está selecionado — e é ela quem busca os dados de verdade toda vez que o
 * dia muda.
 */
export function DietScreen(props: {
  profile: Pick<Profile, 'metas' | 'plano' | 'trialExpira'>
  /** Refeição fixa que deve chegar já aberta (ex.: veio do Home tocando em "Almoço"). */
  abrirRefeicao?: string | null
  /** Veio do "+" da Home: cria uma refeição extra nova assim que a tela monta. */
  criarNovaAoAbrir?: boolean
  /** Avisa o pai (Dieta.tsx) que já pode limpar o `?novaExtra=1` da URL. */
  onNovaExtraCriada?: () => void
}) {
  const { profile } = props
  const metas: Metas = profile.metas
  const navigate = useNavigate()
  const { m, idioma } = useI18n()

  /**
   * Só abre sozinho quando veio de navegação explícita (ex.: Home tocando
   * em "Almoço") — sem isso, o sheet não deve pular na cara do usuário ao
   * simplesmente entrar na tela.
   */
  const [sheetChave, setSheetChave] = useState<string | null>(props.abrirRefeicao ?? null)
  const [suplementoChave, setSuplementoChave] = useState<string | null>(null)
  const [clipboard, setClipboard] = useState<ItemRefeicao | null>(null)

  const tira = useMemo(() => gerarTiraDias(), [])
  const [diaSel, setDiaSel] = useState<Date>(() => new Date())

  const [refeicoes, setRefeicoes] = useState<Refeicao[]>(
    BASE_REFEICOES.map((b) => ({ chave: b.tipo, id: null, tipo: b.tipo, nome: b.nome, emoji: b.emoji, ordem: b.ordem, itens: [], concluida: false })),
  )
  const [consumido, setConsumido] = useState({ kcal: 0, proteina: 0, carboidrato: 0, gordura: 0 })
  const [erroExtra, setErroExtra] = useState<string | null>(null)
  // 'carregando' só na 1ª vez: trocar de dia mantém a lista anterior na tela.
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'erro'>('carregando')

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
        icone: e.icone ?? 'tigela',
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
      setEstado('ok')
    } catch (e) {
      // Mantém o que já tinha na tela; se nunca carregou, mostra o erro com
      // "Tentar de novo" (antes ficava a lista vazia, como se não houvesse nada).
      console.error('carregarDia falhou:', e)
      setEstado((atual) => (atual === 'ok' ? 'ok' : 'erro'))
      if (estado === 'ok') avisar.erro(m.dieta.erroCarregar)
    }
  }

  /** Grava, recarrega o dia e dá retorno (vibração leve / aviso de erro). */
  async function gravar(acao: () => Promise<unknown>, aoDarCerto?: () => void): Promise<boolean> {
    try {
      await acao()
      vibrar.leve()
      aoDarCerto?.()
      await carregarDia(diaSel)
      return true
    } catch (e) {
      console.error('Dieta: gravar falhou:', e)
      avisar.erro(m.dieta.erroSalvar)
      return false
    }
  }

  useEffect(() => {
    void carregarDia(diaSel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diaSel])

  // Plano de referência de dieta (montado no chat do Life): cada card fixo
  // mostra o que o plano sugere, com "Comi o do plano" pra registrar de uma
  // vez. Não registra sozinho — o diário é o que a pessoa comeu de verdade.
  const [planoDieta, setPlanoDieta] = useState<PlanoDietaSalvo | null>(null)
  useEffect(() => {
    const carregar = () => void planosRepository.ultimoPlanoDieta().then(setPlanoDieta).catch(() => setPlanoDieta(null))
    carregar()
    return aoAplicarPlano((p) => p.tipo === 'dieta' && carregar())
  }, [])

  /** Itens do plano pra esta refeição que ainda não foram registrados (só os 4 fixos). */
  function itensDoPlano(r: Refeicao): ItemRefeicao[] {
    const doPlano = r.tipo === 'extra' ? undefined : planoDieta?.refeicoes.find((x) => x.tipo === r.tipo)
    if (!doPlano) return []
    const jaTem = new Set(r.itens.map((i) => i.nome))
    return doPlano.itens
      .filter((i) => !jaTem.has(i.nome))
      .map((i, idx) => ({
        id: `plano-${idx}`,
        nome: i.nome,
        quantidade: quantidade(m, i.gramas, i.porcaoG),
        calorias: i.calorias,
        proteina: i.proteina,
        carboidrato: i.carboidrato,
        gordura: i.gordura,
      }))
  }

  async function registrarDoPlano(r: Refeicao, itens: readonly ItemRefeicao[]) {
    return gravar(async () => {
      for (const { id: _temporario, ...item } of itens) {
        await itensRefeicaoRepository.adicionar(paraAlvo(r), diaSel, item)
      }
    })
  }

  // Veio do "+" da Home: cria a extra, abre ela, e avisa o pai pra limpar a URL.
  useEffect(() => {
    if (!props.criarNovaAoAbrir) return
    let ativo = true
    void (async () => {
      try {
        const nova = await itensRefeicaoRepository.criarExtra(diaSel, m.dieta.nomeNovaRefeicao)
        if (!ativo) return
        await carregarDia(diaSel)
        setSheetChave(nova.id)
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
      const nova = await itensRefeicaoRepository.criarExtra(diaSel, m.dieta.nomeNovaRefeicao)
      await carregarDia(diaSel)
      setSheetChave(nova.id)
    } catch (e) {
      console.error('criarExtra falhou:', e)
    }
  }

  async function adicionarItem(r: Refeicao, item: ItemRefeicao) {
    const { id: _idTemporario, ...semId } = item
    await gravar(
      () => itensRefeicaoRepository.adicionar(paraAlvo(r), diaSel, semId),
      () => avisar.ok(m.dieta.itemAdicionado(item.nome)),
    )
  }

  /** Excluir não pergunta: avisa com "Desfazer" (5 s), que grava o item de volta. */
  async function removerItem(r: Refeicao, itemId: string) {
    const item = r.itens.find((i) => i.id === itemId)
    const ok = await gravar(() => itensRefeicaoRepository.removerItem(itemId))
    if (ok && item) {
      avisar.desfazer(m.dieta.itemExcluido(item.nome), m.dieta.desfazer, () => {
        const { id: _antigo, ...semId } = item
        void gravar(() => itensRefeicaoRepository.adicionar(paraAlvo(r), diaSel, semId))
      })
    }
  }

  // A confirmação ("toque de novo") fica no próprio botão do MealSheet.
  async function excluirRefeicao(r: Refeicao) {
    const ok = await gravar(() =>
      r.tipo === 'extra' && r.id
        ? itensRefeicaoRepository.excluirExtra(r.id)
        : itensRefeicaoRepository.removerTodosDoTipo(r.tipo as TipoFixo, diaSel),
    )
    if (ok && r.tipo === 'extra') setSheetChave(null)
  }

  async function alternarConcluida(r: Refeicao) {
    await gravar(() =>
      r.tipo === 'extra' && r.id
        ? itensRefeicaoRepository.definirConcluidaExtra(r.id, !r.concluida)
        : itensRefeicaoRepository.definirConcluida(r.tipo as TipoFixo, diaSel, !r.concluida),
    () => !r.concluida && vibrar.sucesso(),
    )
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
      setErroExtra(e instanceof Error ? e.message : 'erro')
      console.error('renomearExtra falhou:', e)
    }
  }

  // Segurar ~0,35 s e arrastar (sem puxador "::"): toque curto continua abrindo a refeição e a lista rola normal.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 350, tolerance: 6 } }))

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

  // Nome das 4 fixas no idioma da pessoa (as extras têm o nome que ela deu).
  const visiveis = refeicoes.map((r) => (r.tipo === 'extra' ? r : { ...r, nome: m.dieta.refeicoes[r.tipo as TipoFixo] }))
  const diaSemanaCurto = new Intl.DateTimeFormat(idioma, { weekday: 'short' })
  const diaSemanaLongo = new Intl.DateTimeFormat(idioma, { weekday: 'long' })
  const dataCurta = new Intl.DateTimeFormat(idioma, { weekday: 'long', day: '2-digit', month: '2-digit' })
  const ehHoje = diaSel.toDateString() === new Date().toDateString()
  const tituloDoDia = ehHoje ? m.dieta.tituloHoje(diaSemanaLongo.format(diaSel)) : dataCurta.format(diaSel)

  // A tira tem 3 dias antes de Hoje: rola pra deixar o Hoje à vista na 1ª vez.
  const hojeRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    hojeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [])

  return (
    <main className="space-y-4 px-4 pb-28 pt-safe-t">
      <header className="flex items-center justify-between pt-3">
        <div className="flex items-center gap-2">
          <ActivityIcon icone="salada" tile={false} className="h-7 w-7" />
          <h1 className="text-xl font-bold text-content-hi">{m.dieta.titulo}</h1>
        </div>
        <div className="flex items-center gap-2">
          <BotaoStory modo="food" />
          <ProfileAvatar />
        </div>
      </header>

      {/* Cards de macro — kcal já mora no disco da Home; aqui o foco é
          mapear os 3 macros de verdade (proteína, carbo, gordura). */}
      <div className="flex gap-2">
        <MacroBar valor={`${fmtG(consumido.proteina)}g`} label={m.dieta.macroCurto.proteina} meta={`/${fmtG(metas.proteina)}g`} pct={calcularProgresso(consumido.proteina, metas.proteina)} cor="proteina" />
        <MacroBar valor={`${fmtG(consumido.carboidrato)}g`} label={m.dieta.macroCurto.carbo} meta={`/${fmtG(metas.carboidrato)}g`} pct={calcularProgresso(consumido.carboidrato, metas.carboidrato)} cor="carbo" />
        <MacroBar valor={`${fmtG(consumido.gordura)}g`} label={m.dieta.macroCurto.gordura} meta={`/${fmtG(metas.gordura)}g`} pct={calcularProgresso(consumido.gordura, metas.gordura)} cor="gordura" />
      </div>

      {/* TIRA DE DIAS — padrão Hoje */}
      <div className="-mx-4 flex gap-2 overflow-x-auto sem-barra px-4 pb-1">
        {tira.map((d) => {
          const sel = d.data.toDateString() === diaSel.toDateString()
          return (
            <button
              key={d.data.toISOString()}
              ref={d.ehHoje ? hojeRef : undefined}
              onClick={() => setDiaSel(d.data)}
              aria-pressed={sel}
              className={`min-h-12 min-w-14 flex-none rounded-xl px-3 py-1.5 text-center transition-colors active:scale-95 ${
                sel ? 'bg-brand text-brand-ink' : 'border border-surface-4 text-content-mid active:bg-content-hi/5'
              }`}
            >
              <span className="block text-sm font-bold capitalize">{d.ehHoje ? m.dieta.hoje : diaSemanaCurto.format(d.data).replace('.', '')}</span>
              <span className="block text-micro tabular-nums opacity-80">{String(d.data.getDate()).padStart(2, '0')}</span>
            </button>
          )
        })}
      </div>

      {/* Cabeçalho do dia */}
      <div className="flex items-center gap-2 px-1">
        <ActivityIcon icone="calendario" tile={false} className="h-5 w-5" />
        <div>
          <div className="font-semibold capitalize text-content-hi">{tituloDoDia}</div>
          <div className="text-micro tabular-nums text-content-low">{m.dieta.kcalRegistradas(consumido.kcal)}</div>
        </div>
      </div>

      {estado === 'carregando' && (
        <div className="space-y-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl border border-surface-4 bg-surface-2" />
          ))}
        </div>
      )}

      {estado === 'erro' && (
        <div className="rounded-2xl border border-surface-4 bg-surface-2 p-5 text-center">
          <p className="text-sm text-content-mid">{m.dieta.erroCarregar}</p>
          <button
            type="button"
            onClick={() => void carregarDia(diaSel)}
            className="mt-3 min-h-12 rounded-xl bg-surface-3 px-5 text-sm font-bold text-content-hi active:bg-surface-4"
          >
            {m.dieta.tentarDeNovo}
          </button>
        </div>
      )}

      {/* Refeições — as 4 fixas + as extras do usuário, arrastáveis. Tocar
          abre direto o MealSheet (sem acordeão intermediário). */}
      {estado === 'ok' && (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={refeicoes.map((r) => r.chave)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {visiveis.map((r) => (
              <SortableMealRow key={r.chave} chave={r.chave} draggable={r.tipo === 'extra'}>
                <MealAccordion
                  refeicao={r}
                  sugestaoPlano={(() => {
                    const doPlano = r.itens.length === 0 ? itensDoPlano(r) : []
                    return doPlano.length
                      ? { resumo: doPlano.map((i) => i.nome).join(' · '), kcal: doPlano.reduce((s, i) => s + i.calorias, 0) }
                      : null
                  })()}
                  onAbrir={() => setSheetChave(r.chave)}
                  onToggleConcluida={() => {
                    // Refeição vazia com plano: o ✓ é "comi o do plano" — registra e conclui.
                    const doPlano = r.itens.length === 0 && !r.concluida ? itensDoPlano(r) : []
                    void (doPlano.length ? registrarDoPlano(r, doPlano) : Promise.resolve()).then(() => alternarConcluida(r))
                  }}
                />
              </SortableMealRow>
            ))}
          </div>
        </SortableContext>
      </DndContext>
      )}

      {estado === 'ok' && (
        <button
          type="button"
          onClick={() => void criarExtraInline()}
          className="min-h-14 w-full rounded-2xl border border-dashed border-surface-4 text-sm font-semibold text-content-mid transition-colors active:bg-content-hi/5"
        >
          {m.dieta.novaRefeicao}
        </button>
      )}

      {/* Cozinha ATHOS — embutida na tela do dia, não uma aba separada.
          "Fecham seu dia" só olhando Hoje (é o que ainda dá pra comer). */}
      <CozinhaSecao
        profile={profile}
        restante={
          diaSel.toDateString() === new Date().toDateString()
            ? macrosRestantes(
                { calorias: metas.kcal, proteina: metas.proteina, carboidrato: metas.carboidrato, gordura: metas.gordura },
                { calorias: consumido.kcal, proteina: consumido.proteina, carboidrato: consumido.carboidrato, gordura: consumido.gordura },
              )
            : null
        }
      />

      {sheetChave && (() => {
        const r = visiveis.find((x) => x.chave === sheetChave)
        if (!r) return null
        return (
          <MealSheet
            refeicao={r}
            clipboard={clipboard}
            onFechar={() => setSheetChave(null)}
            onAdicionarItem={(item) => void adicionarItem(r, item)}
            sugestoesPlano={itensDoPlano(r)}
            onAdicionarPlano={(itens) => void registrarDoPlano(r, itens)}
            onRemoverItem={(itemId) => void removerItem(r, itemId)}
            onCopiarItem={(item) => {
              setClipboard(item)
              vibrar.leve()
              avisar.ok(m.dieta.itemCopiado(item.nome))
            }}
            onColar={() => clipboard && void adicionarItem(r, clipboard)}
            onExcluir={() => void excluirRefeicao(r)}
            onToggleConcluida={() => void alternarConcluida(r)}
            onEscanear={() =>
              navigate('/scanner', {
                state: { alvo: paraAlvo(r), nomeRefeicao: r.nome, dataISO: diaSel.toISOString() },
              })
            }
            onAbrirSuplemento={() => setSuplementoChave(r.chave)}
            {...(r.tipo === 'extra'
              ? {
                onRenomear: (nome: string) => void renomearExtra(r, nome), erroRenomear: erroExtra,
                onMudarIcone: async (icone: string) => {
                  if (!r.id) return
                  await itensRefeicaoRepository.definirIconeExtra(r.id, icone)
                  setRefeicoes((atuais) => atuais.map((x) => x.chave === r.chave ? { ...x, icone } : x))
                },
              }
              : {})}
          />
        )
      })()}

      {suplementoChave && (
        <SupplementSheet
          onAdicionar={(item) => {
            const r = refeicoes.find((x) => x.chave === suplementoChave)
            setSuplementoChave(null)
            if (r) void adicionarItem(r, item)
          }}
          onFechar={() => setSuplementoChave(null)}
        />
      )}

      {/* O Life da Dieta (chef): sabe de tudo, mas puxa pra comida. */}
      <LifeFlutuante humor="chef" foco="dieta" />
    </main>
  )
}

/** Wrapper arrastável (dnd-kit) de cada linha da lista. Fixas participam do reflow mas `draggable=false` trava o arraste delas. */
function SortableMealRow(props: {
  chave: string
  draggable: boolean
  children: ReactNode
}) {
  const { listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.chave,
    disabled: !props.draggable,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} {...(props.draggable ? listeners : {})}>
      {props.children}
    </div>
  )
}

// Classes inteiras (o Tailwind não enxerga classe montada por template).
const COR_MACRO = {
  proteina: { texto: 'text-macro-proteina', barra: 'bg-macro-proteina' },
  carbo: { texto: 'text-macro-carbo', barra: 'bg-macro-carbo' },
  gordura: { texto: 'text-macro-gordura', barra: 'bg-macro-gordura' },
} as const

// A meta ao lado do número: sem ela, "50 g" com a barra quase cheia parecia errado.
function MacroBar({ valor, meta, label, pct, cor }: { valor: string; meta: string; label: string; pct: number; cor: keyof typeof COR_MACRO }) {
  const c = COR_MACRO[cor]
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-surface-4 bg-surface-2 p-3">
      {/* Quebra em vez de vazar: 360 px e texto "Extra grande" (relatório do APK). */}
      <div className={`flex flex-wrap items-baseline justify-center text-lg font-bold leading-tight tabular-nums ${c.texto}`}>
        <span>{valor}</span>
        <span className="ml-0.5 text-micro font-semibold text-content-low">{meta}</span>
      </div>
      <div className="mb-2 break-words text-center text-micro leading-tight text-content-low">{label}</div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-4" role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full w-full origin-left rounded-full transition-transform duration-500 ease-athos ${c.barra}`} style={{ transform: `scaleX(${pct / 100})` }} />
      </div>
    </div>
  )
}

