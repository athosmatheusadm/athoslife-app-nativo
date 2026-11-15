-- ATHOSlife — teste grátis cai de 7 para 3 dias (dono, 15/11/2026).
-- Só muda o intervalo em liberar_teste_gratis; o resto é idêntico à versão
-- no ar (db/athoslife_protecao_ia_migration.sql). Quem já está no teste de
-- 7 dias continua com a data que recebeu.
create or replace function public.liberar_teste_gratis(p_aparelho text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid        uuid := auth.uid();
  v_plano      text;
  v_expira     timestamptz;
  v_email      text;
  v_confirmado timestamptz;
  v_aparelho   text := btrim(coalesce(p_aparelho, ''));
  v_n          integer;
begin
  if v_uid is null then return 'sem_sessao'; end if;

  select plano, trial_expira into v_plano, v_expira
    from public.profiles where id = v_uid for update;
  if not found then return 'sem_sessao'; end if;
  if v_plano = 'trial' and v_expira is not null and v_expira > now() then return 'ja_liberado'; end if;
  if v_plano not in ('trial', 'free') then return 'nao_elegivel'; end if;
  if exists (select 1 from public.testes_gratis_contas where user_id = v_uid) then return 'conta_ja_usou'; end if;

  select email, email_confirmed_at into v_email, v_confirmado from auth.users where id = v_uid;
  if v_confirmado is null then return 'email_nao_confirmado'; end if;
  if public.email_descartavel(v_email) then return 'email_descartavel'; end if;

  if length(v_aparelho) < 8 or length(v_aparelho) > 200 then return 'aparelho_invalido'; end if;
  insert into public.testes_gratis_aparelhos (aparelho_hash)
  values (encode(sha256(convert_to('athoslife-teste:' || v_aparelho, 'UTF8')), 'hex'))
  on conflict (aparelho_hash) do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return 'aparelho_ja_usou'; end if;

  insert into public.testes_gratis_contas (user_id, origem) values (v_uid, 'aparelho');
  update public.profiles
     set plano = 'trial', trial_expira = now() + interval '3 days'
   where id = v_uid;
  return 'liberado';
end;
$function$;

revoke all on function public.liberar_teste_gratis(text) from public, anon;
grant execute on function public.liberar_teste_gratis(text) to authenticated;
