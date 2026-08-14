# Diretriz — Módulo Scanner (Captura de comida por IA)

Este documento orienta a implementação. A camada de domínio e dados **já está
escrita e validada** (TypeScript strict, 0 erros; regra de reconciliação testada).
O que falta é a **UI** e a **fiação final**. Siga esta linha — não reinvente.

## Verdade sobre o "scanner"

Não existe scanner dedicado nem leitor de código de barras no produto.
O que chamamos de "scanner" é: **foto → Gemini Vision identifica e estima os
macros → usuário revisa → salva**. É reconhecimento visual real, então vender
"escaneie sua refeição por foto" é honesto. Vender "leitor de código de barras"
**não é** — isso não existe (ver mais abaixo).

## Fluxo (duas etapas, inegociável)

```
[Câmera/Galeria]  ->  foodCaptureService.capturar(base64)
                          |  (Gemini Vision + reconciliação com a base)
                          v
                   RefeicaoRascunho  ->  TELA DE REVISÃO  ->  usuário edita
                          |                                    (porção, incluir/excluir,
                          |                                     corrigir item)
                          v
                   foodCaptureService.confirmar({rascunho, tipo})
                          |  (só aqui salva: refeicoes + scan_historico)
                          v
                   RefeicaoSalva
```

**A tela de revisão é obrigatória.** Estimativa da IA nunca vai direto pro
diário. A IA propõe, a pessoa confirma. É isso que tira a "casca vazia".

## Arquivos já prontos (não reescrever, só consumir)

| Arquivo | Papel |
|---------|-------|
| `src/domain/entities/food.ts` | Tipos: `Macros`, `ItemVisao`, `ResultadoVisao`, `ItemRascunho`, `RefeicaoRascunho`, `somarMacros()` |
| `src/domain/rules/foodReconciliation.ts` | Casa IA × tabela `alimentos`. `montarRascunho()`, `reconciliarItem()`, `escalarMacros()` |
| `src/domain/services/foodCaptureService.ts` | Fachada: `capturar()`, `totalAtual()`, `confirmar()` |
| `src/data/ai/aiProxy.ts` | Cliente do `ai-proxy`: `analisarFoto()`. Erros tipados em `AiProxyError` |
| `src/data/ai/photoCapture.ts` | `capturarFoto('camera'\|'galeria')` via Capacitor Camera |
| `src/data/repositories/alimentosRepository.ts` | `buscar()` (manual), `carregarTodos()` (reconciliação) |
| `src/data/repositories/refeicoesRepository.ts` | `salvarDoScanner()` — dupla escrita refeicoes + scan_historico |

## Regra de consistência (por que foto e busca manual batem)

Quando o Gemini nomeia algo que existe na tabela `alimentos`, os macros passam
a vir da **base** (escalados pela porção estimada), e o item ganha `fonte: 'base'`.
Quando não existe, mantém a estimativa da IA com `fonte: 'ia'`.

**Na UI, mostre esse selo.** "Conferido na base" vs "Estimativa da IA" é
transparência — e é o argumento que responde à dúvida "isso é scanner ou busca?".
O usuário vê o que é sólido e o que é palpite.

## O que a UI precisa construir

1. Botão de captura na Home (câmera + galeria) → `capturarFoto()`.
2. Estado de carregando enquanto o Gemini responde (pode levar segundos).
3. **Tela de revisão**: lista de `ItemRascunho` com, por item: nome, porção (g)
   editável, macros, o selo de fonte, e um toggle incluir/excluir. Total ao vivo
   via `foodCaptureService.totalAtual()`. Seletor de `tipo` (café/almoço/…).
4. Tratar `AiProxyError`:
   - `limit_reached` → mostrar quando reseta + CTA de Premium (cota é real:
     `foto_scans_hoje`).
   - `image_too_dark` / `image_too_large` → pedir outra foto, com dica.
   - `not_authenticated` → mandar pro login.
5. Confirmar → `confirmar()` → feedback de sucesso + atualizar a Home.

## Código de barras — NÃO fazer na v1

`aiProxy.consultarCodigoBarras()` é um stub que lança erro de propósito.
Para existir de verdade precisa de duas coisas que não temos:
1. biblioteca nativa de leitura (ex.: `@capacitor-mlkit/barcode-scanning`) para
   transformar a imagem da câmera no número do código;
2. base de produtos por trás (o campo `fonte`, ex.: OpenFoodFacts).

Enquanto (1) e (2) não existirem, **a UI não oferece código de barras** e o
material de venda não promete isso.

## Invioláveis

- Chave do Gemini só no servidor. O cliente nunca vê `VITE_GEMINI_API_KEY`.
- A UI fala só com `foodCaptureService`. Não importa `aiProxy`, repositórios ou
  o cliente Supabase direto.
- `snake_case` do banco morre nos repositórios. O domínio é camelCase.
- Salvar só o que tem `incluir: true`.
- TypeScript strict continua em 0 erros.
