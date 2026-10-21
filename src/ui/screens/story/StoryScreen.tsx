import { useRef, useState, type CSSProperties } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  aplicarModelo,
  CORES_STORY,
  escalar,
  FAIXA_BASE,
  FAIXA_TOPO,
  itensIniciais,
  MEDIDAS,
  mover,
  naFaixaDoInstagram,
  type EntradaStory,
  type ItemStory,
  type ModeloStory,
} from '@domain/entities/story'
import { capturarFoto } from '@data/ai/photoCapture'
import { compartilharImagem, postarNoStory, type ComoFoi } from '@data/native/instagramStory'
import { exportarStory } from '@ui/screens/story/exportarStory'
import { avisar, vibrar } from '@ui/feedback'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Story Studio — a foto da pessoa ocupa a tela (9:16) e os números do treino
 * ou da refeição ficam soltos por cima: arrasta com o dedo, toca pra mudar
 * tamanho e cor. Controles em vidro (como o scanner), um painel por vez.
 * Entrada: `navigate('/story', { state: EntradaStory })` da Dieta (câmera na
 * refeição) ou do resumo do treino. Prévia aprovada: docs/previas/previa-story.html.
 */

const LIFE = { food: '/life/chef.webp', gym: '/life/treino.webp' } as const
const MODELOS: readonly ModeloStory[] = ['base', 'topo', 'lado', 'foto']
type Painel = null | 'dados' | 'modelos'

const cqw = (f: number, k = 1) => `${(f * 100 * k).toFixed(2)}cqw`

export function StoryScreen() {
  const entrada = useLocation().state as EntradaStory | null
  if (!entrada?.modo) return <Navigate to="/home" replace />
  return <Editor entrada={entrada} />
}

function Editor({ entrada }: { entrada: EntradaStory }) {
  const navigate = useNavigate()
  const { m } = useI18n()
  const t = m.story
  const lifeSrc = LIFE[entrada.modo]
  const [itens, setItens] = useState<ItemStory[]>(() =>
    itensIniciais(entrada, entrada.modo === 'food' ? t.lifeChef : t.lifeTreino),
  )
  const [historico, setHistorico] = useState<ItemStory[][]>([])
  const [foto, setFoto] = useState<string | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [painel, setPainel] = useState<Painel>(null)
  const [arrastando, setArrastando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const tela = useRef<HTMLDivElement>(null)
  const arr = useRef<{ id: string; x0: number; y0: number; ix: number; iy: number; moveu: boolean } | null>(null)

  const selecionado = itens.find((i) => i.id === sel) ?? null

  function guardar() {
    setHistorico((h) => [...h.slice(-29), itens])
  }
  function mudar(id: string, fn: (i: ItemStory) => ItemStory) {
    setItens((lista) => lista.map((i) => (i.id === id ? fn(i) : i)))
  }
  function desfazer() {
    setHistorico((h) => {
      const anterior = h[h.length - 1]
      if (anterior) setItens(anterior)
      return h.slice(0, -1)
    })
    setSel(null)
  }
  function abrir(p: Exclude<Painel, null>) {
    setSel(null)
    setPainel((atual) => (atual === p ? null : p))
  }
  function fecharTudo() {
    setSel(null)
    setPainel(null)
  }

  async function trocarFoto() {
    const f = await capturarFoto('galeria')
    if (f) setFoto(f.dataUrl)
  }

  async function exportar(como: 'story' | 'enviar') {
    setOcupado(true)
    fecharTudo()
    try {
      const base64 = await exportarStory({ foto, itens, lifeSrc })
      const r: ComoFoi = como === 'story' ? await postarNoStory(base64) : await compartilharImagem(base64)
      vibrar.sucesso()
      avisar.ok(r === 'instagram' ? t.abriuInstagram : r === 'menu' ? t.abriuMenu : t.baixou)
    } catch {
      avisar.erro(t.erro)
    } finally {
      setOcupado(false)
    }
  }

  // Arrastar: posição em % da tela, pra bater com a imagem 1080×1920.
  function onPointerDown(e: React.PointerEvent, i: ItemStory) {
    arr.current = { id: i.id, x0: e.clientX, y0: e.clientY, ix: i.x, iy: i.y, moveu: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent) {
    const a = arr.current
    const r = tela.current?.getBoundingClientRect()
    if (!a || !r) return
    const dx = ((e.clientX - a.x0) / r.width) * 100
    const dy = ((e.clientY - a.y0) / r.height) * 100
    if (!a.moveu && Math.hypot(dx, dy) < 1.2) return
    if (!a.moveu) {
      guardar()
      a.moveu = true
      setArrastando(true)
    }
    mudar(a.id, (i) => mover(i, a.ix + dx, a.iy + dy))
  }
  function onPointerUp() {
    const a = arr.current
    arr.current = null
    if (!a) return
    setArrastando(false)
    if (!a.moveu) {
      setPainel(null)
      setSel((s) => (s === a.id ? null : a.id))
      return
    }
    const i = itens.find((x) => x.id === a.id)
    if (i && naFaixaDoInstagram(i)) avisar.ok(t.avisoFaixa)
  }

  const faixa = 'pointer-events-none absolute inset-x-0 z-[1] border-dashed border-white/35 bg-[repeating-linear-gradient(135deg,rgb(255_255_255/0.08)_0_6px,transparent_6px_12px)] transition-opacity'
  const chip = (ativo: boolean) =>
    `h-9 rounded-pill border px-3 text-micro font-semibold ${ativo ? 'border-brand bg-brand/20 text-brand' : 'border-white/25'}`

  return (
    <main className="tema-escuro fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div
        ref={tela}
        className="relative aspect-[9/16] max-h-full w-full max-w-[min(100vw,calc(100dvh*9/16))] touch-none select-none overflow-hidden [container-type:inline-size]"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Fundo: a foto da pessoa, ou um degradê até ela escolher. */}
        <button type="button" onClick={fecharTudo} aria-hidden="true" tabIndex={-1} className="absolute inset-0">
          {foto ? (
            <img src={foto} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="block h-full w-full bg-[radial-gradient(90%_60%_at_30%_80%,rgb(34_197_94/0.18),transparent_70%),linear-gradient(160deg,#262b27,#0b0d0c_70%)]" />
          )}
        </button>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(0_0_0/0.35),transparent_16%,transparent_60%,rgb(0_0_0/0.55))]" />

        <div className={`${faixa} top-0 border-b ${arrastando ? 'opacity-100' : 'opacity-0'}`} style={{ height: `${FAIXA_TOPO}%` }}>
          <span className="absolute bottom-1.5 left-2.5 text-[10px] font-semibold">{t.faixa}</span>
        </div>
        <div className={`${faixa} bottom-0 border-t ${arrastando ? 'opacity-100' : 'opacity-0'}`} style={{ height: `${100 - FAIXA_BASE}%` }}>
          <span className="absolute left-2.5 top-1.5 text-[10px] font-semibold">{t.faixa}</span>
        </div>

        {!foto && (
          <button
            type="button"
            onClick={() => void trocarFoto()}
            className="vidro absolute left-1/2 top-[40%] z-[2] -translate-x-1/2 rounded-pill px-4 py-2.5 text-sm font-semibold"
          >
            {t.semFoto}
          </button>
        )}

        {itens.filter((i) => i.on).map((i) => {
          const estilo: CSSProperties = { left: `${i.x}%`, top: `${i.y}%`, color: i.cor }
          return (
            <div
              key={i.id}
              role="button"
              tabIndex={0}
              aria-label={i.tipo === 'life' ? i.rotulo : `${i.rotulo}: ${i.valor} ${i.unidade ?? ''}`}
              aria-pressed={sel === i.id}
              onPointerDown={(e) => onPointerDown(e, i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setPainel(null)
                  setSel(i.id)
                }
              }}
              style={estilo}
              className={`absolute z-[2] -translate-x-1/2 -translate-y-1/2 cursor-grab text-center [text-shadow:0_2px_12px_rgb(0_0_0/0.55)] ${
                sel === i.id ? 'rounded-md outline-dashed outline-[1.5px] outline-offset-[6px] outline-white/80' : ''
              }`}
            >
              {i.tipo === 'life' ? (
                <img src={lifeSrc} alt="" draggable={false} style={{ width: cqw(MEDIDAS.life, i.k) }} className="block h-auto drop-shadow-[0_8px_16px_rgb(0_0_0/0.45)]" />
              ) : (
                <>
                  <span className="block whitespace-nowrap font-bold uppercase tracking-[0.08em] opacity-85" style={{ fontSize: cqw(MEDIDAS.rotulo, i.k) }}>
                    {i.rotulo}
                  </span>
                  <span
                    className={`block whitespace-nowrap leading-[1.05] ${i.tipo === 'titulo' ? 'font-extrabold' : 'font-black tracking-tight'}`}
                    style={{ fontSize: cqw(i.tipo === 'titulo' ? MEDIDAS.valorTitulo : MEDIDAS.valor, i.k) }}
                  >
                    {i.valor}
                    {i.unidade && <small className="ml-[0.12em] text-[0.5em] font-bold">{i.unidade}</small>}
                  </span>
                </>
              )}
            </div>
          )
        })}

        <div
          className="pointer-events-none absolute z-[2] font-extrabold [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]"
          style={{ left: cqw(MEDIDAS.margem), bottom: cqw(MEDIDAS.margem), fontSize: cqw(MEDIDAS.assinatura) }}
        >
          ATHOS<span className="text-brand">life</span>
        </div>

        {/* Topo */}
        <div className="absolute inset-x-3.5 top-[calc(env(safe-area-inset-top,0px)+14px)] z-[4] flex items-center justify-between gap-2">
          <button type="button" onClick={() => navigate(-1)} aria-label={t.voltar} className="vidro grid h-11 w-11 place-items-center rounded-full text-lg">
            ←
          </button>
          <span className="vidro flex h-8 items-center rounded-pill px-3.5 text-sm font-semibold">{t.titulo(t.modos[entrada.modo])}</span>
          <button
            type="button"
            onClick={desfazer}
            disabled={historico.length === 0}
            aria-label={t.desfazer}
            className="vidro grid h-11 w-11 place-items-center rounded-full text-lg disabled:opacity-40"
          >
            ↶
          </button>
        </div>

        {/* Rodapé: 3 ferramentas + postar (some quando um painel abre) */}
        {!painel && !selecionado && (
          <div className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+14px)] z-[4] grid gap-2.5">
            <div className="flex justify-center gap-6">
              <Ferramenta rotulo={t.foto} onClick={() => void trocarFoto()} icone={<path d="M3 9a3 3 0 0 1 3-3h1.5l2-2h5l2 2H18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Zm9 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />} />
              <Ferramenta rotulo={t.dados} onClick={() => abrir('dados')} icone={<path d="M5 19v-8M12 19V5M19 19v-6" />} />
              <Ferramenta rotulo={t.modelos} onClick={() => abrir('modelos')} icone={<path d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm2 12h6m-6 3h4" />} />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={() => void exportar('story')}
                disabled={ocupado}
                className="flex min-h-[50px] items-center justify-center gap-2 rounded-pill bg-brand text-[15px] font-bold text-brand-ink active:scale-[0.98] disabled:opacity-60"
              >
                {ocupado ? t.gerando : t.postarStories}
              </button>
              <button
                type="button"
                onClick={() => void exportar('enviar')}
                disabled={ocupado}
                aria-label={t.salvar}
                className="vidro grid h-[50px] w-[50px] place-items-center rounded-full disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M12 4v11m-5-5 5 5 5-5M5 19h14" /></svg>
              </button>
            </div>
          </div>
        )}

        {painel === 'dados' && (
          <Painel titulo={t.oQueAparece} pronto={t.pronto} onPronto={fecharTudo}>
            <div className="flex flex-wrap gap-1.5">
              {itens.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  aria-pressed={i.on}
                  onClick={() => {
                    guardar()
                    mudar(i.id, (x) => ({ ...x, on: !x.on }))
                  }}
                  className={chip(i.on)}
                >
                  {i.tipo === 'titulo' ? i.valor : i.rotulo}
                </button>
              ))}
            </div>
            <p className="text-micro opacity-70">{entrada.modo === 'food' ? t.notaFood : t.notaGym}</p>
          </Painel>
        )}

        {painel === 'modelos' && (
          <Painel titulo={t.modelos} pronto={t.pronto} onPronto={fecharTudo}>
            <div className="flex flex-wrap gap-1.5">
              {MODELOS.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => {
                    guardar()
                    setItens((lista) => aplicarModelo(lista, mod))
                    if (mod === 'foto') avisar.ok(t.soFoto)
                  }}
                  className={chip(false)}
                >
                  {t.modelo[mod]}
                </button>
              ))}
            </div>
            <p className="text-micro opacity-70">{t.modelosNota}</p>
          </Painel>
        )}

        {selecionado && (
          <Painel titulo={selecionado.tipo === 'titulo' ? selecionado.valor : selecionado.rotulo} pronto={t.pronto} onPronto={fecharTudo}>
            <div className="flex items-center gap-2.5">
              <span className="w-16 text-micro font-semibold opacity-80">{t.tamanho}</span>
              <button type="button" aria-label={t.menor} onClick={() => { guardar(); mudar(selecionado.id, (i) => escalar(i, -0.15)) }} className="h-9 w-9 rounded-full border border-white/25 text-lg">−</button>
              <button type="button" aria-label={t.maior} onClick={() => { guardar(); mudar(selecionado.id, (i) => escalar(i, 0.15)) }} className="h-9 w-9 rounded-full border border-white/25 text-lg">+</button>
            </div>
            {selecionado.tipo !== 'life' && (
              <div className="flex items-center gap-2.5">
                <span className="w-16 text-micro font-semibold opacity-80">{t.cor}</span>
                {CORES_STORY.map((c, n) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={t.cores[n]}
                    aria-pressed={selecionado.cor === c}
                    onClick={() => { guardar(); mudar(selecionado.id, (i) => ({ ...i, cor: c })) }}
                    style={{ background: c }}
                    className={`h-8 w-8 rounded-full border-2 ${selecionado.cor === c ? 'border-brand ring-2 ring-brand/40' : 'border-white/35'}`}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => { guardar(); mudar(selecionado.id, (i) => ({ ...i, on: false })); setSel(null) }}
              className="h-9 self-start rounded-pill border border-white/25 px-3 text-micro font-semibold"
            >
              {t.ocultar}
            </button>
          </Painel>
        )}
      </div>
    </main>
  )
}

function Ferramenta(props: { rotulo: string; onClick: () => void; icone: React.ReactNode }) {
  return (
    <button type="button" onClick={props.onClick} className="grid justify-items-center gap-1 text-[11px] font-semibold [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">
      <span className="vidro grid h-[46px] w-[46px] place-items-center rounded-full">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {props.icone}
        </svg>
      </span>
      {props.rotulo}
    </button>
  )
}

function Painel(props: { titulo: string; pronto: string; onPronto: () => void; children: React.ReactNode }) {
  return (
    <section className="vidro absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+14px)] z-[5] grid gap-2.5 rounded-[20px] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <b className="min-w-0 truncate text-sm">{props.titulo}</b>
        <button type="button" onClick={props.onPronto} aria-label={props.pronto} className="h-9 w-9 flex-none rounded-full bg-brand font-extrabold text-brand-ink">
          ✓
        </button>
      </div>
      {props.children}
    </section>
  )
}
