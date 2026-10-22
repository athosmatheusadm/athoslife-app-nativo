import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  aplicarModelo,
  campoPersonalizado,
  CORES_STORY,
  criarEstado,
  limitar,
  mudarItem,
  type EstadoStory,
  type ItemStory,
  type ModeloStory,
  type ModoStory,
  type ValoresStory,
} from '@domain/entities/story'
import { capturarFoto } from '@data/ai/photoCapture'
import { compartilharImagem, postarNoStory, type ComoFoi } from '@data/native/instagramStory'
import { macrosRepository } from '@data/repositories/macrosRepository'
import { treinoHistoricoRepository } from '@data/repositories/treinoHistoricoRepository'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { avisar, vibrar } from '@ui/feedback'
import { useI18n } from '@/i18n/I18nProvider'
import type { GrupoMuscular } from '@domain/entities/treino'
import { caixa, cantos, carregarImagem, desenhar, encaixar, exportar, forma, H, W, type Canto, type Midia } from './storyCanvas'

/**
 * Story Studio no formato do protótipo do dono (ATHOS_Story_Editor_Unificado_V2):
 * a foto vem primeiro; Foto · Adicionar · Modelos · Ajustes embaixo; tocar
 * num elemento abre os ajustes dele (opacidade, cor, texto, outro lado…) e
 * puxar um canto redimensiona. Só Musculação e Alimentação por enquanto.
 *
 * Entrada: `navigate('/story', { state: { modo, escolher } })`. Câmera da
 * Dieta → food; do Treino e do fim do treino → gym; da Home → `escolher`
 * mostra as abas. Os dados vêm do banco (último treino / dieta de hoje).
 */

interface EntradaStory {
  readonly modo?: ModoStory
  /** Mostra as abas Musculação / Alimentação (entrada pela Home). */
  readonly escolher?: boolean
}

const LIFE: Record<ModoStory, string> = { gym: '/life/treino.webp', food: '/life/chef.webp' }
const COR_SELECAO = '#d3f6a2'
type Gaveta = null | 'adicionar' | 'modelos' | 'ajustes'

export function StoryScreen() {
  const entrada = (useLocation().state ?? {}) as EntradaStory
  const navigate = useNavigate()
  const { m, idioma } = useI18n()
  const t = m.story
  const escolher = entrada.escolher ?? !entrada.modo

  const [modo, setModo] = useState<ModoStory>(entrada.modo ?? 'gym')
  const [estados, setEstados] = useState<Partial<Record<ModoStory, EstadoStory>>>({})
  const [historicos, setHistoricos] = useState<Record<ModoStory, EstadoStory[]>>({ gym: [], food: [] })
  const [fotoSrc, setFotoSrc] = useState<string | null>(null)
  const [foto, setFoto] = useState<HTMLImageElement | null>(null)
  const [life, setLife] = useState<HTMLImageElement | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [gaveta, setGaveta] = useState<Gaveta>(null)
  const [editandoTexto, setEditandoTexto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const cv = useRef<HTMLCanvasElement>(null)

  const estado = estados[modo]
  const item = estado?.itens.find((i) => i.id === sel) ?? null
  const temDados = estado?.itens.some((i) => i.tipo === 'metric') ?? false

  useFecharNoVoltar(gaveta !== null, () => setGaveta(null))
  useFecharNoVoltar(sel !== null, () => setSel(null))

  // Dados reais da modalidade (uma vez por modalidade).
  useEffect(() => {
    if (estados[modo]) return
    let vivo = true
    const textos = {
      campos: t.campos,
      life: modo === 'gym' ? t.lifeTreino : t.lifeChef,
      halter: t.halter,
      grafico: t.grafico,
      linhas: t.linhas,
    }
    const num = (n: number, casas = 0) => n.toLocaleString(idioma, { maximumFractionDigits: casas })
    const carregar = async (): Promise<ValoresStory> => {
      if (modo === 'food') {
        const d = await macrosRepository.doDia()
        if (!d.kcal && !d.proteina) return {}
        return { kcal: `≈ ${num(d.kcal)}`, protein: num(d.proteina, 1), carbs: num(d.carboidrato, 1), fat: num(d.gordura, 1) }
      }
      const tr = await treinoHistoricoRepository.ultimoParaStory()
      if (!tr) return {}
      return {
        ...(tr.recorde
          ? { pr: t.pr(num(tr.recorde.kg, 1), tr.recorde.exercicio), evolution: t.evolucao(num(tr.recorde.ganhoKg, 1)) }
          : {}),
        ...(tr.grupo ? { focus: m.treino.grupos[tr.grupo as GrupoMuscular] ?? tr.grupo } : {}),
        ...(tr.volumeKg > 0 ? { volume: num(tr.volumeKg) } : {}),
        ...(tr.series > 0 ? { sets: String(tr.series) } : {}),
        ...(tr.duracaoMin > 0 ? { duration: String(tr.duracaoMin) } : {}),
        ...(tr.blocos.length > 1 ? { blocks: tr.blocos } : {}),
      }
    }
    carregar()
      .catch(() => ({}))
      .then((valores) => {
        if (vivo) setEstados((e) => ({ ...e, [modo]: criarEstado(modo, valores, textos) }))
      })
    return () => {
      vivo = false
    }
  }, [modo, estados, t, m.treino.grupos, idioma])

  useEffect(() => {
    let vivo = true
    setLife(null)
    void carregarImagem(LIFE[modo]).then((im) => vivo && setLife(im)).catch(() => {})
    return () => {
      vivo = false
    }
  }, [modo])

  useEffect(() => {
    if (!fotoSrc) return setFoto(null)
    let vivo = true
    void carregarImagem(fotoSrc).then((im) => vivo && setFoto(im)).catch(() => avisar.erro(t.erro))
    return () => {
      vivo = false
    }
  }, [fotoSrc, t.erro])

  const midia: Midia = { foto, life, rotuloGrafico: t.graficoRotulo, idioma }
  const ctx = () => cv.current?.getContext('2d') ?? null
  const pxPorPonto = () => W / (cv.current?.getBoundingClientRect().width || W)

  // Desenha a prévia a cada mudança.
  useEffect(() => {
    const c = ctx()
    if (!c || !estado) return
    desenhar(c, estado, modo, midia, item ? { item, pxPorPonto: pxPorPonto(), cor: COR_SELECAO } : undefined)
  })

  // ── estado + desfazer ─────────────────────────────────────────────────
  const atualizar = useCallback(
    (fn: (e: EstadoStory) => EstadoStory) => setEstados((es) => (es[modo] ? { ...es, [modo]: fn(es[modo]!) } : es)),
    [modo],
  )
  function guardar() {
    if (!estado) return
    setHistoricos((h) => ({ ...h, [modo]: [...h[modo].slice(-34), estado] }))
  }
  function desfazer() {
    const anterior = historicos[modo][historicos[modo].length - 1]
    if (!anterior) return
    setHistoricos((h) => ({ ...h, [modo]: h[modo].slice(0, -1) }))
    setEstados((es) => ({ ...es, [modo]: anterior }))
    setSel(null)
    avisar.ok(t.desfeito)
  }
  function mudar(fn: (i: ItemStory) => ItemStory) {
    if (!sel) return
    atualizar((e) => mudarItem(e, sel, fn))
  }
  function encaixado(i: ItemStory): ItemStory {
    const c = ctx()
    return c ? encaixar(c, i, modo, midia) : i
  }

  // ── gesto: mover e puxar canto (igual ao V2) ──────────────────────────
  const gesto = useRef<{
    id: string
    ponteiro: number
    x: number
    y: number
    ox: number
    oy: number
    tamanho: number
    canto: Canto | null
    ax: number
    ay: number
    w: number
    h: number
    mudou: boolean
  } | null>(null)

  function ponto(e: React.PointerEvent) {
    const r = cv.current!.getBoundingClientRect()
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height, px: W / r.width }
  }

  function aoTocar(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = ctx()
    if (gesto.current || !c || !estado) return
    const p = ponto(e)
    const ativo = item?.visivel ? item : null
    const b = ativo ? caixa(c, ativo, modo, midia) : null
    const canto = b
      ? (cantos(b)
          .filter((k) => Math.abs(p.x - k.x) <= 22 * p.px && Math.abs(p.y - k.y) <= 22 * p.px)
          .sort((a, z) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - z.x, p.y - z.y))[0] ?? null)
      : null
    const o = canto
      ? ativo
      : [...estado.itens].reverse().find((i) => {
          if (!i.visivel) return false
          const k = caixa(c, i, modo, midia)
          return p.x >= k.x - 8 * p.px && p.x <= k.x + k.w + 8 * p.px && p.y >= k.y - 8 * p.px && p.y <= k.y + k.h + 8 * p.px
        })
    if (!o) {
      setSel(null)
      return
    }
    setSel(o.id)
    setEditandoTexto(false)
    setGaveta(null)
    gesto.current = {
      id: o.id, ponteiro: e.pointerId, x: p.x, y: p.y, ox: o.x, oy: o.y, tamanho: o.tamanho, canto,
      ax: canto && b ? (canto.sx === 1 ? b.x : b.x + b.w) : 0,
      ay: canto && b ? (canto.sy === 1 ? b.y : b.y + b.h) : 0,
      w: b?.w ?? 0, h: b?.h ?? 0, mudou: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function aoMover(e: React.PointerEvent<HTMLCanvasElement>) {
    const g = gesto.current
    const c = ctx()
    if (!g || e.pointerId !== g.ponteiro || !c) return
    const p = ponto(e)
    if (!g.mudou) {
      if (Math.hypot(p.x - g.x, p.y - g.y) < 3 * p.px) return
      guardar()
      g.mudou = true
    }
    atualizar((est) =>
      mudarItem(est, g.id, (o) => {
        if (g.canto) {
          const vx = g.canto.sx * g.w
          const vy = g.canto.sy * g.h
          const razao = 1 + ((p.x - g.x) * vx + (p.y - g.y) * vy) / (vx * vx + vy * vy)
          const f = forma(c, o, modo, midia)
          const cabe = Math.min(
            1.7,
            (g.canto.sx === 1 ? 1053 - g.ax : g.ax - 27) / f.w,
            (g.canto.sy === 1 ? 1872 - g.ay : g.ay - 48) / f.h,
          )
          const tamanho = Math.max(Math.min(0.4, cabe), Math.min(cabe, g.tamanho * razao))
          return { ...o, tamanho, x: (g.ax + (g.canto.sx * f.w * tamanho) / 2) / W, y: (g.ay + (g.canto.sy * f.h * tamanho) / 2) / H }
        }
        return encaixar(c, { ...o, x: g.ox + (p.x - g.x) / W, y: g.oy + (p.y - g.y) / H }, modo, midia)
      }),
    )
  }

  function aoSoltar(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!gesto.current || e.pointerId !== gesto.current.ponteiro) return
    gesto.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  // ── ações ─────────────────────────────────────────────────────────────
  async function escolherFoto() {
    setGaveta(null)
    const f = await capturarFoto('galeria')
    if (!f) return
    setFotoSrc(f.dataUrl)
    atualizar((e) => ({ ...e, zoom: 1, panX: 0, panY: 0 }))
    setSel(null)
    avisar.ok(t.fotoAdicionada)
  }

  function soFoto() {
    guardar()
    atualizar((e) => aplicarModelo(e, modo, 'foto'))
    setSel(null)
    setGaveta(null)
    avisar.ok(t.soFotoAviso)
  }

  function trocarModo(novo: ModoStory) {
    if (novo === modo) return
    setSel(null)
    setGaveta(null)
    setModo(novo)
  }

  async function exportarComo(como: 'story' | 'enviar') {
    if (!estado) return
    setOcupado(true)
    setSel(null)
    try {
      const base64 = exportar(estado, modo, midia)
      const r: ComoFoi = como === 'story' ? await postarNoStory(base64) : await compartilharImagem(base64)
      vibrar.sucesso()
      avisar.ok(r === 'instagram' ? t.abriuInstagram : r === 'menu' ? t.abriuMenu : t.baixou)
    } catch {
      avisar.erro(t.erro)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col bg-surface-1 px-4 pb-safe-b pt-safe-t text-content-hi">
      <header className="flex items-center justify-between gap-2 py-3">
        <button onClick={() => navigate(-1)} aria-label={t.voltar} className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-4 text-content-mid active:bg-content-hi/5">
          <Svg><path d="M15 5l-7 7 7 7" /></Svg>
        </button>
        <div className="text-lg font-extrabold tracking-tight">
          ATHOS<span className="font-normal text-brand">life</span>
        </div>
        <button onClick={desfazer} disabled={!historicos[modo].length} aria-label={t.desfazer} className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-4 text-content-mid disabled:opacity-35">
          <Svg><path d="M8 4L3 9l5 5M3 9h10a7 7 0 0 1 0 14" /></Svg>
        </button>
      </header>

      {escolher && (
        <nav className="mb-2 flex gap-1 rounded-xl bg-surface-2 p-1" aria-label={t.formato}>
          {(['gym', 'food'] as const).map((md) => (
            <button
              key={md}
              onClick={() => trocarModo(md)}
              aria-pressed={md === modo}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold ${md === modo ? 'bg-surface-4 text-content-hi' : 'text-content-low'}`}
            >
              {t.modos[md]}
            </button>
          ))}
        </nav>
      )}

      <div className="mx-auto mb-2 flex w-full max-w-[360px] items-center justify-between text-[10px] text-content-low">
        <b className="font-medium text-content-hi">{t.tituloModo[modo]}</b>
        <span>{t.formato}</span>
      </div>

      <div
        className="relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-[13px] bg-[#202720] shadow-[0_25px_70px_#0006]"
        style={{ maxWidth: 'min(360px, calc((100dvh - 330px) * 9 / 16))', minWidth: 230 }}
      >
        <canvas
          ref={cv}
          width={W}
          height={H}
          className="block h-full w-full touch-none"
          onPointerDown={aoTocar}
          onPointerMove={aoMover}
          onPointerUp={aoSoltar}
          onPointerCancel={aoSoltar}
          onLostPointerCapture={() => (gesto.current = null)}
        />
        {!estado && (
          <div className="absolute inset-0 grid place-items-center text-xs text-content-mid">{t.carregando}</div>
        )}
        {estado && !foto && (
          <div className="pointer-events-none absolute left-[15%] top-[34%] w-[70%] text-center">
            <span className="mb-2 block text-[26px] leading-tight tracking-tight text-white">{t.comece}</span>
            <p className="text-xs leading-relaxed text-[#c0cab6]">{temDados ? t.dadosRecebidos : t.semDados[modo]}</p>
            <button onClick={() => void escolherFoto()} className="pointer-events-auto mt-3 rounded-full bg-[#e5eddc] px-5 py-3 text-sm font-semibold text-[#172011] active:scale-95">
              {t.escolherFoto}
            </button>
          </div>
        )}

        {item && (
          <Contexto
            item={item}
            t={t}
            editandoTexto={editandoTexto}
            onEditarTexto={() => setEditandoTexto((v) => !v)}
            onFechar={() => setSel(null)}
            onInicioAjuste={guardar}
            onMudar={(fn) => mudar((i) => encaixado(fn(i)))}
            onOutroLado={() => { guardar(); mudar((i) => encaixado({ ...i, x: 1 - i.x })) }}
            onOcultar={() => { guardar(); mudar((i) => ({ ...i, visivel: false })); setSel(null) }}
            onExcluir={() => {
              guardar()
              atualizar((e) => ({ ...e, itens: e.itens.filter((i) => i.id !== sel) }))
              setSel(null)
              avisar.ok(t.excluido)
            }}
          />
        )}
      </div>

      <p className="my-2 text-center text-[9px] text-content-low">{t.dica}</p>

      <div className="flex justify-center gap-2">
        <Ferramenta rotulo={t.foto} onClick={() => void escolherFoto()}>
          <rect x="3" y="5" width="18" height="15" rx="3" /><path d="M8 5l2-2h4l2 2" /><circle cx="12" cy="12" r="4" />
        </Ferramenta>
        <Ferramenta rotulo={t.adicionar} ativo={gaveta === 'adicionar'} onClick={() => { setSel(null); setGaveta('adicionar') }}>
          <path d="M12 4v16M4 12h16" />
        </Ferramenta>
        <Ferramenta rotulo={t.modelos} ativo={gaveta === 'modelos'} onClick={() => { setSel(null); setGaveta('modelos') }}>
          <rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 14h8M8 17h5" />
        </Ferramenta>
        <Ferramenta rotulo={t.ajustes} ativo={gaveta === 'ajustes'} onClick={() => { setSel(null); setGaveta('ajustes') }}>
          <path d="M4 7h16M4 17h16" /><circle cx="8" cy="7" r="2" className="fill-surface-2" /><circle cx="16" cy="17" r="2" className="fill-surface-2" />
        </Ferramenta>
      </div>

      <div className="mx-auto mt-3 flex w-full max-w-[360px] gap-2 pb-4">
        <button
          onClick={() => void exportarComo('story')}
          disabled={ocupado || !estado}
          className="min-h-12 flex-1 rounded-[13px] bg-brand px-4 text-sm font-bold text-brand-ink active:scale-[0.98] disabled:opacity-60"
        >
          {ocupado ? t.gerando : t.compartilhar}
        </button>
        <button
          onClick={() => void exportarComo('enviar')}
          disabled={ocupado || !estado}
          aria-label={t.salvar}
          className="grid w-12 place-items-center rounded-[13px] border border-surface-4 text-content-mid disabled:opacity-60"
        >
          <Svg><path d="M12 3v12m-5-5l5 5 5-5M4 17v4h16v-4" /></Svg>
        </button>
      </div>

      {gaveta && estado && (
        <GavetaStory titulo={gaveta === 'adicionar' ? t.oQueAcompanha : gaveta === 'modelos' ? t.pontoPartida : t.ajustesTitulo} fechar={t.fechar} onFechar={() => setGaveta(null)}>
          {gaveta === 'adicionar' && (
            <>
              <p className="text-xs leading-relaxed text-content-low">{t.adicionarNota}</p>
              {estado.itens.map((o) => (
                <div key={o.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2.5 border-b border-content-hi/5 py-3">
                  <div className="min-w-0 text-sm">
                    {o.rotulo}
                    <small className="mt-0.5 block truncate text-[10px] text-content-low">
                      {o.tipo === 'metric' ? `${o.valor}${o.unidade ? ` ${o.unidade}` : ''}` : o.tipo === 'life' ? t.descLife : t.descVisual}
                    </small>
                  </div>
                  <button
                    className="px-1.5 text-xs font-semibold text-brand"
                    onClick={() => {
                      if (!o.visivel) { guardar(); atualizar((e) => mudarItem(e, o.id, (i) => ({ ...i, visivel: true }))) }
                      setGaveta(null)
                      setSel(o.id)
                    }}
                  >
                    {t.editar}
                  </button>
                  <Chave
                    ligado={o.visivel}
                    rotulo={t.mostrar(o.rotulo)}
                    onChange={(v) => { guardar(); atualizar((e) => mudarItem(e, o.id, (i) => ({ ...i, visivel: v }))) }}
                  />
                </div>
              ))}
              <BotaoLargo onClick={soFoto}>{t.soFoto}</BotaoLargo>
              <BotaoLargo
                onClick={() => {
                  guardar()
                  const novo = campoPersonalizado(t.seuTitulo, t.seuTexto)
                  atualizar((e) => ({ ...e, itens: [...e.itens, novo] }))
                  setGaveta(null)
                  setSel(novo.id)
                  setEditandoTexto(true)
                }}
              >
                {t.criarCampo}
              </BotaoLargo>
            </>
          )}

          {gaveta === 'modelos' && (
            <>
              <p className="text-xs leading-relaxed text-content-low">{t.modelosNota}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(['foto', 'base', 'coluna', 'editorial'] as const satisfies readonly ModeloStory[]).map((md) => (
                  <button
                    key={md}
                    onClick={() => { guardar(); atualizar((e) => aplicarModelo(e, modo, md)); setGaveta(null) }}
                    className="rounded-xl border border-surface-4 px-2.5 py-4 text-left text-sm active:bg-content-hi/5"
                  >
                    {t.modelo[md][0]}
                    <small className="mt-1 block text-[10px] text-content-low">{t.modelo[md][1]}</small>
                  </button>
                ))}
              </div>
            </>
          )}

          {gaveta === 'ajustes' && (
            <>
              <p className="text-xs leading-relaxed text-content-low">{t.ajustesNota}</p>
              {([
                ['luz', t.luz, -100, 100, 1],
                ['zoom', t.aproximar, 1, 3, 0.01],
                ['panX', t.posH, -1, 1, 0.01],
                ['panY', t.posV, -1, 1, 0.01],
              ] as const).map(([k, rotulo, min, max, passo]) => (
                <label key={k} className="my-3.5 flex flex-col gap-1.5 text-[11px]">
                  {rotulo}
                  <input
                    type="range" min={min} max={max} step={passo} value={estado[k]}
                    onPointerDown={guardar}
                    onChange={(ev) => atualizar((e) => ({ ...e, [k]: Number(ev.target.value) }))}
                    className="w-full accent-brand"
                  />
                </label>
              ))}
              <label className="my-3.5 flex items-center justify-between text-xs">
                {t.sombra}
                <Chave ligado={estado.sombra} rotulo={t.sombra} onChange={(v) => { guardar(); atualizar((e) => ({ ...e, sombra: v })) }} />
              </label>
              <p className="text-xs leading-relaxed text-content-low">{t.ajustesDica}</p>
              <BotaoLargo onClick={() => void escolherFoto()}>{t.trocarFoto}</BotaoLargo>
            </>
          )}
        </GavetaStory>
      )}
    </main>
  )
}

// ── peças ──────────────────────────────────────────────────────────────────

type Textos = ReturnType<typeof useI18n>['m']['story']

/** Ajustes do elemento tocado — painel no pé do quadro, como no V2. */
function Contexto(p: {
  item: ItemStory
  t: Textos
  editandoTexto: boolean
  onEditarTexto: () => void
  onFechar: () => void
  onInicioAjuste: () => void
  onMudar: (fn: (i: ItemStory) => ItemStory) => void
  onOutroLado: () => void
  onOcultar: () => void
  onExcluir: () => void
}) {
  const { item: o, t } = p
  const life = o.tipo === 'life'
  const metrica = o.tipo === 'metric'
  return (
    <section className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md rounded-t-[20px] border-t border-[#c3e09b44] bg-[#10170ff5] px-[18px] pb-[max(15px,env(safe-area-inset-bottom))] pt-[15px] shadow-[0_-8px_28px_#0004]" aria-label={o.rotulo}>
      <div className="mb-2.5 flex items-center justify-between text-xs">
        <strong className="max-w-[220px] truncate">{o.rotulo}</strong>
        <button onClick={p.onFechar} aria-label={t.concluir} className="px-2 py-1 text-lg leading-none">✓</button>
      </div>
      <Faixa rotulo={t.opacidade} min={0.1} max={1} passo={0.01} valor={o.opacidade} saida={`${Math.round(o.opacidade * 100)}%`}
        onInicio={p.onInicioAjuste} onChange={(v) => p.onMudar((i) => ({ ...i, opacidade: v }))} />
      {life && (
        <Faixa rotulo={t.corLife} min={-180} max={180} passo={1} valor={o.matiz} saida={`${o.matiz}°`}
          onInicio={p.onInicioAjuste} onChange={(v) => p.onMudar((i) => ({ ...i, matiz: v }))} />
      )}
      <div className="mt-2.5 flex items-center justify-between gap-1">
        {!life && (
          <div className="flex items-center gap-1.5">
            {CORES_STORY.map((c, k) => (
              <button key={c} aria-label={t.cores[k]} onClick={() => { p.onInicioAjuste(); p.onMudar((i) => ({ ...i, cor: c })) }}
                className="h-[21px] w-[21px] rounded-full border border-white/30" style={{ background: c }} />
            ))}
            <input type="color" aria-label={t.corPersonalizada} value={o.cor} className="h-6 w-6 border-0 bg-transparent p-0"
              onChange={(ev) => { p.onInicioAjuste(); p.onMudar((i) => ({ ...i, cor: ev.target.value })) }} />
          </div>
        )}
        {metrica && <MiniBotao onClick={p.onEditarTexto}>{t.texto}</MiniBotao>}
        <MiniBotao onClick={p.onOutroLado}>{t.outroLado}</MiniBotao>
        <MiniBotao onClick={p.onOcultar}>{t.ocultar}</MiniBotao>
        {metrica && <MiniBotao onClick={p.onExcluir} perigo>{t.excluir}</MiniBotao>}
      </div>
      {metrica && p.editandoTexto && (
        <div className="mt-2 flex gap-1.5">
          <input aria-label={t.rotulo} maxLength={40} defaultValue={o.rotulo} onFocus={p.onInicioAjuste}
            onChange={(ev) => p.onMudar((i) => ({ ...i, rotulo: ev.target.value }))}
            className="w-1/2 min-w-0 rounded-lg border border-surface-4 bg-surface-2 p-2 text-xs" />
          <input aria-label={t.valor} maxLength={90} defaultValue={o.valor} onFocus={p.onInicioAjuste}
            onChange={(ev) => p.onMudar((i) => ({ ...i, valor: ev.target.value }))}
            className="w-1/2 min-w-0 rounded-lg border border-surface-4 bg-surface-2 p-2 text-xs" />
        </div>
      )}
    </section>
  )
}

function Faixa(p: { rotulo: string; min: number; max: number; passo: number; valor: number; saida: string; onInicio: () => void; onChange: (v: number) => void }) {
  return (
    <label className="my-2 grid grid-cols-[66px_1fr_37px] items-center gap-2 text-[11px] text-[#c5cfbf]">
      {p.rotulo}
      <input type="range" min={p.min} max={p.max} step={p.passo} value={p.valor} onPointerDown={p.onInicio}
        onChange={(ev) => p.onChange(limitar(Number(ev.target.value), p.min, p.max))} className="w-full min-w-0 accent-brand" />
      <output className="text-right tabular-nums">{p.saida}</output>
    </label>
  )
}

function MiniBotao({ children, onClick, perigo }: { children: ReactNode; onClick: () => void; perigo?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-lg bg-[#293323] px-2 py-2 text-[10px] ${perigo ? 'text-[#e2b0a5]' : ''}`}>
      {children}
    </button>
  )
}

function Ferramenta({ rotulo, children, onClick, ativo }: { rotulo: string; children: ReactNode; onClick: () => void; ativo?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={ativo}
      className={`flex min-w-[62px] flex-col items-center gap-1 rounded-[11px] border px-3 py-2 text-[10px] ${ativo ? 'border-brand/60 bg-brand/15' : 'border-surface-4 bg-surface-2'} active:bg-content-hi/5`}
    >
      <Svg tamanho={18}>{children}</Svg>
      {rotulo}
    </button>
  )
}

function Chave({ ligado, rotulo, onChange }: { ligado: boolean; rotulo: string; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={() => onChange(!ligado)}
      className={`relative h-[21px] w-[35px] flex-none rounded-full transition-colors ${ligado ? 'bg-brand' : 'bg-surface-4'}`}
    >
      <span className={`absolute top-[3px] h-[15px] w-[15px] rounded-full transition-transform ${ligado ? 'left-[3px] translate-x-[14px] bg-brand-ink' : 'left-[3px] bg-content-hi'}`} />
    </button>
  )
}

function BotaoLargo({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mt-2.5 w-full rounded-[10px] border border-surface-4 p-3 text-left text-xs active:bg-content-hi/5">
      {children}
    </button>
  )
}

/** Painel de baixo (Adicionar / Modelos / Ajustes), um de cada vez. */
function GavetaStory({ titulo, fechar, onFechar, children }: { titulo: string; fechar: string; onFechar: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button aria-label={fechar} onClick={onFechar} className="absolute inset-0 bg-black/55 backdrop-blur-[5px]" />
      <div className="relative mb-2.5 max-h-[80dvh] w-[min(440px,calc(100%-24px))] overflow-y-auto rounded-[22px] border border-surface-4 bg-surface-2 pb-safe-b">
        <div className="sticky top-0 z-10 flex items-center justify-between bg-surface-2 px-5 pb-2.5 pt-5">
          <h2 className="text-lg font-semibold tracking-tight">{titulo}</h2>
          <button onClick={onFechar} aria-label={fechar} className="px-2 py-1 text-xl leading-none text-content-mid">×</button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}

function Svg({ children, tamanho = 20 }: { children: ReactNode; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}
