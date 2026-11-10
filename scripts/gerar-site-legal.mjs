// Gera as páginas públicas que a Google Play exige (link da Política de
// privacidade e link pra pedir exclusão da conta sem instalar o app), a
// partir do MESMO texto que o app mostra (src/ui/screens/legal/documentos.ts).
//
//   node scripts/gerar-site-legal.mjs      ->  site-legal/*.html
//
// Hospede a pasta site-legal/ em qualquer lugar estático (GitHub Pages,
// Cloudflare Pages, Netlify) e use os links na ficha da Play.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { transform } from 'esbuild'

const raiz = fileURLToPath(new URL('..', import.meta.url))
const fonte = readFileSync(raiz + 'src/ui/screens/legal/documentos.ts', 'utf8')
const { code } = await transform(fonte, { loader: 'ts', format: 'esm' })
const { TERMOS, POLITICA, VERSAO_DOCUMENTOS } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'))

const IDIOMAS = [['pt-BR', 'Português'], ['en', 'English'], ['es', 'Español'], ['fr', 'Français'], ['hi', 'हिन्दी']]
const contato = /Contato: (.+?)\.$/.exec(TERMOS['pt-BR'].secoes.at(-1).paragrafos.at(-1))?.[1] ?? ''

/** Página de exclusão de conta (não existe no app: lá é um botão). */
const EXCLUSAO = {
  'pt-BR': { titulo: 'Excluir conta e dados', secoes: [
    { titulo: 'Pelo app (na hora)', paragrafos: ['Abra o ATHOSlife > toque na sua foto > Perfil > Privacidade > Excluir conta. Confirme com a sua senha. A conta e todos os dados são apagados na hora e não dá pra desfazer.'] },
    { titulo: 'Sem o app', paragrafos: [`Envie um e-mail para ${contato} a partir do e-mail cadastrado, com o assunto "Excluir conta". Apagamos em até 30 dias e avisamos quando terminar.`] },
    { titulo: 'O que é apagado', paragrafos: ['Perfil, refeições, água, peso, treinos, passos, hábitos, check-ins, conversas e memórias do Life, fotos e o identificador de notificação do aparelho.', 'Podemos manter apenas o que a lei obriga (por exemplo, registros fiscais de pagamento) e registros de segurança sem identificação.'] },
    { titulo: 'Assinatura', paragrafos: ['Excluir a conta não cancela a assinatura na Google Play. Cancele também em Google Play > Pagamentos e assinaturas.'] },
  ] },
  en: { titulo: 'Delete account and data', secoes: [
    { titulo: 'In the app (immediate)', paragrafos: ['Open ATHOSlife > tap your photo > Profile > Privacy > Delete account. Confirm with your password. The account and all data are deleted immediately and this cannot be undone.'] },
    { titulo: 'Without the app', paragrafos: [`Email ${contato} from your registered email address with the subject "Delete account". We delete within 30 days and let you know when it is done.`] },
    { titulo: 'What is deleted', paragrafos: ['Profile, meals, water, weight, workouts, steps, habits, check-ins, chats and memories with Life, photos and the device notification identifier.', 'We may keep only what the law requires (for example payment tax records) and security records with no identification.'] },
    { titulo: 'Subscription', paragrafos: ['Deleting your account does not cancel your Google Play subscription. Cancel it too in Google Play > Payments and subscriptions.'] },
  ] },
  es: { titulo: 'Eliminar cuenta y datos', secoes: [
    { titulo: 'Desde la app (al instante)', paragrafos: ['Abre ATHOSlife > toca tu foto > Perfil > Privacidad > Eliminar cuenta. Confirma con tu contraseña. La cuenta y todos los datos se borran al instante y no se puede deshacer.'] },
    { titulo: 'Sin la app', paragrafos: [`Envía un correo a ${contato} desde tu correo registrado, con el asunto "Eliminar cuenta". Borramos en un plazo de 30 días y te avisamos al terminar.`] },
    { titulo: 'Qué se borra', paragrafos: ['Perfil, comidas, agua, peso, entrenamientos, pasos, hábitos, check-ins, conversaciones y recuerdos de Life, fotos y el identificador de notificaciones del dispositivo.', 'Podemos conservar solo lo que la ley exige (por ejemplo, registros fiscales de pagos) y registros de seguridad sin identificación.'] },
    { titulo: 'Suscripción', paragrafos: ['Eliminar la cuenta no cancela la suscripción en Google Play. Cancélala también en Google Play > Pagos y suscripciones.'] },
  ] },
  fr: { titulo: 'Supprimer le compte et les données', secoes: [
    { titulo: 'Dans l’application (immédiat)', paragrafos: ['Ouvre ATHOSlife > touche ta photo > Profil > Confidentialité et données > Supprimer le compte. Confirme avec ton mot de passe. Le compte et toutes les données sont supprimés immédiatement, sans retour possible.'] },
    { titulo: 'Sans l’application', paragrafos: [`Envoie un e-mail à ${contato} depuis ton adresse enregistrée, avec l’objet « Supprimer le compte ». Nous supprimons sous 30 jours et te prévenons une fois terminé.`] },
    { titulo: 'Ce qui est supprimé', paragrafos: ['Profil, repas, eau, poids, entraînements, pas, habitudes, check-ins, discussions et souvenirs de Life, photos et identifiant de notification de l’appareil.', 'Nous pouvons conserver uniquement ce que la loi impose (par exemple les justificatifs fiscaux de paiement) et des journaux de sécurité sans identification.'] },
    { titulo: 'Abonnement', paragrafos: ['Supprimer le compte ne résilie pas l’abonnement Google Play. Résilie-le aussi dans Google Play > Paiements et abonnements.'] },
  ] },
  hi: { titulo: 'अकाउंट और डेटा डिलीट करें', secoes: [
    { titulo: 'ऐप से (तुरंत)', paragrafos: ['ATHOSlife खोलें > अपनी फ़ोटो पर टैप करें > प्रोफ़ाइल > प्राइवेसी > अकाउंट डिलीट करें। अपने पासवर्ड से पुष्टि करें। अकाउंट और सारा डेटा तुरंत डिलीट हो जाता है और इसे वापस नहीं लाया जा सकता।'] },
    { titulo: 'ऐप के बिना', paragrafos: [`अपने रजिस्टर्ड ईमेल से ${contato} पर "Delete account" विषय के साथ ईमेल भेजें। हम 30 दिनों के अंदर डिलीट करते हैं और पूरा होने पर आपको बताते हैं।`] },
    { titulo: 'क्या डिलीट होता है', paragrafos: ['प्रोफ़ाइल, भोजन, पानी, वज़न, वर्कआउट, कदम, आदतें, चेक-इन, Life से चैट और यादें, फ़ोटो और डिवाइस का नोटिफ़िकेशन आइडेंटिफ़ायर।', 'हम सिर्फ़ वही रख सकते हैं जो क़ानून के अनुसार ज़रूरी है (जैसे भुगतान के टैक्स रिकॉर्ड) और बिना पहचान वाले सुरक्षा रिकॉर्ड।'] },
    { titulo: 'सब्सक्रिप्शन', paragrafos: ['अकाउंट डिलीट करने से Google Play का सब्सक्रिप्शन कैंसिल नहीं होता। उसे Google Play > पेमेंट और सब्सक्रिप्शन में भी कैंसिल करें।'] },
  ] },
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const NAV = { 'pt-BR': ['Privacidade', 'Termos', 'Excluir conta'], en: ['Privacy', 'Terms', 'Delete account'], es: ['Privacidad', 'Términos', 'Eliminar cuenta'], fr: ['Confidentialité', 'Conditions', 'Supprimer le compte'], hi: ['प्राइवेसी', 'शर्तें', 'अकाउंट डिलीट'] }

function pagina(arquivo, docs) {
  const corpo = IDIOMAS.map(([id]) => {
    const d = docs[id], n = NAV[id]
    return `<article lang="${id}" data-idioma="${id}">
<nav class="docs"><a href="privacidade.html">${n[0]}</a><a href="termos.html">${n[1]}</a><a href="excluir-conta.html">${n[2]}</a></nav>
<h1>${esc(d.titulo)}</h1>${d.atualizado ? `<p class="data">${esc(d.atualizado)}</p>` : ''}
${d.secoes.map((s) => `<section><h2>${esc(s.titulo)}</h2>${s.paragrafos.map((p) => `<p>${esc(p)}</p>`).join('')}</section>`).join('\n')}
</article>`
  }).join('\n')
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ATHOSlife — ${esc(docs['pt-BR'].titulo)}</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:#161616;color:#e8e8e8;font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans Devanagari",sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 16px 64px}
header{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between;margin-bottom:8px}
.marca{font-weight:800;font-size:20px;color:#64c27b;letter-spacing:.2px}
select{background:#222;color:#e8e8e8;border:1px solid #3a3a3a;border-radius:10px;padding:8px 10px;font:inherit}
nav.docs{display:flex;flex-wrap:wrap;gap:8px 16px;margin:8px 0 20px}
a{color:#64c27b}
h1{font-size:26px;line-height:1.25;margin:0 0 4px}
h2{font-size:17px;margin:28px 0 6px;color:#fff}
p{margin:0 0 12px;overflow-wrap:anywhere}
.data,footer{color:#9a9a9a;font-size:14px}
footer{margin-top:40px;border-top:1px solid #2a2a2a;padding-top:16px}
article{display:none}
article.ativo{display:block}
</style>
</head>
<body>
<main>
<header><span class="marca">ATHOSlife</span>
<select id="idioma" aria-label="Idioma / Language">${IDIOMAS.map(([id, nome]) => `<option value="${id}">${nome}</option>`).join('')}</select></header>
${corpo}
<footer>ATHOSlife · ${esc(VERSAO_DOCUMENTOS)}</footer>
</main>
<script>
(function(){var s=document.getElementById('idioma'),ids=${JSON.stringify(IDIOMAS.map(([id]) => id))};
function achar(l){l=(l||'').toLowerCase();for(var i=0;i<ids.length;i++){if(ids[i].toLowerCase()===l||ids[i].slice(0,2).toLowerCase()===l.slice(0,2))return ids[i]}return null}
function mostrar(id){var a=document.querySelectorAll('article');for(var i=0;i<a.length;i++)a[i].className=a[i].getAttribute('data-idioma')===id?'ativo':'';s.value=id;document.documentElement.lang=id}
var q=/[?&]lang=([^&]+)/.exec(location.search);
mostrar(achar(q&&decodeURIComponent(q[1]))||achar(navigator.language)||'pt-BR');
s.onchange=function(){mostrar(s.value)}})();
</script>
<noscript><style>article{display:block}</style></noscript>
</body>
</html>
`
  writeFileSync(raiz + 'site-legal/' + arquivo, html)
}

mkdirSync(raiz + 'site-legal', { recursive: true })
pagina('privacidade.html', POLITICA)
pagina('termos.html', TERMOS)
pagina('excluir-conta.html', EXCLUSAO)
writeFileSync(raiz + 'site-legal/index.html', '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=privacidade.html"><title>ATHOSlife</title><a href="privacidade.html">ATHOSlife</a>\n')

const faltando = [...new Set((JSON.stringify([TERMOS, POLITICA]) + contato).match(/\[[A-ZÀ-Ú/ -]{4,}\]/g) ?? [])]
console.log('site-legal/ gerado (privacidade, termos, excluir-conta) —', VERSAO_DOCUMENTOS)
if (faltando.length) console.warn('ATENÇÃO: ainda há campos pra preencher em documentos.ts:\n  ' + faltando.join('\n  '))
