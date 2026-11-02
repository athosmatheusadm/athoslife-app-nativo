-- ATHOSlife — hábitos "construir" além de leitura (2026-10-21)
--
-- Bug: escolher Construir + "Outro" (ex.: "dormir melhor") gravava
-- categoria null e o hábito voltava como "evitar" (vontade/recaída).
-- Agora Construir tem categorias próprias e "Outro" grava 'construir'.
-- A mesma lista está em src/domain/entities/habito.ts e
-- supabase/functions/ai-proxy/life.ts (ehConstruir). Idempotente.

create or replace function public.categoria_construir(p_categoria text)
returns boolean language sql immutable as $$
  select coalesce(p_categoria = any (array['leitura', 'sono', 'agua', 'meditar', 'caminhar', 'verduras', 'construir']), false)
$$;

create or replace function public.handle_recaida()
returns trigger language plpgsql security definer set search_path to 'public' as $function$
declare
  v_fuso text := public.fuso_do_usuario(new.user_id);
  v_hoje date := (now() at time zone v_fuso)::date;
  v_tipo_construir boolean;
  v_efetivo integer;
begin
  select public.categoria_construir(categoria) into v_tipo_construir
  from public.vicios_user where id = new.vicio_id;

  if v_tipo_construir then
    select case
      when ultimo_checkin is null then 0
      when ultimo_checkin >= (v_hoje - 1) then streak_atual
      when public.dias_ativos_entre(new.user_id, ultimo_checkin, v_hoje) = 0 then streak_atual
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
