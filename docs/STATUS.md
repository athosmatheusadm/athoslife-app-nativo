# ATHOSlife — Status do projeto

Placar honesto do que existe. Três colunas: **Decidido** (pensado e desenhado),
**Codado** (existe compilando, strict 0 erros), **Falta**.

## Estimativa geral

- Decidir + desenhar (a parte difícil de acertar): ~65%
- Código escrito e validado: ~20–25%
- App publicável na Play, na mão de um usuário: ~15–20%

O trabalho que falta é mais **execução repetitiva** sobre fundações que já
existem (repositórios, cliente de IA, componentes) do que decisão nova.
Os primeiros passos foram os mais pensados; os próximos andam mais rápido.

## Fundação

| Item | Estado |
|------|--------|
| React + Vite + TS strict | ✅ Codado |
| Design tokens (cores da marca) | ✅ Codado |
| Capacitor + pasta android/ | ✅ Codado |
| Guards de rota + botão voltar Android | ✅ Codado |
| Sessão via Preferences (não localStorage) | ✅ Codado |
| Build na nuvem (.aab sem PC potente) | ✅ Codado (GitHub Actions) |

## Módulos

| Módulo | Decidido | Codado | Falta |
|--------|:---:|:---:|------|
| Scanner (captura por IA) | ✅ | ✅ domínio+dados | Tela de revisão (UI) |
| Cozinha (25 receitas + Life-chef) | ✅ | ✅ embutida na tela da Dieta (não é mais aba separada), abaixo das refeições do dia, cards em fileira horizontal com selos de kcal/prot/carb + tempo (2026-08-28) | ⚠️ `db/athoslife_cozinha_tempo_preparo_migration.sql` (coluna `tempo_preparo_min`) ainda não rodou no Supabase — sem ela os cards funcionam normal, só sem o selo de tempo. "Life-chef" (IA) segue de propósito sem backend (`recipeAi.ts`), fora do escopo da tela |
| Home (discos + painel único + streak + refeições + peso) | ✅ | ✅ | — (fiel ao mockup `athoslife-home-funcional.html`; revisada em 2026-08-24, sem dado falso em nenhum bloco) |
| Água | ✅ | ✅ | Virou o próprio disco da Home (não é mais card separado) |
| Dieta (acordeão por refeição) | ✅ | ✅ confirmado funcionando | Migrações `itens_refeicao`/`refeicoes_status` + `refeicoes_extra` rodaram com sucesso. "Extra" virou "refeições extras" livres (nome + posição), criadas pelo "+" da Home ou "+ Nova refeição" na Dieta, arrastáveis — testado ao vivo pelo usuário, confirmado funcionando |
| Login (email/senha) | ✅ | ✅ | "Criar conta" adicionado em 2026-08-24. **Consentimento/Onboarding não têm nenhum redirecionamento automático** — se `consentimento_aceito`/`onboarding_completo` virarem `true` no banco enquanto o usuário já está na tela, ele fica preso lá até navegar manualmente pra `/home` (rota `/consentimento` fica fora do guard `RequireAuth`) |
| Perfil + sub-páginas | ✅ | ✅ lista+tela | Conteúdo real das sub-páginas |
| Notificações (regra fixa) | ✅ | ⬜ | Tela + push (FCM) |
| Notificações inteligentes (Life) | ✅ (doc) | ⬜ | Pós-lançamento, de propósito |
| Histórico de peso | 🔸 tem mecânica no app atual | ⬜ | Reaproveitar o gráfico existente |
| Busca manual de alimentos | 🔸 ref. Macros | ⬜ | Codar (usa alimentos + IA já prontos) |
| Histórico do chat | 🔸 ref. Gemini | ⬜ | Codar |
| Treino (100 exercícios + Local/dia da semana) | ✅ mockup do usuário validado | ✅ catálogo com **100 exercícios** (36 completos com foto de execução, 64 novos só com ícone — sem foto de execução/"como executar" ainda, de propósito), plano pessoal com **série individual (reps + carga em kg cada)**, ícone do card independente do formulário de séries (2026-09-17) | Usuário vai preparar as fotos de execução dos 64 exercícios novos, um por um. Formulário de séries com carga ainda não confirmado ao vivo pelo usuário (só testado visualmente). `ambientes`/`grupo_muscular` dos 64 novos foi chute meu em cima do nome do exercício, não confirmado exercício por exercício |
| Hábitos (vícios/streak/vontade) | ✅ (já vinha do commit inicial, com print de referência do usuário) | ✅ lista + streak + "Estou com vontade" (assistente) + "Hoje eu cedi" (tropeço, zera streak) reais, contra `vicios_user`/`recaidas` no Supabase (RLS ok) + **criar hábito novo** (`AddHabitSheet.tsx`, 2026-09-13, mesmo padrão de bottom sheet do assistente de vontade) | Insight da IA (`insightIA` hoje sempre `null`, sem fonte real ainda), "Chat com a Life" (`onAbrirChat` no-op), os 3 caminhos da vontade (esperar/alternativa/já passou) não persistem nada — decisão consciente, só orientam no momento |

## Ainda nem começamos (código)

- Conquistas (não auditada — Hábitos saiu desta lista em 2026-09-13, ver linha
  própria no Módulos acima; Dieta já tinha saído antes pelo mesmo motivo)
- Achievements/conquistas: `avaliar_conquistas()` só existe como decisão no
  Postgres, nunca foi chamada pelo app (por isso o card de streak da Home
  não mostra "próximo nível" — sem RPC ligada, o número seria inventado)
- Chat com a Life (tela) — decisão de arquitetura: a construir junto com o
  agregador de contexto (água/humor/refeições/peso/passos), não isolado
- Onboarding + Consentimento reais (hoje são esqueleto — Login já é real)
- Google Play Billing (venda de assinatura)
- Push notifications (FCM) + botão físico já feito
- Primeiro .aab assinado + Play Console

## Navegação real (fonte de verdade)

Vinda do app rodando (não do blueprint antigo):
**Home · Dieta · Treinos · Hábitos · Conquistas**, com o **Scanner** como
botão destacado no canto.

## Riscos que podem morder prazo

1. Google Play Billing (regras da Google, chato).
2. Modo resgate (push + WhatsApp, várias peças conversando).
3. Primeiro .aab de pé (quando a teoria vira app instalável).
4. ⚠️ **"Confirm email" está DESLIGADO no Supabase Auth** (Authentication →
   Providers → Email) desde 2026-08-24, só pra destravar teste de login local.
   **Tem que reativar antes de qualquer coisa ir pra produção/Play Store** —
   hoje qualquer email, mesmo inventado, consegue criar conta e logar na hora.
