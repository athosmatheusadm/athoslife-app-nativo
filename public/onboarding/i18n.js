/*
 * Traduções do onboarding.
 *
 * As telas continuam escritas em português, como no HTML do dono. Este arquivo
 * troca cada texto visível (e placeholder, aria-label, title) pelo do idioma
 * escolhido, inclusive o que os scripts da página escrevem depois. Os VALORES
 * das respostas não mudam ("Perder gordura", "Em casa"...): o app lê esses
 * valores como códigos.
 *
 * Texto novo na página? Acrescente em TEXTOS (exato) ou PADROES (com partes
 * variáveis). O que não estiver aqui aparece em português.
 */
;(function () {
  'use strict'

  const IDIOMAS = ['pt-BR', 'en', 'es', 'fr', 'hi']
  const LOCALE_NUMEROS = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es', fr: 'fr-FR', hi: 'en-IN' }
  let idioma = 'pt-BR'

  /** pt → [en, es, fr, hi] */
  const TEXTOS = window.ATHOS_TEXTOS || {}
  /** [regex sobre o texto em pt, { en, es, fr, hi } com $1, $2... (as partes também são traduzidas)] */
  const PADROES = window.ATHOS_PADROES || []
  const POS = { en: 0, es: 1, fr: 2, hi: 3 }

  function exato(pt) {
    const linha = TEXTOS[pt]
    return linha ? linha[POS[idioma]] : undefined
  }

  /** Texto em pt → idioma atual (o que não tem tradução volta igual). */
  function traduzir(pt) {
    if (idioma === 'pt-BR' || !pt) return pt
    const ini = pt.match(/^\s*/)[0]
    const fim = pt.match(/\s*$/)[0]
    const miolo = pt.trim().replace(/\s+/g, ' ')
    if (!miolo) return pt
    const direto = exato(miolo)
    if (direto !== undefined) return ini + direto + fim
    // "frango" na fala do Life: mesma tradução de "Frango", em minúscula
    const maiuscula = miolo.charAt(0).toUpperCase() + miolo.slice(1)
    if (maiuscula !== miolo && exato(maiuscula) !== undefined) {
      const t = exato(maiuscula)
      return ini + (idioma === 'hi' ? t : t.charAt(0).toLowerCase() + t.slice(1)) + fim
    }
    for (const [re, alvo] of PADROES) {
      const m = miolo.match(re)
      if (!m) continue
      const modelo = alvo[idioma]
      if (modelo === undefined) break
      return ini + modelo.replace(/\$(\d)/g, (_, n) => traduzir(m[Number(n)] ?? '')) + fim
    }
    return pt
  }

  // ---------------------------------------------------------- DOM
  const ATRIBUTOS = ['placeholder', 'aria-label', 'title', 'aria-valuetext', 'alt']
  const original = new WeakMap() // nó de texto -> texto em pt
  const escrito = new WeakMap() // nó de texto -> última tradução que escrevemos
  const originalAttr = new WeakMap() // elemento -> { atributo: pt }
  const escritoAttr = new WeakMap()

  // O que a pessoa digita (textarea) nunca é traduzido; os atributos dela, sim.
  const ignorarTexto = (el) => !el || el.closest('script,style,textarea,[data-sem-traducao]')
  const ignorarAttr = (el) => !el || el.closest('script,style,[data-sem-traducao]')

  function texto(no) {
    if (ignorarTexto(no.parentElement)) return
    if (escrito.get(no) !== no.data) original.set(no, no.data)
    const pt = original.get(no)
    const novo = traduzir(pt)
    escrito.set(no, novo)
    if (no.data !== novo) no.data = novo
  }

  function atributos(el) {
    if (ignorarAttr(el)) return
    let orig = originalAttr.get(el)
    let esc = escritoAttr.get(el)
    if (!orig) originalAttr.set(el, (orig = {}))
    if (!esc) escritoAttr.set(el, (esc = {}))
    for (const a of ATRIBUTOS) {
      const v = el.getAttribute(a)
      if (v === null) continue
      if (esc[a] !== v) orig[a] = v
      const novo = traduzir(orig[a])
      esc[a] = novo
      if (v !== novo) el.setAttribute(a, novo)
    }
  }

  function percorrer(raiz) {
    if (raiz.nodeType === 3) return texto(raiz)
    if (raiz.nodeType !== 1 && raiz.nodeType !== 11) return
    if (raiz.nodeType === 1) atributos(raiz)
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
    for (let n = w.nextNode(); n; n = w.nextNode()) n.nodeType === 3 ? texto(n) : atributos(n)
  }

  const obs = new MutationObserver((lista) => {
    for (const r of lista) {
      if (r.type === 'characterData') texto(r.target)
      else if (r.type === 'attributes') atributos(r.target)
      else r.addedNodes.forEach(percorrer)
    }
  })

  // Título da aba ("ATHOSlife · Seu corpo"), trocado pela página a cada tela.
  let tituloPt = document.title
  let tituloEscrito = null
  function titulo() {
    if (document.title !== tituloEscrito) tituloPt = document.title
    tituloEscrito = traduzir(tituloPt)
    if (document.title !== tituloEscrito) document.title = tituloEscrito
  }

  function ligar() {
    percorrer(document.body)
    titulo()
    const t = document.querySelector('title')
    if (t) new MutationObserver(titulo).observe(t, { childList: true, characterData: true, subtree: true })
    obs.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATRIBUTOS,
    })
  }

  // ---------------------------------------------------------- API
  window.athosT = traduzir
  window.athosLocale = () => LOCALE_NUMEROS[idioma]
  window.athosIdiomaAtual = () => idioma
  window.athosIdioma = function (novo) {
    if (!IDIOMAS.includes(novo) || novo === idioma) return
    idioma = novo
    document.documentElement.lang = novo
    const orbita = document.getElementById('ob-idioma')
    if (orbita) orbita.setAttribute('label', traduzir('Idioma'))
    if (document.body) percorrer(document.body)
    titulo()
    window.dispatchEvent(new CustomEvent('athos:idioma', { detail: novo }))
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ligar)
  else ligar()
})()
