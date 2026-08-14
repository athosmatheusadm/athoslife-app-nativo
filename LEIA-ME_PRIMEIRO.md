# ATHOSlife — Handoff para desenvolvimento

Este projeto é o app **ATHOSlife** (plataforma de hábitos saudáveis) migrado de
PWA para **app Android** via **React + Vite + TypeScript + Capacitor**, publicável
na Google Play. Backend em **Supabase**. Este documento é o ponto de partida.

---

## 1. O que já está pronto (neste repositório)

Código React/TypeScript de todas as telas principais, em arquitetura limpa
(domínio → dados → UI), com TypeScript strict. Escrito para ser integrado, não
reescrito.

**Telas e sistemas construídos:**
- **Home** — discos de atividade, refeições com foto, água (registro + histórico), peso, check-in emocional
- **Dieta** — diário com acordeão de refeições, busca inline de alimentos, tira de dias, Cozinha (25 receitas)
- **Treino** — 3 níveis (Local → Treinos nomeados → Exercícios), abas, ícones SVG, gaveta de adicionar
- **Hábitos** — tom acolhedor "peso sem punição", streak, assistente de vontade
- **Conquistas** — acervo na gaveta lateral + celebração (Life dourado); bolinha de novidade
- **Transversais** — Scanner (Gemini Vision), Health Connect (passos), notificações (doc)

**Camadas:**
- `src/domain/` — entidades e regras de negócio (puro TS, reusável iOS/Android)
- `src/data/` — repositórios Supabase, IA, health
- `src/ui/` — telas e componentes React
- `db/` — migrações SQL (rodar no Supabase)
- `.github/workflows/android-build.yml` — build do `.aab` na nuvem

---

## 2. Como subir e rodar (primeira vez)

```bash
npm install                 # instala dependências
cp .env.example .env        # configurar credenciais do Supabase
npm run dev                 # rodar web (desenvolvimento)
npx tsc --noEmit            # validar TypeScript strict (meta: 0 erros)
```

Para Android:
```bash
npm run build && npx cap sync android
npx cap open android        # abre no Android Studio
```

O `.aab` de produção é gerado pelo GitHub Actions (`.github/workflows/`), já que
o build local pode ser pesado. Ver o workflow para os secrets necessários.

---

## 3. Decisões pendentes (precisam de humano ANTES da integração)

Três decisões travam partes do trabalho. Ver documentos dedicados:

1. **Capacitor 8** — ✅ DECIDIDO: migrado para o Capacitor 8.
   O `package.json` e o `android/variables.gradle` já estão no 8. Faltam alguns
   comandos de setup que o dev roda no primeiro `npm install` (ambiente com rede
   normal) — ver `docs/MIGRACAO_CAPACITOR_8.md`. É lá que o plugin de passos
   automáticos entra e o stub de tipos é removido.

2. **Login e Onboarding** — as telas (`Login.tsx`, `Onboarding.tsx`) existem como
   estrutura, mas o FLUXO real (método de login, perguntas do onboarding que
   alimentam metas) precisa ser definido. O app não funciona sem isso.

3. **Google Play Billing** — o modelo Premium está definido no negócio, mas o
   mecanismo de cobrança/validação pela Play Console precisa ser configurado.

---

## 4. SQLs a rodar no Supabase (ordem importa)

```
1. athoslife_cozinha_migration.sql   (estrutura da Cozinha)
2. athoslife_cozinha_seed.sql        (25 receitas — DEPOIS da migration)
3. athoslife_treinos_v2.sql          (estrutura de treinos em 3 níveis)
```

Tabelas que JÁ existem no banco e o código usa: `checkins_emocionais` (humor),
`treinos_historico`, `registros_agua`, `registros_peso`, `alimentos`, `refeicoes`,
`profiles`, `vicios_user`, e a função `avaliar_conquistas()`.

---

## 5. Ordem de execução sugerida (para o Claude Code)

1. `npm install` + resolver a decisão do Capacitor (item 3.1)
2. Configurar `.env` com Supabase; rodar os SQLs (seção 4)
3. Validar `npx tsc --noEmit` (deve dar 0 erros)
4. Implementar o fluxo de Login/Onboarding real (item 3.2)
5. Ligar cada tela ao Supabase real (os repositórios já existem) e testar
6. Triggers de streak, chamadas a `avaliar_conquistas()` nos pontos certos
7. Google Play Billing (item 3.3)
8. Primeiro `.aab` via GitHub Actions → testar no aparelho → Play Console

---

## 6. Notas importantes

- **Identidade visual:** preservar o design existente. Verde #22c55e, superfícies
  escuras, fonte Inter. Ver `tailwind.config.ts` para os tokens.
- **Animações:** só `transform`/`opacity` (60fps no WebView Android). Expansões
  usam `grid-rows 0fr↔1fr`, nunca animar `height`.
- **Artes e ícones:** estão sendo produzidos à parte (designer). O código usa
  placeholders (ícones SVG de traço, imagens de exemplo) prontos para substituição.
- **AI/personalização:** projetar sempre pensando que a IA vai personalizar depois
  (metas, nutrição, treino, notificações). Não criar features que impeçam isso.
- **Health Connect:** ler dado de saúde exige aprovação da Google para publicar.
  Ver `HEALTH_CONNECT_DIRETRIZ.md`.

---

## 7. Validação pendente

A última rodada de código (treinos v2, conquistas) não pôde ter o `npx tsc`
completo rodado no ambiente de origem por limitação de rede (bloqueio de pacotes
na instalação). O domínio foi validado isoladamente. **Rodar `npx tsc --noEmit`
no primeiro setup** para confirmar 0 erros — ambiente normal não terá o bloqueio.
