import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { temAcessoPremium } from '@domain/rules/access'
import { profileRepository } from '@data/repositories/profileRepository'
import { planosRepository } from '@data/repositories/planosRepository'
import { dataLocalISO } from '@domain/rules/datas'
import {
  PERGUNTAS_TRIAGEM,
  respostasCompletas,
  situacaoDieta,
  situacaoTreino,
  temRessalva,
  type PerguntaTriagem,
  type RespostasTriagem,
  type TriagemVigente,
} from '@domain/rules/triagemSaude'
import { useI18n } from '@/i18n/I18nProvider'
import { BalaoLife, BalaoPessoa, Opcao } from './baloes'
import { MontarDietaNoLife, MontarTreinoNoLife } from './MontarPlanoNoLife'

type Passo =
  | { tipo: 'carregando' }
  | { tipo: 'convite' }
  | { tipo: 'sexo' }
  | { tipo: 'pergunta'; indice: number }
  | { tipo: 'fechamento' }
  | { tipo: 'ressalva'; depoisDeGravado: boolean }
  | { tipo: 'pronto' }

/**
 * Planos de referência DENTRO do chat do Life (decisão do dono, 29/09):
 *
 *   1. Check de saúde uma vez só: 5 perguntas Sim/Não em balões do Life,
 *      depois data de nascimento + declaração de veracidade.
 *   2. Teve "Sim": o Life aconselha procurar um médico. Se a pessoa quiser
 *      o plano mesmo assim, declara que está ciente (gravado, append-only)
 *      e recebe. Não trava — é a nossa "apólice", não uma catraca.
 *   3. Depois fica aqui: Montar treino · Montar dieta · Trocar algo no plano.
 *      Montar acontece AQUI no chat (MontarPlanoNoLife); aplicou, o plano
 *      vai pra ficha do Treino / cards da Dieta e o chat leva a pessoa lá.
 *
 * Roteiro do app, sem IA: não gasta mensagem da cota. Quem decide o que vale
 * é o servidor (avaliar_triagem + RPCs dos planos).
 */
export function PlanosNoLife(props: { onMudou: () => void; onPreencher: (texto: string) => void; onIr: (rota: string) => void }) {
  const { m } = useI18n()
  const t = m.lifePlanos
  const navigate = useNavigate()
  const { profile, refresh } = useSession()
  // Sexo vem do onboarding; se não tiver (ou "prefiro não dizer"), o check
  // pergunta — gravidez/amamentação (t4) só aparece pra mulher.
  const [sexo, setSexo] = useState<'masculino' | 'feminino' | null>(
    profile?.sexo === 'masculino' || profile?.sexo === 'feminino' ? profile.sexo : null,
  )
  const [perguntouSexo, setPerguntouSexo] = useState(false)
  const perguntas = PERGUNTAS_TRIAGEM.filter((k) => k !== 't4' || sexo === 'feminino')
  const pago = profile ? temAcessoPremium(profile) : false
  const [montando, setMontando] = useState<'treino' | 'dieta' | null>(null)

  const [passo, setPasso] = useState<Passo>({ tipo: 'carregando' })
  const [triagem, setTriagem] = useState<TriagemVigente | null>(null)
  const [respostas, setRespostas] = useState<Partial<RespostasTriagem>>({})
  const [nascimento, setNascimento] = useState('')
  const [declaro, setDeclaro] = useState(false)
  const [ciente, setCiente] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [combinado, setCombinado] = useState(false)
  const hoje = useMemo(() => dataLocalISO(), [])

  useEffect(() => {
    let vivo = true
    void planosRepository
      .triagemVigente()
      .then((tr) => {
        if (!vivo) return
        setTriagem(tr)
        setPasso(tr ? { tipo: 'pronto' } : { tipo: 'convite' })
      })
      .catch(() => vivo && setPasso({ tipo: 'convite' }))
    return () => {
      vivo = false
    }
  }, [])

  // Cada passo novo desce a conversa até ele.
  useEffect(() => {
    props.onMudou()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passo, combinado, erro])

  function responder(chave: PerguntaTriagem, indice: number, valor: boolean) {
    setRespostas((r) => ({ ...r, [chave]: valor }))
    setPasso(indice + 1 < perguntas.length ? { tipo: 'pergunta', indice: indice + 1 } : { tipo: 'fechamento' })
  }

  function escolherSexo(s: 'masculino' | 'feminino') {
    setSexo(s)
    setPerguntouSexo(true)
    // Homem não responde t4; o servidor exige as 5 chaves -> "não".
    if (s === 'masculino') setRespostas((r) => ({ ...r, t4: false }))
    setPasso({ tipo: 'pergunta', indice: 0 })
    void profileRepository
      .atualizarDadosPessoais('sexo', s)
      .then(refresh)
      .catch(() => {})
  }

  function comecarCheck() {
    if (sexo === 'masculino') setRespostas((r) => ({ ...r, t4: false }))
    setPasso(sexo ? { tipo: 'pergunta', indice: 0 } : { tipo: 'sexo' })
  }

  async function gravar(comCiente: boolean) {
    if (!respostasCompletas(respostas)) return
    setSalvando(true)
    setErro(null)
    try {
      const tr = await planosRepository.enviarTriagem({ respostas, dataNascimento: nascimento, ciente: comCiente })
      setTriagem(tr)
      setCombinado(!comCiente && temRessalva(respostas))
      setPasso({ tipo: 'pronto' })
    } catch (e) {
      setErro(e instanceof Error && e.message === 'data_nascimento_invalida' ? t.erroNascimento : m.comum.erroGenerico)
    } finally {
      setSalvando(false)
    }
  }

  function fechar() {
    if (!nascimento || !declaro) {
      setErro(t.erroIncompleto)
      return
    }
    setErro(null)
    // Com ressalva, antes de gravar o Life aconselha e pergunta.
    if (temRessalva(respostas)) setPasso({ tipo: 'ressalva', depoisDeGravado: false })
    else void gravar(false)
  }

  async function declararCienteDepois() {
    setSalvando(true)
    setErro(null)
    try {
      setTriagem(await planosRepository.declararCiente())
      setCombinado(false)
      setPasso({ tipo: 'pronto' })
    } catch {
      setErro(m.comum.erroGenerico)
    } finally {
      setSalvando(false)
    }
  }

  if (passo.tipo === 'carregando') return null

  if (passo.tipo === 'convite') {
    return (
      <div className="rounded-2xl border border-brand/40 bg-brand/5 p-4">
        <p className="text-sm font-bold text-content-hi">{t.cartao}</p>
        <p className="mt-1 text-sm leading-relaxed text-content-mid">{t.cartaoSub}</p>
        <button
          type="button"
          onClick={comecarCheck}
          className="mt-3 w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-[#04120a] active:scale-[0.98]"
        >
          {t.comecar}
        </button>
      </div>
    )
  }

  // Perguntas já respondidas ficam na conversa, como num chat de verdade.
  const respondidas = perguntas.filter((k) => typeof respostas[k] === 'boolean' && (passo.tipo !== 'pergunta' || perguntas.indexOf(k) < passo.indice))
  const chaveAtual = passo.tipo === 'pergunta' ? perguntas[passo.indice] : undefined
  const emCheck =
    passo.tipo === 'sexo' || passo.tipo === 'pergunta' || passo.tipo === 'fechamento' || (passo.tipo === 'ressalva' && !passo.depoisDeGravado)

  return (
    <div className="space-y-3">
      {emCheck && (
        <>
          <BalaoLife>{t.intro}</BalaoLife>
          {passo.tipo === 'sexo' && (
            <>
              <BalaoLife>{t.sexo}</BalaoLife>
              <div className="flex justify-end gap-2">
                <Opcao onClick={() => escolherSexo('masculino')}>♂ {m.lifeMontar.masculino}</Opcao>
                <Opcao onClick={() => escolherSexo('feminino')}>♀ {m.lifeMontar.feminino}</Opcao>
              </div>
            </>
          )}
          {perguntouSexo && sexo && (
            <div className="space-y-3">
              <BalaoLife>{t.sexo}</BalaoLife>
              <BalaoPessoa>{sexo === 'masculino' ? m.lifeMontar.masculino : m.lifeMontar.feminino}</BalaoPessoa>
            </div>
          )}
          {respondidas.map((k, i) => (
            <div key={k} className="space-y-3">
              <BalaoLife>
                <span className="mr-1 text-content-dim">{t.progresso(i + 1, perguntas.length)}</span>
                {t.perguntas[k]}
              </BalaoLife>
              <BalaoPessoa>{respostas[k] ? t.sim : t.nao}</BalaoPessoa>
            </div>
          ))}
        </>
      )}

      {passo.tipo === 'pergunta' && chaveAtual && (
        <>
          <BalaoLife>
            <span className="mr-1 text-content-dim">{t.progresso(passo.indice + 1, perguntas.length)}</span>
            {t.perguntas[chaveAtual]}
          </BalaoLife>
          <div className="flex justify-end gap-2">
            <Opcao onClick={() => responder(chaveAtual, passo.indice, false)}>{t.nao}</Opcao>
            <Opcao onClick={() => responder(chaveAtual, passo.indice, true)}>{t.sim}</Opcao>
          </div>
        </>
      )}

      {passo.tipo === 'fechamento' && (
        <>
          <BalaoLife>{t.fechar}</BalaoLife>
          <div className="space-y-3 rounded-2xl border border-surface-4 bg-surface-2 p-3.5">
            <label className="block text-sm font-semibold text-content-hi">
              {t.nascimento}
              <input
                type="date"
                value={nascimento}
                max={hoje}
                onChange={(e) => setNascimento(e.target.value)}
                className="mt-1.5 block w-full rounded-xl border border-surface-4 bg-surface-1 px-3 py-2.5 text-base text-content-hi"
              />
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={declaro}
                onChange={(e) => setDeclaro(e.target.checked)}
                className="mt-0.5 h-5 w-5 flex-none accent-[#22c55e]"
              />
              <span className="text-micro leading-relaxed text-content-mid">{t.declaracao}</span>
            </label>
            <button
              type="button"
              disabled={salvando}
              onClick={fechar}
              className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-[#04120a] disabled:opacity-60"
            >
              {t.confirmar}
            </button>
          </div>
        </>
      )}

      {passo.tipo === 'ressalva' && (
        <Ressalva
          motivos={
            passo.depoisDeGravado && triagem
              ? triagem.motivos.map((mo) => m.plano.inapto.motivos[mo])
              : PERGUNTAS_TRIAGEM.filter((k) => respostas[k]).map((k) => m.plano.inapto.motivos[MOTIVO_DA_PERGUNTA[k]])
          }
          ciente={ciente}
          onCiente={setCiente}
          salvando={salvando}
          onQuero={() => (passo.depoisDeGravado ? void declararCienteDepois() : void gravar(true))}
          onMedico={() => {
            if (!passo.depoisDeGravado) return void gravar(false)
            setCombinado(true)
            setPasso({ tipo: 'pronto' })
          }}
        />
      )}

      {passo.tipo === 'pronto' && triagem && montando && !pago && (
        <>
          <BalaoLife>{m.plano.pago}</BalaoLife>
          <div className="flex justify-end">
            <Opcao onClick={() => navigate('/perfil/plano')}>{m.plano.verPlanos}</Opcao>
          </div>
        </>
      )}
      {passo.tipo === 'pronto' && triagem && montando === 'treino' && pago && (
        <MontarTreinoNoLife triagem={triagem} onAplicado={props.onIr} onMudou={props.onMudou} />
      )}
      {passo.tipo === 'pronto' && triagem && montando === 'dieta' && pago && (
        <MontarDietaNoLife triagem={triagem} onAplicado={props.onIr} onMudou={props.onMudou} />
      )}

      {passo.tipo === 'pronto' && triagem && !(montando && pago) && (
        <Pronto
          triagem={triagem}
          combinado={combinado}
          onMontarTreino={() => setMontando('treino')}
          onMontarDieta={() => setMontando('dieta')}
          onTrocar={() => props.onPreencher(t.trocarTexto)}
          onQueroMesmoAssim={() => {
            setCiente(false)
            setPasso({ tipo: 'ressalva', depoisDeGravado: true })
          }}
        />
      )}

      {erro && <p className="text-[11px] text-accent-danger">{erro}</p>}
    </div>
  )
}

/** Pergunta -> motivo que o servidor vai gravar (só pra mostrar antes de gravar). */
const MOTIVO_DA_PERGUNTA = {
  t1: 'coracao',
  t2: 'condicao_medica',
  t3: 'lesao_cirurgia',
  t4: 'gestacao_amamentacao',
  t5: 'alimentar_especial',
} as const

function Ressalva(props: {
  motivos: string[]
  ciente: boolean
  onCiente: (v: boolean) => void
  salvando: boolean
  onQuero: () => void
  onMedico: () => void
}) {
  const { m } = useI18n()
  const t = m.lifePlanos
  return (
    <>
      <BalaoLife>
        {t.ressalva}
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {props.motivos.map((mo) => (
            <li key={mo}>{mo}</li>
          ))}
        </ul>
        <span className="mt-2 block">{t.ressalvaMesmoAssim}</span>
      </BalaoLife>
      <div className="space-y-2.5 rounded-2xl border border-accent-gold/40 bg-accent-gold/5 p-3.5">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={props.ciente}
            onChange={(e) => props.onCiente(e.target.checked)}
            className="mt-0.5 h-5 w-5 flex-none accent-[#22c55e]"
          />
          <span className="text-micro leading-relaxed text-content-mid">{t.ciente}</span>
        </label>
        <button
          type="button"
          disabled={!props.ciente || props.salvando}
          onClick={props.onQuero}
          className="w-full rounded-xl bg-brand py-2.5 text-sm font-bold text-[#04120a] disabled:opacity-40"
        >
          {t.querMesmoAssim}
        </button>
        <button
          type="button"
          disabled={props.salvando}
          onClick={props.onMedico}
          className="w-full rounded-xl border border-surface-4 py-2.5 text-sm font-semibold text-content-mid disabled:opacity-60"
        >
          {t.vouAoMedico}
        </button>
      </div>
    </>
  )
}

function Pronto(props: {
  triagem: TriagemVigente
  combinado: boolean
  onMontarTreino: () => void
  onMontarDieta: () => void
  onTrocar: () => void
  onQueroMesmoAssim: () => void
}) {
  const { m } = useI18n()
  const t = m.lifePlanos
  const treino = situacaoTreino(props.triagem)
  const dieta = situacaoDieta(props.triagem)

  if (treino === 'bloqueado') {
    return (
      <BalaoLife>
        {t.bloqueado}
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          {props.triagem.motivos
            .filter((mo) => mo === 'menor_de_idade' || mo === 'idade_divergente')
            .map((mo) => (
              <li key={mo}>{m.plano.inapto.motivos[mo]}</li>
            ))}
        </ul>
      </BalaoLife>
    )
  }

  const precisaCiente = treino === 'precisa_ciente' || dieta === 'precisa_ciente'
  return (
    <>
      {props.combinado && <BalaoLife>{t.combinado}</BalaoLife>}
      <div className="flex flex-wrap gap-2">
        {precisaCiente ? (
          <Opcao onClick={props.onQueroMesmoAssim}>{t.querMesmoAssim}</Opcao>
        ) : (
          <>
            <Opcao onClick={props.onMontarTreino}>🏋️ {t.montarTreino}</Opcao>
            <Opcao onClick={props.onMontarDieta}>🥗 {t.montarDieta}</Opcao>
          </>
        )}
        <Opcao onClick={props.onTrocar}>🔄 {t.trocarNoPlano}</Opcao>
      </div>
    </>
  )
}
