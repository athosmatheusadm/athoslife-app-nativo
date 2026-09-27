/**
 * Preferências de acessibilidade — tamanho de texto, reduzir animações,
 * alto contraste. Guardadas no `localStorage` de propósito: é preferência
 * de exibição do aparelho, não dado do usuário (não precisa ir pro banco,
 * não precisa sincronizar entre aparelhos).
 *
 * `aplicarPreferencias()` é chamada uma vez no boot do app (`App.tsx`) pra
 * já nascer com o que a pessoa escolheu antes.
 */

export type TamanhoTexto = 'normal' | 'grande' | 'extra'

const CHAVE_TAMANHO = 'athoslife:tamanho-texto'
const CHAVE_ANIMACOES = 'athoslife:reduzir-animacoes'
const CHAVE_CONTRASTE = 'athoslife:alto-contraste'

const TAMANHO_PX: Record<TamanhoTexto, string> = {
  normal: '',
  grande: '18px',
  extra: '20px',
}

function ler(chave: string): boolean {
  try {
    return localStorage.getItem(chave) === '1'
  } catch {
    return false
  }
}

function gravar(chave: string, valor: boolean): void {
  try {
    if (valor) localStorage.setItem(chave, '1')
    else localStorage.removeItem(chave)
  } catch {
    // localStorage pode falhar (modo privado, storage cheio) — preferência visual, não crítico.
  }
}

export function lerTamanhoTexto(): TamanhoTexto {
  try {
    const v = localStorage.getItem(CHAVE_TAMANHO)
    return v === 'grande' || v === 'extra' ? v : 'normal'
  } catch {
    return 'normal'
  }
}

export function lerReduzirAnimacoes(): boolean {
  return ler(CHAVE_ANIMACOES)
}

export function lerAltoContraste(): boolean {
  return ler(CHAVE_CONTRASTE)
}

export function definirTamanhoTexto(tamanho: TamanhoTexto): void {
  try {
    if (tamanho === 'normal') localStorage.removeItem(CHAVE_TAMANHO)
    else localStorage.setItem(CHAVE_TAMANHO, tamanho)
  } catch {
    // idem
  }
  document.documentElement.style.fontSize = TAMANHO_PX[tamanho]
}

export function definirReduzirAnimacoes(ativo: boolean): void {
  gravar(CHAVE_ANIMACOES, ativo)
  document.documentElement.classList.toggle('reduzir-animacoes', ativo)
}

export function definirAltoContraste(ativo: boolean): void {
  gravar(CHAVE_CONTRASTE, ativo)
  document.documentElement.classList.toggle('alto-contraste', ativo)
}

/** Chamar uma vez no boot — aplica o que já estava salvo, sem esperar a tela de Acessibilidade abrir. */
export function aplicarPreferencias(): void {
  document.documentElement.style.fontSize = TAMANHO_PX[lerTamanhoTexto()]
  document.documentElement.classList.toggle('reduzir-animacoes', lerReduzirAnimacoes())
  document.documentElement.classList.toggle('alto-contraste', lerAltoContraste())
}
