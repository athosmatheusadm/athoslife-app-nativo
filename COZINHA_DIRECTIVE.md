# Diretriz — Módulo Cozinha ATHOSlife

A camada de domínio e dados **já está escrita e validada** (strict, 0 erros).
Falta a UI, o conteúdo das receitas e um handler no backend. Siga esta linha.

## O que é a Cozinha

Duas coisas sob o mesmo módulo:

1. **Mini e-book** — ~25 receitas curadas (tabela `receitas_cozinha`), com
   conteúdo real. Categorias: emagrecimento, massa, ansiedade, vicios, shakes,
   chas. `ansiedade` e `vicios` conectam ao apoio emocional — não são só dieta.
2. **Life monta receita** — a IA cria uma receita a partir do que a pessoa tem
   em casa + a dieta dela (restrições, macros que faltam, objetivo).

## Realidade do backend (importante)

- As 10 receitas seedadas hoje são **cascas**: têm metadados, mas `conteudo`
  está NULL. Precisam de recheio + ~15 novas. Conteúdo e formato: ver
  `cozinha-athoslife-amostras.md` (aprovado com o dono do produto).
- Gerar receita por IA chama `ai-proxy` com `tipo: 'recipe'`, que **ainda não
  existe** no Edge Function. É preciso adicionar esse handler (mesmo padrão de
  'vision'/'chat': cota, auditoria, Gemini devolvendo JSON no formato de
  `ReceitaGerada`). Até lá, `gerarReceitaComIA` falha de propósito.

## Arquivos prontos (consumir, não reescrever)

| Arquivo | Papel |
|---------|-------|
| `src/domain/entities/receita.ts` | Tipos: `Receita`, `ReceitaGerada`, `ContextoReceita`, `CATEGORIA_META` |
| `src/domain/services/cozinhaService.ts` | Fachada: `listar()`, `listarFavoritas()`, `favoritar()`, `montarComLife()` |
| `src/data/repositories/receitasRepository.ts` | Acesso a receitas_cozinha e receitas_favoritas |
| `src/data/ai/recipeAi.ts` | `gerarReceitaComIA()` — precisa do handler 'recipe' no backend |

## O que a UI constrói

1. **Grade de receitas** por categoria (cor do card = `corTema`). Receita com
   `bloqueada: true` mostra cadeado + CTA de Premium. Nunca revela o `conteudo`
   de uma receita bloqueada.
2. **Tela da receita**: renderiza `conteudo` (Markdown leve, estrutura fixa —
   ver amostras) + botão favoritar (`favoritada`).
3. **Life monta receita** (premium): a pessoa informa o que tem em casa →
   `cozinhaService.montarComLife(...)` → mostra a `ReceitaGerada` com a
   **Dica do Life** e os selos de restrição respeitada → permite salvar.
4. Tratar erros: `recurso_premium` (mostrar upsell), `limit_reached`,
   `not_authenticated`.

## Invioláveis

- Bloqueio premium usa `temAcessoPremium` (a MESMA regra do app). Sem regra
  paralela de acesso.
- A UI fala só com `cozinhaService`. Não importa repositório nem ai client direto.
- Conteúdo bloqueado nunca chega ao cliente destravado.
- Chave do Gemini só no servidor.
- Strict em 0 erros.
