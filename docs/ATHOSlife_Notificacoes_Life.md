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
