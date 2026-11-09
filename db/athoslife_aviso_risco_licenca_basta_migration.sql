-- Fase 5 ligada (09/11/2026, dono). O "oi" depois do tropeço passa a depender
-- só da licença própria ("Pode ser?" → Pode), não do "Life pode te chamar"
-- do Perfil, que começa desligado (12 de 13 contas) e deixava o oi invisível.
-- "Não precisa" (avisos_risco = false) continua parando tudo.
create or replace function public.life_agendar_aviso_risco()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_fuso text := public.fuso_do_usuario(new.user_id);
  v_ok boolean;
  v_licenca boolean;
  v_construir boolean;
  v_quando timestamptz;
  v_ignorados int;
begin
  if not public.life_config_ligada('aviso_risco') then return new; end if;

  select coalesce(consentimento_habitos, false), avisos_risco
    into v_ok, v_licenca from profiles where id = new.user_id;
  select public.categoria_construir(categoria) into v_construir from vicios_user where id = new.vicio_id;
  if not coalesce(v_ok, false) or v_licenca is false or coalesce(v_construir, true) or new.horario is null then
    return new;
  end if;

  -- Dois alôs seguidos que ela não abriu: para de marcar pra esse hábito.
  select count(*) into v_ignorados from (
    select estado from life_avisos
     where user_id = new.user_id and vicio_id = new.vicio_id and estado in ('agendado', 'aberto') and enviar_em < now()
     order by enviar_em desc limit 2
  ) x where estado = 'agendado';
  if v_ignorados >= 2 then return new; end if;

  -- mesmo dia da semana, 7 dias depois, 30 min antes, no fuso da pessoa
  v_quando := (((new.data + 7) + new.horario) - interval '30 minutes') at time zone v_fuso;
  if v_quando <= now() then return new; end if;

  -- um alô por hábito por dia: vale o horário mais cedo
  update life_avisos set enviar_em = least(enviar_em, v_quando)
   where user_id = new.user_id and vicio_id = new.vicio_id
     and estado in ('proposto', 'agendado')
     and (enviar_em at time zone v_fuso)::date = (v_quando at time zone v_fuso)::date;
  if not found then
    insert into life_avisos (user_id, vicio_id, recaida_id, enviar_em, estado)
    values (new.user_id, new.vicio_id, new.id, v_quando, case when v_licenca then 'agendado' else 'proposto' end);
  end if;
  return new;
end $$;
