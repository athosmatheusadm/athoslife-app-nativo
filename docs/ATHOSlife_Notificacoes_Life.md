# Notificações da Life — Arquitetura (fase pós-lançamento)

> Não é pra codar agora. Faz sentido só depois do app na Play, com usuários
> gerando eventos reais. Guardado aqui pra não perder o raciocínio.

## A ideia em uma frase

Duas camadas trabalhando juntas: **regra fixa garante o que não pode faltar,
a Life encanta por cima** — falando só quando algo foge do padrão do usuário.

## Como funciona (o modelo que faz sentido)

**Camada 1 — Regras fixas (burras, mas nunca falham).**
Lembretes essenciais: água, treino, hábito, avisos do sistema. Se a IA cair,
isso continua funcionando. É o piso.

**Camada 2 — Life (inteligente, acordada por evento).**
A Life NÃO fica vigiando o dia inteiro nem é chamada a cada notificação.
Ela é acordada só quando um **gatilho incomum** dispara. Exemplos:
- passou das 20h e o usuário não registrou água (e ele é do tipo que esquece);
- é sexta 22h e ele costuma escorregar num lanche nesse horário;
- sumiu há alguns dias.

Quando um gatilho desses dispara, a Life decide: **fala ou não? como? espera
resposta?** No dia normal (tudo registrado certo), nenhum gatilho aciona —
a Life nem é chamada. Custo zero nos dias tranquilos.

> Por que não "decide tudo de manhã": um plano feito às 7h não sabe que às 22h
> o usuário esqueceu a água. Quem chama a Life é o **evento**, não o relógio.

## Memória: acompanha, não decora

A Life guarda um **resumo vivo** do usuário — poucas linhas do que o define:
"esquece a água", "ama treino de perna", "some nos fins de semana".
Não é um diário completo (caro e desnecessário). É um perfil curto + um radar
pra perceber quando ele **sai do padrão**. Isso é o que dá a sensação de
"o app me conhece". Atualiza de vez em quando, não a cada evento.

## Travas (pra não virar spam)

- **Teto rígido de mensagens/dia**, aplicado pela regra fixa, nunca pela IA.
  IA empolgada manda demais — e notificação demais é o caminho pro desinstalar.
- **Feedback manda no aprendizado**: tocou / ignorou / fez a ação depois.
  Se um tipo de aviso é sempre ignorado, a Life encolhe e para de mandar.
- **Relevância acima de frequência**: um "5 dias batendo a meta, tá voando 🔥"
  por semana vale mais que dez "hora da água" por dia.

## Custo (o que mantém barato)

- IA só é chamada em **evento incomum**, não por horário nem por notificação.
- Dia dentro do padrão = nenhuma chamada.
- Encaixa no que já existe: o cron `relogio-athos` detecta os gatilhos,
  o `ai-proxy` responde quando a Life precisa decidir.

## Quando construir

Depois do app de pé, com usuários reais gerando os eventos que alimentam isso.
Construir antes é acertar no escuro — as decisões boas vêm de ver gente reagindo.

## Companheiro, não alarme (o resumo)

Alarme dispara por relógio ("são 15h"). Companheiro dispara por evento
("você acabou de fechar o terceiro treino da semana"). A Life já tem o
contexto — streak, dieta, hábitos — pra reparar nisso. É a diferença entre
um alarme e alguém que percebeu.

---

## Pacote externo recebido (2026-09-02) — "Life Intelligence v2"

O usuário recebeu de outra IA (GPT) um pacote pronto pra essa mesma ideia:
`ATHOSlife_Life_Intelligence_v2.zip` (migration + `ai-proxy/index.ts` novo +
`README_DEPLOY.md`), mais dois arquivos soltos que vieram antes e **não têm
código real** (`ATHOSlife_Life_Intelligence_Upgrade_v1.zip`/`.md` e
`MAPA_DE_SUBSTITUICAO.md` — o zip v1 é só uma cópia do `ai-proxy` atual sem
nenhuma mudança, apesar do texto dizer o contrário). Só o v2 é o pacote real.

**Revisado linha a linha nesta sessão, não implementado — combinado explicitamente
que não é pra rodar agora.** Arquitetura confirmada como correta pro que está
descrito acima (`life_events`/`life_memories`/`life_patterns` cobrem "lembrar
e perceber padrão"; o gatilho por evento, não relógio, é o mesmo princípio
do `relogio-athos` citado acima). Mas o pacote tem 4 problemas concretos que
**bloqueiam** um deploy direto:

1. **Bug real**: `handleVision` para de devolver `next_reset` no erro
   `limit_reached` — `src/data/ai/aiProxy.ts:69` e
   `src/data/ai/recipeAi.ts:60` dependem desse campo pra mostrar "próximo
   scan libera às Xh". Quebra silenciosamente.
2. **Regressão de personalidade no chat**: o `handleChat` novo troca o
   system prompt específico do Life (limite de parágrafo/emoji, exemplos de
   como puxar assunto, cuidado com "vício"/"recaída") por um prompt genérico
   compartilhado com `life_decision`, e o bloco de contexto do chat deixa de
   incluir hábitos/vícios/conquistas/check-in/passos. Vai na direção
   contrária do que essa doc pede ("companheiro, não alarme").
3. **Acoplamento novo e arriscado**: `handleChat` passa a depender de
   `getLifeContext`, que consulta as 5 tabelas novas — se a migration falhar
   ou uma dessas tabelas tiver problema, o **chat atual quebra junto**, não só
   o recurso novo. Precisa tolerar falha parcial (ex.: `Promise.allSettled`)
   antes de ir pra produção.
4. **`life_push_outbox` criada mas não usada**: a migration cria a fila, o
   README descreve ela como o mecanismo de entrega, mas `handleLifeDecision`
   nunca escreve nela — o "outbox" não está de fato implementado.

**Recomendação registrada**: não reescrever do zero — a base do pacote segue
o mesmo padrão de isolamento do `ai-proxy` atual (handlers separados por
`type`, RLS por dono) e reescrever tudo geraria mais código novo pra testar
sem necessidade. Patch cirúrgico nos 4 pontos acima, revisado de novo antes
de qualquer deploy.

**Ordem de implementação combinada, quando chegar a hora** (ver
[[reference_session_logs]] / `STATUS.md` pro estado atual de cada
pré-requisito):

- **Fase 0 — bloqueadores fora do código do Life** (nenhum existe hoje):
  telas de Treinos e Hábitos (sem elas não tem `workout_*`/`habit_*`), push
  básico (FCM/VAPID) funcionando, e o `relogio-athos`/scheduler agendado —
  sem ele o Life só reage quando o app chama, nunca percebe ausência sozinho.
- **Fase 1** — migration das 6 tabelas `life_*` (já vem pronta e correta no
  pacote v2, aditiva, RLS por dono, policies idempotentes — reaproveitar
  como está).
- **Fase 2** — corrigir os 4 problemas acima no `ai-proxy` antes de tocar
  em produção.
- **Fase 3** — `lifeEventService.ts` no frontend, instrumentando só o que já
  existe hoje (água, refeição, streak, scanner, check-in, abrir o app);
  `workout_*`/`habit_*` ficam pra depois das telas existirem.
- **Fase 4** — motor de padrões (`upsertPatternSignal`, já vem pronto e é
  reaproveitável direto).
- **Fase 5** — push de verdade: primeiro FCM/VAPID básico, só depois um
  dispatcher lendo `life_push_outbox`.
- **Fase 6** — o `relogio-athos`: função agendada varrendo usuários
  inativos e disparando `life_decision` com `event_type: 'app_absent'` —
  é essa peça que falta pro "perceber sozinho" descrito no topo desta doc.

Arquivos do pacote ficam guardados na raiz do projeto
(`ATHOSlife_Life_Intelligence_v2.zip` e os dois arquivos v1 sem código real)
até essa fase chegar.
