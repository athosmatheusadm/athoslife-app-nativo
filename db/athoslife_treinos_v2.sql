-- ============================================================================
-- Treino v2 — três níveis: Local → Treinos nomeados → Exercícios
-- ============================================================================
-- Evolução: antes era local -> exercícios soltos. Agora o usuário separa por
-- treino (Peito, Braço, Perna...), com abas dentro de cada local.
-- Alguns treinos vêm prontos (semeados, modelo = TRUE); o usuário cria os seus.
--
-- Substitui athoslife_exercicios_treino.sql (v1). Agora o exercício pertence
-- a um TREINO, e o treino a um local.
--
-- Reversível: DROP TABLE public.exercicios_treino; DROP TABLE public.treinos;
-- ============================================================================

DROP TABLE IF EXISTS public.exercicios_treino CASCADE;

-- Treinos nomeados (Peito, Braço...) por local
CREATE TABLE IF NOT EXISTS public.treinos (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  local        TEXT NOT NULL CHECK (local IN ('casa', 'academia')),
  nome         TEXT NOT NULL,
  subtitulo    TEXT,
  icone        TEXT,
  ordem        INTEGER NOT NULL DEFAULT 0,
  modelo       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Exercícios pertencem a um treino
CREATE TABLE IF NOT EXISTS public.exercicios_treino (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  treino_id    UUID NOT NULL REFERENCES public.treinos(id) ON DELETE CASCADE,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  icone        TEXT,
  series       INTEGER NOT NULL DEFAULT 3 CHECK (series > 0),
  repeticoes   INTEGER NOT NULL DEFAULT 12 CHECK (repeticoes > 0),
  concluido    BOOLEAN NOT NULL DEFAULT FALSE,
  ordem        INTEGER NOT NULL DEFAULT 0,
  data         DATE DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treinos_user_local ON public.treinos (user_id, local);
CREATE INDEX IF NOT EXISTS idx_ex_treino ON public.exercicios_treino (treino_id, data);

-- RLS
ALTER TABLE public.treinos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treinos: ver meus e os modelos"
  ON public.treinos FOR SELECT
  USING (auth.uid() = user_id OR modelo = TRUE);
CREATE POLICY "treinos: editar os meus"
  ON public.treinos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.exercicios_treino ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercicios: acesso pessoal"
  ON public.exercicios_treino FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- SEED — treinos prontos (modelos). user_id NULL, modelo = TRUE.
-- ============================================================================
INSERT INTO public.treinos (local, nome, subtitulo, icone, ordem, modelo) VALUES
  ('academia', 'Treino A — Peito',  'Peito e tríceps',         'peito',  1, TRUE),
  ('academia', 'Treino B — Costas', 'Costas e bíceps',         'costas', 2, TRUE),
  ('academia', 'Treino C — Perna',  'Pernas e glúteos',        'perna',  3, TRUE),
  ('casa',     'Corpo Inteiro',     'Treino de corpo inteiro', 'corpo',  1, TRUE),
  ('casa',     'Abdômen',           'Core e abdômen',          'core',   2, TRUE);
