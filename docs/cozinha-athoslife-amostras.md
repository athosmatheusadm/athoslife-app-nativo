# Cozinha ATHOSlife — Formato e Amostras

Este documento define **como cada receita é escrita** e traz amostras completas
para você validar o estilo antes de eu produzir as 25. Depois de aprovado,
gero o restante no mesmo padrão + o `seed.sql` pronto para rodar.

---

## Princípios (a voz da cozinha)

A Cozinha ATHOSlife não é um livro de chef. É comida **brasileira, real,
barata e possível** — feita pra quem quer manter o hábito sem sofrer.

- Ingredientes que existem no mercado do bairro, não em loja gourmet.
- Modo de preparo curto, em passos numerados. Nada de técnica difícil.
- Macros por porção, honestos (batendo com a base de `alimentos` quando dá).
- Toda receita fecha com a **Dica do Life** — a voz do mascote, que conecta
  a receita ao momento da pessoa (sem punição, sempre acolhendo).
- Categorias carregam significado: `ansiedade` e `vicios` acolhem, não só
  "cortam calorias".

## Estrutura do campo `conteudo`

O `conteudo` é texto (Markdown leve) com esta ordem fixa, para a UI renderizar
sempre igual:

```
⏱ {tempo} · 🍽 {rendimento}

INGREDIENTES
- item com quantidade
- item com quantidade

MODO DE PREPARO
1. passo curto
2. passo curto

💚 DICA DO LIFE
frase do mascote conectando ao momento da pessoa
```

---

## Amostras completas

### 1. Salada que Mata a Fome  ·  *emagrecimento*  ·  grátis
**Volume máximo, calorias mínimas** — 230 kcal · P 22 / C 18 / G 8

⏱ 15 min · 🍽 1 porção

**Ingredientes**
- 2 xícaras de alface e rúcula picadas
- 100 g de frango grelhado desfiado
- ½ pepino em fatias
- 1 tomate picado
- ½ cenoura ralada
- 1 colher de sopa de azeite
- Suco de ½ limão · sal e pimenta a gosto

**Modo de preparo**
1. Tempere o frango desfiado com sal, pimenta e o limão.
2. Misture todos os vegetais numa tigela grande.
3. Junte o frango, regue com o azeite e sirva na hora.

💚 **Dica do Life:** Bateu aquela fome fora de hora? Essa aqui enche o prato e
não pesa na consciência. Come devagar — o corpo demora uns minutos pra avisar
que já chega.

---

### 2. Bowl de Frango com Arroz  ·  *massa*  ·  grátis
**Clássico de ganho de massa** — 497 kcal · P 45 / C 60 / G 9

⏱ 20 min · 🍽 1 porção

**Ingredientes**
- 150 g de frango em cubos
- 1 xícara de arroz integral cozido
- ½ xícara de feijão preto cozido
- ½ pimentão em tiras
- 1 colher de chá de azeite
- Alho, sal e páprica a gosto

**Modo de preparo**
1. Doure o alho no azeite e refogue o frango com sal e páprica até corar.
2. Junte o pimentão e refogue mais 3 minutos.
3. Monte o bowl: arroz, feijão e o frango por cima.

💚 **Dica do Life:** Treinou pesado? Esse bowl repõe o que você gastou. A
proteína aqui é a estrela — ela é quem reconstrói o músculo enquanto você descansa.

---

### 3. Mindful Eating na Prática  ·  *ansiedade*  ·  premium
**Comer com consciência e sem culpa** — 282 kcal · P 18 / C 30 / G 10

⏱ 10 min · 🍽 1 porção

**Ingredientes**
- 1 pote de iogurte natural integral (170 g)
- 2 colheres de sopa de aveia em flocos
- ½ banana em rodelas
- 1 colher de chá de mel
- 1 colher de sopa de castanhas picadas

**Modo de preparo**
1. Coloque o iogurte numa tigela bonita — comer bem começa pelos olhos.
2. Cubra com a aveia, a banana e as castanhas. Finalize com o mel.
3. Sente-se, guarde o celular e coma sem pressa, sentindo cada colher.

💚 **Dica do Life:** Ansiedade pede comida rápida e sem atenção — e é aí que a
gente exagera. Aqui o truque não é o prato, é o ritmo. Uma colher de cada vez,
respirando. Você no controle, não o impulso.

---

### 4. Quebrando o Ciclo do Açúcar  ·  *vicios*  ·  premium
**Substitutos doces que não sabotam** — 186 kcal · P 8 / C 25 / G 6

⏱ 5 min · 🍽 1 porção

**Ingredientes**
- 1 banana congelada
- 1 colher de sopa de cacau 100% em pó
- 2 colheres de sopa de iogurte natural
- 1 tâmara sem caroço (opcional, para adoçar)

**Modo de preparo**
1. Bata tudo no processador até virar um creme gelado.
2. Sirva na hora, como um sorvete de chocolate.

💚 **Dica do Life:** A vontade de doce não é fraqueza — é o corpo pedindo
recompensa. Em vez de brigar com ela, dá pra responder com algo que abraça sem
te derrubar. Um tropeço não apaga o quanto você já andou.

---

### 5. Chá Anti-Ansiedade  ·  *chas*  ·  grátis
**Relaxa sem sedação** — 8 kcal · P 0 / C 2 / G 0

⏱ 8 min · 🍽 1 xícara

**Ingredientes**
- 1 colher de chá de camomila seca
- 1 colher de chá de erva-cidreira
- 200 ml de água quente
- Raspas de limão (opcional)

**Modo de preparo**
1. Ferva a água e desligue o fogo.
2. Junte as ervas, tampe e deixe em infusão por 5 minutos.
3. Coe e beba morno, de preferência longe das telas.

💚 **Dica do Life:** Esse chá não resolve o dia difícil — mas te dá cinco
minutos de pausa pra respirar. Às vezes é disso que a gente precisa: um
intervalo, não uma solução.

---

## Plano das 25 (proposta)

Distribuição equilibrada pelas 6 categorias, misturando grátis (chamariz) e
premium (valor):

| Categoria | Qtd | Grátis | Premium |
|-----------|-----|--------|---------|
| emagrecimento | 5 | 2 | 3 |
| massa | 5 | 2 | 3 |
| ansiedade | 4 | 1 | 3 |
| vicios | 4 | 1 | 3 |
| shakes | 4 | 2 | 2 |
| chas | 3 | 2 | 1 |
| **Total** | **25** | **10** | **15** |

10 grátis dá gosto de conhecer; 15 premium sustentam a assinatura.
