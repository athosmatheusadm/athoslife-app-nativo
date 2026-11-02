-- Streak da Home (dias seguidos abrindo o app) — 2026-10-30
--
-- O app sempre fez UPDATE profiles SET last_app_open = now() esperando o
-- trigger handle_streak_on_open() (docs/ATHOSlife_Regras_de_Negocio.md §4),
-- mas nem o trigger nem as colunas streak_atual/maior_streak existiam no
-- banco: o card ficava em 0 para sempre.
--
-- Regras: 1x por dia no fuso do usuário (profiles.fuso); ontem -> +1;
-- buraco -> recomeça em 1; recorde nunca diminui. Quem decide é o servidor
-- (now(), não o horário do aparelho). As colunas novas NÃO recebem GRANT
-- UPDATE para authenticated: o app só lê.

alter table public.profiles
  add column if not exists streak_atual integer not null default 0,
  add column if not exists maior_streak integer not null default 0,
  add column if not exists streak_dia date;

create or replace function public.handle_streak_on_open()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  hoje date := (now() at time zone coalesce(nullif(new.fuso, ''), 'America/Sao_Paulo'))::date;
begin
  if old.streak_dia is not distinct from hoje then
    return new;
  end if;
  if old.streak_dia = hoje - 1 then
    new.streak_atual := coalesce(old.streak_atual, 0) + 1;
  else
    new.streak_atual := 1;
  end if;
  new.streak_dia := hoje;
  new.maior_streak := greatest(coalesce(old.maior_streak, 0), new.streak_atual);
  return new;
end;
$$;

drop trigger if exists streak_na_abertura on public.profiles;
create trigger streak_na_abertura
  before update of last_app_open on public.profiles
  for each row
  when (new.last_app_open is distinct from old.last_app_open)
  execute function public.handle_streak_on_open();

-- Ponto de partida justo: dias seguidos com algum registro no app (comida,
-- água, peso, check-in, treino) terminando hoje ou ontem. Ignora os dados
-- de teste do gráfico (created_at em 2000-01-01).
with dias as (
  select r.user_id, (r.created_at at time zone coalesce(nullif(p.fuso, ''), 'America/Sao_Paulo'))::date d
  from (
    select user_id, created_at from public.itens_refeicao
    union all select user_id, created_at from public.registros_agua
    union all select user_id, created_at from public.registros_peso
    union all select user_id, created_at from public.checkins_emocionais
    union all select user_id, created_at from public.treinos_historico
  ) r
  join public.profiles p on p.id = r.user_id
  where r.created_at > '2001-01-01'
  group by 1, 2
),
ilhas as (
  select user_id, d, d - (row_number() over (partition by user_id order by d))::int grupo
  from dias
),
blocos as (
  select user_id, max(d) fim, count(*)::int n from ilhas group by user_id, grupo
),
ultimo as (
  select distinct on (b.user_id) b.user_id, b.fim, b.n
  from blocos b order by b.user_id, b.fim desc
)
update public.profiles p
set streak_atual = u.n,
    maior_streak = greatest(p.maior_streak, (select max(n) from blocos b where b.user_id = p.id)),
    streak_dia = u.fim
from ultimo u
where u.user_id = p.id
  and u.fim >= (now() at time zone coalesce(nullif(p.fuso, ''), 'America/Sao_Paulo'))::date - 1;
