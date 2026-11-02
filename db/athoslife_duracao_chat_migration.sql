-- ================================================================
-- ATHOSlife · Tempo do chat no log (02/11/2026)
-- docs/PLANO_LIFE_ACOES.md, Fase 7 (guia item 11: "Medir").
-- Meta do guia: primeira palavra < 1 s, resposta completa < 3 s.
-- A ai-proxy grava sem estas colunas enquanto elas não existirem.
-- ================================================================
alter table public.ai_audit_logs
  add column if not exists duracao_ms integer check (duracao_ms is null or duracao_ms >= 0),
  add column if not exists primeira_palavra_ms integer check (primeira_palavra_ms is null or primeira_palavra_ms >= 0);

-- Pra conferir:
-- select modelo, count(*), percentile_cont(0.5) within group (order by duracao_ms) mediana_ms,
--        percentile_cont(0.5) within group (order by primeira_palavra_ms) primeira_mediana_ms
--   from ai_audit_logs where tipo_chamada = 'chat' and data > now() - interval '1 day' group by 1;
