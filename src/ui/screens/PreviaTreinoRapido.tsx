import type { AjusteTreino } from '@data/ai/aiProxy'
import { useEffect, useState } from 'react'
import { exercicioCatalogoRepository } from '@data/repositories/exercicioCatalogoRepository'
import type { ExercicioCatalogo } from '@domain/entities/treino'
import { CartaoTreinoRapido } from '@ui/components/life/LifeChatSheet'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Só no `npm run dev` (17/11): o cartão do treino rápido do chat com 3
 * roscas de verdade do catálogo, pro dono ver sem gerar APK.
 */
export function PreviaTreinoRapido() {
  const { m } = useI18n()
  const [lista, setLista] = useState<ExercicioCatalogo[] | null>(null)
  const [ajustes, setAjustes] = useState<Record<string, AjusteTreino>>({})
  useEffect(() => {
    void exercicioCatalogoRepository.listar({ grupoMuscular: 'bracos' }).then((l) =>
      setLista(l.filter((e) => /rosca/i.test(e.nomeBase) && e.ambientes.includes('academia')).slice(0, 3)),
    )
  }, [])
  if (!lista) return <p className="p-6 text-content-low">…</p>
  return (
    <div className="min-h-dvh bg-surface-1 px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col gap-2">
        <CartaoTreinoRapido
          treino={{ parte: 'bíceps', dia: 'hoje', local: 'academia', itens: lista.map((e) => ({ id: e.id, nome: e.nome })) }}
          exercicios={new Map(lista.map((e) => [e.id, e]))}
          textos={m.lifeChat.treinoRapido}
          onde={m.lifeChat.treinoRapido.onde('Hoje', m.onboarding.treino.academia)}
          ajustes={ajustes}
          onAjustar={(id, a) => setAjustes((x) => ({ ...x, [id]: a }))}
        />
        {/* Os botões de verdade ficam no chat; aqui é só a aparência. */}
        <div className="flex flex-wrap justify-end gap-2">
          <span className="flex min-h-11 items-center rounded-full border border-brand/50 bg-brand/10 px-4 text-sm font-semibold text-brand">
            {m.lifeChat.treinoRapido.porNaFicha('hoje')}
          </span>
          <span className="flex min-h-11 items-center rounded-full border border-surface-4 px-4 text-sm font-semibold text-content-mid">
            {m.lifeChat.treinoRapido.outraOpcao}
          </span>
        </div>
      </div>
    </div>
  )
}
