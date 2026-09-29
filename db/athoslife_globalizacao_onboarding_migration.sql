-- ATHOSlife — globalização + onboarding real (2026-09-28)
--
-- 1. profiles ganha idioma, país, fuso e sistema de unidades, e guarda as
--    respostas do onboarding que não têm coluna própria (rotina, sono,
--    preferências alimentares, obstáculos, suplementos, estresse...).
-- 2. "Hoje" deixa de ser Brasília pra todo mundo: cada usuário usa o fuso
--    dele (profiles.fuso). Quem não tem fuso salvo continua em
--    America/Sao_Paulo — nada muda pra base atual.
-- 3. O teto global de tokens da IA segue no dia de Brasília (é a conta da
--    empresa, não do usuário).
--
-- Idempotente: pode rodar de novo sem quebrar.

-- ----------------------------------------------------------------
-- 1. Colunas
-- ----------------------------------------------------------------
alter table public.profiles
  add column if not exists idioma text not null default 'pt-BR',
  add column if not exists pais text,
  add column if not exists fuso text not null default 'America/Sao_Paulo',
  add column if not exists unidades text not null default 'metrico',
  add column if not exists onboarding_respostas jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_unidades_check') then
    alter table public.profiles
      add constraint profiles_unidades_check check (unidades in ('metrico', 'imperial'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_idioma_check') then
    alter table public.profiles
      add constraint profiles_idioma_check check (idioma ~ '^[a-z]{2}(-[A-Z]{2})?$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_pais_check') then
    alter table public.profiles
      add constraint profiles_pais_check check (pais is null or pais ~ '^[A-Z]{2}$');
  end if;
end $$;

-- ----------------------------------------------------------------
-- 2. Fuso do usuário (com rede de segurança pra fuso inválido)
-- ----------------------------------------------------------------
create or replace function public.fuso_do_usuario(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_fuso text;
begin
  select fuso into v_fuso from public.profiles where id = p_user_id;
  v_fuso := coalesce(nullif(v_fuso, ''), 'America/Sao_Paulo');
  perform now() at time zone v_fuso;  -- lança erro se o nome não existir
  return v_fuso;
exception when others then
  return 'America/Sao_Paulo';
end;
$$;

create or replace function public.hoje_do_usuario(p_user_id uuid)
returns date
language sql
stable
security definer
set search_path to 'public'
as $$
  select (now() at time zone public.fuso_do_usuario(p_user_id))::date;
$$;

revoke all on function public.fuso_do_usuario(uuid) from public, anon;
revoke all on function public.hoje_do_usuario(uuid) from public, anon;
grant execute on function public.fuso_do_usuario(uuid) to authenticated, service_role;
grant execute on function public.hoje_do_usuario(uuid) to authenticated, service_role;

-- ----------------------------------------------------------------
-- 3. Funções que usavam o dia de Brasília fixo
-- ----------------------------------------------------------------
create or replace function public.consumir_cota_ia(p_user_id uuid, p_tipo text, p_teto_global_tokens bigint default null::bigint)
returns table(permitido boolean, motivo text, usados_hoje integer, limite_hoje integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_dia    date := public.hoje_do_usuario(p_user_id);
  -- Teto global = gasto da empresa, contado no dia de Brasília.
  v_dia_br date := (now() at time zone 'America/Sao_Paulo')::date;
  v_limite integer;
  v_usados integer;
  v_rajada integer;
  v_gasto  bigint;
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    return query select false, 'sem_perfil', 0, 0; return;
  end if;

  v_limite := public.limite_ia(p_tipo, public.is_premium_like(p_user_id));
  if v_limite <= 0 then
    return query select false, 'premium_required', 0, 0; return;
  end if;

  if p_teto_global_tokens is not null then
    select coalesce(sum(tokens_usados), 0) into v_gasto
      from public.ai_audit_logs
     where data >= (v_dia_br::timestamp at time zone 'America/Sao_Paulo');
    if v_gasto >= p_teto_global_tokens then
      return query select false, 'teto_global', 0, v_limite; return;
    end if;
  end if;

  insert into public.ia_rajada as r (user_id, janela_inicio, qtd)
  values (p_user_id, now(), 1)
  on conflict (user_id) do update set
    qtd           = case when r.janela_inicio < now() - interval '1 minute' then 1 else r.qtd + 1 end,
    janela_inicio = case when r.janela_inicio < now() - interval '1 minute' then now() else r.janela_inicio end
  returning r.qtd into v_rajada;

  if v_rajada > 6 then
    return query select false, 'rajada', 0, v_limite; return;
  end if;

  insert into public.ia_uso_diario as u (user_id, dia, tipo, usados)
  values (p_user_id, v_dia, p_tipo, 1)
  on conflict (user_id, dia, tipo) do update set usados = u.usados + 1
    where u.usados < v_limite
  returning u.usados into v_usados;

  if v_usados is null then
    return query select false, 'limite_diario', v_limite, v_limite; return;
  end if;

  return query select true, 'ok', v_usados, v_limite;
end;
$function$;

create or replace function public.cota_ia_status(p_tipo text)
returns table(usados_hoje integer, limite_hoje integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    coalesce((select usados from public.ia_uso_diario
               where user_id = auth.uid()
                 and dia = public.hoje_do_usuario(auth.uid())
                 and tipo = p_tipo), 0),
    public.limite_ia(p_tipo, public.is_premium_like(auth.uid()));
$function$;

create or replace function public.devolver_cota_ia(p_user_id uuid, p_tipo text)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.ia_uso_diario
     set usados = greatest(usados - 1, 0)
   where user_id = p_user_id
     and dia = public.hoje_do_usuario(p_user_id)
     and tipo = p_tipo;
$function$;

create or replace function public.handle_recaida()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_fuso text := public.fuso_do_usuario(new.user_id);
  v_hoje date := (now() at time zone v_fuso)::date;
  v_tipo_construir boolean;
  v_efetivo integer;
begin
  select categoria = 'leitura' into v_tipo_construir
  from public.vicios_user where id = new.vicio_id;

  if v_tipo_construir then
    select case
      when ultimo_checkin is null then 0
      when ultimo_checkin >= (v_hoje - 1) then streak_atual
      else 0
    end into v_efetivo
    from public.vicios_user where id = new.vicio_id;
  else
    select (v_hoje - greatest(
              (criado_em at time zone v_fuso)::date,
              coalesce((ultima_recaida at time zone v_fuso)::date,
                       (criado_em at time zone v_fuso)::date)))
    into v_efetivo
    from public.vicios_user where id = new.vicio_id;
  end if;

  update public.vicios_user
  set
    ultima_recaida = now(),
    total_recaidas = total_recaidas + 1,
    melhor_streak   = greatest(melhor_streak, coalesce(v_efetivo, 0)),
    streak_atual    = 0,
    ultimo_checkin  = null
  where id = new.vicio_id;

  return new;
end;
$function$;

create or replace function public.registrar_checkin_habito(p_habito_id uuid)
returns table(streak_atual integer, melhor_streak integer, ultimo_checkin date)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_hoje date := public.hoje_do_usuario(auth.uid());
  v_ultimo date;
  v_streak integer;
  v_melhor integer;
  v_novo integer;
begin
  select vu.ultimo_checkin, vu.streak_atual, vu.melhor_streak
  into v_ultimo, v_streak, v_melhor
  from public.vicios_user vu
  where vu.id = p_habito_id and vu.user_id = v_user_id
  for update;

  if not found then
    raise exception 'habito_nao_encontrado_ou_nao_pertence_ao_usuario';
  end if;

  if v_ultimo = v_hoje then
    v_novo := v_streak;
  elsif v_ultimo = v_hoje - 1 then
    v_novo := v_streak + 1;
  else
    v_novo := 1;
  end if;

  update public.vicios_user vu
  set streak_atual   = v_novo,
      melhor_streak  = greatest(vu.melhor_streak, v_novo),
      ultimo_checkin = v_hoje
  where vu.id = p_habito_id;

  return query select v_novo, greatest(v_melhor, v_novo), v_hoje;
end;
$function$;
