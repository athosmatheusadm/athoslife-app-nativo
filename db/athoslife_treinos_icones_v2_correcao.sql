-- CORREÇÃO da migração anterior (athoslife_treinos_icones_v1_migration.sql).
--
-- Erro cometido: os ícones dos dois zips (ATHOSlife_CARDS_HD.zip e
-- icones-exercicios-athoslife.zip) eram pra valer só pro CARD FECHADO/lista
-- de busca. A v1 substituiu o `imagem_url` inteiro, que também alimenta a
-- tela EXPANDIDA (a foto grande com diagrama+início+execução) — perdendo
-- esse detalhe de execução pros 35 exercícios que ganharam ícone novo.
--
-- Esta migração:
--   1) adiciona a coluna `icone_url` (card fechado / lista de busca);
--   2) devolve `imagem_url` pra foto original de execução (tela expandida);
--   3) preenche `icone_url` com o ícone novo dos zips.
--
-- Os arquivos já foram reorganizados no projeto: fotos originais de volta
-- em public/exercicios/<slug>.jpg (+ -thumb.jpg), ícones novos movidos pra
-- public/exercicios/icones/<slug>.png.
--
-- Executar uma vez no SQL Editor do Supabase (depois da v1, que já rodou).

ALTER TABLE public.exercicios_catalogo ADD COLUMN IF NOT EXISTS icone_url TEXT;

UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/supino-reto-com-barra.png', imagem_url = '/exercicios/supino-reto-com-barra.jpg' WHERE imagem_url = '/exercicios/supino-reto-com-barra.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/supino-inclinado-com-halteres.png', imagem_url = '/exercicios/supino-inclinado-com-halteres.jpg' WHERE imagem_url = '/exercicios/supino-inclinado-com-halteres.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/supino-declinado.png', imagem_url = '/exercicios/supino-declinado.jpg' WHERE imagem_url = '/exercicios/supino-declinado.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/crucifixo-reto-com-halteres.png', imagem_url = '/exercicios/crucifixo-reto-com-halteres.jpg' WHERE imagem_url = '/exercicios/crucifixo-reto-com-halteres.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/crossover.png', imagem_url = '/exercicios/crossover.jpg' WHERE imagem_url = '/exercicios/crossover.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/voador-pec-deck.png', imagem_url = '/exercicios/voador-pec-deck.jpg' WHERE imagem_url = '/exercicios/voador-pec-deck.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/flexao-de-braco.png', imagem_url = '/exercicios/flexao-de-braco.jpg' WHERE imagem_url = '/exercicios/flexao-de-braco.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/puxada-alta-pulldown.png', imagem_url = '/exercicios/puxada-alta-pulldown.jpg' WHERE imagem_url = '/exercicios/puxada-alta-pulldown.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/remada-baixa-no-cabo.png', imagem_url = '/exercicios/remada-baixa-no-cabo.jpg' WHERE imagem_url = '/exercicios/remada-baixa-no-cabo.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/remada-curvada-com-barra.png', imagem_url = '/exercicios/remada-curvada-com-barra.jpg' WHERE imagem_url = '/exercicios/remada-curvada-com-barra.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/levantamento-terra.png', imagem_url = '/exercicios/levantamento-terra.jpg' WHERE imagem_url = '/exercicios/levantamento-terra.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/face-pull.png', imagem_url = '/exercicios/face-pull.jpg' WHERE imagem_url = '/exercicios/face-pull.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/cadeira-extensora.png', imagem_url = '/exercicios/cadeira-extensora.jpg' WHERE imagem_url = '/exercicios/cadeira-extensora.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/cadeira-flexora.png', imagem_url = '/exercicios/cadeira-flexora.jpg' WHERE imagem_url = '/exercicios/cadeira-flexora.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/mesa-flexora.png', imagem_url = '/exercicios/mesa-flexora.jpg' WHERE imagem_url = '/exercicios/mesa-flexora.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/leg-press-45.png', imagem_url = '/exercicios/leg-press-45.jpg' WHERE imagem_url = '/exercicios/leg-press-45.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/agachamento-livre-com-barra.png', imagem_url = '/exercicios/agachamento-livre-com-barra.jpg' WHERE imagem_url = '/exercicios/agachamento-livre-com-barra.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/elevacao-frontal.png', imagem_url = '/exercicios/elevacao-frontal.jpg' WHERE imagem_url = '/exercicios/elevacao-frontal.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/elevacao-lateral-com-halteres.png', imagem_url = '/exercicios/elevacao-lateral-com-halteres.jpg' WHERE imagem_url = '/exercicios/elevacao-lateral-com-halteres.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/desenvolvimento-com-halteres.png', imagem_url = '/exercicios/desenvolvimento-com-halteres.jpg' WHERE imagem_url = '/exercicios/desenvolvimento-com-halteres.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/crucifixo-invertido-com-halteres.png', imagem_url = '/exercicios/crucifixo-invertido-com-halteres.jpg' WHERE imagem_url = '/exercicios/crucifixo-invertido-com-halteres.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/encolhimento-com-halteres.png', imagem_url = '/exercicios/encolhimento-com-halteres.jpg' WHERE imagem_url = '/exercicios/encolhimento-com-halteres.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/barra-fixa.png', imagem_url = '/exercicios/barra-fixa.jpg' WHERE imagem_url = '/exercicios/barra-fixa.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/elevacao-pelvica.png', imagem_url = '/exercicios/elevacao-pelvica.jpg' WHERE imagem_url = '/exercicios/elevacao-pelvica.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/gluteo-na-polia-coice.png', imagem_url = '/exercicios/gluteo-na-polia-coice.jpg' WHERE imagem_url = '/exercicios/gluteo-na-polia-coice.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/cadeira-abdutora.png', imagem_url = '/exercicios/cadeira-abdutora.jpg' WHERE imagem_url = '/exercicios/cadeira-abdutora.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/gemeos-sentados.png', imagem_url = '/exercicios/gemeos-sentados.jpg' WHERE imagem_url = '/exercicios/gemeos-sentados.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/gemeos-em-pe.png', imagem_url = '/exercicios/gemeos-em-pe.jpg' WHERE imagem_url = '/exercicios/gemeos-em-pe.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/agachamento-bulgaro.png', imagem_url = '/exercicios/agachamento-bulgaro.jpg' WHERE imagem_url = '/exercicios/agachamento-bulgaro.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/agachamento-hack.png', imagem_url = '/exercicios/agachamento-hack.jpg' WHERE imagem_url = '/exercicios/agachamento-hack.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/remada-unilateral-com-halter.png', imagem_url = '/exercicios/remada-unilateral-com-halter.jpg' WHERE imagem_url = '/exercicios/remada-unilateral-com-halter.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/supino-articulado.png', imagem_url = '/exercicios/supino-articulado.jpg' WHERE imagem_url = '/exercicios/supino-articulado.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/extensao-lombar-banco-romano.png', imagem_url = '/exercicios/extensao-lombar-banco-romano.jpg' WHERE imagem_url = '/exercicios/extensao-lombar-banco-romano.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/puxada-articulada.png', imagem_url = '/exercicios/puxada-articulada.jpg' WHERE imagem_url = '/exercicios/puxada-articulada.png';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/pullover-no-cabo.png', imagem_url = '/exercicios/pullover-no-cabo.jpg' WHERE imagem_url = '/exercicios/pullover-no-cabo.png';
