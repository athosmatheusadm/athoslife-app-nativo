-- ATHOSlife — Segurança: quem pode editar o quê (2026-09-26)
--
-- Auditoria ao vivo (2026-09-26) achou:
--  1. profiles_update deixava o usuário editar QUALQUER coluna da própria
--     linha — plano, is_admin, assinatura_*, trial_expira e os contadores de
--     cota. Virando is_admin, admin_list_users devolvia nome/e-mail/telefone
--     de todo mundo. Delete + insert da própria linha também recriava o
--     perfil com is_admin = true.
--  2. Funções SECURITY DEFINER de cota/vagas executáveis por anon/authenticated
--     com qualquer p_user_id/p_today: zerar a própria cota mandando outra
--     data, devolver scans (decrementar_scan), esgotar/liberar vagas de
--     fundador.
--  3. O usuário podia apagar/editar os próprios eventos_seguranca e
--     ai_audit_logs (apagar rastro de auditoria), e editar a tabela streak
--     (nada no app nem no banco escreve nela hoje — é do servidor).
--  4. Bucket público `avatars` sem limite de tamanho/tipo — dava pra usar de
--     hospedagem de arquivo qualquer. Policy de update sem with_check (dava
--     pra mover um arquivo pra pasta de outro usuário).
--  5. anon com privilégio de escrita em todas as tabelas (RLS barrava, mas
--     sem defesa em camada).
--
-- Regra que fica valendo:
--  - VIP: só o admin concede (admin_set_vip / vip_links). Admin: só o dono.
--  - Plano, cota, assinatura, admin: só o servidor (service_role / ai-proxy).
--  - Dado do próprio dia a dia (água, refeição, peso, treino, hábitos...):
--    o usuário edita o próprio, como antes.
--
-- Rodar inteiro no SQL Editor do Supabase (role: postgres). O editor já roda
-- tudo como um bloco só; pode rodar de novo sem problema (idempotente).


-- ── 0. Defesa em camada: anônimo não escreve em tabela nenhuma ──────
revoke insert, update, delete, truncate on all tables in schema public from anon;

-- ── 1. profiles: só colunas que o próprio usuário pode editar ───────
revoke insert, update, delete on public.profiles from authenticated;

grant update (
  nome, telefone, avatar_url, sexo,
  peso_inicial, peso_atual, peso_meta, altura_cm, idade,
  objetivo, restricoes, local_treino, dias_treino, nivel_treino,
  horario_acordar, horario_dormir, lembrete_agua, lembrete_treino,
  kcal_meta, prot_meta, carbo_meta, gord_meta, agua_meta_ml, passos_meta,
  consentimento_aceito, consentimento_data, consentimento_versao, consentimento_habitos,
  onboarding_completo, mascote_modo_atual, last_app_open
) on public.profiles to authenticated;
-- A linha do perfil é criada pelo trigger handle_new_user (security definer);
-- o app nunca insere/apaga perfil direto. Exclusão de conta é manual.

-- ── 2. Funções de cota/vagas: só servidor ───────────────────────────
revoke execute on function public.verificar_limite_chat(uuid, date) from public, anon, authenticated;
revoke execute on function public.verificar_limite_scan(uuid, date) from public, anon, authenticated;
revoke execute on function public.decrementar_scan(uuid)            from public, anon, authenticated;
revoke execute on function public.reservar_vaga_fundador()          from public, anon, authenticated;
revoke execute on function public.liberar_vaga_fundador()           from public, anon, authenticated;
revoke execute on function public.check_trial_expiry()              from public, anon, authenticated;

grant execute on function public.verificar_limite_chat(uuid, date) to service_role;
grant execute on function public.verificar_limite_scan(uuid, date) to service_role;
grant execute on function public.decrementar_scan(uuid)            to service_role;
grant execute on function public.reservar_vaga_fundador()          to service_role;
grant execute on function public.liberar_vaga_fundador()           to service_role;
grant execute on function public.check_trial_expiry()              to service_role;

-- check_access_status é chamada pelo app ao abrir (profileRepository.ts) e
-- só expira planos vencidos — segue liberada pra logado, não pra anônimo.
revoke execute on function public.check_access_status() from public, anon;
grant  execute on function public.check_access_status() to authenticated;

-- Funções admin_* já checam is_admin() por dentro; tira só o anônimo.
revoke execute on function public.admin_list_users(integer)                        from public, anon;
revoke execute on function public.admin_set_vip(uuid, boolean)                     from public, anon;
revoke execute on function public.admin_create_vip_link(text, text, integer, timestamptz) from public, anon;
revoke execute on function public.admin_set_vip_link_active(text, boolean)         from public, anon;

-- search_path fixo nas security definer que estavam sem
alter function public.verificar_limite_scan(uuid, date) set search_path = public;
alter function public.decrementar_scan(uuid)            set search_path = public;
alter function public.sync_peso_atual()                 set search_path = public;
alter function public.is_premium_like(uuid)             set search_path = public;

-- ── 3. Rastro de auditoria e streak: usuário só lê (e insere evento) ─
revoke update, delete on public.eventos_seguranca from authenticated;
revoke update, delete on public.ai_audit_logs     from authenticated;
revoke insert         on public.ai_audit_logs     from authenticated; -- só o proxy grava
revoke insert, update, delete on public.streak    from authenticated;

-- ── 4. Storage: avatars só imagem, até 5 MB, sem mover pra pasta alheia ─
update storage.buckets
   set file_size_limit    = 5242880,
       allowed_mime_types = array['image/jpeg','image/png','image/webp']
 where id = 'avatars';

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update
  using      (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (auth.uid())::text);

-- ── 5. Admin = só o dono ────────────────────────────────────────────
-- Hoje NINGUÉM é admin (conferido 2026-09-26). As duas contas do dono viram
-- admin + VIP (acesso pago completo, sem expirar) — pedido explícito do dono.
update public.profiles
   set is_admin = true, plano = 'vip', assinatura_ativa = true, assinatura_expira = null
 where email in ('matheusbarretonunes.mb@gmail.com', 'matheusecomerc@gmail.com');

-- ── 6. Teste grátis: 30 → 7 dias (decisão 2026-09-26) ───────────────
-- Vale pra quem criar conta daqui pra frente; quem já está em trial mantém.
alter table public.profiles alter column trial_expira set default (now() + interval '7 days');

