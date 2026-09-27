-- ATHOSlife — hábitos com data de Brasília (2026-09-27)
--
-- O banco roda em UTC: `current_date` e `timestamptz::date` viram o dia
-- seguinte das 21h à meia-noite no Brasil. O app passou a usar a data do
-- aparelho; estas duas funções eram as últimas no banco com data UTC.
-- Sem begin/commit (o SQL Editor já roda como bloco único).

create or replace function public.registrar_checkin_habito(p_habito_id uuid)
returns table(streak_atual integer, melhor_streak integer, ultimo_checkin date)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
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

create or replace function public.handle_recaida()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
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
              (criado_em at time zone 'America/Sao_Paulo')::date,
              coalesce((ultima_recaida at time zone 'America/Sao_Paulo')::date,
                       (criado_em at time zone 'America/Sao_Paulo')::date)))
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
