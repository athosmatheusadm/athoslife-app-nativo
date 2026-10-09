-- =====================================================================
-- ATHOSlife — exclusão de conta de verdade (2026-10-09)
--
-- Antes: o botão "Excluir conta" só gravava um pedido em eventos_seguranca
-- e ninguém era avisado; a Política promete apagar em até 30 dias e a
-- Google Play exige exclusão real.
--
-- Agora a própria pessoa exclui, no app, confirmando a senha:
--   1. excluir_minha_conta(senha, so_conferir => true)  -> confere a senha
--   2. o app apaga as fotos dela no Storage (avatars, receitas-criadas) —
--      Storage não deixa apagar arquivo por SQL (storage.protect_delete)
--   3. excluir_minha_conta(senha)                       -> apaga a conta
--
-- O que acontece no passo 3:
--   - auth.users some; profiles e todas as tabelas do usuário caem em
--     cascata (FK on delete cascade, conferido em 09/10);
--   - ai_audit_logs e eventos_seguranca NÃO têm cascata: ficam
--     anonimizados (user_id = null) — custo da IA e segurança sem dono,
--     como a Política diz ("apagamos ou anonimizamos");
--   - fica um evento 'conta_excluida' sem user_id (prova de que cumpriu).
--
-- Senha errada: grava 'exclusao_senha_errada' e devolve o status (não
-- levanta erro, senão o registro da tentativa seria desfeito). 5 erros
-- numa hora bloqueiam por 1 hora — quem pegou o celular destravado não
-- fica chutando a senha.
-- =====================================================================

create or replace function public.excluir_minha_conta(p_senha text, p_so_conferir boolean default false)
returns text
language plpgsql
volatile
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_hash text;
  v_erros int;
begin
  if v_uid is null then
    return 'nao_autenticado';
  end if;

  select count(*) into v_erros
  from public.eventos_seguranca
  where user_id = v_uid
    and tipo = 'exclusao_senha_errada'
    and data > now() - interval '1 hour';
  if v_erros >= 5 then
    return 'muitas_tentativas';
  end if;

  select encrypted_password into v_hash from auth.users where id = v_uid;
  if v_hash is null or v_hash = '' or p_senha is null
     or extensions.crypt(p_senha, v_hash) <> v_hash then
    insert into public.eventos_seguranca (user_id, tipo, contexto)
    values (v_uid, 'exclusao_senha_errada', null);
    return 'senha_incorreta';
  end if;

  if p_so_conferir then
    return 'ok';
  end if;

  update public.ai_audit_logs set user_id = null where user_id = v_uid;
  update public.eventos_seguranca set user_id = null where user_id = v_uid;
  insert into public.eventos_seguranca (user_id, tipo, contexto)
  values (null, 'conta_excluida', 'Excluída pela própria pessoa no app');

  delete from auth.users where id = v_uid;
  return 'ok';
end;
$function$;

revoke all on function public.excluir_minha_conta(text, boolean) from public, anon;
grant execute on function public.excluir_minha_conta(text, boolean) to authenticated;
