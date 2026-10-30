/*
 * Conversa entre esta página (aberta num iframe) e o app
 * (src/ui/screens/OnboardingNovo.tsx). Mensagens só com a mesma origem.
 *
 * Página -> app: pronto | idioma { idioma } | concluir { dados } | sair (voltar na 1ª tela)
 * App -> página: voltar | salvando { texto } | erro { texto }
 *
 * Parâmetros da URL: idioma, unidades (metric|imperial), nome. Tema claro/escuro: tema.js.
 */
;(function () {
  'use strict'
  const app = window.parent !== window ? window.parent : null
  const enviar = (tipo, extra) => app && app.postMessage({ origem: 'athos-onboarding', tipo, ...extra }, location.origin)
  const $ = (s) => document.querySelector(s)

  const q = new URLSearchParams(location.search)
  const orbita = $('#ob-idioma')
  const idioma = q.get('idioma')
  if (idioma) {
    window.athosIdioma(idioma)
    if (orbita) orbita.value = idioma
  }
  orbita?.addEventListener('languagechange', (e) => {
    window.athosIdioma(e.detail.locale)
    enviar('idioma', { idioma: e.detail.locale })
  })
  if (q.get('unidades') === 'imperial') $('#athos-body-rulers-swipe [data-unit="imperial"]')?.click()
  const nome = q.get('nome')
  if (nome && !$('#ob-name').value) $('#ob-name').value = nome

  const botao = $('#ob-export')
  const erro = $('#ob-save-error')
  const rotulo = botao.textContent

  window.addEventListener('athos:onboarding-finish', (e) => {
    erro.textContent = ''
    enviar('concluir', { dados: e.detail })
  })

  window.addEventListener('message', (e) => {
    if (e.origin !== location.origin || !e.data || typeof e.data !== 'object') return
    const m = e.data
    if (m.tipo === 'voltar') {
      if (!window.athosOnboarding.voltar()) enviar('sair')
    } else if (m.tipo === 'salvando') {
      botao.disabled = true
      botao.textContent = m.texto
    } else if (m.tipo === 'erro') {
      botao.disabled = false
      botao.textContent = rotulo
      erro.textContent = m.texto
    }
  })

  enviar('pronto')
})()
