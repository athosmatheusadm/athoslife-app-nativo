---
name: athoslife-ui-ux
description: Engenheiro de UI/UX do ATHOSlife. Use antes de melhorar, revisar ou criar qualquer tela, botão, card, sheet, animação ou fluxo do app (Home, Dieta, Treino, Hábitos, Perfil, chat do Life, Scanner, Onboarding, Plano). Traz o método de auditoria por tela, as regras do app (tokens, roxo da recaída, acessibilidade, safe area, i18n) e o catálogo de ferramentas escolhidas a dedo de 4 listas de design.
---

# Engenheiro de UI/UX — ATHOSlife

App de celular (Capacitor/Android) em React 18 + Vite + Tailwind 3, tema escuro,
mascote Life. O usuário é gente comum cuidando de comida, treino e hábitos —
muitas vezes num dia ruim. A interface tem que ser **rápida de usar com uma mão,
legível e acolhedora**. Bonito vem depois de claro.

## Regras do app (não quebrar)

- **Tokens**: só as cores de `tailwind.config.ts` (`brand`, `surface-1..4`,
  `content-hi/mid/low/dim`, `accent-*`). Nada de hex solto. Cor nova = token novo,
  com comentário do porquê.
- **Recaída é roxo** (`accent-recaida`), nunca vermelho. `accent-danger` só pra
  erro real e ação destrutiva. Nada de vermelho/“X” pra falta de registro.
- **Sem culpa nem cobrança** (Humane By Design): estado vazio convida
  ("Registrar o almoço"), não acusa ("Você não registrou nada"). Sequência
  quebrada não é fracasso. Sem contagem regressiva ansiosa, sem dark pattern no
  paywall (cancelar tão fácil quanto assinar, preço claro).
- **Texto mínimo 12px** (`text-micro`). Respeitar Perfil > Acessibilidade:
  tamanho de texto (usar `rem`, nunca px fixo em texto), `.reduzir-animacoes`
  e `.alto-contraste` (não usar `content-dim` em texto que precisa ser lido).
- **Animação só com `transform`/`opacity`**, curva `ease-athos`, 150–300 ms.
  Toda animação some com `prefers-reduced-motion` e `.reduzir-animacoes`.
- **Safe area**: `pt-safe-t` / `pb-safe-b` em topo, BottomNav, sheets e botões
  fixos no rodapé.
- **i18n**: todo texto novo nas 3 línguas (`src/i18n/mensagens` pt-BR/en/es).
  Desenhar pro texto mais longo (espanhol/alemão costuma ser 30% maior):
  nada de largura fixa em botão com texto.
- **Fonte de verdade é o servidor**: UI espelha acesso (`access.ts`), nunca
  libera conteúdo pago sozinha.

## Princípios de UX (Laws of UX aplicadas)

1. **Alvo de toque ≥ 48×48 dp** (Fitts). Ícone pequeno ganha área com padding.
   8 dp entre alvos.
2. **Zona do polegar**: ação principal na metade de baixo da tela; destrutiva
   longe dela. Botão primário fixo no rodapé em fluxo de formulário.
3. **Uma ação principal por tela/card** (Hick). Secundárias em texto ou menu.
4. **Feedback em até 100 ms**: toque muda o visual na hora (`active:scale-[0.97]`
   + `active:bg-*`), vibração leve (`Haptics.impact({ style: Light })`) em ação
   que grava, sucesso com `NotificationType.Success`. Nunca vibrar em erro de
   digitação.
5. **Estados completos** em todo componente com dado: carregando (skeleton com
   o formato do conteúdo, não spinner solto), vazio (convite + 1 ação), erro
   (o que houve + tentar de novo, sem jargão), sucesso, sem conexão.
6. **Botão que salva** mostra carregando → sucesso → volta (stateful button);
   desabilitado durante o envio (evita toque duplo).
7. **Desfazer > confirmar**: excluir item vira toast "Excluído · Desfazer"
   (5 s). Diálogo de confirmação só pra coisa irreversível de verdade.
8. **Números importantes animam** ao mudar (kcal, água, sequência) — devagar e
   curto, sem pular layout (`tabular-nums`).
9. **Proximidade e ritmo**: espaçamento em múltiplos de 4 (Tailwind), cards com
   `rounded-card`, padding 16–20, hierarquia em 3 níveis de texto no máximo.
10. **Contraste WCAG AA**: 4,5:1 texto normal, 3:1 texto grande e ícones.
    Medido: `content-low` 6,9:1 sobre `surface-2` (passa); `content-dim`
    3,6:1 (só texto grande/ícone, e nunca sobre `surface-4`, onde dá 3,0:1);
    `brand` 7,6:1 (passa).

## Método (seguir nesta ordem)

1. **Ler a tela de verdade** — o componente, os filhos e o i18n. Abrir no
   localhost (`npx vite --host --port 5173`) em 360×800 se der.
2. **Auditar** com o checklist abaixo e listar achados por gravidade:
   quebra (bloqueia uso) > atrito (atrapalha) > polimento.
3. **Propor ao dono antes de mexer em layout grande**: 1 parágrafo por tela,
   com o antes/depois em palavras (ou mockup ASCII). Ajuste pequeno (área de
   toque, contraste, estado vazio, feedback) pode ir direto.
4. **Implementar** reaproveitando componentes de `src/ui/components` antes de
   criar novo. Componente novo genérico vai pra `src/ui/components`.
5. **Conferir**: `npx tsc -b` 0 erros, `npx vite build`, olhar em 360 px e com
   texto "extra" + reduzir animações ligados.
6. **Registrar** no `docs/WORKLOG.md` o que mudou e o que ficou pra ver no
   aparelho.

## Checklist por tela

- [ ] Ação principal óbvia e no alcance do polegar
- [ ] Todo alvo ≥ 48 dp; nada colado na borda (safe area)
- [ ] Estados: carregando / vazio / erro / sem conexão / sucesso
- [ ] Feedback de toque visual + haptic nas ações que gravam
- [ ] Textos nas 3 línguas, sem cortar com texto longo nem com fonte "extra"
- [ ] Contraste AA; nenhum texto de leitura em `content-dim`
- [ ] Sem vermelho pra recaída/falta; tom acolhedor nos vazios
- [ ] Animações só transform/opacity e desligáveis
- [ ] Botão voltar do Android fecha sheet/modal antes de sair da tela
- [ ] Teclado não cobre o campo nem o botão de enviar
- [ ] Imagens com `alt` (ou `alt=""` se decorativas); ícone-botão com `aria-label`

## Ferramentas (escolhidas das 4 listas — detalhes em `references/catalogo.md`)

Antes de instalar pacote: ver tamanho (bundlephobia), se roda em Tailwind 3 e
React 18, e se já não dá pra fazer com CSS + o que o app tem. Componentes do
ecossistema shadcn são **copiar e adaptar** aos nossos tokens, não instalar o
shadcn inteiro.

| Necessidade | Primeira escolha | Por quê |
|---|---|---|
| Sheet que sobe de baixo (refeição, adicionar hábito) | **vaul** | arrastar pra fechar, acessível, leve |
| Toast / "Desfazer" | **sonner** | pequeno, empilha, swipe |
| Número que anima (kcal, água, streak) | **number-flow** | transição sem pular layout |
| Escolher peso / reps / carga / horário | **react-wheel-picker** | roleta estilo iOS, uma mão |
| Animação de componente/rota | **motion** (Framer Motion) | layout e gestos; usar pouco |
| Ícones de interface | **Lucide** (ou Phosphor/Tabler) | traço consistente 24px; importar só o usado |
| Ícone animado / celebração | **Lottie** (já no app: `lottie-react`) + LottieFiles/Lordicon/UseAnimations | conquistas, sucesso |
| Mascote que reage (humor do Life) | **Rive** (avaliar) | máquina de estados: hidratado ↔ desidratado ↔ dourado |
| Calendário de dias firmes | **calendar-heatmap** (shadcn) | sequência de hábito visual |
| Guia de primeira vez | **tour / user-tour-kit** | onboarding por tela |
| Base acessível (dialog, popover, tabs) | **Radix Primitives** / Headless UI | foco e teclado certos |
| Checar acessibilidade no dev | **Checka11y.css** (só em dev) | destaca falhas na tela |
| Paleta / contraste | Huetone, Realtime Colors, Colorlab | testar token novo no contexto |

Referência de padrões (olhar antes de redesenhar fluxo): **Mobbin**, **Page
Flows**, **Refero** (apps reais de mercado), **Laws of UX**, **Checklist
Design**, **Humane By Design**, Material 3 e Apple HIG pra convenções de
celular.
