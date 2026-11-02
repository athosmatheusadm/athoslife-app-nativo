-- =====================================================================
-- ATHOSlife — app offline + achados do relatório de teste do APK (24/10/2026)
--
-- 1. registrar_checkin_habito(p_habito_id, p_dia): "Fiz hoje" marcado sem
--    internet sobe depois e conta pro dia em que foi feito (até 7 dias
--    atrás; nunca no futuro). Sem p_dia, igual a antes (hoje do usuário).
--
-- 2. check_access_status(): rodava dois UPDATE na tabela profiles INTEIRA
--    a cada abertura de qualquer usuário (relatório, item 10). Agora só
--    mexe na linha de quem chama. O acesso continua decidido pela data em
--    is_premium_like(), então um plano vencido de quem não abre o app não
--    dá acesso a nada.
--
-- 3. is_premium_like / fuso_do_usuario respondiam sobre qualquer id. Agora,
--    chamadas por um usuário logado, só respondem sobre ele mesmo (ou pra
--    admin). Chamadas internas (service role, auth.uid() nulo) seguem iguais.
--
-- 4. Limpeza apontada pelo Supabase / relatório: TRUNCATE em profiles pra
--    authenticated, search_path de categoria_construir.
-- =====================================================================

-- 1 -------------------------------------------------------------------
drop function if exists public.registrar_checkin_habito(uuid);

create or replace function public.registrar_checkin_habito(p_habito_id uuid, p_dia date default null)
returns table(streak_atual integer, melhor_streak integer, ultimo_checkin date)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_hoje date := public.hoje_do_usuario(auth.uid());
  v_dia date;
  v_ultimo date;
  v_streak integer;
  v_melhor integer;
  v_novo integer;
begin
  -- Dia do toque (feito offline): só aceita de 7 dias atrás até hoje.
  v_dia := coalesce(p_dia, v_hoje);
  if v_dia > v_hoje or v_dia < v_hoje - 7 then
    v_dia := v_hoje;
  end if;

  select vu.ultimo_checkin, vu.streak_atual, vu.melhor_streak
  into v_ultimo, v_streak, v_melhor
  from public.vicios_user vu
  where vu.id = p_habito_id and vu.user_id = v_user_id
  for update;

  if not found then
    raise exception 'habito_nao_encontrado_ou_nao_pertence_ao_usuario';
  end if;

  if v_ultimo is not null and v_ultimo >= v_dia then
    -- Já contado (reenvio) ou já existe check-in mais novo: nada muda.
    return query select v_streak, v_melhor, v_ultimo;
    return;
  elsif v_ultimo is not null and public.dias_ativos_entre(v_user_id, v_ultimo, v_dia) = 0 then
    -- dia seguinte, ou só dias pausados no meio: a sequência segue
    v_novo := v_streak + 1;
  else
    v_novo := 1;
  end if;

  update public.vicios_user vu
  set streak_atual   = v_novo,
      melhor_streak  = greatest(vu.melhor_streak, v_novo),
      ultimo_checkin = v_dia
  where vu.id = p_habito_id;

  return query select v_novo, greatest(v_melhor, v_novo), v_dia;
end;
$function$;

revoke execute on function public.registrar_checkin_habito(uuid, date) from public, anon;
grant execute on function public.registrar_checkin_habito(uuid, date) to authenticated, service_role;

-- 2 -------------------------------------------------------------------
create or replace function public.check_access_status()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return;
  end if;

  -- Trial expirado → free
  update public.profiles
  set plano = 'free'
  where id = v_uid
    and plano = 'trial'
    and trial_expira is not null
    and trial_expira < now();

  -- Premium expirado → free
  update public.profiles
  set plano = 'free',
      assinatura_ativa = false
  where id = v_uid
    and plano = 'premium'
    and assinatura_ativa = true
    and assinatura_expira is not null
    and assinatura_expira < now();

  -- fundador e vitalicio: NUNCA expiram — nenhuma ação necessária
  -- vip: controlado pelos vip_links — nenhuma ação necessária aqui
end;
$function$;

-- 3 -------------------------------------------------------------------
create or replace function public.is_premium_like(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and (auth.uid() is null or p_user_id = auth.uid() or public.is_admin())
      and (
        plano in ('vip', 'fundador', 'vitalicio')
        or (plano = 'premium' and (assinatura_expira is null or assinatura_expira > now()))
        or (plano = 'trial' and trial_expira is not null and trial_expira > now())
      )
  );
$function$;

create or replace function public.fuso_do_usuario(p_user_id uuid)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_fuso text;
begin
  if auth.uid() is not null and p_user_id is distinct from auth.uid() and not public.is_admin() then
    return 'America/Sao_Paulo';
  end if;
  select fuso into v_fuso from public.profiles where id = p_user_id;
  v_fuso := coalesce(nullif(v_fuso, ''), 'America/Sao_Paulo');
  perform now() at time zone v_fuso;
  return v_fuso;
exception when others then
  return 'America/Sao_Paulo';
end;
$function$;

-- 4 -------------------------------------------------------------------
revoke truncate on table public.profiles from authenticated, anon;
alter function public.categoria_construir(text) set search_path = public;
