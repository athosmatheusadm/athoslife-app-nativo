-- Hábitos com valor (09/11/2026) — vitórias, gatilho com um toque, padrão aprendido.
--
-- 1. habitos_vontades: cada vontade VENCIDA ("esperei", "já passou", "fui na
--    alternativa"). Antes só o tropeço ficava salvo: o app só lembrava quando a
--    pessoa falhava. O tropeço segue em `recaidas` (com gatilho agora).
-- 2. vicios_user.gatilhos e horario_risco passam a ser aprendidos sozinhos
--    (últimos 60 dias de vontades + tropeços). Antes ficavam sempre vazios.
-- 3. Cota 'alternativas' (trocas sob medida pelo Life): grátis 3/dia, pago 20/dia.
--
-- Rodar ANTES de publicar a ai-proxy e o app desta versão.

create table if not exists public.habitos_vontades (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  vicio_id    uuid not null references public.vicios_user(id) on delete cascade,
  caminho     text not null check (caminho in ('esperar', 'alternativa', 'passou')),
  gatilho     text check (char_length(gatilho) <= 40),
  alternativa text check (char_length(alternativa) <= 160),
  data        date,
  horario     time,
  created_at  timestamptz not null default now()
);
create index if not exists habitos_vontades_user_idx on public.habitos_vontades (user_id, vicio_id, created_at desc);
create index if not exists recaidas_user_vicio_idx on public.recaidas (user_id, vicio_id, created_at desc);

alter table public.habitos_vontades enable row level security;
drop policy if exists habitos_vontades_select on public.habitos_vontades;
drop policy if exists habitos_vontades_insert on public.habitos_vontades;
drop policy if exists habitos_vontades_delete on public.habitos_vontades;
create policy habitos_vontades_select on public.habitos_vontades for select using ((select auth.uid()) = user_id);
create policy habitos_vontades_insert on public.habitos_vontades for insert with check (
  (select auth.uid()) = user_id
  and exists (select 1 from public.vicios_user v where v.id = vicio_id and v.user_id = (select auth.uid()))
);
create policy habitos_vontades_delete on public.habitos_vontades for delete using ((select auth.uid()) = user_id);

-- Dia e hora no fuso da pessoa (igual recaidas_horario_local).
create or replace function public.habitos_vontades_local()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_local timestamp := coalesce(new.created_at, now()) at time zone public.fuso_do_usuario(new.user_id);
begin
  if new.data is null then new.data := v_local::date; end if;
  if new.horario is null then new.horario := v_local::time; end if;
  return new;
end $$;
drop trigger if exists habitos_vontades_local on public.habitos_vontades;
create trigger habitos_vontades_local before insert on public.habitos_vontades
  for each row execute function public.habitos_vontades_local();

-- Padrão do hábito: gatilhos mais frequentes e a hora em que a vontade mais
-- bate (precisa de 3+ registros na mesma hora pra contar).
create or replace function public.aprender_padrao_habito(p_vicio_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_gatilhos text[];
  v_hora     int;
begin
  with ev as (
    select gatilho, horario from public.recaidas
     where vicio_id = p_vicio_id and created_at > now() - interval '60 days'
    union all
    select gatilho, horario from public.habitos_vontades
     where vicio_id = p_vicio_id and created_at > now() - interval '60 days'
  )
  select
    (select array_agg(g order by n desc, g) from (
       select lower(trim(gatilho)) g, count(*) n from ev
        where coalesce(trim(gatilho), '') <> '' group by 1 order by n desc, g limit 4) x),
    (select h from (
       select extract(hour from horario)::int h, count(*) n from ev
        where horario is not null group by 1 having count(*) >= 3 order by n desc, h desc limit 1) y)
  into v_gatilhos, v_hora;

  update public.vicios_user
     set gatilhos = v_gatilhos,
         horario_risco = case when v_hora is null then null else make_time(v_hora, 0, 0) end
   where id = p_vicio_id;
end $$;
revoke all on function public.aprender_padrao_habito(uuid) from public, anon, authenticated;

create or replace function public.habito_aprender_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.aprender_padrao_habito(new.vicio_id);
  return new;
end $$;
drop trigger if exists recaidas_aprender on public.recaidas;
create trigger recaidas_aprender after insert on public.recaidas
  for each row execute function public.habito_aprender_trigger();
drop trigger if exists habitos_vontades_aprender on public.habitos_vontades;
create trigger habitos_vontades_aprender after insert on public.habitos_vontades
  for each row execute function public.habito_aprender_trigger();

-- Cota das trocas sob medida.
create or replace function public.limite_ia(p_tipo text, p_pago boolean)
returns integer language sql immutable set search_path = public as $$
  select case p_tipo
    when 'chat'         then case when p_pago then 80 else 5 end
    when 'vision'       then case when p_pago then 5  else 0 end
    when 'recipe'       then case when p_pago then 10 else 1 end
    when 'life'         then case when p_pago then 6  else 0 end
    when 'estimar'      then case when p_pago then 20 else 1 end
    when 'alternativas' then case when p_pago then 20 else 3 end
    else 0
  end;
$$;

alter table public.ai_audit_logs drop constraint if exists ai_audit_logs_tipo_chamada_check;
alter table public.ai_audit_logs add constraint ai_audit_logs_tipo_chamada_check
  check (tipo_chamada in ('vision', 'chat', 'barcode', 'acao', 'estimar', 'recipe', 'checkin', 'memoria', 'alternativas'));

alter table public.ia_uso_diario drop constraint if exists ia_uso_diario_tipo_check;
alter table public.ia_uso_diario add constraint ia_uso_diario_tipo_check
  check (tipo in ('chat', 'vision', 'recipe', 'life', 'estimar', 'alternativas'));
