# Planos de treino e dieta — diretriz (2026-09-28)

Regras que o código tem de seguir. Mudou regra aqui? Mude o código, o banco
e a `VERSAO_GERADOR`/`VERSAO_TRIAGEM` juntos.

## 1. Posição jurídica (a "área cinzenta")

O ATHOSlife **não prescreve**. Ele é uma ferramenta que monta um **plano de
referência** a partir de:

- escolhas da própria pessoa (objetivo, nível, dias, local, tempo);
- diretrizes gerais e públicas (ACSM para treino de força; guias alimentares
  e fórmulas de gasto energético para dieta);
- modelos fixos do app (não improvisa por IA).

É o mesmo lugar em que operam MyFitnessPal, Fitbod e similares. Base:

- Brasil: prescrição dietética é do nutricionista (Lei 8.234/91) e
  prescrição de exercício é do profissional de Educação Física (Lei
  9.696/98). Por isso a linguagem é sempre "plano de referência",
  "sugestão", "modelo" — nunca "prescrição", "sua dieta", "seu personal".
- CDC art. 14, §3º, II: não há responsabilidade do fornecedor quando o dano
  vem de culpa exclusiva do consumidor — daí a **declaração de veracidade**.
- Revisão por profissional (CRN/CREF) dos modelos **não é obrigatória**, mas
  é a camada extra mais forte. O banco já tem onde registrar
  (`planos_gerados.revisao_profissional`). Enquanto não houver, a tela diz
  "modelo baseado em diretrizes públicas, sem revisão individual".

## 2. Triagem obrigatória (antes de qualquer plano)

Vale **90 dias**. Refeita quando vence. Guardada para sempre, sem update nem
delete pelo usuário (`triagens_saude`, append-only). **A aptidão é calculada
no servidor** (trigger `avaliar_triagem`), nunca aceita do app.

Perguntas (adaptadas do PAR-Q+ geral, domínio público):

| # | Pergunta | "Sim" bloqueia |
|---|----------|----------------|
| q1 | Médico já disse que você tem problema cardíaco ou pressão alta? | treino |
| q2 | Sente dor no peito em repouso, no dia a dia ou fazendo atividade física? | treino |
| q3 | Perdeu o equilíbrio por tontura ou desmaiou nos últimos 12 meses? | treino |
| q4 | Tem outra doença crônica diagnosticada? | treino e dieta |
| q5 | Toma remédio de uso contínuo para doença crônica? | treino e dieta |
| q6 | Tem problema em osso, articulação ou músculo que piora com exercício? | treino |
| q7 | Médico disse que só deve se exercitar com supervisão? | treino |
| q8 | Está grávida, pode estar ou amamentando? | treino e dieta |
| q9 | Tem diabetes, doença renal ou do fígado, ou precisa de dieta especial? | dieta |
| q10 | Tem ou já teve transtorno alimentar (anorexia, bulimia, compulsão)? | dieta |
| q11 | Fez cirurgia nos últimos 6 meses (incluindo bariátrica)? | treino e dieta |

Outros bloqueios calculados no servidor:

- **Menor de 18 anos** (pela data de nascimento) → sem plano automático
  (o app aceita 16+, o plano não).
- **Data de nascimento que não bate com a idade do perfil** (diferença > 1
  ano) → bloqueia até corrigir. Pega quem "arredonda" a idade pra passar.
- **IMC < 18,5** → dieta bloqueada (risco de transtorno alimentar).

Bloqueado não fica sem nada: continua montando a ficha manualmente e recebe
a orientação de procurar médico / educador físico / nutricionista.

## 3. Declaração de veracidade

Obrigatória, marcada na hora, texto versionado (`DECLARACAO_VERSAO`). Fica
na linha da triagem com data/hora. O banco recusa triagem sem ela.

> Declaro que as informações acima são verdadeiras e completas. Entendo que
> o plano é montado a partir delas e que omitir ou informar dado falso
> (como idade, gravidez ou doença) pode trazer risco à minha saúde, sendo
> de minha exclusiva responsabilidade. Sei que o plano é uma referência
> geral e não substitui avaliação de médico, nutricionista ou profissional
> de Educação Física.

Termos de uso (seção nova) repetem isso.

## 4. Plano de treino — regras do gerador (`domain/rules/geradorTreino.ts`)

Faixas do ACSM Position Stand (2009) para treino de força, arredondadas:

| Objetivo | Nível | Séries | Reps | Descanso |
|----------|-------|--------|------|----------|
| Hipertrofia | iniciante | 2–3 | 8–12 | 90 s |
| Hipertrofia | intermediário | 3 | 8–12 | 90 s |
| Hipertrofia | avançado | 3–4 | 6–12 | 120 s |
| Condicionamento / emagrecimento | todos | 2–3 | 12–15 | 45 s |
| Saúde geral | todos | 2 | 10–15 | 60 s |

Exercício por tempo (prancha etc.): 20 s iniciante, 30 s intermediário,
45 s avançado.

Travas (no app **e** no RPC `aplicar_plano_treino`):

- 2 a 6 dias por semana (sempre ≥ 1 dia de descanso); iniciante no máximo 4.
- 30 a 90 min por sessão → 4 a 7 exercícios (iniciante no máximo 5).
- Séries 1–5, repetições 1–20, tempo 10–120 s por série.
- Volume semanal por grupo muscular ≤ 10 séries (iniciante), 16
  (intermediário), 20 (avançado).
- Exercício precisa existir no catálogo e servir pro local escolhido.
- Iniciante não recebe exercício marcado `nivel_minimo` intermediário/avançado
  (levantamento terra, barra fixa, flexão nórdica, agachamento frontal...).
- **Carga nunca é definida pelo app.** A pessoa anota; a regra de progressão
  é informativa: "fechou o topo da faixa em todas as séries por 2 treinos?
  Suba a carga um pouco (2 a 5%)".

Divisão por dias: 2–3 = corpo inteiro A/B; 4 = superior/inferior A/B;
5 = superior, inferior, empurrar, puxar, pernas; 6 = empurrar/puxar/pernas ×2.

## 5. Plano de dieta — etapa 2 (ainda não construído)

- Meta de referência por fórmula (Mifflin-St Jeor × atividade), pisos:
  nunca abaixo do basal; perda máx. ~0,5–1% do peso/semana; sem dieta
  "zero carboidrato", jejum ou restrição agressiva.
- Cardápio sugerido com alimentos da base e receitas da Cozinha, respeitando
  gostos, alergias e país; tudo trocável.
- Sem dose de suplemento, nunca.
- Só com `apto_dieta` na triagem vigente.

## 6. O Life

Pode: explicar o plano de referência da pessoa, motivar, lembrar, sugerir
trocas equivalentes DENTRO do plano. Não pode: criar plano, mudar séries /
reps / carga / calorias, dar dose. Encaminha para profissional quando o
assunto é saúde. (Regras no prompt do ai-proxy + filtro de saída.)

## 7. Linguagem obrigatória nas telas

Usar: "plano de referência", "sugestão", "modelo", "ajuste como quiser".
Nunca: "prescrição", "sua dieta", "treino ideal para você", promessa de
resultado ("perca X kg"), linguagem de tratamento.
