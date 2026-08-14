# ATHOSlife — Inventário de Regras de Negócio

> **O contrato da reconstrução.** Extraído do backend real (schema Supabase, RPCs, triggers e Edge Functions).
> Estas regras descrevem **comportamento**, não implementação. O app Android deve preservar todas elas.
> A implementação legada (HTML monolítico) pode ser descartada; **este documento, não.**

**Status da stack:** React + Vite + TypeScript + Tailwind, empacotado com Capacitor → Google Play.
**Backend:** Supabase (Postgres + RLS + RPCs + Edge Functions) — preservado integralmente.

---

## 1. Acesso e planos

| Regra | Comportamento |
|-------|---------------|
| Trial padrão | Todo perfil novo nasce com `plano = 'trial'` e `trial_expira = NOW() + 30 dias` |
| Trial expirado | Rebaixa automaticamente para `free` (`check_access_status()`) |
| Premium expirado | Rebaixa para `free` **e** `assinatura_ativa = false` |
| Acesso premium-like | `premium`, `vip`, **ou** `trial` ainda não expirado (`is_premium_like()`) |
| Verificação | `check_access_status()` roda 1× por sessão ao abrir o app |

**Planos existentes:** `trial`, `free`, `premium`, `fundador`, `vitalicio`, `vip`.

**Decisão tomada:** Stripe e Kiwify **aposentados**. Google Play Billing é o único provedor de venda no Android.
O trial de 30 dias **não passa pela Play** (não é venda) — continua exatamente como está.

**Regra de arquitetura:** a lógica de negócio nunca fala com o provedor de pagamento.
Tudo atrás de um `SubscriptionService` → trocar de provedor não toca no domínio.

---

## 2. Plano fundador

| Regra | Comportamento |
|-------|---------------|
| Limite | 500 vagas, controladas **server-side** |
| Reserva | `reservar_vaga_fundador()` — atômica, retorna `TRUE` se conseguiu, `FALSE` se esgotou |
| Rollback | `liberar_vaga_fundador()` se o pagamento falhar/expirar após a reserva |
| Consulta pública | `vagas_fundador_disponiveis()` → exibe "X vagas restantes" |
| Preço | **Desconto vitalício** — o fundador mantém o preço enquanto a assinatura não for interrompida |

**Implementação na Play:** oferta de preço especial na Play Console + exclusão dos assinantes antigos em aumentos futuros.
**Ponto de atenção (Fase 5):** cancelamento pode fazer perder o preço de fundador na Play.
Mitigação: registrar quem foi fundador no banco e reativar o benefício por regra própria.

---

## 3. VIP e acesso admin (fora da Play — não são venda)

| Regra | Comportamento |
|-------|---------------|
| Links VIP | `vip_links`: `code` único, `ativo`, `usos_maximos`, `usos_atuais`, `expira_em` |
| Resgate | Registrado em `vip_redemptions` |
| Admin | `profiles.is_admin` — acesso liberado pelo e-mail do dono |

Como **conceder acesso gratuito não é venda**, isso não conflita com a política do Google Play.

---

## 4. Streak (ofensiva)

| Regra | Comportamento |
|-------|---------------|
| Gatilho | `UPDATE profiles SET last_app_open = NOW()` → trigger `handle_streak_on_open()` |
| Frequência | 1× por dia por usuário |
| Continuidade | Diferença de **1 dia** desde `ultimo_acesso` → `streak_atual + 1` |
| Quebra | Diferença **> 1 dia** → `streak_atual = 1` (reinicia, não zera) |
| Recorde | `maior_streak = GREATEST(maior_streak, streak_atual + 1)` — nunca diminui |
| Idempotência | Múltiplas aberturas no mesmo dia **não** incrementam (proteção multi-device) |

**Crítico:** a idempotência é a defesa contra incremento duplo. O app Android **não** pode reimplementar essa
lógica no client — apenas atualizar `last_app_open` e deixar o trigger decidir.

---

## 5. Conquistas (gamificação)

Avaliadas por `avaliar_conquistas()`, que **retorna apenas as conquistas novas** (determinístico, via `RETURNING`).

**Quando chamar:** após toda ação gamificada (registrar água, refeição, peso, completar treino).
**Reação na UI:** se retornar conquista nova → mascote modo `champion` + modal centralizado + confetti.

### Condições implementadas (`condicao_tipo`)

| Categoria | Tipos |
|-----------|-------|
| Streak | `streak_dias` |
| Treino | `treinos_total`, `treinos_semana` (7d), `treinos_30_dias` |
| Dieta | `refeicoes_total`, `dia_completo` (4+ refeições hoje), `proteina_dias`, `dieta_dias` (4+ refeições/dia), `macros_perfeitos` (kcal+prot+carbo+gord dentro de ±10%) |
| Hidratação | `agua_registros`, `agua_dias` (dias consecutivos batendo meta) |
| Peso | `peso_registros`, `peso_semanas`, `peso_variacao_3kg`, `peso_meta` (±0,5kg) |

**Níveis:** bronze, prata, ouro, diamante, lendário.
**Regra:** a lógica de desbloqueio vive **no Postgres**, não no app. Android e iOS só chamam a RPC.

---

## 6. Hábitos e vícios — o coração do produto

| Regra | Comportamento |
|-------|---------------|
| Sem punição | Recaída **nunca** pune, culpa ou zera progresso de forma humilhante |
| Registro | Insert em `recaidas` (`gatilho`, `contexto`, `data`, `horario`) |
| Contadores | `vicios_user`: `streak_atual`, `melhor_streak`, `total_recaidas`, `ultima_recaida` |
| Personalização | `gatilhos[]`, `horario_risco`, `intensidade` (leve/medio/forte) |
| Resposta à recaída | Modal de apoio + mascote modo `struggle` + tom acolhedor da IA |
| Consentimento | Módulo exige `consentimento_habitos` explícito (LGPD) |

**Este módulo é a proposta de valor única do ATHOSlife.** Nenhuma decisão técnica pode degradar
o tom acolhedor ou transformar recaída em punição.

---

## 7. Mascote Life — 8 modos

**Prioridade (maior vence):** `champion` > `critical` > `rescue` > `struggle` > `athlete`/`chef`/`scanner` > `active`

| Modo | Gatilho |
|------|---------|
| `active` | padrão |
| `athlete` | treino completo / aba treinos |
| `chef` | aba dieta |
| `scanner` | abre scanner |
| `struggle` | humor ≤ 2 ou fluxo de vício |
| `rescue` | 3–5 dias sem abrir |
| `critical` | 7+ dias sem abrir |
| `champion` | conquista nova (6s) |

**Regras de UX:** auto-hide 4s (exceto `critical`/`struggle`); anti-spam 30min; tocar em "ATHOSlife" sempre ativa.
**Estado:** persistido em `profiles.mascote_modo_atual` (Supabase — **não** localStorage).

---

## 8. Modo resgate (retenção) — Edge Function `relogio-athos`

Cron diário (7h Brasília). Só atinge usuários com `whatsapp_verificado = true` e `telefone` preenchido.
Calcula `diasInativo` a partir de `last_app_open`:

| Dias inativo | Ação | Tom |
|--------------|------|-----|
| **3** | Cutucão via WhatsApp | Leve, sem cobrança |
| **5** | Incentivo | "Um tropeço não cancela sua caminhada" — propõe recomeço pequeno |
| **7** | Alerta crítico | Sem julgamento + registra evento para o admin |

**Decisão tomada:** o WhatsApp (Z-API) **fica** — é parte do modo resgate, não só boas-vindas.
**Adição no Android:** push notification (FCM) como canal complementar ao WhatsApp.
**Pendência:** a verificação do número no onboarding era simulada no mockup → implementar de verdade.

---

## 9. Inteligência artificial

| Regra | Comportamento |
|-------|---------------|
| Isolamento | **Só** via Edge Function `ai-proxy`. Chave de API **nunca** no client |
| Tipos | `chat`, `vision` (foto do prato), `barcode` |
| Safety | `safetyGuard` no client + `ai_audit_logs` + `eventos_seguranca` no servidor |
| Limite de scan | `foto_scans_hoje` / `foto_scans_reset_date` |
| Limite de chat | `chat_msgs_hoje` / `chat_msgs_reset_date` |
| Erros de UX | `limit_reached` (+ `next_reset`), `image_too_dark`, `image_too_large` → toast + CTA assinar |
| Contexto | `sendChat(messages, context)` — ver bloco abaixo |
| Histórico de scan | `scan_historico`: `descricao_ia`, `resultado_final` (jsonb), `confianca` (0–100) |

### Contexto enviado à IA (não é só o perfil)

A IA do ATHOSlife **não é um chatbot isolado**. Ela enxerga o usuário inteiro:

| Fonte | O que alimenta |
|-------|----------------|
| Perfil | objetivo, nível, restrições, metas |
| **Dieta** | refeições do dia, macros consumidos vs. meta, padrão alimentar, restrições |
| **Treino** | histórico, frequência, local de treino, nível, dias disponíveis |
| **Hábitos / vícios** | vício ativo, streak, gatilhos, horário de risco, recaídas recentes |
| Hidratação | água do dia vs. meta |
| Gamificação | streak, conquistas |
| Emocional | check-in de humor |

**Regra:** ao construir qualquer contexto de IA, dieta, treino e hábitos são
**obrigatórios**, não opcionais. Sem eles a IA responde genérico — que é
exatamente o oposto da proposta do produto.

**Regra de adaptabilidade:** a IA deve ficar progressivamente mais personalizada.
Nenhuma feature pode ser desenhada de forma que impeça personalização futura.

---

## 10. Nutrição, água e peso

**Refeições** (`refeicoes`): `tipo` ∈ cafe/almoco/lanche/jantar/extra · `origem` ∈ manual/scanner/barcode/plano
Colunas reais: `nome`, `calorias`, `proteina`, `carboidrato`, `gordura`, `foto_url`, `data`

**Água** (`registros_agua`): `quantidade_ml > 0` (constraint), `data`

**Peso** (`registros_peso`) + `profiles`: `peso_inicial`, `peso_atual`, `peso_meta`

**Views de agregação — usar sempre que existirem:** `agua_diaria`, `macros_diarios`

**Fórmula de progresso:**
```
progress = min(100, (atual / meta) * 100)
```

**Metas em `profiles`:** `kcal_meta`, `prot_meta`, `carbo_meta`, `gord_meta`, `agua_meta_ml`, `passos_meta`
Calculadas no onboarding, **editáveis** pelo usuário, e candidatas a personalização por IA.

---

## 11. Onboarding e consentimento (LGPD)

**Ordem dos guards (não negociável):**
```
Sessão? → consentimento_aceito? → onboarding_completo? → /home
```

| Campo | Uso |
|-------|-----|
| `consentimento_aceito`, `consentimento_data`, `consentimento_versao` | Aceite dos termos (versionado) |
| `consentimento_habitos` | Consentimento **separado** para o módulo de vícios |
| `onboarding_completo` | Libera o app |

**Dados coletados:** objetivo (emagrecer/massa/manter), nível, dados físicos (altura, idade, peso),
`local_treino`, `dias_treino`, `nivel_treino`, `restricoes[]`, telefone.
**Saída:** cálculo das metas diárias.

---

## 12. Segurança de dados (inegociável)

- **Todas** as tabelas de usuário têm RLS por `auth.uid() = user_id`.
- Políticas existentes **nunca** podem ser enfraquecidas. Melhorias são permitidas; regressões, não.
- `fundador_vagas` sem RLS — acesso **exclusivo** via `service_role` (Edge Function).
- `profiles.id` referencia `auth.users(id)` com `ON DELETE CASCADE`.
- Dados de usuário: **só Supabase**. Nunca armazenamento local do dispositivo.

---

## 13. Módulos do produto (prontos e funcionais — entram no app)

**Correção importante:** estas **não** são "features futuras". Estão prontas e funcionais,
fazem parte do produto e devem entrar no aplicativo. Tratá-las como backlog seria
entregar um ATHOSlife incompleto.

| Módulo | Tabela | Observação |
|--------|--------|------------|
| **Cozinha ATHOSlife** | `receitas_cozinha` | Módulo de valor. Gate `premium`, `mascote_modo` = chef |
| Check-in emocional | `checkins_emocionais` | Humor 1–5, 1×/dia → alimenta modo `struggle` |
| Fotos de progresso | `progress_photos` | Frente/lado/costas + `peso_dia` · bucket `progress-photos` |
| Check-in semanal | `weekly_checkins` | `dados` jsonb + `analise_ia` · 1/semana (`semana_inicio` = segunda) |
| Desafio semanal | `weekly_challenges` | 1 ativo por usuário/semana + `conquista_desbloqueada` |
| Busca de alimentos | `alimentos` | Base para registro manual |
| Passos | `passos_diarios` | Pedômetro |

> ⚠️ **Pendência de decisão:** dois módulos desta lista **não** entram no lançamento.
> Aguardando o dono do produto indicar quais. Até lá, todos são tratados como escopo.

---

## 14. Regras de plataforma (novas — Android)

| Regra | Motivo |
|-------|--------|
| Venda de assinatura **só** via Google Play Billing | Política de pagamentos da Play (checkout externo = rejeição) |
| Acesso gratuito (VIP/admin/trial) fora da Play | Não é venda → sem conflito |
| Câmera via plugin nativo do Capacitor | Substitui a câmera do navegador (scanner + barcode) |
| Push via FCM | Substitui Web Push |
| Botão físico "Voltar" tratado | Ciclo de vida Android — inexistente no mockup |
| Animações: só `transform` + `opacity`; mascote em Lottie | Garante 60fps dentro da casca |
| Dados sensíveis de saúde | Exige política de privacidade e declaração na Play Console |

---

## 15. Design: o que fica e o que evolui

**O design está aprovado e permanece.** O mockup não é rascunho para jogar fora —
a identidade visual funciona (UI avaliada 9/10 na análise de produto) e o layout das
telas existentes é a referência a ser seguida. **Não há redesenho tela a tela.**

O trabalho é cirúrgico e se divide em três frentes:

### 15.1 — Telas ausentes (construir, o desenho não existe ainda)

| Tela | Por quê |
|------|---------|
| Água dedicada | Hoje só existe o card na home |
| Histórico de peso | Existe registro, não existe visualização |
| Notificações | Nenhuma tela |
| Sub-páginas do perfil | Editar metas, dados, plano, privacidade |
| Busca manual de alimentos | Tabela `alimentos` sem interface |
| Histórico do chat | Conversas não persistem na tela |

### 15.2 — Estados que faltam (o desenho existe, os estados não)

Não muda layout. Preenche buracos que hoje quebram a experiência:

- **Empty states** — inexistentes. Tela vazia sem convite à ação.
- **Loading / erro** — ausentes fora do scanner.
- **Acessibilidade** — sem ARIA, sem foco visível. Fontes de 8–9px → **piso de 12px**.
- **Offline** — o app precisa dizer o que houve, não travar.

### 15.3 — Combater o genérico (sem redesenhar)

O que faz um app de saúde parecer template não é o layout — é a falta de voz.
Alavancas de maior impacto, do mais barato ao mais caro:

| Alavanca | O que muda |
|----------|-----------|
| **Voz do texto** | "Submit"/"Você falhou" → linguagem do ATHOSlife. Copy genérico é o que mais entrega template. |
| **Mascote como assinatura** | O Life é o que nenhum concorrente tem. Ele deve reagir, não decorar. |
| **Cor com significado** | Recaída em roxo, não vermelho. A cor obedece à regra de negócio. |
| **Empty states com personalidade** | Tela vazia é palco do mascote, não um "Nenhum item encontrado". |
| **Tipografia com hierarquia** | Mesma paleta, mesmo layout, peso e escala intencionais. |
| **Micro-reações** | Confetti já existe. Falta o resto responder ao toque. |

**Regra:** propor melhoria pontual e justificada, dentro do design existente.
Redesenho geral não é escopo.

---

## 16. Regra de cor (semântica, não estética)

| Cor | Uso | Nunca |
|-----|-----|-------|
| Verde `#22c55e` | Marca, progresso, sucesso | — |
| Laranja `#f97316` | Treino, calorias, energia | — |
| Azul `#3b82f6` | Hidratação | — |
| Âmbar `#fbbf24` | Conquistas | — |
| **Roxo `#8b5cf6`** | **Recaída, hábitos, apoio** | Nunca vermelho/rosa |
| Rosa `#f43f5e` | Erro real, ação destrutiva | Nunca para recaída |

**Por que recaída é roxo:** vermelho é cor de alarme e leria como punição.
A regra diz que recaída **nunca pune**. O roxo acolhe sem julgar.
A cor está subordinada à regra de negócio.

---

## Critério de conclusão

Uma feature só está pronta quando:

- [ ] O comportamento de negócio original foi preservado
- [ ] A arquitetura ficou mais limpa que antes
- [ ] TypeScript strict respeitado
- [ ] Sem duplicação de lógica
- [ ] Regra de negócio na camada correta (UI só apresenta)
- [ ] Reutilizável por Android **e** iOS
- [ ] RLS preservada ou melhorada — nunca enfraquecida
- [ ] Auto-revisada
