/*
 * Claro ou escuro (claro.css). Roda no <head>, antes de desenhar, pra não
 * piscar escuro. Dentro do app segue o tema do app (classe `tema-claro` do
 * <html> dele, mesma origem) e acompanha se mudar; aberta sozinha, segue o
 * celular. `?tema=claro|escuro` força (prévia).
 */
;(function () {
  'use strict'
  const raiz = document.documentElement
  const forcado = new URLSearchParams(location.search).get('tema')
  let pai = null
  try {
    if (window.parent !== window) pai = window.parent.document.documentElement
  } catch (e) {
    pai = null
  }
  const celular = window.matchMedia('(prefers-color-scheme: light)')
  const claro = () => (forcado === 'claro' ? true : forcado === 'escuro' ? false : pai ? pai.classList.contains('tema-claro') : celular.matches)
  const aplicar = () => raiz.classList.toggle('tema-claro', claro())
  aplicar()
  if (pai) new MutationObserver(aplicar).observe(pai, { attributes: true, attributeFilter: ['class'] })
  else celular.addEventListener('change', aplicar)
})()
