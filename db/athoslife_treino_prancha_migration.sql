-- ATHOSlife — pranchas instrucionais do Treino (2026-09-24)
--
-- Coluna nova pra guardar a "prancha" (painel único: título+músculo /
-- início / execução, com o mascote ATHOS) de cada exercício. Separada de
-- `imagem_url` (foto de execução solta, ainda existe pros 36 exercícios
-- que tinham foto real) e `icone_url` (miniatura do card fechado) — a
-- prancha é o novo conteúdo mostrado na tela expandida do exercício.

alter table public.exercicios_catalogo
  add column if not exists prancha_url text;

comment on column public.exercicios_catalogo.prancha_url is
  'Painel único (título+músculo/início/execução) com o mascote ATHOS — mostrado na tela expandida do exercício. Ver public/exercicios/pranchas/.';
