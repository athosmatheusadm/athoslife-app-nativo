-- ================================================================
-- ATHOSlife · Água e hábito pelo chat + desfazer (02/11/2026)
-- docs/PLANO_LIFE_ACOES.md, Fase 4 (guia item 7).
-- Depende de: athoslife_treino_chat_migration.sql (aplicar ANTES desta).
--
-- 1. life_acoes: tipos registrar_agua e marcar_habito; status 'desfeita'
--    (o "desfaz isso" do chat volta a última ação do Life).
-- 2. life_marcar_habito: o servidor (service role) marca o hábito de
--    construir do dia pela MESMA regra da tela (registrar_checkin_habito),
--    no nome da pessoa. Só o servidor chama.
-- ================================================================

alter table public.life_acoes drop constraint if exists life_acoes_tipo_check;
alter table public.life_acoes add constraint life_acoes_tipo_check
  check (tipo in ('repetir_refeicao', 'salvar_restricao', 'registrar_tropeco', 'adicionar_exercicio', 'copiar_treino',
                  'registrar_agua', 'marcar_habito'));

alter table public.life_acoes drop constraint if exists life_acoes_status_check;
alter table public.life_acoes add constraint life_acoes_status_check
  check (status in ('executando', 'pendente', 'feita', 'cancelada', 'falhou', 'desfeita'));

create index if not exists life_acoes_user_criado_idx on public.life_acoes (user_id, criado_em desc);

create or replace function public.life_marcar_habito(p_user_id uuid, p_habito_id uuid, p_dia date default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  -- registrar_checkin_habito usa auth.uid(): roda no nome da pessoa, só nesta transação.
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  select * into r from public.registrar_checkin_habito(p_habito_id, p_dia);
  return jsonb_build_object('status', 'ok', 'streak', r.streak_atual, 'melhor', r.melhor_streak, 'dia', r.ultimo_checkin);
exception when others then
  return jsonb_build_object('status', 'erro', 'detalhe', left(sqlerrm, 200));
end $$;
revoke execute on function public.life_marcar_habito(uuid, uuid, date) from public, anon, authenticated;
