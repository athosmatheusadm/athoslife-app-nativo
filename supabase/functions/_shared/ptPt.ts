// ================================================================
// PORTUGUÊS DE PORTUGAL (24/11) — o dono pediu o pt-PT "e a cultura de lá".
// A conversa do Life já sai em pt-PT pelo prompt (blocoCultura). Este
// conversor é só para as FRASES PRONTAS do servidor (cartões, avisos,
// respostas fixas), que estão escritas em pt-BR. Faz só trocas seguras:
// vocabulário, "pra/tá", gerúndio com estar ("estou a fazer"), "você"
// (some, o verbo na 3ª pessoa já é o tratamento educado de Portugal) e
// artigo antes do possessivo ("o seu"). Em texto que já está em pt-PT,
// não muda nada de relevante.
// ================================================================

type Troca = readonly [RegExp, string | ((...m: string[]) => string)]

const INF: Record<string, string> = { ando: 'ar', endo: 'er', indo: 'ir' }
const infinitivo = (g: string) => g.slice(0, -4) + INF[g.slice(-4)]

const ESTAR = '(estou|está|estamos|estão|estava|estavam|fico|fica|ficar|ficam|continua|continuo|continuar|segue|sigo|anda)'

const ARTIGOS = new Set(['o', 'a', 'os', 'as', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas', 'pelo', 'pela', 'pelos', 'pelas', 'ao', 'à', 'aos', 'às', 'um', 'uma', 'este', 'esta', 'esse', 'essa', 'num', 'numa'])

// \b do JS não entende acento ("tá", "manhã"): fronteira de palavra em Unicode.
const B = '(?:(?<![\\p{L}\\d_])(?=[\\p{L}\\d_])|(?<=[\\p{L}\\d_])(?![\\p{L}\\d_]))'
const uni = (re: RegExp) => new RegExp(re.source.replaceAll('\\b', B), re.flags.includes('u') ? re.flags : re.flags + 'u')

const TROCAS_BR: readonly Troca[] = [
  [/\bpras\b/g, 'para as'], [/\bPras\b/g, 'Para as'], [/\bpros\b/g, 'para os'], [/\bPros\b/g, 'Para os'],
  [/\bpra\b/g, 'para'], [/\bPra\b/g, 'Para'], [/\bpro\b/g, 'para o'], [/\bPro\b/g, 'Para o'],
  [/\btá\b/g, 'está'], [/\bTá\b/g, 'Está'], [/\btô\b/g, 'estou'], [/\bTô\b/g, 'Estou'],
  [/\bcelulares\b/g, 'telemóveis'], [/\bcelular\b/g, 'telemóvel'], [/\bCelular\b/g, 'Telemóvel'],
  [/\bcâmera\b/g, 'câmara'],
  [/\bda academia\b/g, 'do ginásio'], [/\bna academia\b/g, 'no ginásio'], [/\bà academia\b/g, 'ao ginásio'], [/\bpela academia\b/g, 'pelo ginásio'], [/\ba academia\b/g, 'o ginásio'],
  [/\bacademia\b/g, 'ginásio'], [/\bAcademia\b/g, 'Ginásio'],
  [/\bcafé da manhã\b/g, 'pequeno-almoço'], [/\bCafé da manhã\b/g, 'Pequeno-almoço'],
  [/\bsucos?\b/g, 'sumo'], [/\bSucos?\b/g, 'Sumo'],
  [/\bcardápio\b/g, 'ementa'],
  [/\bregistr(\w*)/g, (_, r) => `regist${r}`], [/\bRegistr(\w*)/g, (_, r) => `Regist${r}`],
  [/\bsalvar\b/g, 'guardar'], [/\bsalvei\b/g, 'guardei'], [/\bsalvou\b/g, 'guardou'], [/\bsalvos?\b/g, 'guardado'],
  [/\bna tela\b/g, 'no ecrã'], [/\bda tela\b/g, 'do ecrã'], [/\ba tela\b/g, 'o ecrã'], [/\btela\b/g, 'ecrã'],
  [/\bcarboidratos?\b/g, 'hidratos de carbono'],
  [/^Oi\b/, 'Olá'], [/([.!?]\s+)Oi\b/g, '$1Olá'],
  [/\bE aí\b/g, 'Então'],
  [/\bembaixo\b/g, 'em baixo'], [/\b([Dd])á uma olhada n(o|a|os|as)\b/g, (_, d, art) => `${d === 'D' ? 'V' : 'v'}ê ${art}`], [/\bdá uma olhada\b/g, 'dá uma vista de olhos'], [/\bDá uma olhada\b/g, 'Dá uma vista de olhos'],
  [/\bBeleza\b/g, 'Está bem'], [/\bFechou\b/g, 'Combinado'],
  [/\b([Mm])e (conta|diz|manda|avisa|chama|fala)\b/g, (_, m, v) => `${m === 'M' ? v[0].toUpperCase() + v.slice(1) : v}-me`],
  // "você": some antes do verbo; nas outras posições vira "si"/"consigo".
  [/\bcom você\b/g, 'consigo'], [/\b(para|de|por|a) você\b/g, '$1 si'],
  [/\b([Vv])ocê (\p{L})/gu, (_, v, c) => (v === 'V' ? c.toUpperCase() : c)],
  [new RegExp(`\\b${ESTAR} (\\w+(?:ando|endo|indo))\\b`, 'g'), (_, e, g) => `${e} a ${infinitivo(g)}`],
  [/\b(de|em|por) (seu|sua|seus|suas)\b/g, (_, p, s) => {
    const art = s.startsWith('seu') ? (s.endsWith('s') ? 'os' : 'o') : (s.endsWith('s') ? 'as' : 'a')
    const junto: Record<string, Record<string, string>> = {
      de: { o: 'do', a: 'da', os: 'dos', as: 'das' }, em: { o: 'no', a: 'na', os: 'nos', as: 'nas' }, por: { o: 'pelo', a: 'pela', os: 'pelos', as: 'pelas' },
    }
    return `${junto[p][art]} ${s}`
  }],
]

const TROCAS: readonly Troca[] = TROCAS_BR.map(([re, troca]) => [uni(re), troca] as const)

/** Artigo antes de seu/sua quando falta ("seu treino" → "o seu treino"). */
function artigoNoPossessivo(t: string): string {
  return t.replace(/(^|[^\p{L}])(\p{L}+\s+)?([Ss]eu|[Ss]ua|[Ss]eus|[Ss]uas)\b/gu, (todo, ini, antes, pos) => {
    const anterior = (antes ?? '').trim().toLowerCase()
    if (anterior && ARTIGOS.has(anterior)) return todo
    const p = pos.toLowerCase()
    const art = p.startsWith('seu') ? (p.endsWith('s') ? 'os' : 'o') : (p.endsWith('s') ? 'as' : 'a')
    const maiuscula = pos[0] === pos[0].toUpperCase() && !antes
    return `${ini}${antes ?? ''}${maiuscula ? art[0].toUpperCase() + art.slice(1) : art} ${p}`
  })
}

/** Frase pronta em pt-BR → pt-PT. */
export function paraPtPt(texto: string): string {
  let t = texto
  for (const [re, troca] of TROCAS) t = t.replace(re, troca as never)
  return artigoNoPossessivo(t)
}
