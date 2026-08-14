# Decisão necessária: Capacitor 6 ou 8?

Olá! Antes de tocar a integração do ATHOSlife, preciso de uma decisão sua
sobre a versão do Capacitor. É rápido, mas trava uma feature se não for definido.

## O contexto em uma frase

O app está montado em **Capacitor 6**. A feature de **passos automáticos**
(ler o Health Connect do Android, em vez de o usuário digitar os passos na mão)
usa o plugin `@capgo/capacitor-health`, e a versão atual dele **exige
Capacitor 8**.

Ou seja: com o projeto no Capacitor 6, o plugin de passos automáticos **não
instala**. O código dele já está escrito e validado contra a API real
(arquivos `src/data/health/healthConnect.ts` e `src/domain/services/passosService.ts`),
mas o plugin ficou **fora do `package.json`** de propósito, pra não deixar o
projeto num estado que não roda `npm install`. Há um stub de tipos em
`types/capgo-health.d.ts` só pra o TypeScript compilar sem o pacote.

## As duas opções

**Opção A — Subir para o Capacitor 8 (recomendada)**
- Atualiza `@capacitor/*` de 6.x para 8.x, roda `npx cap sync`, retesta.
- A fundação do projeto é recente e tem pouca coisa dependurada, então este é
  o momento mais barato pra fazer essa subida.
- Depois: `npm i @capgo/capacitor-health` e remover o stub de tipos.
- Passos automáticos passam a funcionar de verdade.

**Opção B — Ficar no Capacitor 6 por enquanto**
- Fixar uma versão antiga do `@capgo/capacitor-health` que seja compatível
  com Capacitor 6 (plugin mais velho), OU
- Deixar os passos **só no modo manual** (que já funciona: o usuário digita),
  e adiar o automático.
- Zero mexida na fundação agora.

## Recomendação

**Opção A**, se você for encostar no automático de passos em algum momento.
Subir cedo é mais barato que subir depois com o app cheio. Mas é decisão sua —
os dois caminhos funcionam.

## O que NÃO muda com essa decisão

O resto do app não depende disso. Todas as outras telas, o Supabase, o billing,
os push — nada disso é afetado pela versão do Capacitor. Isso trava **apenas**
o plugin de passos automáticos.

## Importante: aprovação da Google (separado disso)

Ler dado de saúde exige uma **autorização especial da Google** pra publicar na
Play Store (formulário de acesso ao Health Connect + política de privacidade +
revisão). Isso **não** trava o desenvolvimento nem o teste no aparelho — só a
publicação. Detalhes no arquivo `docs/HEALTH_CONNECT_DIRETRIZ.md`.
