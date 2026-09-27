-- ATHOSlife — modo "treino em andamento" (2026-09-27)
--
-- Sem begin/commit de propósito (o SQL Editor já roda como bloco único).
--
-- 1) Exercício por TEMPO (prancha etc.): o catálogo só conhecia reps —
--    "Prancha Frontal: 3 × 12" não faz sentido. `medida` diz se a série é
--    contada em repetições ou em segundos; `segundos_padrao` é o tempo
--    sugerido. No plano pessoal (treino_plano.series_detalhe, jsonb) cada
--    série passa a poder guardar `segundos` — jsonb, não precisa de coluna.
--
-- 2) Histórico da sessão: treinos_historico já existe (vazio) e é o que as
--    conquistas leem. Ganha o que a sessão produz: local/dia, início/fim e
--    o que foi feito de verdade em cada série (peso, reps ou segundos).

alter table public.exercicios_catalogo
  add column if not exists medida text not null default 'reps',
  add column if not exists segundos_padrao integer;

alter table public.exercicios_catalogo
  drop constraint if exists exercicios_catalogo_medida_check;
alter table public.exercicios_catalogo
  add constraint exercicios_catalogo_medida_check check (medida in ('reps', 'tempo'));

-- Exercícios que são por tempo (confirmar a lista com o dono antes de rodar).
update public.exercicios_catalogo set medida = 'tempo', segundos_padrao = 30
  where nome in ('Prancha Frontal', 'Prancha Lateral', 'Mountain Climber');
update public.exercicios_catalogo set medida = 'tempo', segundos_padrao = 40
  where nome = 'Farmer''s Walk';

alter table public.treinos_historico
  add column if not exists local text,
  add column if not exists dia_semana text,
  add column if not exists iniciado_em timestamptz,
  add column if not exists finalizado_em timestamptz,
  -- [{ exercicio_id, nome, series: [{ carga_kg, reps, segundos, feita_em }] }]
  add column if not exists series_feitas jsonb not null default '[]'::jsonb;
