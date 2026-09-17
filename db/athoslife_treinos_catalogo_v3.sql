-- ============================================================================
-- Treinos v3 — Catálogo de exercícios + plano pessoal por dia da semana
-- ============================================================================
-- SUBSTITUI o modelo de db/athoslife_treinos_v2.sql (Local → Treino nomeado
-- tipo "Treino A - Peito" → Exercícios). Aquela migração NUNCA rodou no banco
-- (tabelas treinos/exercicios_treino nunca existiram) — não há dado real
-- em jogo, então essa troca de modelo não quebra nada em produção.
--
-- Novo modelo (alinhado com o mockup validado pelo usuário):
--   Local (casa/academia) → Dia da semana (Seg..Dom) → Exercícios do dia.
--
-- Duas peças:
--   1) exercicios_catalogo — conteúdo curado (compartilhado, mesmo espírito
--      de receitas_cozinha): nome, grupo muscular, foto, como executar.
--      RLS só leitura pra autenticado, igual receitas_cozinha.
--   2) treino_plano — atribuição pessoal: quais exercícios do catálogo o
--      usuário colocou em qual (local, dia da semana), com séries/reps.
--      RLS pessoal, igual itens_refeicao/refeicoes_extra.
--
-- Fotos: cortadas das imagens de referência do usuário (36 exercícios),
-- empacotadas como asset estático do app em public/exercicios/<slug>.jpg
-- (não Supabase Storage — conteúdo curado e pequeno, sem custo de upload/
-- permissão extra, mesmo raciocínio dos ícones SVG que já existem no app).
--
-- Reversível: DROP TABLE public.treino_plano; DROP TABLE public.exercicios_catalogo;
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.exercicios_catalogo (
  id                    UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome                  TEXT NOT NULL,
  grupo_muscular        TEXT NOT NULL CHECK (grupo_muscular IN
                          ('peito','costas','ombro','pernas','gluteos','panturrilha','lombar','bracos')),
  musculos_trabalhados  TEXT,
  ambientes             TEXT[] NOT NULL DEFAULT '{}',
  imagem_url            TEXT,
  como_executar         TEXT[] NOT NULL DEFAULT '{}',
  series_padrao         INTEGER NOT NULL DEFAULT 3 CHECK (series_padrao > 0),
  repeticoes_padrao     INTEGER NOT NULL DEFAULT 12 CHECK (repeticoes_padrao > 0),
  dica                  TEXT,
  ordem                 INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.treino_plano (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  local        TEXT NOT NULL CHECK (local IN ('casa', 'academia')),
  dia_semana   TEXT NOT NULL CHECK (dia_semana IN ('seg','ter','qua','qui','sex','sab','dom')),
  exercicio_id UUID NOT NULL REFERENCES public.exercicios_catalogo(id) ON DELETE CASCADE,
  series       INTEGER NOT NULL DEFAULT 3 CHECK (series > 0),
  repeticoes   INTEGER NOT NULL DEFAULT 12 CHECK (repeticoes > 0),
  ordem        INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treino_plano_user_local_dia
  ON public.treino_plano (user_id, local, dia_semana);
CREATE INDEX IF NOT EXISTS idx_exercicios_catalogo_grupo
  ON public.exercicios_catalogo (grupo_muscular);

-- RLS
ALTER TABLE public.exercicios_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exercicios_catalogo: leitura autenticada"
  ON public.exercicios_catalogo FOR SELECT
  USING (auth.role() = 'authenticated');

ALTER TABLE public.treino_plano ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treino_plano: acesso pessoal"
  ON public.treino_plano FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;

-- ============================================================================
-- SEED — 36 exercícios do catálogo inicial
-- ============================================================================
BEGIN;

INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Elevação Pélvica', 'gluteos', 'Trabalha principalmente os glúteos, com participação dos posteriores das coxas.', ARRAY['academia']::TEXT[], '/exercicios/elevacao-pelvica.jpg', ARRAY['Apoie as costas no banco, flexione os joelhos e posicione a barra nos quadris.', 'Eleve os quadris contraindo os glúteos e desça com controle.']::TEXT[], 1);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Glúteo na Polia (Coice)', 'gluteos', 'Trabalha principalmente os glúteos, com participação dos posteriores das coxas.', ARRAY['academia']::TEXT[], '/exercicios/gluteo-na-polia-coice.jpg', ARRAY['Segure o apoio, mantenha o tronco firme e o cabo preso ao tornozelo.', 'Leve a perna para trás contraindo o glúteo e retorne lentamente.']::TEXT[], 2);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Cadeira Abdutora', 'gluteos', 'Trabalha os glúteos, principalmente a região lateral do quadril.', ARRAY['academia']::TEXT[], '/exercicios/cadeira-abdutora.jpg', ARRAY['Sente-se com as costas apoiadas e joelhos unidos contra os apoios.', 'Abra os joelhos sem tirar os pés do apoio e retorne com controle.']::TEXT[], 3);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Gêmeos Sentados', 'panturrilha', 'Trabalha principalmente o sóleo, na região inferior das panturrilhas.', ARRAY['academia']::TEXT[], '/exercicios/gemeos-sentados.jpg', ARRAY['Sente-se com os joelhos apoiados e a parte da frente dos pés na plataforma.', 'Eleve os calcanhares o máximo que puder e desça com controle.']::TEXT[], 4);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Gêmeos em Pé', 'panturrilha', 'Trabalha principalmente o gastrocnêmio, na parte superior das panturrilhas.', ARRAY['academia']::TEXT[], '/exercicios/gemeos-em-pe.jpg', ARRAY['Apoie os ombros, coloque a parte da frente dos pés na plataforma e mantenha o corpo ereto.', 'Suba na ponta dos pés, contraia as panturrilhas e retorne devagar.']::TEXT[], 5);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Levantamento Terra (Deadlift)', 'pernas', 'Trabalha glúteos, posteriores das coxas, lombar e costas.', ARRAY['academia']::TEXT[], '/exercicios/levantamento-terra.jpg', ARRAY['Pés sob a barra, quadris para trás, joelhos flexionados e coluna neutra.', 'Estenda quadris e joelhos, mantenha a barra próxima e desça com controle.']::TEXT[], 6);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Afundo com Halteres', 'pernas', 'Trabalha quadríceps e glúteos, com participação dos posteriores das coxas.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/afundo-com-halteres.jpg', ARRAY['Fique em pé, segure os halteres ao lado do corpo e mantenha o tronco ereto.', 'Dê um passo à frente, flexione os joelhos e empurre o chão para voltar.']::TEXT[], 7);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Agachamento Búlgaro', 'pernas', 'Trabalha quadríceps e glúteos, com maior ênfase em uma perna por vez.', ARRAY['academia']::TEXT[], '/exercicios/agachamento-bulgaro.jpg', ARRAY['Apoie um pé no banco atrás e mantenha o outro firme no chão.', 'Desça mantendo o joelho da frente alinhado e suba com controle.']::TEXT[], 8);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Agachamento Hack', 'pernas', 'Trabalha quadríceps e glúteos, com participação dos posteriores das coxas.', ARRAY['academia']::TEXT[], '/exercicios/agachamento-hack.jpg', ARRAY['Apoie costas e ombros, coloque os pés na plataforma e mantenha a coluna neutra.', 'Desça com controle e empurre a plataforma sem travar os joelhos.']::TEXT[], 9);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Cadeira Extensora', 'pernas', 'Trabalha principalmente os quadríceps, na parte da frente das coxas.', ARRAY['academia']::TEXT[], '/exercicios/cadeira-extensora.jpg', ARRAY['Sente-se com as costas apoiadas e canela atrás do apoio da máquina.', 'Estenda os joelhos sem travar e desça o peso com controle.']::TEXT[], 10);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Mesa Flexora', 'pernas', 'Trabalha os posteriores das coxas, com participação das panturrilhas.', ARRAY['academia']::TEXT[], '/exercicios/mesa-flexora.jpg', ARRAY['Deite de bruços, alinhe os joelhos e coloque os tornozelos sob o apoio.', 'Flexione os joelhos levando os calcanhares aos glúteos e retorne.']::TEXT[], 11);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Cadeira Flexora', 'pernas', 'Trabalha os posteriores das coxas, com participação das panturrilhas.', ARRAY['academia']::TEXT[], '/exercicios/cadeira-flexora.jpg', ARRAY['Sente-se com as costas apoiadas, pernas estendidas e tornozelos no apoio.', 'Puxe o apoio para trás com os calcanhares e retorne devagar.']::TEXT[], 12);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Remada Baixa no Cabo', 'costas', 'Trabalha as costas, principalmente a região central e o latíssimo do dorso.', ARRAY['academia']::TEXT[], '/exercicios/remada-baixa-no-cabo.jpg', ARRAY['Sente-se com joelhos levemente flexionados, tronco ereto e braços estendidos.', 'Puxe a alça até o abdômen, aproximando as escápulas e retorne.']::TEXT[], 13);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Remada Curvada com Barra', 'costas', 'Trabalha as costas, com foco no latíssimo do dorso e na região central.', ARRAY['academia']::TEXT[], '/exercicios/remada-curvada-com-barra.jpg', ARRAY['Incline o tronco, mantenha a coluna neutra e a barra abaixo dos ombros.', 'Puxe a barra em direção ao abdômen, mantendo os cotovelos próximos.']::TEXT[], 14);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Remada Unilateral com Halter (Serrote)', 'costas', 'Trabalha o latíssimo do dorso, romboides e parte posterior do ombro.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/remada-unilateral-com-halter.jpg', ARRAY['Apoie uma mão e um joelho no banco, coluna neutra e halter suspenso.', 'Puxe o halter em direção às costelas e desça com controle.']::TEXT[], 15);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Flexão de Braço', 'peito', 'Trabalha peito, ombros e tríceps usando o peso do corpo.', ARRAY['casa', 'academia']::TEXT[], '/exercicios/flexao-de-braco.jpg', ARRAY['Mãos apoiadas no chão, braços estendidos e corpo alinhado.', 'Desça o peito com controle e empurre o chão para voltar.']::TEXT[], 16);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Supino Articulado', 'peito', 'Trabalha o peitoral, com participação dos ombros e tríceps.', ARRAY['academia']::TEXT[], '/exercicios/supino-articulado.jpg', ARRAY['Sente-se com as costas apoiadas e alças próximas ao peito.', 'Empurre as alças para frente sem travar os cotovelos e retorne.']::TEXT[], 17);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Puxada Alta (Pulldown)', 'costas', 'Trabalha as costas, principalmente o latíssimo do dorso e bíceps.', ARRAY['academia']::TEXT[], '/exercicios/puxada-alta-pulldown.jpg', ARRAY['Segure a barra aberta, tronco ereto e braços estendidos.', 'Puxe a barra até o peito, aproximando as escápulas.']::TEXT[], 18);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Crucifixo Reto com Halteres', 'peito', 'Trabalha o peitoral, com foco na parte interna.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/crucifixo-reto-com-halteres.jpg', ARRAY['Deite no banco, halteres acima do peito e cotovelos levemente flexionados.', 'Abra os braços até sentir o alongamento e retorne contraindo o peitoral.']::TEXT[], 19);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Crossover', 'peito', 'Trabalha o peitoral, com foco na contração muscular.', ARRAY['academia']::TEXT[], '/exercicios/crossover.jpg', ARRAY['Fique entre as polias, tronco levemente inclinado e braços abertos.', 'Puxe as alças para frente e una as mãos, contraindo o peitoral.']::TEXT[], 20);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Voador (Pec Deck)', 'peito', 'Isola o peitoral, com foco na parte interna.', ARRAY['academia']::TEXT[], '/exercicios/voador-pec-deck.jpg', ARRAY['Sente-se com as costas apoiadas e braços abertos na máquina.', 'Aproxime os braços à frente do corpo, contraindo o peitoral.']::TEXT[], 21);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Supino Reto com Barra', 'peito', 'Trabalha a parte central do peitoral, com participação dos ombros e tríceps.', ARRAY['academia']::TEXT[], '/exercicios/supino-reto-com-barra.jpg', ARRAY['Deite no banco, pés firmes no chão e mãos na barra um pouco mais afastadas que os ombros.', 'Empurre a barra para cima até estender os braços, mantendo o controle do movimento.']::TEXT[], 22);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Supino Inclinado com Halteres', 'peito', 'Trabalha a parte superior do peitoral, ombros e tríceps.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/supino-inclinado-com-halteres.jpg', ARRAY['Halteres próximos ao peito, banco inclinado e cotovelos flexionados.', 'Empurre os halteres para cima até estender os braços, aproximando-os sem bater.']::TEXT[], 23);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Supino Declinado', 'peito', 'Trabalha a parte inferior do peitoral, com participação dos ombros e tríceps.', ARRAY['academia']::TEXT[], '/exercicios/supino-declinado.jpg', ARRAY['Deite no banco declinado, pés firmes e barra alinhada acima do peito.', 'Desça a barra de forma controlada até o peito e empurre para cima.']::TEXT[], 24);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Crucifixo Invertido com Halteres', 'ombro', 'Trabalha a parte posterior dos ombros e a região superior das costas.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/crucifixo-invertido-com-halteres.jpg', ARRAY['Incline o tronco, mantenha a coluna neutra e halteres abaixo dos ombros.', 'Abra os braços para os lados e retorne devagar, sem impulsos.']::TEXT[], 25);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Face Pull', 'ombro', 'Trabalha a parte posterior dos ombros e os músculos da parte superior das costas.', ARRAY['academia']::TEXT[], '/exercicios/face-pull.jpg', ARRAY['Segure a corda na altura do rosto, braços estendidos e tronco firme.', 'Puxe a corda em direção ao rosto, abrindo os cotovelos e retorne.']::TEXT[], 26);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Encolhimento com Halteres', 'ombro', 'Trabalha principalmente o trapézio, na região superior das costas.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/encolhimento-com-halteres.jpg', ARRAY['Fique em pé com halteres ao lado do corpo e ombros relaxados.', 'Eleve os ombros em direção às orelhas e desça com controle.']::TEXT[], 27);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Desenvolvimento com Halteres', 'ombro', 'Trabalha os ombros, com participação dos tríceps.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/desenvolvimento-com-halteres.jpg', ARRAY['Halteres na altura dos ombros, cotovelos flexionados e tronco firme.', 'Empurre os halteres para cima sem travar os cotovelos e retorne.']::TEXT[], 28);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Elevação Lateral com Halteres', 'ombro', 'Trabalha principalmente a porção lateral dos ombros.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/elevacao-lateral-com-halteres.jpg', ARRAY['Fique em pé, halteres ao lado do corpo e cotovelos levemente flexionados.', 'Eleve os braços até a altura dos ombros e desça com controle.']::TEXT[], 29);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Elevação Frontal', 'ombro', 'Trabalha principalmente a parte anterior dos ombros.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/elevacao-frontal.jpg', ARRAY['Halteres à frente das coxas, braços estendidos e tronco firme.', 'Eleve os braços à frente até a altura dos ombros e retorne devagar.']::TEXT[], 30);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Extensão Lombar (Banco Romano)', 'lombar', 'Trabalha a lombar, os eretores da coluna e os glúteos.', ARRAY['academia']::TEXT[], '/exercicios/extensao-lombar-banco-romano.jpg', ARRAY['Apoie os quadris no banco, mantenha o tronco inclinado e a coluna neutra.', 'Eleve o tronco até alinhar o corpo e retorne lentamente.']::TEXT[], 31);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Agachamento Livre com Barra', 'pernas', 'Trabalha quadríceps, glúteos e posteriores das coxas.', ARRAY['academia']::TEXT[], '/exercicios/agachamento-livre-com-barra.jpg', ARRAY['Barra apoiada nos ombros, pés afastados e coluna neutra.', 'Desça flexionando quadris e joelhos e suba empurrando o chão.']::TEXT[], 32);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Leg Press 45°', 'pernas', 'Trabalha quadríceps, glúteos e posteriores das coxas.', ARRAY['academia']::TEXT[], '/exercicios/leg-press-45.jpg', ARRAY['Apoie as costas, coloque os pés na plataforma e flexione os joelhos.', 'Empurre a plataforma sem travar os joelhos e retorne com controle.']::TEXT[], 33);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Barra Fixa', 'costas', 'Trabalha as costas, principalmente o latíssimo do dorso, além dos bíceps.', ARRAY['academia', 'casa']::TEXT[], '/exercicios/barra-fixa.jpg', ARRAY['Segure a barra com pegada aberta, braços estendidos e corpo estável.', 'Puxe o corpo até aproximar o peito da barra e desça com controle.']::TEXT[], 34);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Puxada Articulada', 'costas', 'Trabalha as costas, com foco no latíssimo do dorso e na região central.', ARRAY['academia']::TEXT[], '/exercicios/puxada-articulada.jpg', ARRAY['Sente-se com as costas apoiadas e braços estendidos nas alças.', 'Puxe as alças para baixo, aproximando os cotovelos do tronco.']::TEXT[], 35);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, musculos_trabalhados, ambientes, imagem_url, como_executar, ordem) VALUES ('Pullover no Cabo', 'costas', 'Trabalha o latíssimo do dorso, com foco na extensão dos ombros.', ARRAY['academia']::TEXT[], '/exercicios/pullover-no-cabo.jpg', ARRAY['Fique de frente para a polia alta, braços estendidos e tronco levemente inclinado.', 'Leve a barra até as coxas, mantendo os cotovelos levemente flexionados.']::TEXT[], 36);

-- Conferência: os 36 devem ter entrado.
DO $$
DECLARE total integer;
BEGIN
  SELECT count(*) INTO total FROM public.exercicios_catalogo;
  IF total < 36 THEN
    RAISE EXCEPTION 'Só % de 36 exercícios foram inseridos.', total;
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK
-- ----------------------------------------------------------------------------
-- BEGIN;
-- DROP TABLE IF EXISTS public.treino_plano;
-- DROP TABLE IF EXISTS public.exercicios_catalogo;
-- COMMIT;
-- ============================================================================
