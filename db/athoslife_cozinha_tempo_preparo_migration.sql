-- ============================================================================
-- MIGRAÇÃO — Tempo de preparo da Cozinha ATHOSlife
-- ============================================================================
-- O QUE FAZ:
--   Adiciona a coluna tempo_preparo_min (minutos) em receitas_cozinha e
--   preenche o valor de cada uma das 25 receitas do seed atual.
--
-- POR QUE:
--   Pedido do usuário: mostrar tempo de preparo no card da Cozinha (referência
--   visual com selo de relógio). Os valores abaixo não são chutados — foram
--   lidos do próprio texto de PREPARO de cada receita em
--   db/athoslife_cozinha_seed.sql (passos com tempo explícito somados; quando
--   a receita não cita tempo, estimado pelo número/tipo de passos — nenhuma
--   receita nova ganhou dado que não existisse antes na descrição dela).
--
-- ORDEM: rodar depois de athoslife_cozinha_seed.sql (usa o `titulo` pra achar
--   a linha certa — se rodar antes do seed, os UPDATE não acham nada e
--   silenciosamente não fazem efeito; rode o seed de novo depois se for o caso).
--
-- SEGURANÇA: só adiciona coluna e faz UPDATE por título. Reversível (rollback
--   no fim).
-- ============================================================================

BEGIN;

ALTER TABLE public.receitas_cozinha
  ADD COLUMN IF NOT EXISTS tempo_preparo_min integer;

UPDATE public.receitas_cozinha SET tempo_preparo_min = 5  WHERE titulo = 'Salada que Mata a Fome';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 5  WHERE titulo = 'Overnight Oats Proteico';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 25 WHERE titulo = 'Sopa Termogênica';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 25 WHERE titulo = 'Omelete de Forno com Legumes';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 15 WHERE titulo = 'Frango com Abobrinha em Tiras';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 15 WHERE titulo = 'Bowl de Frango com Arroz';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 10 WHERE titulo = 'Wrap Proteico Rápido';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 15 WHERE titulo = 'Panqueca de Banana e Aveia';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 15 WHERE titulo = 'Macarrão com Atum e Azeite';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 25 WHERE titulo = 'Batata Doce com Carne Moída';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 10 WHERE titulo = 'Bowl de Grão-de-Bico Temperado';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 15 WHERE titulo = 'Tofu Grelhado com Legumes';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 15 WHERE titulo = 'Lentilha Cremosa com Arroz';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 15 WHERE titulo = 'Panqueca Vegana de Aveia';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 5  WHERE titulo = 'Quebrando o Ciclo do Açúcar';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 10 WHERE titulo = 'Pipoca Salgada Consciente';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 30 WHERE titulo = 'Chips de Batata Doce no Forno';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 5  WHERE titulo = 'Café Gelado Proteico';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 5  WHERE titulo = 'Shake Pós-Treino Perfeito';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 5  WHERE titulo = 'Shake Detox Verde';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 5  WHERE titulo = 'Vitamina de Banana e Whey';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 5  WHERE titulo = 'Shake de Morango Cremoso';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 10 WHERE titulo = 'Chá pra Desacelerar';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 5  WHERE titulo = 'Chá Verde Termogênico';
UPDATE public.receitas_cozinha SET tempo_preparo_min = 10 WHERE titulo = 'Chá de Gengibre e Limão';

-- Conferência: nenhuma receita pode ficar sem tempo definido.
DO $$
DECLARE sem_tempo integer;
BEGIN
  SELECT count(*) INTO sem_tempo FROM public.receitas_cozinha WHERE tempo_preparo_min IS NULL;
  IF sem_tempo > 0 THEN
    RAISE EXCEPTION '% receitas ficaram sem tempo_preparo_min. Rode o seed antes desta migração.', sem_tempo;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE public.receitas_cozinha DROP COLUMN IF EXISTS tempo_preparo_min;
-- COMMIT;
-- ============================================================================
