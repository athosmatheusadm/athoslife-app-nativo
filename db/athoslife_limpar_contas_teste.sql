-- ============================================================================
-- LIMPAR CONTAS DE TESTE — pra poder criar de novo com o mesmo e-mail
-- ============================================================================
-- PASSO 1: rode só o SELECT e veja quais contas existem.
-- PASSO 2: troque os e-mails da lista em `alvo` e rode o bloco BEGIN..COMMIT.
--   Apagar auth.users leva junto (cascata) perfil, refeições, treinos,
--   hábitos, chat do Life etc. NÃO tem volta.
--   Fotos no Storage (avatars, receitas-criadas) ficam órfãs — apagar pelo
--   painel Storage se quiser.
-- ============================================================================

-- PASSO 1
select email, created_at::date as criado, last_sign_in_at::date as ultimo_login,
       email_confirmed_at is not null as confirmado
from auth.users
order by created_at;

-- PASSO 2 (descomente e troque os e-mails; mesmo caminho da exclusão do app:
--   logs de IA e eventos de segurança ficam sem dono, o resto cai em cascata)
-- begin;
-- create temp table alvo on commit drop as
--   select id, email from auth.users
--   where lower(email) in (
--     'teste1@exemplo.com',
--     'teste2@exemplo.com'
--   );
-- select email from alvo;   -- confere antes
-- update public.ai_audit_logs     set user_id = null where user_id in (select id from alvo);
-- update public.eventos_seguranca set user_id = null where user_id in (select id from alvo);
-- delete from auth.users where id in (select id from alvo) returning email;
-- commit;
