// Regra das camadas do app (arquitetura limpa). Roda em `npm run camadas`
// e junto do `npm run typecheck`.
//
//   domain  -> não importa data, ui nem app (regra pura, sem banco nem tela)
//   data    -> não importa ui nem app
//   ui      -> não fala com o Supabase direto (só por repositório/serviço)
//   app     -> junta tudo (provedores, serviços que usam repositórios)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('../src', import.meta.url))
const REGRAS = [
  { pasta: 'domain', proibido: /from\s+'(@data|@ui|@app|@\/(data|ui|app))\//, motivo: 'domínio não depende de dados, tela nem app' },
  { pasta: 'data', proibido: /from\s+'(@ui|@app|@\/(ui|app))\//, motivo: 'dados não dependem de tela nem de app' },
  { pasta: 'ui', proibido: /from\s+'(@supabase\/supabase-js|@data\/supabase\/client)'/, motivo: 'tela não fala com o Supabase direto' },
]

function* arquivos(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) yield* arquivos(caminho)
    else if (/\.tsx?$/.test(nome) && !/\.gerado\.ts$/.test(nome)) yield caminho
  }
}

const erros = []
for (const { pasta, proibido, motivo } of REGRAS) {
  for (const arq of arquivos(join(raiz, pasta))) {
    readFileSync(arq, 'utf8').split('\n').forEach((linha, i) => {
      if (proibido.test(linha)) erros.push(`src/${relative(raiz, arq).replaceAll('\\', '/')}:${i + 1}  ${motivo}\n    ${linha.trim()}`)
    })
  }
}

if (erros.length) {
  console.error(`Camadas: ${erros.length} import(s) fora da regra\n\n${erros.join('\n')}`)
  process.exit(1)
}
console.log('Camadas: ok')
