-- ============================================================================
-- MIGRAÇÃO — Categorias da Cozinha ATHOSlife
-- ============================================================================
-- O QUE FAZ:
--   Troca as categorias da tabela receitas_cozinha.
--   Sai:  ansiedade, vicios
--   Entra: vegano, habitos
--
-- POR QUE:
--   Decisão de produto. "vicios" vira "habitos" (o app é sobre construir
--   hábitos, não rotular a pessoa). "ansiedade" sai; a única receita dela
--   ("Mindful Eating na Prática") é removida a pedido.
--
-- SEGURANÇA:
--   Não é destrutiva além do combinado: apaga só 1 receita (Mindful) e
--   renomeia categorias. Reversível — ver bloco ROLLBACK no fim.
--
-- ORDEM IMPORTA: primeiro ajusta os dados, depois troca a trava (CHECK).
--   Se trocar a trava antes, as linhas antigas violariam a regra nova.
-- ============================================================================

BEGIN;

-- 1) Remover a receita de ansiedade (a pedido do dono do produto).
DELETE FROM public.receitas_cozinha
WHERE categoria = 'ansiedade';

-- 2) Renomear a categoria das receitas existentes: vicios -> habitos.
UPDATE public.receitas_cozinha
SET categoria = 'habitos'
WHERE categoria = 'vicios';

-- 3) Trocar a trava (CHECK): tira ansiedade/vicios, põe vegano/habitos.
ALTER TABLE public.receitas_cozinha
  DROP CONSTRAINT IF EXISTS receitas_cozinha_categoria_check;

ALTER TABLE public.receitas_cozinha
  ADD CONSTRAINT receitas_cozinha_categoria_check
  CHECK (categoria = ANY (ARRAY[
    'emagrecimento'::text,
    'massa'::text,
    'vegano'::text,
    'habitos'::text,
    'shakes'::text,
    'chas'::text
  ]));

-- 4) Conferência: nenhuma linha pode ter ficado fora da lista nova.
--    Se este SELECT retornar algo, é bug — revise antes do COMMIT.
DO $$
DECLARE fora integer;
BEGIN
  SELECT count(*) INTO fora
  FROM public.receitas_cozinha
  WHERE categoria NOT IN ('emagrecimento','massa','vegano','habitos','shakes','chas');
  IF fora > 0 THEN
    RAISE EXCEPTION 'Existem % receitas com categoria inválida. Abortando.', fora;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK (rodar só se precisar voltar atrás)
-- ----------------------------------------------------------------------------
-- Observação: a receita "Mindful Eating na Prática" foi apagada e NÃO volta
-- por este rollback (foi remoção intencional). Se quiser recuperá-la, ela
-- está no seed original (BLOCO 17). O resto volta ao estado anterior:
--
-- BEGIN;
-- ALTER TABLE public.receitas_cozinha
--   DROP CONSTRAINT IF EXISTS receitas_cozinha_categoria_check;
-- UPDATE public.receitas_cozinha SET categoria = 'vicios' WHERE categoria = 'habitos';
-- ALTER TABLE public.receitas_cozinha
--   ADD CONSTRAINT receitas_cozinha_categoria_check
--   CHECK (categoria = ANY (ARRAY[
--     'emagrecimento'::text,'massa'::text,'ansiedade'::text,
--     'vicios'::text,'shakes'::text,'chas'::text]));
-- COMMIT;
-- ============================================================================
