-- ============================================================================
-- MIGRAÇÃO — Refeições extras múltiplas e arrastáveis (tela Dieta)
-- ============================================================================
-- O QUE FAZ:
--   1) Cria refeicoes_extra: cada refeição extra criada pelo usuário
--      (Colação, Ceia, Pós-treino, ...) vira sua PRÓPRIA linha, com nome
--      livre e uma posição (`ordem`) que o usuário controla arrastando na
--      tela. Antes, só existia UM slot fixo "Extra" por dia
--      (tipo='extra' em refeicoes_status) — agora pode haver quantos o
--      usuário quiser no mesmo dia.
--   2) Liga itens_refeicao a uma refeição extra específica
--      (refeicao_extra_id), pra saber a qual delas cada alimento pertence
--      quando há mais de uma no mesmo dia.
--
-- POR QUE:
--   Pedido do dono do produto (2026-08-26): "Extra" não deve ser um 5º slot
--   fixo sempre visível — deve funcionar como uma refeição livre que o
--   usuário cria quando quiser (nome + posição livres), não uma categoria.
--
-- IMPORTANTE — depois de rodar, recarregue o schema cache do PostgREST
--   (Project Settings → API → "Reload schema", ou rode
--   `NOTIFY pgrst, 'reload schema';` aqui mesmo) — sem isso a API do
--   Supabase continua respondendo 404 pra tabela nova por um tempo, mesmo
--   com a tabela já existindo no Postgres.
--
-- SEGURANÇA:
--   Só adiciona (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--   Não apaga nem altera dado existente. Reversível — ver ROLLBACK no fim.
-- ============================================================================

BEGIN;

-- 1) Uma linha por refeição extra criada pelo usuário.
CREATE TABLE IF NOT EXISTS public.refeicoes_extra (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  nome        TEXT NOT NULL DEFAULT 'Nova refeição',
  ordem       NUMERIC NOT NULL,
  concluida   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refeicoes_extra_user_data
  ON public.refeicoes_extra (user_id, data);

ALTER TABLE public.refeicoes_extra ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refeicoes_extra: acesso pessoal" ON public.refeicoes_extra;
CREATE POLICY "refeicoes_extra: acesso pessoal"
  ON public.refeicoes_extra FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Liga cada item de itens_refeicao à refeição extra específica a que
--    pertence (NULL para os 4 tipos fixos — café/almoço/lanche/jantar).
ALTER TABLE public.itens_refeicao
  ADD COLUMN IF NOT EXISTS refeicao_extra_id UUID REFERENCES public.refeicoes_extra(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_itens_refeicao_extra
  ON public.itens_refeicao (refeicao_extra_id);

COMMIT;

-- Reforça o refresh do cache do PostgREST logo após criar a tabela nova.
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ROLLBACK (rodar só se precisar voltar atrás)
-- ----------------------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE public.itens_refeicao DROP COLUMN IF EXISTS refeicao_extra_id;
-- DROP TABLE IF EXISTS public.refeicoes_extra;
-- COMMIT;
-- ============================================================================
