-- ATHOSlife — alimentos que o Life estimou no chat (2026-11-22)
--
-- O dono: quando a base não tem o alimento (geleia de goiaba, capuccino
-- gelado), o Life estima e o item fica guardado. Na próxima vez, para
-- qualquer pessoa, ele já está na base. A pessoa não vê que foi salvo.
--
-- Quem grava é só a ai-proxy (service role). O app continua só lendo
-- (a política "leitura publica" não muda).
-- `origem = 'life'` separa esses itens da base conferida, para revisar:
--   select nome, porcao_g, calorias, proteina, carboidrato, gordura, aliases, criado_em
--   from alimentos where origem = 'life' order by criado_em desc;
-- Entram com scanner = false: o scanner de foto só usa a base conferida.
--
-- Idempotente. TEM QUE estar aplicada antes do deploy da ai-proxy que guarda
-- (se faltar, a ai-proxy só não guarda: o registro segue funcionando).

alter table public.alimentos
  add column if not exists origem text not null default 'base',
  add column if not exists criado_em timestamptz default now();

do $$ begin
  alter table public.alimentos add constraint alimentos_origem_check check (origem in ('base', 'life'));
exception when duplicate_object then null; end $$;

create index if not exists alimentos_origem_life_idx on public.alimentos (criado_em desc) where origem = 'life';
