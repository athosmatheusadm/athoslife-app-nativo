-- ============================================================================
-- MIGRAÇÃO — Marcar exercício como concluído (Treino)
-- ============================================================================
-- O QUE FAZ:
--   Adiciona treino_plano.concluido_em (DATE, opcional). Guarda uma DATA,
--   não um boolean, de propósito: comparando com a data de hoje no código
--   (concluidoHoje = concluido_em === hoje), o check "reseta" sozinho toda
--   semana sem precisar de job nenhum — dia diferente, comparação falha,
--   volta a aparecer desmarcado.
--
-- POR QUE: pedido do usuário depois de testar a tela nova — faltava um jeito
--   de marcar o exercício como feito no dia.
--
-- SEGURANÇA: só adiciona coluna opcional. Reversível (rollback no fim).
-- ============================================================================

BEGIN;

ALTER TABLE public.treino_plano
  ADD COLUMN IF NOT EXISTS concluido_em DATE;

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE public.treino_plano DROP COLUMN IF EXISTS concluido_em;
-- COMMIT;
-- ============================================================================
