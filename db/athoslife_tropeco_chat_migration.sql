-- ================================================================
-- ATHOSlife · Tropeço pelo chat + horário local (02/11/2026)
-- docs/PLANO_LIFE_ACOES.md, Fase 2 (guia "Life: conversa e memória",
-- Aviso de recaída, peças 1 e 2).
--
-- 1. recaidas.horario e recaidas.data tinham padrão CURRENT_TIME/CURRENT_DATE,
--    que no banco é UTC: um tropeço às 15h no Brasil ficava 18h (e perto da
--    meia-noite, no dia seguinte). O app nunca manda o horário, então tudo
--    caía no padrão. Agora um gatilho preenche pelo fuso da pessoa quando o
--    horário (ou a data) não vem. Quem manda (o Life, "ontem por volta das
--    15h") fica com o que mandou.
-- 2. life_acoes aceita 'registrar_tropeco' (Anotar / Deixa pra lá, um toque).
-- ================================================================

alter table public.recaidas alter column horario drop default;

create or replace function public.recaidas_horario_local()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_local timestamp := coalesce(new.created_at, now()) at time zone public.fuso_do_usuario(new.user_id);
begin
  if new.horario is null then
    new.horario := v_local::time;
  end if;
  return new;
end $$;

drop trigger if exists recaidas_horario_local on public.recaidas;
create trigger recaidas_horario_local before insert on public.recaidas
  for each row execute function public.recaidas_horario_local();

-- Corrige os que já existem (todos vieram do padrão UTC: o app nunca mandou horário).
update public.recaidas r
   set horario = (r.created_at at time zone public.fuso_do_usuario(r.user_id))::time
 where r.created_at is not null;

alter table public.life_acoes drop constraint if exists life_acoes_tipo_check;
alter table public.life_acoes add constraint life_acoes_tipo_check
  check (tipo in ('repetir_refeicao', 'salvar_restricao', 'registrar_tropeco'));
