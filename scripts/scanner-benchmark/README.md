# Benchmark do scanner

Mede o scanner com pratos de verdade, **pesados**. É a etapa 1 da
especificação v1.1 (medir o atual antes de mexer) e a etapa 6 (comparar
versões). Sem essas fotos não dá pra dizer se o scanner melhorou.

## Como montar as fotos

1. Monte o prato e **pese cada parte** antes de juntar (arroz, feijão, carne...).
   Anote o preparo (com óleo? quanto?).
2. Tire a foto como um usuário tiraria: de cima, prato inteiro, luz normal.
   Não ponha balança nem etiqueta na foto.
3. Salve em `<pasta>/fotos/` (ex.: `dados/fotos/001.jpg`).
4. Preencha `<pasta>/referencia.csv` (separador `;`, vírgula decimal ok),
   uma linha por item. Os números de referência vêm da **TACO** (por 100 g × gramas
   pesadas) ou do rótulo:

```
foto;refeicao;categoria;conjunto;item;gramas;kcal;proteina;carboidrato;gordura
001.jpg;1;pf;dev;Arroz branco cozido;150;192;3,8;42,2;0,3
001.jpg;1;pf;dev;Feijão carioca cozido;140;106;6,7;19;0,7
002.jpg;2;composto;cego;Lasanha bolonhesa;320;480;26;45;22
```

- `categoria`: `pf` (prato com partes separadas), `composto` (lasanha, feijoada,
  estrogonofe, pizza), `lanche` (pão, fruta), `bebida`, `embalado`, `dificil`
  (pouca luz, sobreposição).
- `conjunto`: metade `dev` (pra ajustar), metade `cego` (só pra avaliar no fim).
  Todas as fotos da mesma refeição ficam no mesmo conjunto.
- Começo sugerido: **30 refeições** (piloto da seção 12.1). Alvo: 200.

As fotos são pessoais: a pasta `scripts/scanner-benchmark/dados/` está no
`.gitignore`. Não suba fotos pro GitHub.

## Rodar

Precisa de uma conta **paga** de teste (cada foto gasta 1 scan) e, pra v2,
`SCANNER_V2=true` na ai-proxy.

```
ATHOS_EMAIL=teste@... ATHOS_SENHA=... node scripts/scanner-benchmark/rodar.mjs scripts/scanner-benchmark/dados ambos dev
```

Mostra, por versão: recall de componentes, itens inventados, erro de massa,
erro mediano de kcal, WAPE, erros graves (> 50%), MAE de macros, latência
p50/p95 e as portas G1/G2. Salva tudo (inclusive a resposta crua) em
`<pasta>/resultados/`.

Regras da especificação: falha e recusa **entram** no relatório; não mexer
no prompt depois de olhar o conjunto cego sem abrir uma rodada nova.
