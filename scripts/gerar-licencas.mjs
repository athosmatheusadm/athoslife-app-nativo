// Gera src/ui/screens/legal/licencas.gerado.ts: as bibliotecas que vão no
// app (só dependências de produção, com as transitivas), a licença e a linha
// de copyright de cada uma. Rodar de novo quando mudar package.json:
//   node scripts/gerar-licencas.mjs
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const raiz = process.cwd()
const caminhos = execSync('npm ls --omit=dev --all --parseable', { encoding: 'utf8', maxBuffer: 1 << 26 })
  .split('\n')
  .filter((p) => p && p !== raiz && relative(raiz, p).startsWith('node_modules'))

function copyright(dir) {
  const arq = readdirSync(dir).find((f) => /^(licen[cs]e|copying)/i.test(f))
  if (!arq) return null
  const linha = readFileSync(join(dir, arq), 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /^(\(c\)|copyright\s)/i.test(l) && !/copyright notice|copyright owner|copyright license/i.test(l))
  return linha ? linha.replace(/\s+/g, ' ').slice(0, 160) : null
}

const vistos = new Map()
for (const dir of caminhos) {
  const pj = join(dir, 'package.json')
  if (!existsSync(pj)) continue
  const p = JSON.parse(readFileSync(pj, 'utf8'))
  if (!p.name || vistos.has(p.name)) continue
  const licenca = typeof p.license === 'string' ? p.license : p.license?.type ?? (p.licenses?.[0]?.type ?? 'ver pacote')
  vistos.set(p.name, { nome: p.name, versao: p.version, licenca, copyright: copyright(dir) })
}
const lista = [...vistos.values()].sort((a, b) => a.nome.localeCompare(b.nome))
writeFileSync(
  'src/ui/screens/legal/licencas.gerado.ts',
  `// GERADO por scripts/gerar-licencas.mjs — não editar à mão.\n\nexport interface LicencaPacote {\n  readonly nome: string\n  readonly versao: string\n  readonly licenca: string\n  readonly copyright: string | null\n}\n\nexport const PACOTES: readonly LicencaPacote[] = ${JSON.stringify(lista, null, 2)}\n`,
)
const porLicenca = {}
for (const p of lista) porLicenca[p.licenca] = (porLicenca[p.licenca] ?? 0) + 1
console.log(lista.length, 'pacotes', porLicenca)
