-- ============================================================================
-- MIGRAÇÃO — Alergênicos e tipo das receitas da Cozinha (Life no chat)
-- ============================================================================
-- O QUE FAZ:
--   Adiciona em receitas_cozinha:
--     alergenos text[]  — o que a receita CONTÉM, como está escrita
--     tipo_prato text   — 'doce' | 'salgado' | 'bebida'
--   e preenche as 25 receitas do catálogo atual.
--   Libera em life_acoes o tipo 'salvar_restricao': o Life pergunta "quer que
--   eu guarde no seu perfil que você evita lactose?" e só grava no "Salvar".
--
-- POR QUE (dono, 12/10):
--   "Tô com vontade de doce, mas sou intolerante a lactose": o Life (ai-proxy
--   v3.10) procura na Cozinha uma receita que sirva e mostra o card. Sem esta
--   marcação ele teria que adivinhar pelo texto — com alergia não dá.
--
-- CÓDIGOS (o ai-proxy traduz o que a pessoa escreve pra estes):
--   lactose, gluten, ovo, amendoim, castanhas, soja, peixe, frutos_mar,
--   gergelim, carne (frango/carne vermelha — vegetariano), mel (vegano).
--
-- CRITÉRIO (conservador, lido dos INGREDIENTES de cada receita no banco):
--   - "leite ou bebida vegetal" e whey (mesmo opcional) => lactose: a receita
--     como escrita leva; quem não pode toma o Life-chef.
--   - aveia => gluten (contaminação cruzada; só a certificada é sem glúten).
--   - shoyu => soja + gluten (trigo na fórmula comum).
--
-- ORDEM: rodar depois do seed e da athoslife_cozinha_nomes_migration.sql.
--   UPDATE por id (os títulos mudaram em 07/10). Receita nova sem marcação
--   fica com tipo_prato null e o Life NÃO a oferece no chat até ser marcada.
--
-- SEGURANÇA: só adiciona colunas e faz UPDATE. Quem lê é o ai-proxy
--   (service_role tem SELECT na tabela inteira); `authenticated` tem GRANT
--   por coluna, então o app não vê as colunas novas — e nem precisa.
--   Desfazer: ver ROLLBACK no fim.
-- ============================================================================

BEGIN;

ALTER TABLE public.receitas_cozinha
  ADD COLUMN IF NOT EXISTS alergenos text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.receitas_cozinha
  ADD COLUMN IF NOT EXISTS tipo_prato text;

ALTER TABLE public.receitas_cozinha
  DROP CONSTRAINT IF EXISTS receitas_cozinha_tipo_prato_check;
ALTER TABLE public.receitas_cozinha
  ADD CONSTRAINT receitas_cozinha_tipo_prato_check
  CHECK (tipo_prato IS NULL OR tipo_prato IN ('doce', 'salgado', 'bebida'));

ALTER TABLE public.receitas_cozinha
  DROP CONSTRAINT IF EXISTS receitas_cozinha_alergenos_check;
ALTER TABLE public.receitas_cozinha
  ADD CONSTRAINT receitas_cozinha_alergenos_check
  CHECK (alergenos <@ ARRAY['lactose','gluten','ovo','amendoim','castanhas','soja',
                            'peixe','frutos_mar','gergelim','carne','mel']::text[]);

UPDATE public.receitas_cozinha AS r
SET alergenos = v.alergenos, tipo_prato = v.tipo
FROM (VALUES
  -- 1  Salada Power de Frango e Grão-de-Bico
  ('53c7e715-8af8-4f34-be65-03f992290d5c'::uuid, ARRAY['carne'],                     'salgado'),
  -- 2  Overnight Oats Proteico (aveia, whey, leite)
  ('8c4a27f1-6398-49a1-a36f-1e081a1b0fef'::uuid, ARRAY['lactose','gluten'],          'doce'),
  -- 3  Sopa Termogênica (frango)
  ('b74b6990-dba1-423a-941a-1f30bc8e9f1b'::uuid, ARRAY['carne'],                     'salgado'),
  -- 4  Omelete de Forno com Legumes
  ('58e3a881-38f9-41c8-b140-a22c95f95f95'::uuid, ARRAY['ovo'],                       'salgado'),
  -- 5  Espaguete de Abobrinha com Frango
  ('ea221b4b-fb2f-4ecd-9d44-4f66481cd88b'::uuid, ARRAY['carne'],                     'salgado'),
  -- 6  Bowl de Frango Grelhado com Brócolis
  ('d05386a4-72ad-45c3-9d99-f9de6b1ee43e'::uuid, ARRAY['carne'],                     'salgado'),
  -- 7  Wrap Cremoso de Frango (tortilha de trigo, requeijão)
  ('8ec672bb-e950-43a3-a47d-12059e04df00'::uuid, ARRAY['gluten','lactose','carne'],  'salgado'),
  -- 8  Panqueca Fit de Banana com Canela (ovos, aveia, whey opcional)
  ('c324cba4-b48b-4910-b3ff-e6d89789e0aa'::uuid, ARRAY['ovo','gluten','lactose'],    'doce'),
  -- 9  Macarrão ao Alho com Atum
  ('4ff0ddea-506b-4736-adaf-b86c191b0605'::uuid, ARRAY['gluten','peixe'],            'salgado'),
  -- 10 Batata Doce Rústica com Carne
  ('591977f1-4c23-4c18-9f1d-8ef49f8c86d7'::uuid, ARRAY['carne'],                     'salgado'),
  -- 11 Bowl Mediterrâneo de Grão-de-Bico
  ('f894afa1-6ea4-4e72-83f6-be132d19c9be'::uuid, ARRAY[]::text[],                    'salgado'),
  -- 12 Tofu Dourado no Shoyu com Gergelim
  ('01810d66-8212-49f0-abdc-783973213fe8'::uuid, ARRAY['soja','gluten','gergelim'],  'salgado'),
  -- 13 Lentilha Cremosa ao Cominho
  ('549d7ee3-07ae-44ec-85b2-a45bde50f789'::uuid, ARRAY[]::text[],                    'salgado'),
  -- 14 Panqueca Vegana de Banana (aveia)
  ('7b8235c2-475b-4b24-a54e-4f9b02d93ea9'::uuid, ARRAY['gluten'],                    'doce'),
  -- 15 Sorvete de Banana com Cacau e Amendoim
  ('e77c3426-8e65-4137-911a-c00bf3b7acc7'::uuid, ARRAY['amendoim'],                  'doce'),
  -- 16 Pipoca Defumada com Páprica
  ('6eb7833d-af78-4f97-b860-c59a2b3e63c5'::uuid, ARRAY[]::text[],                    'salgado'),
  -- 17 Chips Crocantes de Batata Doce com Alecrim
  ('dedb54b4-8b98-4cbd-9c83-e4ed0f93a47c'::uuid, ARRAY[]::text[],                    'salgado'),
  -- 18 Café Gelado Cremoso com Whey (whey, leite)
  ('3feb60ba-67aa-41e3-8b82-3aae5fcd9046'::uuid, ARRAY['lactose'],                   'bebida'),
  -- 19 Shake Pós-Treino de Banana e Aveia
  ('6dd5ba00-c1bb-4ec9-a0e6-4e7013855936'::uuid, ARRAY['lactose','gluten'],          'bebida'),
  -- 20 Suco Verde de Maçã e Gengibre
  ('0c126771-bd06-4a93-a8c4-534374a5bdfa'::uuid, ARRAY[]::text[],                    'bebida'),
  -- 21 Vitamina Proteica de Banana (whey, leite, aveia)
  ('589625d3-204e-418c-b3e5-b5d031722be0'::uuid, ARRAY['lactose','gluten'],          'bebida'),
  -- 22 Milkshake Fit de Morango (whey, leite, iogurte)
  ('e514cd6d-eb4b-498f-bbf8-88d5848d4fe1'::uuid, ARRAY['lactose'],                   'bebida'),
  -- 23 Chá Calmante de Camomila e Cidreira (mel opcional)
  ('ae1816b1-d2e0-4cdc-bd76-dbbeaac1bddf'::uuid, ARRAY['mel'],                       'bebida'),
  -- 24 Chá Verde com Limão
  ('5024d2d8-65e2-4c64-b189-a796d7a03d54'::uuid, ARRAY[]::text[],                    'bebida'),
  -- 25 Chá de Gengibre, Limão e Mel
  ('cb666433-f034-4f40-a54f-056d6fb5ff50'::uuid, ARRAY['mel'],                       'bebida')
) AS v(id, alergenos, tipo)
WHERE r.id = v.id;

-- Life guarda no perfil a restrição dita no chat (com botão de confirmar).
ALTER TABLE public.life_acoes DROP CONSTRAINT IF EXISTS life_acoes_tipo_check;
ALTER TABLE public.life_acoes
  ADD CONSTRAINT life_acoes_tipo_check CHECK (tipo IN ('repetir_refeicao', 'salvar_restricao'));

-- Conferência: tem que dar 25 marcadas e 0 sem tipo.
SELECT count(*) FILTER (WHERE tipo_prato IS NOT NULL) AS marcadas,
       count(*) FILTER (WHERE tipo_prato IS NULL)     AS sem_tipo
FROM public.receitas_cozinha;

COMMIT;

-- ROLLBACK (desfazer):
-- DELETE FROM public.life_acoes WHERE tipo = 'salvar_restricao';
-- ALTER TABLE public.life_acoes DROP CONSTRAINT IF EXISTS life_acoes_tipo_check;
-- ALTER TABLE public.life_acoes ADD CONSTRAINT life_acoes_tipo_check CHECK (tipo = 'repetir_refeicao');
-- ALTER TABLE public.receitas_cozinha DROP CONSTRAINT IF EXISTS receitas_cozinha_alergenos_check;
-- ALTER TABLE public.receitas_cozinha DROP CONSTRAINT IF EXISTS receitas_cozinha_tipo_prato_check;
-- ALTER TABLE public.receitas_cozinha DROP COLUMN IF EXISTS alergenos;
-- ALTER TABLE public.receitas_cozinha DROP COLUMN IF EXISTS tipo_prato;
