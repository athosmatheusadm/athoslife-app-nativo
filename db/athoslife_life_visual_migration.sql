-- ATHOSlife — personalizar o Life (dono, 18/11/2026): a pessoa escolhe a
-- cor do Life nas Configurações. Verde (null), amarelo e rosa clarinho pra
-- todo mundo; branco pérola e a auréola são do Fundador ("Apoiador Anjo").

alter table public.profiles
  add column if not exists life_cor text,
  add column if not exists life_acessorio text;

alter table public.profiles drop constraint if exists profiles_life_cor_check;
alter table public.profiles add constraint profiles_life_cor_check
  check (life_cor is null or life_cor in ('amarelo', 'rosa', 'perola'));
alter table public.profiles drop constraint if exists profiles_life_acessorio_check;
alter table public.profiles add constraint profiles_life_acessorio_check
  check (life_acessorio is null or life_acessorio in ('aureola'));

-- profiles usa permissão por coluna: libera só estas duas.
grant update (life_cor, life_acessorio) on public.profiles to authenticated;

-- Pérola e auréola: só quem está em fundadores.
create or replace function public.perfil_life_visual_do_fundador()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if (new.life_cor = 'perola' or new.life_acessorio = 'aureola')
     and not exists (select 1 from public.fundadores f where f.user_id = new.id) then
    raise exception 'so_fundador' using errcode = 'P0001';
  end if;
  return new;
end $function$;

drop trigger if exists perfil_life_visual_do_fundador on public.profiles;
create trigger perfil_life_visual_do_fundador
  before update of life_cor, life_acessorio on public.profiles
  for each row execute function public.perfil_life_visual_do_fundador();
