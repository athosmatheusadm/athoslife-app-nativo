# Health Connect (passos automáticos) — diretriz

## Estado

O código de leitura de passos via Health Connect **está escrito e validado**
contra a API real do plugin `@capgo/capacitor-health`:

- `src/data/health/healthConnect.ts` — contato com o plugin nativo, isolado.
- `src/domain/services/passosService.ts` — junta automático + manual (fallback).
- `src/data/repositories/passosRepository.ts` — grava em `passos_diarios`.

A UI e o disco de passos falam só com `passosService`; não sabem se o número
veio do sensor ou foi digitado.

## ⚠️ Pendência que trava a instalação: Capacitor 6 → 8

A versão atual do `@capgo/capacitor-health` (8.x) exige **Capacitor 8**, e o
projeto está no **Capacitor 6**. Por isso o plugin **não está no package.json
ainda** — para não deixar o projeto num estado que não instala.

Um **stub de tipos local** (`types/capgo-health.d.ts`) permite o código
compilar aqui sem o pacote. No ambiente do dev, ao instalar o pacote real,
o stub pode ser removido.

### Decisão a tomar (dev, com o app rodando)

1. **Subir para Capacitor 8** (recomendado p/ longo prazo): atualiza
   `@capacitor/*` para 8.x, roda `npx cap sync`, retesta. A fundação é
   recente e tem pouca coisa dependurada, então é o momento mais barato
   pra fazer essa subida.
2. **Ou** fixar uma versão antiga do plugin compatível com Capacitor 6
   (plugin mais velho; só se quiser adiar a subida).

Depois de resolver, instalar: `npm i @capgo/capacitor-health` e remover o stub.

## Setup nativo obrigatório (Android)

- `minSdk` 26+ (Health Connect exige Android 8+).
- Permissão `android.permission.health.READ_STEPS` no manifest (o plugin já
  declara as básicas).
- String `health_connect_privacy_policy_url` no `strings.xml` apontando para
  a política de privacidade.

## Aprovação da Google (antes de publicar, não de testar)

Ler dado de saúde exige **autorização especial** da Google para publicar na
Play (formulário de acesso a Health Connect + política de privacidade +
revisão). Isso **não** trava o desenvolvimento nem o teste no aparelho —
só a publicação. O relatório/documento para a Google é feito quando o app
estiver pronto.

## Leitura correta (mudança da Google jun/2026)

A leitura usa `queryAggregated` (soma do dia), **sem filtrar por origem**.
Assim os passos contados pelo próprio aparelho entram automaticamente e a
mudança de atribuição de jun/2026 não quebra a conta.
