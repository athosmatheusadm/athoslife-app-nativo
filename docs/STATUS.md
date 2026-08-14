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
| Cozinha (25 receitas + Life-chef) | ✅ | ✅ código+SQL | Rodar SQL no Supabase; tela da Cozinha (UI) |
| Água dedicada | ✅ | ✅ card+dados | Plugar na Home real |
| Perfil + sub-páginas | ✅ | ✅ lista+tela | Conteúdo real das sub-páginas |
| Notificações (regra fixa) | ✅ | ⬜ | Tela + push (FCM) |
| Notificações inteligentes (Life) | ✅ (doc) | ⬜ | Pós-lançamento, de propósito |
| Histórico de peso | 🔸 tem mecânica no app atual | ⬜ | Reaproveitar o gráfico existente |
| Busca manual de alimentos | 🔸 ref. Macros | ⬜ | Codar (usa alimentos + IA já prontos) |
| Histórico do chat | 🔸 ref. Gemini | ⬜ | Codar |

## Ainda nem começamos (código)

- Telas de tracking: Dieta, Treinos, Hábitos, Conquistas
- Chat com a Life (tela)
- Login + Onboarding + Consentimento reais (hoje são esqueleto)
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
