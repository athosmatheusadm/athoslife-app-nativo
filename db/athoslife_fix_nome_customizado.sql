-- ============================================================================
-- CORREÇÃO — garante a coluna nome_customizado em refeicoes_status
-- ============================================================================
-- Roda em qualquer estado: se a tabela refeicoes_status ainda não existe,
-- cria ela inteira (igual à migração original). Se já existe mas sem a
-- coluna nova, só adiciona a coluna. Nada aqui apaga dado nenhum.
--
-- COMO USAR: abra este arquivo num editor de texto simples (Bloco de
-- Notas, VS Code...), selecione tudo (Ctrl+A), copie (Ctrl+C) e cole numa
-- aba NOVA do SQL Editor do Supabase. Copiar direto do arquivo evita
-- caractere invisível que às vezes entra ao colar do chat.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.refeicoes_status (
  user_id           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data              DATE NOT NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('cafe', 'almoco', 'lanche', 'jantar', 'extra')),
  concluida         BOOLEAN NOT NULL DEFAULT FALSE,
  nome_customizado  TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, data, tipo)
);

ALTER TABLE public.refeicoes_status ADD COLUMN IF NOT EXISTS nome_customizado TEXT;

ALTER TABLE public.refeicoes_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "refeicoes_status: acesso pessoal" ON public.refeicoes_status;
CREATE POLICY "refeicoes_status: acesso pessoal"
  ON public.refeicoes_status FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Conferência: se este SELECT der erro, a coluna não pegou.
SELECT nome_customizado FROM public.refeicoes_status LIMIT 1;

COMMIT;
