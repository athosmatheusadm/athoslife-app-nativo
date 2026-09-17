-- Atualiza imagem_url dos exercícios que ganharam ícone de card novo
-- (ATHOSlife_CARDS_HD.zip, sessão 2026-09-11, + icones-exercicios-athoslife.zip,
-- sessão 2026-09-12). Só falta "Afundo com Halteres" — nenhum dos dois zips
-- trouxe o ícone certo pra ele ainda (o arquivo enviado pra ele era na
-- verdade "Agachamento Búlgaro", já usado abaixo).
-- Executar uma vez no SQL Editor do Supabase.

UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/supino-reto-com-barra.png' WHERE imagem_url = '/exercicios/supino-reto-com-barra.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/supino-inclinado-com-halteres.png' WHERE imagem_url = '/exercicios/supino-inclinado-com-halteres.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/supino-declinado.png' WHERE imagem_url = '/exercicios/supino-declinado.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/crucifixo-reto-com-halteres.png' WHERE imagem_url = '/exercicios/crucifixo-reto-com-halteres.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/crossover.png' WHERE imagem_url = '/exercicios/crossover.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/voador-pec-deck.png' WHERE imagem_url = '/exercicios/voador-pec-deck.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/flexao-de-braco.png' WHERE imagem_url = '/exercicios/flexao-de-braco.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/puxada-alta-pulldown.png' WHERE imagem_url = '/exercicios/puxada-alta-pulldown.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/remada-baixa-no-cabo.png' WHERE imagem_url = '/exercicios/remada-baixa-no-cabo.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/remada-curvada-com-barra.png' WHERE imagem_url = '/exercicios/remada-curvada-com-barra.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/levantamento-terra.png' WHERE imagem_url = '/exercicios/levantamento-terra.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/face-pull.png' WHERE imagem_url = '/exercicios/face-pull.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/cadeira-extensora.png' WHERE imagem_url = '/exercicios/cadeira-extensora.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/cadeira-flexora.png' WHERE imagem_url = '/exercicios/cadeira-flexora.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/mesa-flexora.png' WHERE imagem_url = '/exercicios/mesa-flexora.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/leg-press-45.png' WHERE imagem_url = '/exercicios/leg-press-45.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/agachamento-livre-com-barra.png' WHERE imagem_url = '/exercicios/agachamento-livre-com-barra.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/elevacao-frontal.png' WHERE imagem_url = '/exercicios/elevacao-frontal.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/elevacao-lateral-com-halteres.png' WHERE imagem_url = '/exercicios/elevacao-lateral-com-halteres.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/desenvolvimento-com-halteres.png' WHERE imagem_url = '/exercicios/desenvolvimento-com-halteres.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/crucifixo-invertido-com-halteres.png' WHERE imagem_url = '/exercicios/crucifixo-invertido-com-halteres.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/encolhimento-com-halteres.png' WHERE imagem_url = '/exercicios/encolhimento-com-halteres.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/barra-fixa.png' WHERE imagem_url = '/exercicios/barra-fixa.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/elevacao-pelvica.png' WHERE imagem_url = '/exercicios/elevacao-pelvica.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/gluteo-na-polia-coice.png' WHERE imagem_url = '/exercicios/gluteo-na-polia-coice.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/cadeira-abdutora.png' WHERE imagem_url = '/exercicios/cadeira-abdutora.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/gemeos-sentados.png' WHERE imagem_url = '/exercicios/gemeos-sentados.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/gemeos-em-pe.png' WHERE imagem_url = '/exercicios/gemeos-em-pe.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/agachamento-bulgaro.png' WHERE imagem_url = '/exercicios/agachamento-bulgaro.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/agachamento-hack.png' WHERE imagem_url = '/exercicios/agachamento-hack.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/remada-unilateral-com-halter.png' WHERE imagem_url = '/exercicios/remada-unilateral-com-halter.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/supino-articulado.png' WHERE imagem_url = '/exercicios/supino-articulado.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/extensao-lombar-banco-romano.png' WHERE imagem_url = '/exercicios/extensao-lombar-banco-romano.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/puxada-articulada.png' WHERE imagem_url = '/exercicios/puxada-articulada.jpg';
UPDATE public.exercicios_catalogo SET imagem_url = '/exercicios/pullover-no-cabo.png' WHERE imagem_url = '/exercicios/pullover-no-cabo.jpg';
