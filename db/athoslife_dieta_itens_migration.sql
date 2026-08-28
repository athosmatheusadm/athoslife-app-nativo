-- ============================================================================
-- MIGRAÇÃO — Itens de refeição + status de conclusão (tela Dieta)
-- ============================================================================
-- O QUE FAZ:
--   1) Cria itens_refeicao: cada alimento adicionado manualmente na Dieta
--      (busca inline ou clonado de outra refeição) vira uma linha real,
--      persistente por (user_id, data, tipo).
--   2) Cria refeicoes_status: guarda o checkbox "concluída" por
--      (user_id, data, tipo) — hoje esse estado não é salvo em lugar nenhum.
--   3) Reforça (idempotente) o CHECK de refeicoes.tipo pra garantir que
--      'extra' é aceito — os 5 valores já estão documentados em
--      docs/ATHOSlife_Regras_de_Negocio.md, isto só protege caso a trava
--      real no banco tenha ficado desatualizada.
--
-- POR QUE:
--   A tela Dieta guardava os itens só em useState (React) — sumia no
--   refresh. Auditoria de 2026-08-24, pedido do dono do produto de
--   implementar persistência de verdade + editar/excluir/clonar.
--
-- SEGURANÇA:
--   Só adiciona (CREATE TABLE IF NOT EXISTS). Não apaga nem altera dado
--   existente. Reversível — ver bloco ROLLBACK no fim.
-- ============================================================================

BEGIN;

-- 1) Itens de refeição — um alimento por linha.
CREATE TABLE IF NOT EXISTS public.itens_refeicao (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo              TEXT NOT NULL CHECK (tipo IN ('cafe', 'almoco', 'lanche', 'jantar', 'extra')),
  nome              TEXT NOT NULL,
  quantidade_texto  TEXT NOT NULL,
  calorias          NUMERIC NOT NULL DEFAULT 0,
  proteina          NUMERIC NOT NULL DEFAULT 0,
  carboidrato       NUMERIC NOT NULL DEFAULT 0,
  gordura           NUMERIC NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itens_refeicao_user_data
  ON public.itens_refeicao (user_id, data, tipo);

ALTER TABLE public.itens_refeicao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "itens_refeicao: acesso pessoal" ON public.itens_refeicao;
CREATE POLICY "itens_refeicao: acesso pessoal"
  ON public.itens_refeicao FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2) Status "concluída" por refeição do dia (o checkbox do card) + nome
--    customizado (hoje só usado pelo slot "Extra", que não tem nome fixo).
CREATE TABLE IF NOT EXISTS public.refeicoes_status (
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data              DATE NOT NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('cafe', 'almoco', 'lanche', 'jantar', 'extra')),
  concluida         BOOLEAN NOT NULL DEFAULT FALSE,
  nome_customizado  TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, data, tipo)
);

-- Idempotente: se você já rodou esta migração antes de o campo existir,
-- este ALTER adiciona só a coluna nova, sem recriar a tabela.
ALTER TABLE public.refeicoes_status ADD COLUMN IF NOT EXISTS nome_customizado TEXT;

ALTER TABLE public.refeicoes_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refeicoes_status: acesso pessoal" ON public.refeicoes_status;
CREATE POLICY "refeicoes_status: acesso pessoal"
  ON public.refeicoes_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;

-- ============================================================================
-- 3) Reforço defensivo do CHECK em refeicoes.tipo — EM TRANSAÇÃO SEPARADA
--    de propósito: `refeicoes` é tabela antiga (dado real, pré-repo). Se
--    houver alguma linha com `tipo` fora dos 5 valores esperados, este
--    passo falha — mas como está isolado, não derruba as tabelas novas
--    criadas acima. Se der erro aqui, tudo bem: as tabelas novas já
--    existem, o app funciona; me chama pra investigar esse passo à parte.
-- ============================================================================
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'refeicoes' AND column_name = 'tipo'
  ) THEN
    ALTER TABLE public.refeicoes DROP CONSTRAINT IF EXISTS refeicoes_tipo_check;
    ALTER TABLE public.refeicoes
      ADD CONSTRAINT refeicoes_tipo_check
      CHECK (tipo IN ('cafe', 'almoco', 'lanche', 'jantar', 'extra'));
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK (rodar só se precisar voltar atrás)
-- ----------------------------------------------------------------------------
-- BEGIN;
-- DROP TABLE IF EXISTS public.itens_refeicao;
-- DROP TABLE IF EXISTS public.refeicoes_status;
-- -- (o CHECK de refeicoes.tipo não precisa voltar: 'extra' já era esperado)
-- COMMIT;
-- ============================================================================
