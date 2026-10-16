import { useEffect, useRef, useState } from 'react'
import { LifeMascote, type HumorLife } from '@ui/components/LifeMascote'
import { ActivityIcon } from '@ui/components/ActivityIcon'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import { Regua, EscolherMusculos } from './OnboardingConversa'

type Valor = string | number | string[]
type Respostas = Record<string, Valor>
type Pergunta = {
  id: string
  titulo: string
  ajuda?: string
  resumo: string
  tipo: 'texto' | 'data' | 'unica' | 'multi' | 'medida' | 'corpo' | 'suplementos'
  humor?: HumorLife
  opcoes?: readonly string[]
  opcional?: boolean
  grupo: number
  quando?: (r: Respostas) => boolean
}
const TREINO = (r: Respostas) => r.treino === 'Quero ajuda'
const PERGUNTAS: readonly Pergunta[] = [
  { id: 'nome', titulo: 'Oi! Eu sou o Life. Como posso te chamar?', ajuda: 'Vamos deixar esse começo com a sua cara.', resumo: 'Seu nome', tipo: 'texto', grupo: 0 },
  { id: 'objetivo', titulo: 'O que você quer cuidar primeiro?', resumo: 'Objetivo', tipo: 'unica', opcoes: ['Perder gordura', 'Ganhar massa', 'Cuidar da saúde e manter o peso'], grupo: 0 },
  { id: 'nascimento', titulo: 'Quando você nasceu?', resumo: 'Nascimento', tipo: 'data', grupo: 0 },
  { id: 'sexo', titulo: 'Qual é o seu sexo biológico?', ajuda: 'É usado no cálculo inicial de energia, quando você pedir metas personalizadas.', resumo: 'Sexo', tipo: 'unica', opcoes: ['Masculino', 'Feminino', 'Prefiro não dizer'], grupo: 0 },
  { id: 'altura', titulo: 'Qual é a sua altura?', ajuda: 'Role para ajustar. O número do meio é o escolhido.', resumo: 'Altura', tipo: 'medida', grupo: 0 },
  { id: 'peso', titulo: 'E o seu peso hoje?', ajuda: 'Um ponto de partida, sem julgamento.', resumo: 'Peso', tipo: 'medida', grupo: 0 },
  { id: 'treino', titulo: 'Quer ajuda para montar seu treino?', ajuda: 'Se preferir organizar sozinho, tudo bem. Pode pedir ajuda depois.', resumo: 'Plano de treino', tipo: 'unica', opcoes: ['Quero ajuda', 'Vou montar depois'], humor: 'treino', grupo: 1 },
  { id: 'dias', titulo: 'Em quais dias você consegue treinar?', ajuda: 'Marque os dias que cabem na sua semana.', resumo: 'Dias de treino', tipo: 'multi', opcoes: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'], humor: 'treino', grupo: 1, quando: TREINO },
  { id: 'tempo', titulo: 'Quanto tempo você tem para cada sessão?', resumo: 'Tempo por sessão', tipo: 'unica', opcoes: ['20 min', '30 min', '45 min', '60 min', '90 min'], humor: 'treino', grupo: 1, quando: TREINO },
  { id: 'local', titulo: 'Onde você vai treinar?', resumo: 'Local do treino', tipo: 'unica', opcoes: ['Em casa', 'Na academia'], humor: 'treino', grupo: 1, quando: TREINO },
  { id: 'experiencia', titulo: 'Como estão os treinos hoje?', resumo: 'Experiência', tipo: 'unica', opcoes: ['Começando agora', 'Voltando a treinar', 'Já treino com frequência'], humor: 'treino', grupo: 1, quando: TREINO },
  { id: 'foco', titulo: 'Em que parte do corpo você quer focar?', ajuda: 'Até 3 regiões. Sem marcar nada, seguimos com corpo todo.', resumo: 'Foco', tipo: 'corpo', humor: 'treino', grupo: 1, quando: TREINO },
  { id: 'dieta', titulo: 'E com a alimentação, quer ajuda com um plano?', ajuda: 'Você também pode registrar suas refeições do seu jeito.', resumo: 'Plano de alimentação', tipo: 'unica', opcoes: ['Quero ajuda', 'Vou montar depois'], humor: 'chef', grupo: 2 },
  { id: 'refeicoes', titulo: 'Quais refeições fazem parte do seu dia?', resumo: 'Refeições', tipo: 'multi', opcoes: ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'], opcional: true, humor: 'chef', grupo: 2 },
  { id: 'gosta', titulo: 'O que você gosta de comer?', ajuda: 'Pode escrever alguns alimentos. Ex.: arroz, ovos, banana…', resumo: 'Gosta de comer', tipo: 'texto', opcional: true, humor: 'chef', grupo: 2 },
  { id: 'evita', titulo: 'E o que prefere não comer?', ajuda: 'Aqui entram os alimentos de que você não gosta. Alergias vêm a seguir.', resumo: 'Prefere evitar', tipo: 'texto', opcional: true, humor: 'chef', grupo: 2 },
  { id: 'restricoes', titulo: 'Tem alguma alergia ou intolerância?', ajuda: 'Marque só o que se aplica a você. Também dá para escrever outra.', resumo: 'Alergias e intolerâncias', tipo: 'multi', opcoes: ['Lactose', 'Glúten', 'Amendoim', 'Castanhas', 'Soja', 'Ovo', 'Peixe e frutos do mar'], opcional: true, humor: 'chef', grupo: 2 },
  { id: 'suplementos', titulo: 'Você já usa algum suplemento?', ajuda: 'Se usar, abra o card e marque os tipos. Não é uma recomendação de uso.', resumo: 'Suplementos', tipo: 'suplementos', opcoes: ['Whey', 'Creatina', 'Albumina', 'Proteína vegetal', 'Multivitamínico', 'Ômega 3'], opcional: true, humor: 'chef', grupo: 2 },
  { id: 'agua', titulo: 'E a água, como anda no seu dia?', ajuda: 'Uma ideia aproximada já ajuda. Não precisa saber o número exato.', resumo: 'Água hoje', tipo: 'unica', opcoes: ['Menos de 1 litro', 'Entre 1 e 2 litros', 'Mais de 2 litros', 'Não sei dizer'], humor: 'hidratado', grupo: 3 },
  { id: 'habitos', titulo: 'Quer dar atenção a mais alguma coisa?', ajuda: 'Escolha o que importa para você. Também pode deixar para depois.', resumo: 'Hábitos de interesse', tipo: 'multi', opcoes: ['Lembrar de beber água', 'Caminhar mais', 'Comer mais verduras', 'Reduzir doces', 'Reduzir refrigerante', 'Ler mais', 'Menos tempo no celular'], opcional: true, humor: 'feliz', grupo: 3 },
]
const MUSCULOS: Record<string, string> = { peito: 'Peito', costas: 'Costas', ombros: 'Ombros', bracos: 'Braços', abdomen: 'Abdômen', gluteos: 'Glúteos', pernas: 'Pernas', panturrilhas: 'Panturrilhas' }
const INPUT = 'min-h-14 w-full rounded-2xl border border-surface-4 bg-surface-2 px-4 py-3 text-base text-content-hi outline-none focus:border-brand'
const BOTAO = 'min-h-12 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-brand-ink active:scale-[0.98]'
const lista = (v: Valor | undefined): string[] => Array.isArray(v) ? v : []

/** Conversa guiada, sem IA ou persistência: uma decisão por vez, controles completos. */
export function OnboardingEssencial() {
  const [r, setR] = useState<Respostas>({})
  const [atual, setAtual] = useState('nome')
  const [historico, setHistorico] = useState<string[]>([])
  const [retornoEdicao, setRetornoEdicao] = useState<string | null>(null)
  const [erro, setErro] = useState('')
  const [aberto, setAberto] = useState(false)
  const area = useRef<HTMLDivElement>(null)
  const perguntas = PERGUNTAS.filter((p) => !p.quando || p.quando(r))
  const p = perguntas.find((x) => x.id === atual)
  const resumo = atual === 'resumo'
  const fim = atual === 'fim'
  const grupo = p?.grupo ?? 3
  useEffect(() => { setErro(''); area.current?.scrollTo({ top: 0 }) }, [atual])
  function mudar(valor: Valor) { setR((prev) => ({ ...prev, [atual]: valor })) }
  function responder(valor: Valor, pular = false) {
    if (!p) return
    if (!pular && !p.opcional && (valor === '' || (Array.isArray(valor) && !valor.length && p.tipo !== 'corpo'))) { setErro('Escolha uma resposta para seguir.'); return }
    if (p.tipo === 'data' && (!/^\d{4}-\d{2}-\d{2}$/.test(String(valor)) || !Number.isFinite(new Date(`${valor}T12:00:00`).getTime()) || String(valor) > dataHoje())) { setErro('Confira sua data de nascimento.'); return }
    const novo = { ...r, [atual]: valor }
    setR(novo)
    if (retornoEdicao) { setAtual(retornoEdicao); setRetornoEdicao(null); return }
    setHistorico((h) => [...h, atual])
    const visiveis = PERGUNTAS.filter((q) => !q.quando || q.quando(novo))
    setAtual(visiveis[visiveis.findIndex((q) => q.id === atual) + 1]?.id ?? 'resumo')
  }
  function editar(id: string) { setRetornoEdicao(atual); setAtual(id) }
  function voltar() {
    if (fim) { setAtual('resumo'); return }
    if (retornoEdicao) { setAtual(retornoEdicao); setRetornoEdicao(null); return }
    const anteriores = historico.filter((id) => perguntas.some((q) => q.id === id))
    setAtual(anteriores[anteriores.length - 1] ?? 'nome')
    setHistorico(anteriores.slice(0, -1))
  }
  useFecharNoVoltar(atual !== 'nome', voltar)
  function resposta(q: Pergunta): string {
    const v = r[q.id]
    let texto = Array.isArray(v) ? v.map((x) => q.id === 'foco' ? MUSCULOS[x] ?? x : x).join(', ') : String(v ?? '')
    if (q.id === 'altura' && v !== undefined) texto += ' cm'
    if (q.id === 'peso' && v !== undefined) texto += ' kg'
    if (q.id === 'nascimento' && texto) texto = texto.split('-').reverse().join('/')
    if (q.id === 'restricoes' && r.outraRestricao) texto = [texto, String(r.outraRestricao)].filter(Boolean).join(', ')
    if (q.id === 'suplementos' && r.outroSuplemento) texto = [texto, String(r.outroSuplemento)].filter(Boolean).join(', ')
    return texto || (q.id === 'foco' ? 'Corpo todo' : 'Não informado')
  }
  const registros = historico.filter((id) => perguntas.some((q) => q.id === id)).slice(-2)
  const nome = String(r.nome ?? '').trim().split(' ')[0]
  if (fim) return <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-8 text-center">
    <LifeMascote humor="conquista" className="mx-auto h-40" />
    <h1 className="mt-6 text-3xl font-bold text-content-hi">Seu começo, do seu jeito{nome ? `, ${nome}` : ''}.</h1>
    <p className="mt-4 leading-relaxed text-content-mid">Um passo de cada vez. O Life vai estar por perto para acompanhar os seus.</p>
    <div className="mt-6 grid grid-cols-3 gap-2">{(['treino', 'chef', 'hidratado'] as const).map((humor, i) => <div key={humor} className="rounded-2xl border border-surface-4 bg-surface-2 p-3"><LifeMascote humor={humor} className="mx-auto h-16" /><p className="mt-2 text-micro text-content-mid">{['Seu movimento', 'Sua alimentação', 'Sua hidratação'][i]}</p></div>)}</div>
    <button type="button" onClick={() => setAtual('resumo')} className={`${BOTAO} mt-7`}>Rever minhas escolhas</button>
    <p className="mt-4 text-micro text-content-low">Prévia concluída. Nenhum plano foi gerado e nenhum dado foi salvo.</p>
  </main>

  return <main className="mx-auto flex h-[100dvh] max-w-md flex-col bg-surface-1 pt-safe-t">
    <header className="flex-none border-b border-surface-4 px-5 pb-3 pt-4">
      <div className="flex items-center justify-between"><span className="text-lg font-bold text-content-hi">ATHOS<span className="text-brand">life</span></span><span className="text-micro text-content-low">Seu começo · prévia</span></div>
      <div className="mt-3 flex gap-2" aria-label={`Parte ${grupo + 1} de 4`}>{['Você', 'Movimento', 'Alimentação', 'Seu dia'].map((label, i) => <span key={label} className="flex-1"><span className={`block h-1 rounded-full ${i <= grupo ? 'bg-brand' : 'bg-surface-4'}`} /><span className={`mt-1 block text-micro ${i === grupo ? 'text-brand' : 'text-content-dim'}`}>{label}</span></span>)}</div>
    </header>
    <div ref={area} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
      {!resumo && registros.length > 0 && <div className="flex flex-wrap gap-2 pt-4" aria-label="Respostas recentes">{registros.map((id) => { const anterior = perguntas.find((q) => q.id === id)!; return <button type="button" key={id} onClick={() => editar(id)} className="max-w-full truncate rounded-full border border-surface-4 px-3 py-1.5 text-micro text-content-low" title="Toque para editar">{anterior.resumo}: {resposta(anterior)} <span aria-hidden="true">↗</span></button> })}</div>}
      <div className="flex items-center gap-4 py-5"><LifeMascote humor={p?.humor ?? (resumo ? 'conquista' : 'normal')} className={p?.id === 'agua' ? 'h-28' : 'h-20'} /><div><span className="text-sm font-semibold text-brand">Life</span><p className="mt-1 text-micro text-content-low">{resumo ? 'Tudo pode ser ajustado.' : 'Uma escolha de cada vez.'}</p></div></div>
      <div key={atual} className="motion-safe:animate-[fadeIn_0.15s_ease]">
        <h1 className="text-2xl font-bold leading-tight text-content-hi">{p?.titulo ?? `Olha o seu ponto de partida${nome ? `, ${nome}` : ''}.`}</h1>
        {p?.ajuda && <p className="mt-2 text-sm leading-relaxed text-content-mid">{p.ajuda}</p>}
        {resumo && <p className="mt-2 text-sm leading-relaxed text-content-mid">Toque em qualquer resposta para ajustar. Você continua no controle.</p>}
      </div>
      {p && <div className="mt-5">
        {(p.tipo === 'texto' || p.tipo === 'data') && <form onSubmit={(e) => { e.preventDefault(); responder(String(r[atual] ?? '').trim()) }}><label className="sr-only" htmlFor={`resposta-${atual}`}>{p.titulo}</label><input key={atual} id={`resposta-${atual}`} type={p.tipo === 'data' ? 'date' : 'text'} max={p.tipo === 'data' ? dataHoje() : undefined} maxLength={p.id === 'nome' ? 60 : 400} autoComplete={p.id === 'nome' ? 'given-name' : 'off'} value={String(r[atual] ?? '')} onChange={(e) => mudar(e.target.value)} className={`${INPUT} ${p.tipo === 'data' ? '[color-scheme:dark]' : ''}`} /><button type="submit" className={`${BOTAO} mt-3 w-full`}>{retornoEdicao ? 'Salvar resposta' : 'Continuar'}</button></form>}
        {p.tipo === 'unica' && <div className="grid gap-2">{p.opcoes?.map((o) => <Opcao key={o} ativo={r[atual] === o} onClick={() => responder(o)}>{o}</Opcao>)}</div>}
        {p.tipo === 'multi' && <><div className="flex flex-wrap gap-2">{p.opcoes?.map((o) => <Opcao key={o} ativo={lista(r[atual]).includes(o)} onClick={() => mudar(lista(r[atual]).includes(o) ? lista(r[atual]).filter((v) => v !== o) : [...lista(r[atual]), o])}>{o}</Opcao>)}</div>{p.id === 'restricoes' && <label className="mt-4 block text-sm text-content-mid">Outra alergia ou intolerância<input className={`${INPUT} mt-2`} value={String(r.outraRestricao ?? '')} maxLength={300} onChange={(e) => setR((prev) => ({ ...prev, outraRestricao: e.target.value }))} /></label>}<button type="button" onClick={() => responder(lista(r[atual]))} className={`${BOTAO} mt-4 w-full`}>{retornoEdicao ? 'Salvar resposta' : p.id === 'restricoes' && !lista(r[atual]).length && !r.outraRestricao ? 'Nenhuma que eu saiba' : 'Continuar'}</button></>}
        {p.tipo === 'medida' && <Regua key={atual} rotuloConfirmar={retornoEdicao ? 'Salvar resposta' : 'Continuar'} entrada={{ tipo: 'regua', min: p.id === 'altura' ? 100 : 25, max: p.id === 'altura' ? 230 : 300, passo: p.id === 'altura' ? 1 : 0.5, unidade: p.id === 'altura' ? 'cm' : 'kg', inicial: () => Number(r[atual] ?? (p.id === 'altura' ? 170 : 70)) }} r={{}} onChange={mudar} onConfirmar={(v) => responder(v)} />}
        {p.tipo === 'corpo' && <><EscolherMusculos valor={lista(r.foco)} onChange={mudar} ocultarConfirmacao onConfirmar={(v) => responder(v)} /><div className="mt-4 flex flex-wrap gap-2">{Object.entries(MUSCULOS).map(([id, label]) => <Opcao key={id} ativo={lista(r.foco).includes(id)} onClick={() => { const selecionados = lista(r.foco); if (selecionados.includes(id)) mudar(selecionados.filter((x) => x !== id)); else if (selecionados.length < 3) mudar([...selecionados, id]) }}>{label}</Opcao>)}</div><button type="button" className={`${BOTAO} mt-4 w-full`} onClick={() => responder(lista(r.foco))}>{retornoEdicao ? 'Salvar resposta' : lista(r.foco).length ? 'Continuar' : 'Continuar com corpo todo'}</button></>}
        {p.tipo === 'suplementos' && <><div className="overflow-hidden rounded-2xl border border-surface-4 bg-surface-2"><button type="button" aria-expanded={aberto} aria-controls="tipos-suplementos" onClick={() => setAberto(!aberto)} className="flex min-h-20 w-full items-center gap-3 p-4 text-left"><ActivityIcon icone="shake" /><span className="flex-1 text-sm font-semibold text-content-hi">Já uso suplementos<span className="mt-1 block text-micro font-normal text-content-low">{lista(r.suplementos).length ? `${lista(r.suplementos).length} selecionado(s)` : 'Toque para escolher'}</span></span><span aria-hidden="true" className="text-xl text-brand">{aberto ? '−' : '+'}</span></button>{aberto && <div id="tipos-suplementos" className="border-t border-surface-4 p-4"><div className="flex flex-wrap gap-2">{p.opcoes?.map((o) => <Opcao key={o} ativo={lista(r.suplementos).includes(o)} onClick={() => mudar(lista(r.suplementos).includes(o) ? lista(r.suplementos).filter((v) => v !== o) : [...lista(r.suplementos), o])}>{o}</Opcao>)}</div><label className="mt-4 block text-sm text-content-mid">Outro suplemento<input className={`${INPUT} mt-2`} value={String(r.outroSuplemento ?? '')} maxLength={200} onChange={(e) => setR((prev) => ({ ...prev, outroSuplemento: e.target.value }))} /></label></div>}</div><button type="button" onClick={() => responder(lista(r.suplementos))} className={`${BOTAO} mt-4 w-full`}>{retornoEdicao ? 'Salvar resposta' : lista(r.suplementos).length || r.outroSuplemento ? 'Continuar' : 'Não uso suplementos'}</button></>}
      </div>}
      {resumo && <><div className="mt-5 rounded-2xl border border-surface-4 bg-surface-2 px-4">{perguntas.map((q) => <button type="button" key={q.id} onClick={() => editar(q.id)} className="flex min-h-16 w-full items-center justify-between gap-3 border-b border-surface-4 py-3 text-left last:border-0"><span><span className="block text-micro text-content-low">{q.resumo}</span><span className="mt-1 block text-sm text-content-hi">{resposta(q)}</span></span><span className="text-micro text-brand">Editar</span></button>)}</div>{(TREINO(r) || r.dieta === 'Quero ajuda') && <p className="mt-4 text-sm leading-relaxed text-content-low">Antes de gerar qualquer plano, faremos um check de saúde específico. Nesta prévia, estamos apenas organizando suas escolhas.</p>}<button type="button" className={`${BOTAO} mt-5 w-full`} onClick={() => setAtual('fim')}>Esse é o meu começo</button></>}
      {erro && <p role="alert" className="mt-3 text-sm text-content-mid">{erro}</p>}
      {p?.opcional && <button type="button" onClick={() => responder(r[atual] ?? (p.tipo === 'texto' ? '' : []), true)} className="mt-3 min-h-11 w-full text-sm font-semibold text-content-low">Prefiro responder depois</button>}
    </div>
    {(historico.length > 0 || retornoEdicao) && <footer className="flex-none border-t border-surface-4 px-5 pb-[calc(8px+env(safe-area-inset-bottom))] pt-1"><button type="button" onClick={voltar} className="min-h-11 text-sm font-semibold text-content-low">← {retornoEdicao ? 'Voltar sem avançar' : 'Voltar'}</button></footer>}
  </main>
}

function Opcao({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: string }) {
  return <button type="button" aria-pressed={ativo} onClick={onClick} className={`min-h-12 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors active:bg-brand/20 ${ativo ? 'border-brand bg-brand/10 text-brand' : 'border-surface-4 bg-surface-2 text-content-hi'}`}>{children}</button>
}
function dataHoje() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
