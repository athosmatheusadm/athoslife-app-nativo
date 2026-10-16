-- Opção B: escolhas persistidas, sem alterar nome ou categoria.
begin;
alter table public.refeicoes_extra add column if not exists icone text not null default 'tigela';
alter table public.vicios_user add column if not exists icone text;
commit;
