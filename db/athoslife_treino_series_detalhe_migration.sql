-- Troca o modelo de séries do Treino: em vez de um total agregado
-- (series/repeticoes), cada série vira uma linha própria com reps + carga
-- (kg), editável individualmente no card expandido — pra bater com o card
-- de referência que o usuário mandou (exercise-card.html, sessão 2026-09-17).
--
-- As colunas antigas `series`/`repeticoes` (int, NOT NULL) ficam no banco
-- sem uso (nada no app lê mais elas) — mantidas só pra não quebrar o
-- schema à toa; podem ser removidas depois se quiser.
--
-- Executar uma vez no SQL Editor do Supabase.

ALTER TABLE public.treino_plano ADD COLUMN IF NOT EXISTS series_detalhe JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: cada linha existente vira N séries com a mesma "reps" que já
-- tinha (repeticoes) e carga em branco (o usuário nunca registrou carga
-- antes, não tem o que herdar). Postgres não deixa usar agregação direto
-- num UPDATE simples (correlated subquery), por isso o join com subquery.
UPDATE public.treino_plano t
SET series_detalhe = sub.detalhe
FROM (
  SELECT tp.id, jsonb_agg(jsonb_build_object('reps', tp.repeticoes, 'carga_kg', null)) AS detalhe
  FROM public.treino_plano tp, generate_series(1, tp.series)
  GROUP BY tp.id
) sub
WHERE t.id = sub.id AND t.series_detalhe = '[]'::jsonb;
