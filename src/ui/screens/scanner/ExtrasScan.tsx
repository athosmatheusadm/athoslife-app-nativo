import { useEffect, useMemo, useState } from 'react'
import { alimentosRepository } from '@data/repositories/alimentosRepository'
import { normalizarNome } from '@domain/rules/foodReconciliation'
import { atualizarItemScan } from '@domain/rules/scanCalculo'
import type { AlimentoBase, BaseScan, ItemRascunho, VarianteOleo } from '@domain/entities/food'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Scanner v1.1 — o que aparece a mais dentro do card de um item: escolher
 * entre candidatos, buscar na base quando não achou, preparo (óleo) e os
 * avisos de porção. Tudo recalcula na hora, sem IA.
 */

const VARIANTES: readonly VarianteOleo[] = ['sem_oleo', 'caseiro', 'bastante_oleo']
const MOTIVOS_PORCAO = ['porcao_fraca', 'porcao_atipica', 'porcao_divergente', 'faixa_ampla']

const chip = (ativo: boolean) =>
  `min-h-10 rounded-pill border px-3 text-micro font-semibold transition-colors ${
    ativo ? 'border-brand bg-brand/20 text-brand' : 'border-white/25 text-content-hi active:bg-white/10'
  }`

function paraBaseScan(a: AlimentoBase): BaseScan {
  return {
    alimentoId: a.id,
    nome: a.nome,
    porcaoG: a.porcaoG,
    kcal: a.calorias,
    proteina: a.proteina,
    carboidrato: a.carboidrato,
    gordura: a.gordura,
    gorduraPreparoPct: a.gorduraPreparoPct ?? null,
    fonte: a.tacoId != null ? 'taco' : 'base',
  }
}

// A base inteira só carrega se alguém precisar buscar (uma vez por sessão).
let baseCache: Promise<AlimentoBase[]> | null = null

function BuscaNaBase({ onEscolher }: { onEscolher: (b: BaseScan) => void }) {
  const { m } = useI18n()
  const t = m.scanner.v2
  const [termo, setTermo] = useState('')
  const [base, setBase] = useState<AlimentoBase[] | null>(null)

  useEffect(() => {
    if (termo.trim().length < 2 || base) return
    baseCache ??= alimentosRepository.carregarTodos()
    void baseCache.then(setBase).catch(() => {
      baseCache = null
    })
  }, [termo, base])

  const achados = useMemo(() => {
    const alvo = normalizarNome(termo)
    if (!base || alvo.length < 2) return []
    return base.filter((a) => normalizarNome(a.nome).includes(alvo) && !/ — porção /.test(a.nome)).slice(0, 6)
  }, [base, termo])

  return (
    <div className="mt-2">
      <input
        value={termo}
        onChange={(e) => setTermo(e.target.value.slice(0, 60))}
        placeholder={t.buscarBase}
        aria-label={t.buscarBase}
        enterKeyHint="search"
        className="min-h-11 w-full rounded-card border border-surface-4 bg-surface-1 px-3 text-sm text-content-hi placeholder:text-content-low focus:border-brand focus:outline-none"
      />
      {termo.trim().length >= 2 && base && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {achados.length === 0 && <p className="text-micro text-content-low">{t.nenhumResultado}</p>}
          {achados.map((a) => (
            <button key={a.id} onClick={() => onEscolher(paraBaseScan(a))} className={chip(false)}>
              {a.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ExtrasScan({ item, onMudar }: { item: ItemRascunho; onMudar: (novo: ItemRascunho) => void }) {
  const { m } = useI18n()
  const t = m.scanner.v2
  const s = item.scan
  if (!s) return null

  const escolhido = s.base?.alimentoId
  const porcaoDuvidosa = s.base && s.motivos.some((x) => MOTIVOS_PORCAO.includes(x))

  return (
    <div className="mt-2 space-y-2">
      {s.candidatos.length > 0 && (
        <div>
          <p className="text-micro font-semibold text-content-mid">{t.qualE}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {s.candidatos.map((c) => (
              <button
                key={c.alimentoId}
                onClick={() => onMudar(atualizarItemScan(item, { base: c }))}
                aria-pressed={escolhido === c.alimentoId}
                className={chip(escolhido === c.alimentoId)}
              >
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {!s.base && s.candidatos.length === 0 && (
        <div>
          <p className="text-micro text-accent-gold">{t.naoAchei}</p>
          <BuscaNaBase onEscolher={(b) => onMudar(atualizarItemScan(item, { base: b }))} />
        </div>
      )}

      {s.base?.gorduraPreparoPct != null && (
        <div>
          <div role="group" aria-label={t.preparoAria} className="flex flex-wrap gap-1.5">
            {VARIANTES.map((v) => (
              <button
                key={v}
                onClick={() => onMudar(atualizarItemScan(item, { variante: v }))}
                aria-pressed={s.variante === v}
                className={chip(s.variante === v)}
              >
                {t.preparo[v]}
              </button>
            ))}
          </div>
          {s.varianteOrigem === 'padrao' && s.variante === 'caseiro' && (
            <p className="mt-1 text-micro text-content-low">{t.premissaPadrao}</p>
          )}
          {s.varianteOrigem === 'visual' && s.variante === 'bastante_oleo' && (
            <p className="mt-1 text-micro text-content-low">{t.premissaVisual}</p>
          )}
        </div>
      )}

      {porcaoDuvidosa && <p className="text-micro text-accent-gold">{t.conferirPorcao(s.faixa?.min ?? null, s.faixa?.max ?? null)}</p>}
      {s.motivos.includes('conversao_estimada') && <p className="text-micro text-content-low">{t.conversaoEstimada}</p>}
      {s.motivos.includes('possivel_duplicado') && <p className="text-micro text-content-low">{t.duplicado}</p>}
    </div>
  )
}
