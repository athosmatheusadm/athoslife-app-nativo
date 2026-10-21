import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { ItemRascunho, Macros, RefeicaoRascunho } from '@domain/entities/food'
import { ExtrasScan } from '@ui/screens/scanner/ExtrasScan'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Revisão do scanner (foto do prato e código de barras): a foto ocupa a
 * tela inteira e por cima fica um painel de vidro com uma linha por item
 * (nome · gramas · kcal). Tocar na linha abre o ajuste dela, uma de cada vez.
 * Produto do código vem com foto pequena: ela fica nítida no meio e uma
 * cópia borrada preenche o fundo.
 */

interface Props {
  rascunho: RefeicaoRascunho
  origem: 'foto' | 'codigo'
  fotoPrato: string | null
  imagemProduto: string | null
  nomeRefeicao: string
  total: Macros
  incluidos: number
  salvando: boolean
  erro: string | null
  onMudarItem: (id: string, fn: (i: ItemRascunho) => ItemRascunho) => void
  mudarGramas: (i: ItemRascunho, gramas: number) => ItemRascunho
  onSalvar: () => void
  onRefazer: () => void
  onVoltar: () => void
}

export function RevisaoScanner(p: Props) {
  const { m } = useI18n()
  const t = m.scanner
  const tv = t.vidro
  const { rascunho } = p
  const [aberto, setAberto] = useState<string | null>(rascunho.itens.length === 1 ? rascunho.itens[0]!.id : null)
  // Porção que veio do rótulo, pra voltar a ela com um toque.
  const [porcaoInicial] = useState(() => new Map(rascunho.itens.map((i) => [i.id, i.quantidadeG])))

  const pendente = rascunho.itens.find((i) => i.incluir && i.scan?.semNumeros)
  const travado = p.salvando || p.incluidos === 0 || Boolean(pendente)
  const fundo = p.fotoPrato ?? p.imagemProduto

  return createPortal(
    <div className="tema-escuro fixed inset-0 z-[55] overflow-hidden bg-[rgb(14_16_15)]">
      {p.fotoPrato ? (
        <img src={p.fotoPrato} alt={tv.fotoAria} className="absolute inset-0 h-full w-full object-cover" />
      ) : fundo ? (
        <>
          <img src={fundo} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl" />
          <img
            src={fundo}
            alt={rascunho.descricao}
            className="absolute left-1/2 top-[20%] aspect-square w-[46%] -translate-x-1/2 rounded-[28px] bg-white object-contain p-3 shadow-[0_20px_50px_rgb(0_0_0/0.35)]"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_30%,rgb(var(--c-brand)/0.25),transparent_70%)]" />
      )}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgb(0_0_0/0.35),transparent_18%,transparent_42%,rgb(0_0_0/0.72)_78%)]" />

      <div className="absolute inset-x-3.5 top-[calc(env(safe-area-inset-top,0px)+14px)] flex items-center justify-between gap-2">
        <button onClick={p.onVoltar} aria-label={t.voltar} className="vidro grid h-11 w-11 place-items-center rounded-full text-lg">
          ←
        </button>
        <span className="vidro flex h-8 min-w-0 items-center truncate rounded-pill px-3.5 text-sm font-semibold">{p.nomeRefeicao}</span>
        <button
          onClick={p.onRefazer}
          disabled={p.salvando}
          aria-label={p.origem === 'codigo' ? t.outroCodigo : t.outraFoto}
          className="vidro grid h-11 w-11 place-items-center rounded-full text-lg"
        >
          ↻
        </button>
      </div>

      <section className="absolute inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+14px)] flex max-h-[calc(100%-90px)] flex-col gap-1.5 overflow-y-auto">
        <div className="flex items-baseline justify-between gap-2 px-1 pb-0.5 [text-shadow:0_1px_8px_rgb(0_0_0/0.5)]">
          <span className="font-mono text-[30px] font-bold tabular-nums tracking-tight">
            {Math.round(p.total.calorias)}
            <small className="ml-1 font-sans text-sm font-semibold opacity-80">
              kcal{pendente ? ` ${tv.parcial}` : ''}
            </small>
          </span>
          <span className="flex gap-2.5 font-mono text-sm font-bold tabular-nums">
            <span className="text-macro-proteina">P {Math.round(p.total.proteina)}g</span>
            <span className="text-macro-carbo">C {Math.round(p.total.carboidrato)}g</span>
            <span className="text-macro-gordura">G {Math.round(p.total.gordura)}g</span>
          </span>
        </div>
        {rascunho.observacao && <p className="px-1 text-micro opacity-80">{rascunho.observacao}</p>}

        <ul className="grid gap-1.5">
          {rascunho.itens.map((item) => {
            const semNumeros = Boolean(item.scan?.semNumeros)
            const estaAberto = aberto === item.id
            const inicial = porcaoInicial.get(item.id)
            return (
              <li
                key={item.id}
                className={`vidro overflow-hidden rounded-[14px] transition-opacity ${semNumeros ? '!border-accent-gold/70' : ''} ${
                  item.incluir ? '' : 'opacity-45'
                }`}
              >
                <div className="grid min-h-[46px] grid-cols-[44px_1fr_auto_auto] items-center pr-3">
                  <button
                    onClick={() => p.onMudarItem(item.id, (i) => ({ ...i, incluir: !i.incluir }))}
                    role="checkbox"
                    aria-checked={item.incluir}
                    aria-label={item.incluir ? t.tirar(item.nome) : t.incluir(item.nome)}
                    className="grid h-[46px] w-11 place-items-center"
                  >
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-full border-[1.5px] text-[11px] font-extrabold ${
                        item.incluir ? 'border-brand bg-brand text-brand-ink' : 'border-white/60 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                  <button
                    onClick={() => setAberto(estaAberto ? null : item.id)}
                    aria-expanded={estaAberto}
                    className="col-span-3 grid min-h-[46px] grid-cols-[1fr_auto_auto] items-center text-left"
                  >
                    <span className={`truncate pr-2 text-sm font-semibold ${item.incluir ? '' : 'line-through'}`}>
                      {item.nome}
                      {semNumeros && <em className="ml-1.5 text-micro font-medium not-italic text-accent-gold">{tv.qualE}</em>}
                    </span>
                    <span className="pr-2.5 font-mono text-micro tabular-nums opacity-75">{item.quantidadeG} g</span>
                    <span className="min-w-[54px] text-right font-mono text-[13px] font-bold tabular-nums">
                      {semNumeros ? '—' : `${item.calorias} kcal`}
                    </span>
                  </button>
                </div>

                {estaAberto && (
                  <div className="grid gap-2 border-t border-white/10 px-3 pb-3 pt-2.5">
                    {!item.scan && p.origem === 'foto' && (
                      <input
                        value={item.nome}
                        onChange={(e) => p.onMudarItem(item.id, (i) => ({ ...i, nome: e.target.value }))}
                        aria-label={t.nomeAria}
                        className="min-h-10 rounded-lg border border-white/20 bg-transparent px-2.5 text-sm font-semibold focus:border-brand focus:outline-none"
                      />
                    )}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => p.onMudarItem(item.id, (i) => p.mudarGramas(i, i.quantidadeG - 10))}
                        aria-label={t.menos10}
                        className="h-9 w-9 rounded-full border border-white/25 text-lg"
                      >
                        −
                      </button>
                      <span className="min-w-16 text-center font-mono text-sm font-bold">{item.quantidadeG} g</span>
                      <button
                        onClick={() => p.onMudarItem(item.id, (i) => p.mudarGramas(i, i.quantidadeG + 10))}
                        aria-label={t.mais10}
                        className="h-9 w-9 rounded-full border border-white/25 text-lg"
                      >
                        +
                      </button>
                      {!semNumeros && (
                        <span className="ml-auto flex gap-2 font-mono text-[11px]">
                          <span className="text-macro-proteina">P {item.proteina}</span>
                          <span className="text-macro-carbo">C {item.carboidrato}</span>
                          <span className="text-macro-gordura">G {item.gordura}</span>
                        </span>
                      )}
                    </div>
                    {item.fonte === 'rotulo' && inicial !== undefined && inicial !== 100 && (
                      <div className="flex flex-wrap gap-1.5">
                        {[inicial, 100].map((g) => (
                          <button
                            key={g}
                            onClick={() => p.onMudarItem(item.id, (i) => p.mudarGramas(i, g))}
                            aria-pressed={item.quantidadeG === g}
                            className={`h-8 rounded-pill border px-3 text-micro font-semibold ${
                              item.quantidadeG === g ? 'border-brand bg-brand/20 text-brand' : 'border-white/25'
                            }`}
                          >
                            {g === inicial ? tv.porcaoRotulo(g) : '100 g'}
                          </button>
                        ))}
                      </div>
                    )}
                    <ExtrasScan item={item} onMudar={(novo) => p.onMudarItem(item.id, () => novo)} />
                    {item.fonte === 'rotulo' && <p className="text-micro text-brand/75">{t.rotulo}</p>}
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {p.erro && (
          <p role="alert" className="vidro rounded-xl px-3 py-2 text-center text-sm font-medium text-accent-danger">
            {p.erro}
          </p>
        )}
        <button
          onClick={p.onSalvar}
          disabled={travado}
          className={`mt-1 min-h-[50px] w-full flex-none rounded-pill px-4 text-[15px] font-bold transition-transform active:scale-[0.98] ${
            pendente ? 'vidro !border-accent-gold/60 text-accent-gold' : 'bg-brand text-brand-ink disabled:opacity-50'
          }`}
        >
          {p.salvando ? t.salvando : pendente ? tv.falta(pendente.nome) : t.adicionarEm(p.incluidos, p.nomeRefeicao)}
        </button>
        {aberto === null && rascunho.itens.length > 1 && <p className="text-center text-micro opacity-70">{tv.tocarAjustar}</p>}
      </section>
    </div>,
    document.body,
  )
}
