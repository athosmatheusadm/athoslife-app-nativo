-- ATHOSlife — streak de Hábitos confiável (2026-09-24)
--
-- Contexto: vicios_user.streak_atual nunca teve mecanismo de crescimento
-- (nem cron, nem trigger) — só existia o trigger de recaída, que reduzia
-- 30% em vez de zerar (divergente do discurso do produto). Esta migração:
--
--   1. Adiciona `ultimo_checkin` (date) — marca o dia do último "Fiz hoje"
--      de um hábito tipo "construir" (ex. Leitura). Hábitos "evitar" não
--      usam essa coluna: o streak deles é 100% derivado de datas
--      (hoje - última recaída/criação), sem precisar de contador.
--   2. Reescreve handle_recaida(): agora ZERA o streak (era *0.7) e grava
--      melhor_streak com o valor efetivo (calculado, não o streak_atual
--      desatualizado) antes de zerar.
--   3. Nova função registrar_checkin_habito(): check-in do dia pro tipo
--      "construir" — idempotente (tocar 2x no mesmo dia não quebra nada),
--      streak quebra sozinho se pular um dia (sem precisar de job).
--
-- Nenhuma linha existente é apagada. Streaks hoje congelados vão passar a
-- refletir o valor real assim que isso rodar (ver conversa com o usuário).

begin;

alter table public.vicios_user
  add column if not exists ultimo_checkin date;

comment on column public.vicios_user.ultimo_checkin is
  'Último dia com "Fiz hoje" registrado (só hábitos tipo construir, ver tipoDaCategoria em src/domain/entities/habito.ts). NULL = nunca fez check-in.';

create or replace function public.handle_recaida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tipo_construir boolean;
  v_efetivo integer;
begin
  -- Mesma regra de src/domain/entities/habito.ts (CATEGORIAS_CONSTRUIR) —
  -- se esse set crescer lá, replicar aqui.
  select categoria = 'leitura' into v_tipo_construir
  from public.vicios_user where id = new.vicio_id;

  if v_tipo_construir then
    -- "construir": o streak só é válido se o check-in mais recente foi
    -- hoje ou ontem — senão já tinha quebrado sozinho antes da recaída.
    select case
      when ultimo_checkin is null then 0
      when ultimo_checkin >= (current_date - 1) then streak_atual
      else 0
    end into v_efetivo
    from public.vicios_user where id = new.vicio_id;
  else
    -- "evitar": streak = dias desde a última recaída (ou desde a criação
    -- do hábito, se nunca recaiu). Puramente derivado de data.
    select (current_date - greatest(criado_em::date, coalesce(ultima_recaida::date, criado_em::date)))
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
$$;

create or replace function public.registrar_checkin_habito(p_habito_id uuid)
returns table(streak_atual integer, melhor_streak integer, ultimo_checkin date)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
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

  if v_ultimo = current_date then
    v_novo := v_streak; -- já fez check-in hoje, idempotente
  elsif v_ultimo = current_date - 1 then
    v_novo := v_streak + 1;
  else
    v_novo := 1; -- pulou um dia (ou primeiro check-in): recomeça
  end if;

  update public.vicios_user vu
  set streak_atual   = v_novo,
      melhor_streak  = greatest(vu.melhor_streak, v_novo),
      ultimo_checkin = current_date
  where vu.id = p_habito_id;

  return query select v_novo, greatest(v_melhor, v_novo), current_date;
end;
$$;

revoke all on function public.registrar_checkin_habito(uuid) from public;
grant execute on function public.registrar_checkin_habito(uuid) to authenticated;

commit;
