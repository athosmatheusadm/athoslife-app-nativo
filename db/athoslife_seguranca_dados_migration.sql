begin;
-- ================================================================
-- ATHOSlife — Limpeza de segurança e correção de dados
--
-- Nada é apagado. Só permissões, regras do bucket de fotos de progresso
-- e search_path fixo. (A troca da view macros_diarios ficou de fora: ver item 5.)
-- Seguro rodar mais de uma vez.
-- ================================================================

-- ---------- 1) Funções de gatilho chamáveis pela API ----------
-- Funções de gatilho não precisam de EXECUTE para disparar: o Postgres só
-- confere a permissão quando o gatilho é criado. Tirar o EXECUTE apenas
-- fecha a porta /rest/v1/rpc/... para quem não é o servidor.
revoke execute on function public.avaliar_triagem()      from public, anon, authenticated;
revoke execute on function public.handle_new_user()      from public, anon, authenticated;
revoke execute on function public.handle_recaida()       from public, anon, authenticated;
revoke execute on function public.sync_peso_atual()      from public, anon, authenticated;
revoke execute on function public.validar_habito()       from public, anon, authenticated;
revoke execute on function public.contato_log_imutavel() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable()      from public, anon, authenticated; -- event trigger

-- ---------- 2) Stripe (não é mais usado) ----------
-- Hoje qualquer pessoa, até sem login, grava pagamentos/eventos falsos ou
-- altera assinatura de quem tem o customer_id.
revoke execute on function public.register_stripe_payment(uuid, text, text, integer, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.register_stripe_event(text, text, jsonb)                                                from public, anon, authenticated;
revoke execute on function public.sync_stripe_subscription(text, text, text, text, text, timestamptz, timestamptz, boolean, timestamptz) from public, anon, authenticated;
revoke execute on function public.update_stripe_event_error(text, text)                                                   from public, anon, authenticated;
revoke execute on function public.reservar_vaga_fundador() from public, anon, authenticated;
revoke execute on function public.liberar_vaga_fundador()  from public, anon, authenticated;

-- ---------- 3) Funções que só fazem sentido com login ----------
-- registrar_checkin_habito usa auth.uid(); sem login não tem o que fazer.
revoke execute on function public.registrar_checkin_habito(uuid) from public, anon;
grant  execute on function public.registrar_checkin_habito(uuid) to authenticated, service_role;

-- is_premium_like: sem login, qualquer um descobre se um id é pagante.
-- Nenhuma regra de RLS usa esta função, então tirar do anon não quebra leitura.
revoke execute on function public.is_premium_like(uuid) from public, anon;
grant  execute on function public.is_premium_like(uuid) to authenticated, service_role;

-- ---------- 4) search_path fixo (aviso "Function Search Path Mutable") ----------
alter function public.is_admin()                  set search_path = public;
alter function public.normalizar_texto(text)      set search_path = public;
alter function public.habito_nome_proibido(text)  set search_path = public;
alter function public.contato_log_imutavel()      set search_path = public;

-- ---------- 5) macros_diarios: NÃO mexer aqui ----------
-- O app lê esta view (scanner antigo, tabela refeicoes) e SOMA por cima
-- itens_refeicao em macrosRepository.ts. Se a view passar a somar
-- itens_refeicao, Home e Dieta mostram calorias em dobro. Trocar a view
-- só junto com o app parando de somar os itens.

-- ---------- 6) Fotos de progresso (bucket privado sem nenhuma regra) ----------
-- Hoje ninguém consegue enviar nem ver as próprias fotos pelo app.
-- Regra igual à dos avatares: cada pessoa só mexe na pasta com o próprio id
-- (caminho "<user_id>/arquivo.jpg"). Fotos de corpo continuam privadas.
update storage.buckets
   set public = false,
       file_size_limit = 10485760, -- 10 MB
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
 where id = 'progress-photos';

drop policy if exists progress_photos_dono_select on storage.objects;
drop policy if exists progress_photos_dono_insert on storage.objects;
drop policy if exists progress_photos_dono_update on storage.objects;
drop policy if exists progress_photos_dono_delete on storage.objects;

create policy progress_photos_dono_select on storage.objects for select to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy progress_photos_dono_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy progress_photos_dono_update on storage.objects for update to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy progress_photos_dono_delete on storage.objects for delete to authenticated
  using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------- 7) Tabelas só do servidor (documentação) ----------
-- RLS ligado e sem regras de propósito: só a ai-proxy e funções do servidor usam.
comment on table public.ia_rajada               is 'Somente servidor: limite de chamadas por minuto da ai-proxy. RLS sem regras de propósito.';
comment on table public.ia_restricoes           is 'Somente servidor: chat pausado por abuso. RLS sem regras de propósito.';
comment on table public.ia_sinais_uso           is 'Somente servidor: sinais de uso fora do tema. RLS sem regras de propósito.';
comment on table public.life_acoes              is 'Somente servidor: ações pendentes do Life. RLS sem regras de propósito.';
comment on table public.testes_gratis_contas    is 'Somente servidor: contas que já usaram o teste grátis. RLS sem regras de propósito.';
comment on table public.testes_gratis_aparelhos is 'Somente servidor: hash de aparelhos que já usaram o teste grátis. RLS sem regras de propósito.';

commit;
