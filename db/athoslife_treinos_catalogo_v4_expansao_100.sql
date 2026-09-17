-- Substitui de vez os ícones interinos (v1/v2, nunca aplicada) pelo pacote
-- definitivo do designer (ATHOSlife_icones_FINAL_100.zip, sessão 2026-09-16)
-- e expande o catálogo de 36 pra 100 exercícios.
--
-- A v2 (athoslife_treinos_icones_v2_correcao.sql) nunca rodou no banco —
-- por isso a coluna `icone_url` não existe ainda, o que quebra TODA consulta
-- de `exercicios_catalogo`/`treino_plano` no app (o SELECT pede uma coluna
-- inexistente, o Postgrest devolve erro, e o app engole em silêncio como
-- lista vazia). Essa é a causa real da tela de Treino aparecer sem nenhum
-- exercício, não falta de dado do dia.
--
-- Esta migração:
--   1) adiciona `icone_url` (card fechado / lista de busca);
--   2) corrige os 36 exercícios que já existiam: `icone_url` aponta pro
--      ícone novo (`public/exercicios/icones/<slug>.jpg`, recortado 300x300
--      a partir do pacote FINAL_100, ~18KB cada) e `imagem_url` volta pra
--      foto original de execução (`public/exercicios/<slug>.jpg`,
--      diagrama+início+execução), que a v1 (aplicada) tinha substituído por
--      engano pelo ícone antigo;
--   3) insere os outros 64 exercícios do pacote FINAL_100, cada um já com
--      `icone_url` mas SEM `imagem_url` (execução) nem `como_executar` —
--      de propósito, o usuário vai preparar essas fotos/instruções depois,
--      exercício por exercício. Até lá o card deles funciona normal, só sem
--      a foto grande de execução quando expandido.
--
-- `grupo_muscular`/`ambientes` dos 64 novos foram um chute meu em cima do
-- nome/padrão de equipamento de cada exercício (mesmo raciocínio já usado
-- pros 36 originais em 2026-09-08), não confirmado exercício por exercício.
-- Categoria nova `abdominal` criada pra esse lote (não existia antes) — ver
-- `GrupoMuscular` em `src/domain/entities/treino.ts`.
--
-- Executar uma vez no SQL Editor do Supabase.

ALTER TABLE public.exercicios_catalogo ADD COLUMN IF NOT EXISTS icone_url TEXT;

-- O CHECK de grupo_muscular só previa as 8 categorias antigas — precisa
-- incluir 'abdominal' antes de inserir os novos exercícios de core.
ALTER TABLE public.exercicios_catalogo DROP CONSTRAINT IF EXISTS exercicios_catalogo_grupo_muscular_check;
ALTER TABLE public.exercicios_catalogo ADD CONSTRAINT exercicios_catalogo_grupo_muscular_check
  CHECK (grupo_muscular = ANY (ARRAY['peito','costas','ombro','pernas','gluteos','panturrilha','lombar','bracos','abdominal']));

-- 1) Corrige os 36 exercícios existentes
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/elevacao-pelvica.jpg', imagem_url = '/exercicios/elevacao-pelvica.jpg' WHERE id = 'bacfce4d-4552-478b-b5e7-1b9c8587b3ad';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/gluteo-na-polia-coice.jpg', imagem_url = '/exercicios/gluteo-na-polia-coice.jpg' WHERE id = 'dbaf3046-e3db-4324-870b-055ca047efac';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/cadeira-abdutora.jpg', imagem_url = '/exercicios/cadeira-abdutora.jpg' WHERE id = '2b71d16a-ac37-42a4-82e9-28db491e34c7';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/gemeos-sentados.jpg', imagem_url = '/exercicios/gemeos-sentados.jpg' WHERE id = '99a3e296-db46-4f35-bac6-913b2336ce95';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/gemeos-em-pe.jpg', imagem_url = '/exercicios/gemeos-em-pe.jpg' WHERE id = '3675f04c-c4f0-439e-8d9a-a7f7c32f1837';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/levantamento-terra.jpg', imagem_url = '/exercicios/levantamento-terra.jpg' WHERE id = 'e83131af-7e06-41aa-b501-89a66bea42a3';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/afundo-com-halteres.jpg', imagem_url = '/exercicios/afundo-com-halteres.jpg' WHERE id = 'e22423bf-a357-4178-836b-24ebc6f2478c';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/agachamento-bulgaro.jpg', imagem_url = '/exercicios/agachamento-bulgaro.jpg' WHERE id = '844b6110-a07a-47c2-82dd-7b8b7aabe9be';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/agachamento-hack.jpg', imagem_url = '/exercicios/agachamento-hack.jpg' WHERE id = 'aa7ec230-7181-4acb-b6d7-103db9534c14';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/cadeira-extensora.jpg', imagem_url = '/exercicios/cadeira-extensora.jpg' WHERE id = '97b1a40b-a231-4104-b820-c032eed32b44';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/mesa-flexora.jpg', imagem_url = '/exercicios/mesa-flexora.jpg' WHERE id = '283bd9c7-e1e1-4e18-b5b1-6bec4902e2b6';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/cadeira-flexora.jpg', imagem_url = '/exercicios/cadeira-flexora.jpg' WHERE id = '2f14c090-7baf-471f-9a8f-c4b6aedb3c06';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/remada-baixa-no-cabo.jpg', imagem_url = '/exercicios/remada-baixa-no-cabo.jpg' WHERE id = 'eb16d89e-af46-42da-b4cd-3b7ad582cb64';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/remada-curvada-com-barra.jpg', imagem_url = '/exercicios/remada-curvada-com-barra.jpg' WHERE id = 'bcb5ed8c-d416-4279-8ecd-4b7f869ed689';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/remada-unilateral-com-halter.jpg', imagem_url = '/exercicios/remada-unilateral-com-halter.jpg' WHERE id = 'c19b1047-6ed2-41b7-9729-1a0548eec071';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/flexao-de-braco.jpg', imagem_url = '/exercicios/flexao-de-braco.jpg' WHERE id = '3888683c-0da0-4ca9-892e-ebc39d3881f6';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/supino-articulado.jpg', imagem_url = '/exercicios/supino-articulado.jpg' WHERE id = 'f6582476-a45c-44ba-805e-7b05150a5bff';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/puxada-alta-pulldown.jpg', imagem_url = '/exercicios/puxada-alta-pulldown.jpg' WHERE id = '93d46f26-10ff-4947-b865-434ef5c59976';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/crucifixo-reto-com-halteres.jpg', imagem_url = '/exercicios/crucifixo-reto-com-halteres.jpg' WHERE id = '383ff5dd-071b-40c5-a6ca-592d976f6b32';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/crossover.jpg', imagem_url = '/exercicios/crossover.jpg' WHERE id = '94ad2444-3de2-45e4-b551-ce87b4ba40ae';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/voador-pec-deck.jpg', imagem_url = '/exercicios/voador-pec-deck.jpg' WHERE id = '8223bf14-1083-49af-aa59-059a311799df';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/supino-reto-com-barra.jpg', imagem_url = '/exercicios/supino-reto-com-barra.jpg' WHERE id = '597b969d-d01a-4464-b23b-eb3bc97477c0';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/supino-inclinado-com-halteres.jpg', imagem_url = '/exercicios/supino-inclinado-com-halteres.jpg' WHERE id = '554a1456-ed91-4f58-99d9-92c6d342968f';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/supino-declinado.jpg', imagem_url = '/exercicios/supino-declinado.jpg' WHERE id = 'ce0062b5-3b6a-4ae0-b520-d692765dccbc';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/crucifixo-invertido-com-halteres.jpg', imagem_url = '/exercicios/crucifixo-invertido-com-halteres.jpg' WHERE id = 'bcc739cf-1d8b-4366-a963-83314d4e9733';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/face-pull.jpg', imagem_url = '/exercicios/face-pull.jpg' WHERE id = 'db1a13f9-5569-46c4-b00e-158290933160';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/encolhimento-com-halteres.jpg', imagem_url = '/exercicios/encolhimento-com-halteres.jpg' WHERE id = 'a15125ea-856b-441d-81c4-e18bfb46591e';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/desenvolvimento-com-halteres.jpg', imagem_url = '/exercicios/desenvolvimento-com-halteres.jpg' WHERE id = 'd1e2c51b-d2e6-40b1-bedd-215080767392';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/elevacao-lateral-com-halteres.jpg', imagem_url = '/exercicios/elevacao-lateral-com-halteres.jpg' WHERE id = 'f55d01e1-9fe0-48b5-a720-25479402c4e0';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/elevacao-frontal.jpg', imagem_url = '/exercicios/elevacao-frontal.jpg' WHERE id = '4506bd70-f48c-4aec-af7d-4215d3ab6490';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/extensao-lombar-banco-romano.jpg', imagem_url = '/exercicios/extensao-lombar-banco-romano.jpg' WHERE id = 'de80981c-55a0-4177-9a0b-d0cceff1c754';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/agachamento-livre-com-barra.jpg', imagem_url = '/exercicios/agachamento-livre-com-barra.jpg' WHERE id = 'a6a37e75-11be-46ce-b68f-362d9a42087b';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/leg-press-45.jpg', imagem_url = '/exercicios/leg-press-45.jpg' WHERE id = 'd9d69cb5-e036-4b0b-bf03-ffcd06e3551c';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/barra-fixa.jpg', imagem_url = '/exercicios/barra-fixa.jpg' WHERE id = '672e0908-b28b-4f56-b0f2-d50097795628';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/puxada-articulada.jpg', imagem_url = '/exercicios/puxada-articulada.jpg' WHERE id = '689c4ffb-aaef-42be-b735-e7dfd1e7b799';
UPDATE public.exercicios_catalogo SET icone_url = '/exercicios/icones/pullover-no-cabo.jpg', imagem_url = '/exercicios/pullover-no-cabo.jpg' WHERE id = '017ff04b-2bcd-4655-a3e1-e6e40462b988';

-- 2) Insere os outros 64 exercícios do pacote FINAL_100 (sem imagem_url/como_executar ainda)
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Stiff', 'pernas', ARRAY['academia'], '/exercicios/icones/stiff.jpg', 37);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Rosca Direta com Barra', 'bracos', ARRAY['academia'], '/exercicios/icones/rosca-direta-com-barra.jpg', 38);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Rosca Alternada com Halteres', 'bracos', ARRAY['academia','casa'], '/exercicios/icones/rosca-alternada-com-halteres.jpg', 39);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Rosca Martelo', 'bracos', ARRAY['academia','casa'], '/exercicios/icones/rosca-martelo.jpg', 40);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Rosca Scott', 'bracos', ARRAY['academia'], '/exercicios/icones/rosca-scott.jpg', 41);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Tríceps na Polia', 'bracos', ARRAY['academia'], '/exercicios/icones/triceps-na-polia.jpg', 42);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Tríceps Testa', 'bracos', ARRAY['academia'], '/exercicios/icones/triceps-testa.jpg', 43);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Tríceps Francês', 'bracos', ARRAY['academia','casa'], '/exercicios/icones/triceps-frances.jpg', 44);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Mergulho nas Paralelas', 'bracos', ARRAY['academia'], '/exercicios/icones/mergulho-nas-paralelas.jpg', 45);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Abdominal Supra (Crunch)', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/abdominal-supra-crunch.jpg', 46);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Abdominal Infra (Elevação de Pernas)', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/abdominal-infra-elevacao-de-pernas.jpg', 47);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Prancha Frontal', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/prancha-frontal.jpg', 48);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Abdominal na Polia', 'abdominal', ARRAY['academia'], '/exercicios/icones/abdominal-na-polia.jpg', 49);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Abdominal Oblíquo', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/abdominal-obliquo.jpg', 50);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Supino Pegada Fechada', 'peito', ARRAY['academia'], '/exercicios/icones/supino-pegada-fechada.jpg', 51);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Supino Máquina Convergente', 'peito', ARRAY['academia'], '/exercicios/icones/supino-maquina-convergente.jpg', 52);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Flexão Inclinada', 'peito', ARRAY['academia','casa'], '/exercicios/icones/flexao-inclinada.jpg', 53);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Flexão Declinada', 'peito', ARRAY['academia','casa'], '/exercicios/icones/flexao-declinada.jpg', 54);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Flexão Diamante', 'peito', ARRAY['academia','casa'], '/exercicios/icones/flexao-diamante.jpg', 55);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Remada Cavalinho (T-bar)', 'costas', ARRAY['academia'], '/exercicios/icones/remada-cavalinho-tbar.jpg', 56);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Remada Máquina Articulada', 'costas', ARRAY['academia'], '/exercicios/icones/remada-maquina-articulada.jpg', 57);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Remada Alta no Cabo', 'costas', ARRAY['academia'], '/exercicios/icones/remada-alta-no-cabo.jpg', 58);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Pulldown Pegada Neutra', 'costas', ARRAY['academia'], '/exercicios/icones/pulldown-pegada-neutra.jpg', 59);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Pulldown Unilateral', 'costas', ARRAY['academia'], '/exercicios/icones/pulldown-unilateral.jpg', 60);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Barra Fixa Supinada (Chin-up)', 'costas', ARRAY['academia','casa'], '/exercicios/icones/barra-fixa-supinada-chinup.jpg', 61);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Barra Fixa Pegada Neutra', 'costas', ARRAY['academia','casa'], '/exercicios/icones/barra-fixa-pegada-neutra.jpg', 62);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Pullover com Halter', 'costas', ARRAY['academia','casa'], '/exercicios/icones/pullover-com-halter.jpg', 63);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Bom Dia com Barra', 'lombar', ARRAY['academia'], '/exercicios/icones/bom-dia-com-barra.jpg', 64);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Agachamento Frontal', 'pernas', ARRAY['academia'], '/exercicios/icones/agachamento-frontal.jpg', 65);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Agachamento Goblet', 'pernas', ARRAY['academia','casa'], '/exercicios/icones/agachamento-goblet.jpg', 66);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Agachamento Sumô com Halter', 'pernas', ARRAY['academia','casa'], '/exercicios/icones/agachamento-sumo-com-halter.jpg', 67);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Passada Reversa', 'pernas', ARRAY['academia','casa'], '/exercicios/icones/passada-reversa.jpg', 68);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Step-up no Banco', 'pernas', ARRAY['academia','casa'], '/exercicios/icones/stepup-no-banco.jpg', 69);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Sissy Squat', 'pernas', ARRAY['academia','casa'], '/exercicios/icones/sissy-squat.jpg', 70);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Cadeira Adutora', 'pernas', ARRAY['academia'], '/exercicios/icones/cadeira-adutora.jpg', 71);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Glúteo na Máquina', 'gluteos', ARRAY['academia'], '/exercicios/icones/gluteo-maquina.jpg', 72);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Flexão Nórdica', 'pernas', ARRAY['academia','casa'], '/exercicios/icones/flexao-nordica.jpg', 73);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Flexão com Joelhos na Bola Suíça', 'peito', ARRAY['academia','casa'], '/exercicios/icones/flexao-joelhos-bola-suica.jpg', 74);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Elevação de Panturrilha no Leg Press', 'panturrilha', ARRAY['academia'], '/exercicios/icones/elevacao-panturrilha-leg-press.jpg', 75);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Desenvolvimento na Máquina', 'ombro', ARRAY['academia'], '/exercicios/icones/desenvolvimento-na-maquina.jpg', 76);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Arnold Press', 'ombro', ARRAY['academia','casa'], '/exercicios/icones/arnold-press.jpg', 77);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Elevação Lateral na Máquina', 'ombro', ARRAY['academia'], '/exercicios/icones/elevacao-lateral-na-maquina.jpg', 78);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Elevação Lateral no Cabo', 'ombro', ARRAY['academia'], '/exercicios/icones/elevacao-lateral-no-cabo.jpg', 79);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Elevação Posterior na Máquina', 'ombro', ARRAY['academia'], '/exercicios/icones/elevacao-posterior-na-maquina.jpg', 80);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Rosca Concentrada', 'bracos', ARRAY['academia','casa'], '/exercicios/icones/rosca-concentrada.jpg', 81);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Rosca no Cabo', 'bracos', ARRAY['academia'], '/exercicios/icones/rosca-no-cabo.jpg', 82);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Rosca Inversa', 'bracos', ARRAY['academia','casa'], '/exercicios/icones/rosca-inversa.jpg', 83);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Tríceps Corda', 'bracos', ARRAY['academia'], '/exercicios/icones/triceps-corda.jpg', 84);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Tríceps Unilateral no Cabo', 'bracos', ARRAY['academia'], '/exercicios/icones/triceps-unilateral-no-cabo.jpg', 85);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Tríceps Coice com Halter', 'bracos', ARRAY['academia','casa'], '/exercicios/icones/triceps-coice-com-halter.jpg', 86);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Tríceps no Banco', 'bracos', ARRAY['academia','casa'], '/exercicios/icones/triceps-banco.jpg', 87);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Abdominal Bicicleta', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/abdominal-bicicleta.jpg', 88);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Abdominal Canivete', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/abdominal-canivete.jpg', 89);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Abdominal na Máquina', 'abdominal', ARRAY['academia'], '/exercicios/icones/abdominal-na-maquina.jpg', 90);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Dead Bug', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/dead-bug.jpg', 91);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Russian Twist', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/russian-twist.jpg', 92);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Prancha Lateral', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/prancha-lateral.jpg', 93);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Prancha com Toque no Ombro', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/prancha-toque-ombro.jpg', 94);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Mountain Climber', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/mountain-climber.jpg', 95);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Burpee', 'abdominal', ARRAY['academia','casa'], '/exercicios/icones/burpee.jpg', 96);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Extensão de Quadril no Cabo', 'gluteos', ARRAY['academia'], '/exercicios/icones/extensao-quadril-cabo.jpg', 97);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Abdução de Quadril no Cabo', 'gluteos', ARRAY['academia'], '/exercicios/icones/abducao-quadril-cabo.jpg', 98);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Adução de Quadril no Cabo', 'pernas', ARRAY['academia'], '/exercicios/icones/aducao-quadril-cabo.jpg', 99);
INSERT INTO public.exercicios_catalogo (nome, grupo_muscular, ambientes, icone_url, ordem) VALUES ('Farmer''s Walk', 'costas', ARRAY['academia','casa'], '/exercicios/icones/farmers-walk.jpg', 100);
