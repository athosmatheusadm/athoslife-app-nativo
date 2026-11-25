/**
 * Nome de alimento da base (escrito no Brasil) como se diz em Portugal
 * (24/11, pedido do dono: português de Portugal "com a cultura de lá").
 * Só troca palavras com certeza de equivalência; o resto fica igual.
 * Cuidado com os falsos amigos: o "presunto" do Brasil (cozido, fatiado) é o
 * "fiambre" de Portugal; "requeijão" lá é outro queijo, então não troca.
 * TypeScript puro.
 */
const TROCAS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bsucos?\b/gi, 'sumo'],
  [/\babacaxis?\b/gi, 'ananás'],
  [/\bpresuntos?\b/gi, 'fiambre'],
  [/\bsorvetes?\b/gi, 'gelado'],
  [/\bcreme de leite\b/gi, 'natas'],
  [/\bbiscoitos?\b/gi, 'bolacha'],
  [/\bpão francês\b/gi, 'carcaça'],
  [/\bmamão\b/gi, 'papaia'],
  [/\babobrinhas?\b/gi, 'curgete'],
  [/\bberinjelas?\b/gi, 'beringela'],
  [/\bvagens?\b/gi, 'feijão-verde'],
  [/\brepolho\b/gi, 'couve'],
  [/\bcarne moída\b/gi, 'carne picada'],
  [/\bfubá\b/gi, 'farinha de milho'],
  [/\bxícaras?\b/gi, 'chávena'],
  [/\bcafé da manhã\b/gi, 'pequeno-almoço'],
  [/\bfilé\b/gi, 'filete'],
  [/\bcafezinho\b/gi, 'café'],
  [/\bchiclete\b/gi, 'pastilha elástica'],
  [/\bÔmega\b/g, 'Ómega'],
]

/** Mantém a maiúscula do original na primeira letra trocada. */
function igualarCaixa(original: string, novo: string): string {
  const a = original.charAt(0)
  return a !== '' && a === a.toUpperCase() ? novo.charAt(0).toUpperCase() + novo.slice(1) : novo
}

export function nomeAlimentoPtPt(nome: string): string {
  let s = nome
  for (const [re, troca] of TROCAS) s = s.replace(re, (m) => igualarCaixa(m, troca))
  return s
}
