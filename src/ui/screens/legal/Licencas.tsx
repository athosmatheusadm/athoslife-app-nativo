import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { PACOTES } from '@ui/screens/legal/licencas.gerado'
import { useI18n } from '@/i18n/I18nProvider'

/**
 * Perfil > Sobre > Licenças de código aberto. A lista vem de
 * scripts/gerar-licencas.mjs (rodar de novo quando mudar package.json).
 * Os textos das licenças ficam em inglês: é o texto legal original.
 */

const MIT = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`

const BSD0 = `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`

const APACHE = `Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.`

export function Licencas() {
  const { m } = useI18n()
  const t = m.perfil.sobre.licencasTela

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={m.perfil.sobre.licencas} />
      <p className="mx-5 mt-2 text-sm text-content-mid">{t.intro}</p>

      <h2 className="mx-5 mt-6 text-micro font-semibold uppercase tracking-wide text-content-low">{t.bibliotecas}</h2>
      <ul className="mx-5 mt-2 divide-y divide-surface-4/50 overflow-hidden rounded-2xl border border-surface-4 bg-surface-2">
        {PACOTES.map((p) => (
          <li key={p.nome} className="px-4 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 break-all text-sm text-content-hi">{p.nome}</span>
              <span className="flex-none font-mono text-micro text-content-low">{p.licenca}</span>
            </div>
            <p className="text-micro text-content-low">
              {p.versao}
              {p.copyright ? ` · ${p.copyright}` : ''}
            </p>
          </li>
        ))}
      </ul>
      <p className="mx-5 mt-3 text-micro text-content-low">{t.android}</p>

      <h2 className="mx-5 mt-6 text-micro font-semibold uppercase tracking-wide text-content-low">{t.textos}</h2>
      {[
        ['MIT', MIT],
        ['0BSD', BSD0],
        ['Apache-2.0', `${APACHE}\n\n${t.apacheNota}`],
      ].map(([nome, texto]) => (
        <details key={nome} className="mx-5 mt-2 rounded-2xl border border-surface-4 bg-surface-2">
          <summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-semibold text-content-hi">{nome}</summary>
          <p className="whitespace-pre-line px-4 pb-4 text-micro text-content-low">{texto}</p>
        </details>
      ))}
    </main>
  )
}
