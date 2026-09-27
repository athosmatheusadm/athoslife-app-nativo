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
| Scanner (captura por IA) | ✅ | ✅ **tela real (2026-09-27)**: foto -> IA -> revisão item a item -> itens da refeição na Dieta; **código de barras** (ML Kit + Open Food Facts) | Cota de 2 códigos/dia no grátis + busca com IA quando o produto não existe na base (pendente); publicar ai-proxy novo |
| Cozinha (25 receitas + Life-chef) | ✅ | ✅ embutida na tela da Dieta, abaixo das refeições do dia, cards em fileira horizontal com selos de kcal/prot/carb + tempo | ⚠️ `db/athoslife_cozinha_tempo_preparo_migration.sql` já rodou (confirmado 2026-09-08). "Life-chef" (IA) segue de propósito sem backend, fora do escopo da tela |
| Home (discos + painel único + streak + refeições + peso) | ✅ | ✅ | — (sem dado falso em nenhum bloco) |
| Água | ✅ | ✅ | Virou o próprio disco da Home (não é mais card separado) |
| Dieta (menu por refeição) | ✅ redesenhada 2026-09-24: tocar na refeição abre direto um sheet único (itens + menu de ações), substituiu o acordeão antigo | ✅ **MealSheet** (itens já registrados com ⧉ copiar/🗑 excluir, macros, concluída) + menu "Escanear/Pesquisar/Suplemento/Alimentos salvos/Colar" + **⭐ favoritar alimento** (`alimentos_favoritos`, tabela nova) + **clipboard de copiar/colar entre refeições** (substituiu "copiar de outra refeição") + **Registrar suplemento** com carrossel por tipo (Whey/Creatina/BCAA/Pré-treino/...), 169 produtos reais cadastrados | "Refeições salvas" aparece no menu mas desabilitado ("Em breve") — não existe esse conceito no banco. Auditoria de macros do banco de alimentos feita uma vez (2026-09-24), sem erro estrutural encontrado |
| Login (email/senha) | ✅ | ✅ | "Criar conta" adicionado em 2026-08-24. **Consentimento/Onboarding não têm nenhum redirecionamento automático** — se `consentimento_aceito`/`onboarding_completo` virarem `true` no banco enquanto o usuário já está na tela, ele fica preso lá até navegar manualmente pra `/home` (rota `/consentimento` fica fora do guard `RequireAuth`) |
| Perfil + sub-páginas | ✅ | ✅ **todas as 8 sub-páginas reais** (2026-09-24): Conquistas, Conta (nome/foto/e-mail/sexo/altura/idade/peso), Metas, Plano (status real, sem venda — Billing não existe), Privacidade (exportar dados real em `.json`, solicitar exclusão), Notificações (lembretes de hábito centralizados), Acessibilidade (tamanho de texto/reduzir animações/alto contraste — funcionam de verdade, salvos no aparelho), Sobre | Usuário vai revisar/ajustar cada uma ao gosto dele — construídas rápido, sem refinamento visual ainda |
| Notificações (regra fixa) | ✅ | 🔸 lembrete local só do hábito "construir" (`@capacitor/local-notifications`), agora com tela central em Perfil > Notificações, não testado em build real ainda | Regra fixa pros outros módulos (água/treino), push de verdade (FCM), modo resgate/WhatsApp (nenhum dos dois existe) |
| Notificações inteligentes (Life) | ✅ (doc) + **novo conceito 2026-09-24**: check-in em 3 momentos do dia (manhã=sono, meio-dia=refeição, noite=treino/dia), grounded em dado real, sem gatilho tipo "notificação de anúncio" — reaproveitar o EmotionalCheckin já existente na Home em vez de criar aviso novo | ⬜ | Pós-lançamento, de propósito. Depende da Life virar componente global (decisão de 2026-09-13, nunca implementada) |
| Histórico de peso | 🔸 tem mecânica no app atual | ⬜ | Reaproveitar o gráfico existente |
| Busca manual de alimentos | 🔸 ref. Macros | ⬜ | Codar (usa alimentos + IA já prontos) |
| Histórico do chat | 🔸 ref. Gemini | ⬜ | Codar |
| Treino (100 exercícios + Local/dia da semana) | ✅ mockup do usuário validado | ✅ catálogo com 100 exercícios, plano pessoal com série individual (reps + carga em kg) + **100 "pranchas" ilustradas** (mascote ATHOS, início/execução/instrução numa imagem só, 2026-09-24, `prancha_url`) | ⚠️ **Usuário não gostou da qualidade das pranchas geradas — fazendo auditoria própria, vai reentregar corrigidas.** 25 das 100 vieram com fundo claro por engano (deveria ser escuro). `ambientes`/`grupo_muscular` dos 64 exercícios mais novos foi chute meu, não confirmado um por um |
| Treino em andamento + Live Activity | ✅ | ✅ 2026-09-27: "Começar treino" na mesma tela, faixa com Encerrar/Parar, card nativo na tela de bloqueio (peso/reps, descanso, cronômetro pra exercício por tempo) | Testar no aparelho |
| Widget de água | ✅ HTML do dono | ✅ 2026-09-27 nativo (copos, Life com humor, câmera -> scanner, volume do copo) | Testar no aparelho |
| Conquistas (26 conquistas, bronze→lendário) | ✅ catálogo já existia pronto no banco | ✅ **avaliação real contra dado do usuário** (2026-09-24, client-side TS — `avaliar_conquistas()` da doc antiga nunca existiu de verdade no Postgres, corrigido). Card expande no toque (descrição, nível, data/progresso) | Banco de teste está quase vazio (0 treino/água/peso registrados) — galeria aparece quase toda bloqueada, é o esperado, não é bug. Sem gatilho em tempo real (só avalia quando abre a tela) |
| Hábitos (evitar/construir, streak, vontade, Life) | ✅ redesenhada 2026-09-19: card colapsável, dois tipos (evitar/construir), Life como termômetro+chat | ✅ lista + **streak confiável derivado de datas** (2026-09-24: sem cron, recaída zera de verdade — antes reduzia 30% e não tinha mecanismo de crescimento nenhum) + "Estou com vontade" + **"Fiz hoje" agora persiste de verdade** (RPC `registrar_checkin_habito`, antes era só ✓ visual) + criar hábito + chat com o Life (ainda não testado ao vivo) + lembrete local (só funciona em build Android real) | Música do timer de espera (sem áudio no projeto); **imagem do Life continua com fundo preto sólido** (gambiarra `mix-blend-mode` restaurada — uma tentativa de troca em 2026-09-24 usou a imagem errada, revertida; aguardando a versão certa do usuário); Camada 2 da Life (life_* tables, ai-proxy fixes, FCM, relogio-athos) |

## Ainda nem começamos (código)

- Chat com a Life (tela dedicada, fora de Hábitos) — decisão de arquitetura: a
  construir junto com o agregador de contexto (água/humor/refeições/peso/passos),
  não isolado. Depende da Life virar componente global (2026-09-13, nunca feito)
- Onboarding + Consentimento reais (hoje são esqueleto — Login já é real)
- Google Play Billing (venda de assinatura)
- Push notifications (FCM) + botão físico já feito
- Primeiro .aab assinado + Play Console
- Termos de uso / Política de privacidade / canal de suporte — nenhum documento
  legal existe ainda em lugar nenhum do projeto (Sobre mostra "em breve" de propósito)

## Navegação real (fonte de verdade)

Vinda do app rodando (não do blueprint antigo):
**Home · Dieta · Treinos · Hábitos**, com **Perfil** (Conquistas mora lá dentro)
acessível pelo avatar do cabeçalho. **Scanner saiu da bottom nav em 2026-09-24**
— agora só se chega por ela via "Escanear comida" no menu de uma refeição na
Dieta, ou digitando `/scanner` direto.

## Riscos que podem morder prazo

1. Google Play Billing (regras da Google, chato).
2. Modo resgate (push + WhatsApp, várias peças conversando).
3. Primeiro .aab de pé (quando a teoria vira app instalável).
4. ⚠️ **"Confirm email" está DESLIGADO no Supabase Auth** (Authentication →
   Providers → Email) desde 2026-08-24, só pra destravar teste de login local.
   **Tem que reativar antes de qualquer coisa ir pra produção/Play Store** —
   hoje qualquer email, mesmo inventado, consegue criar conta e logar na hora.
5. ~~Capacitor 6→8~~ — **concluído de verdade em 2026-09-27**: o npm já
   estava no 8.5 (conferido 26/09), mas a pasta `android/` seguia no molde do 6
   (Gradle 8.2.1) e o build nativo quebrava; alinhada ao molde oficial do 8.5. Falta só instalar `@capgo/capacitor-health`,
   apagar `types/capgo-health.d.ts` e `npx cap sync android` quando for mexer
   com Health Connect (que exige aprovação da Google + Política de Privacidade).
