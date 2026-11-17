"""
Gera o "player" do Life animado a partir dos protótipos do dono
(life_foco.html / life_agua.html, que ficam na raiz e não vão pro git).

    python3 scripts/gerar_life_vivo.py life_foco.html foco
    python3 scripts/gerar_life_vivo.py life_agua.html agua /tmp/captura   # só pra gravar os quadros do widget

Saída em public/life/vivo/:
  <nome>.html   o protótipo intacto (mesmo motor WebGL), com o painel de
                controle escondido, fundo transparente e uma ponte de
                mensagens pro app (LifeVivo.tsx);
  a/*.webp|png  as imagens que vinham em base64 dentro do HTML, viram
                arquivos (o WebView guarda em cache e o HTML cai de ~4 MB
                pra ~80 KB).

O motor não é reescrito: o app comanda o Life "clicando" nos botões
escondidos do painel (versão, expressão, toque, conquista, ação), então
uma versão nova do protótipo entra rodando este script de novo.
"""
import base64
import hashlib
import os
import re
import sys

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, 'public', 'life', 'vivo')

CSS = """
<style id="life-vivo-app">
:root{color-scheme:normal!important}
html,body{background:transparent!important;margin:0!important;padding:0!important;overflow:hidden!important;height:100%}
body{visibility:hidden}
.stage,.stage *{visibility:visible}
.chip,.hint,.fallback,.shadow{display:none!important}
main{max-width:none!important;display:block!important;margin:0!important}
.studio{display:block!important}
.stage{position:fixed!important;inset:0!important;padding:0!important;margin:0!important;border:0!important;border-radius:0!important;
  background:transparent!important;min-height:0!important;display:block!important;overflow:visible!important}
.stage canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border-radius:0!important;cursor:default!important}
</style>
"""

# Ponte com o app. Mensagens (window.postMessage do LifeVivo.tsx):
#   {lifeVivo:'versao', id}      padrao | habitos | chef | treino | agua | seco
#   {lifeVivo:'hab', valor}      0–100 (roxo dos hábitos)
#   {lifeVivo:'expr', id}        id da expressão do protótipo (normal, feliz, sono...)
#   {lifeVivo:'toque'} | {lifeVivo:'conquista'} | {lifeVivo:'acao', i}
#   {lifeVivo:'cor', id}         '' | amarelo | perola | rosa (cor das conquistas, só no Life padrão)
#   {lifeVivo:'acessorio', id}   '' | aureola (preso na cabeça)
# Respostas pro app: {lifeVivo:'pronto'} quando o Life pedido está na tela;
# {lifeVivo:'falhou'} sem WebGL (o app mantém a imagem parada).
PONTE = """
<script id="life-vivo-ponte">
(function(){
  var avisar=function(tipo){try{parent.postMessage({lifeVivo:tipo},'*')}catch(e){}};
  var q=function(s){return document.querySelector(s)};
  var clicar=function(s){var b=q(s);if(b&&!b.disabled)b.click()};
  var pedido=null, avisado=false;
  function aplicar(d){
    if(!d||!d.lifeVivo) return;
    switch(d.lifeVivo){
      case 'versao': pedido=d.id; avisado=false; clicar('[data-ver="'+d.id+'"]'); break;
      case 'hab': var h=q('#hab'); if(h){h.disabled=false;h.value=String(d.valor);h.dispatchEvent(new Event('input',{bubbles:true}))} break;
      case 'expr': clicar('#exprRow [data-ex="'+d.id+'"]'); break;
      case 'toque': clicar('#btnToque'); break;
      case 'conquista': var c=q('#btnConq'); if(c){c.hidden=false;c.click()} break;
      case 'acao': var a=document.querySelectorAll('#acoes button')[d.i||0]; if(a)a.click(); break;
      case 'cor': if(window.__S) window.__S.cor=({amarelo:1,perola:2,rosa:3})[d.id]||0; break;
      case 'acessorio': if(window.__S) window.__S.skin=d.id||''; break;
    }
  }
  addEventListener('message',function(ev){if(ev.source===parent)aplicar(ev.data)});
  // Configuração inicial pela URL: ?v=chef&hab=40&ex=feliz
  var u=new URLSearchParams(location.search);
  function iniciar(){
    if(u.get('v')) aplicar({lifeVivo:'versao',id:u.get('v')});
    if(u.get('hab')) aplicar({lifeVivo:'hab',valor:Number(u.get('hab'))});
    if(u.get('ex')) aplicar({lifeVivo:'expr',id:u.get('ex')});
    if(u.get('cor')) aplicar({lifeVivo:'cor',id:u.get('cor')});
    if(u.get('ac')) aplicar({lifeVivo:'acessorio',id:u.get('ac')});
  }
  // "pronto" só quando a versão pedida já carregou e está desenhada.
  var iniciado=false;
  (function vigiar(){
    var S=window.__S;
    if(S&&window.__lifeVivoPronto){
      if(!iniciado){iniciado=true;iniciar()}
      // S.ver só vira a versão pedida quando a textura dela carregou; espera a transição (320 ms).
      if(!avisado&&S.ver===S.want){avisado=true;setTimeout(function(){avisar('pronto')},pedido?360:0)}
    }
    if(window.__lifeVivoFalhou){avisar('falhou');return}
    setTimeout(vigiar,S&&window.__lifeVivoPronto?120:60);
  })();
})();
</script>
"""


# Cores especiais do Life (dono, 15/11/2026: lista de espera = amarelo
# clarinho, Fundador = branco pérola + auréola). A cor é recalculada no
# shader, igual ao roxo dos hábitos: só os pixels verdes mudam (olhos, boca
# e brilho ficam), então a animação toda continua valendo — piscar, sorriso,
# pálpebra. A auréola usa o encaixe de acessório do protótipo (preso ao osso
# da cabeça).
PELE_GLSL = """
vec4 pele(vec4 t){
  if(t.a<0.004) return t;
  vec3 c0=t.rgb/t.a; vec3 h=rgb2hsv(c0); float H=h.x*360.0;
  float w=clamp((h.y-0.04)/0.12,0.0,1.0)*step(45.0,H)*step(H,170.0);
  if(w<=0.0) return t;
  float v=clamp(h.z,0.0,1.0); vec3 rgb;
  if(uPele<1.5){
    // amarelo clarinho: amarelo-manteiga, mantendo a sombra do 3D
    float nh=50.0+(H-96.0)*0.20;
    rgb=hsv2rgb(vec3(nh/360.0, clamp(h.y*0.58,0.0,1.0), clamp(pow(v,0.82)*1.03,0.0,1.0)));
  } else if(uPele>2.5){
    // rosa clarinho: rosa-bebê, mantendo a sombra do 3D
    float nh=338.0+(H-96.0)*0.15;
    rgb=hsv2rgb(vec3(nh/360.0, clamp(h.y*0.50,0.0,1.0), clamp(pow(v,0.82)*1.04,0.0,1.0)));
  } else {
    // pérola: branco quente na luz, sombra lilás-acinzentada (não fica chapado/pálido)
    float l=smoothstep(0.30,0.95,v);
    float nv=clamp(0.06+pow(v,1.0)*0.98,0.0,1.0);
    rgb=nv*mix(vec3(0.86,0.85,0.97), vec3(1.0,0.975,0.93), l);
    rgb+=vec3(0.035,0.0,0.05)*sin(v*9.0)*l;
  }
  return vec4(mix(c0, rgb, w)*t.a, t.a);
}
"""

PELE_PATCHES = [
    ("uniform float uHappy, uErase, uMode, uAlpha, uRecolor, uLidMode;",
     "uniform float uHappy, uErase, uMode, uAlpha, uRecolor, uLidMode, uPele;"),
    ("vec4 both(vec2 px, float m){", PELE_GLSL.strip() + "\nvec4 both(vec2 px, float m){"),
    ("    gl_FragColor = c*uAlpha;\n  }\n}`", "    if(uPele>0.5) c = pele(c);\n    gl_FragColor = c*uAlpha;\n  }\n}`"),
    ("'uWipe','uSprOn','uSpr','uSprC'].forEach(n=>U[n]=gl.getUniformLocation(prog,n));",
     "'uWipe','uSprOn','uSpr','uSprC','uPele'].forEach(n=>U[n]=gl.getUniformLocation(prog,n));"),
    ("gl.uniform1f(U.uRecolor,v.base||v.medal?0:1);",
     "gl.uniform1f(U.uRecolor,v.base||v.medal?0:1);gl.uniform1f(U.uPele,(v.base||v.medal)?(S.cor||0):0);"),
    ("  Object.values(SKINS).forEach(s=>s.mesh=quadMesh(s.rect));",
     "  SKINS.aureola={src:'a/aureola.png',rect:[212,-196,570,210],nome:'Auréola'};\n"
     "  Object.values(SKINS).forEach(s=>s.mesh=quadMesh(s.rect));"),
    ("// acessórios, pele rosa, pose e as outras versões carregam depois, sem segurar o Life\n",
     "// acessórios, pele rosa, pose e as outras versões carregam depois, sem segurar o Life\n"
     "    loadTex(SKINS.aureola.src,5).then(x=>SKINS.aureola.tex=x).catch(()=>{});\n"),
]


def main(origem: str, nome: str, destino: str = DESTINO) -> None:
    html = open(origem, encoding='utf-8').read()
    pasta_a = os.path.join(destino, 'a')
    os.makedirs(pasta_a, exist_ok=True)
    total = [0]

    def trocar(m: re.Match) -> str:
        tipo, dados = m.group(1), m.group(2)
        if len(dados) < 200:  # placeholders vazios/1px do protótipo ficam como estão
            return m.group(0)
        binario = base64.b64decode(dados)
        ext = 'png' if tipo == 'png' else 'webp'
        arquivo = hashlib.sha1(binario).hexdigest()[:12] + '.' + ext
        caminho = os.path.join(pasta_a, arquivo)
        if not os.path.exists(caminho):
            with open(caminho, 'wb') as f:
                f.write(binario)
            total[0] += len(binario)
        return 'a/' + arquivo

    html = re.sub(r'data:image/(webp|png);base64,([A-Za-z0-9+/=]*)', trocar, html)

    # O motor avisa quando as texturas principais carregaram / quando caiu no modo parado.
    a, b = "]).then(()=>{resize();", "]).then(()=>{resize();window.__lifeVivoPronto=true;"
    assert html.count(a) == 1, 'ponto de "pronto" não encontrado no protótipo'
    html = html.replace(a, b)
    a, b = "function fallbackStatic(){", "function fallbackStatic(){window.__lifeVivoFalhou=true;"
    assert html.count(a) == 1, 'fallbackStatic não encontrado no protótipo'
    html = html.replace(a, b)

    # Sem fontes do Google (offline e sem chamada externa): o motor só usa a fonte no "Z" do sono.
    html = re.sub(r'<link rel="(preconnect|stylesheet)"[^>]*fonts\.(googleapis|gstatic)[^>]*>\n?', '', html)

    for a, b in PELE_PATCHES:
        assert html.count(a) == 1, f'encaixe da cor/auréola não encontrado: {a[:40]}'
        html = html.replace(a, b)

    html = html.replace('</style>', '</style>' + CSS, 1)
    html = html.replace('</body>', PONTE + '</body>') if '</body>' in html else html + PONTE
    if not html.lstrip().lower().startswith('<!doctype'):
        html = ('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
                '<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html)

    with open(os.path.join(destino, nome + '.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'{nome}.html: {len(html) // 1024} KB; imagens novas: {total[0] // 1024} KB')


if __name__ == '__main__':
    if len(sys.argv) not in (3, 4):
        sys.exit(__doc__)
    main(*sys.argv[1:])
