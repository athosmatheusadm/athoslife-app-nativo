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

## 2. Check de saúde (v2, 2026-09-29) — orienta, não trava

**Decisão do dono (29/09):** o check é a nossa "apólice de seguro", não uma
catraca. "Paguei o app e não recebo meu plano?" não pode acontecer.

- **5 perguntas, uma vez só**, feitas pelo Life **dentro do chat** (roteiro
  do app, sem IA, não gasta cota) + data de nascimento + declaração de
  veracidade. Vale pra sempre (a última respondida).
- Guardado para sempre, sem update nem delete (`triagens_saude`,
  append-only). Aptidão e motivos calculados **no servidor** (trigger
  `avaliar_triagem`), nunca aceitos do app.
- Teve "Sim": o Life aconselha procurar um médico e mostra os pontos de
  atenção. Se a pessoa quiser o plano mesmo assim, marca a **declaração de
  ciente** (`ciente_orientacao` + `ciente_versao`, linha nova, append-only)
  e recebe. Se escolheu "vou ao médico" e voltar depois, declara o ciente
  sem refazer as perguntas (linha nova copiando as respostas).

| # | Pergunta | "Sim" = ressalva em |
|---|----------|--------------------|
| t1 | Coração/pressão alta, dor no peito, tontura ou desmaio? | treino |
| t2 | Doença crônica, remédio contínuo ou exercício só com supervisão? | treino e dieta |
| t3 | Lesão em osso/articulação/músculo ou cirurgia nos últimos 6 meses? | treino |
| t4 | Grávida, pode estar ou amamentando? | treino e dieta |
| t5 | Transtorno alimentar, bariátrica ou dieta especial por orientação médica? | dieta |

O que a ressalva muda no **conteúdo** (servidor, RPCs dos planos):

- Treino com ressalva → só nível **iniciante**.
- Dieta com ressalva alimentar (t5), gravidez (t4), IMC < 18,5 ou cirurgia
  (v1) → só **"manter"** (sem déficit nem superávit). Os pisos de sempre
  (basal, 1.200 kcal, 130 g de carbo, volume...) valem pra todos.

**Travas duras** (não se resolvem com ciente):

- **Menor de 18 anos** pela data de nascimento (aceite de menor não vale).
- **Data de nascimento que não bate com a idade do perfil** (diferença > 1
  ano) → bloqueia até corrigir. Pega quem mente a idade.

As 11 perguntas da v1 (28/09) continuam aceitas pro histórico.
Migração: `db/athoslife_triagem_v2_ciente_migration.sql`.

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

## 5. Plano de dieta — etapa 2 (construído 2026-09-29)

- Meta de referência por fórmula (Mifflin-St Jeor × atividade), pisos:
  nunca abaixo do basal; perda máx. ~0,5–1% do peso/semana; sem dieta
  "zero carboidrato", jejum ou restrição agressiva.
- Cardápio sugerido com alimentos da base e receitas da Cozinha, respeitando
  gostos, alergias e país; tudo trocável.
- Sem dose de suplemento, nunca.
- Com `apto_dieta` ou com a declaração de ciente (ver seção 2).

## 6. O Life

Um Life por tela (29/09): Home junta tudo; Dieta (chef), Treino e Hábitos
sabem de tudo mas puxam pro assunto da tela (`foco` no ai-proxy). No chat
ficam o check de saúde (uma vez) e os botões Montar treino / Montar dieta /
Trocar algo no plano.

Pode: explicar o plano de referência da pessoa, motivar, lembrar, informar
trocas equivalentes DENTRO do plano (kcal/macros de cada opção, sem
recomendar). Não pode: criar plano, mudar séries /
reps / carga / calorias, dar dose. Encaminha para profissional quando o
assunto é saúde. (Regras no prompt do ai-proxy + filtro de saída.)

## 7. Linguagem obrigatória nas telas

Usar: "plano de referência", "sugestão", "modelo", "ajuste como quiser".
Nunca: "prescrição", "sua dieta", "treino ideal para você", promessa de
resultado ("perca X kg"), linguagem de tratamento.
