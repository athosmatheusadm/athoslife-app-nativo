-- ATHOSlife — push do Life com mensagem personalizada (2026-11-09, dono)
--
-- O que entra:
--   push_dispositivos   endereço (token FCM) de cada aparelho da pessoa.
--   life_push_envios    cada push mandado: motivo, texto, se foi IA e se a
--                       pessoa abriu (teto por dia, "ignorou 3 vezes descansa").
--   RPCs do app         registrar/remover o aparelho e marcar o push aberto.
--   Senha do relógio    no Vault; a função life-push confere pela RPC
--                       conferir_relogio_push (só service_role chama).
--   Log de IA           tipo 'push' em ai_audit_logs.
--
-- Consentimento: o mesmo "Life pode te chamar" (profiles.life_chat_ligado e
-- life_chat_momentos), gravado só pela RPC salvar_preferencias_contato,
-- que já registra cada aceite em contato_preferencias_log.
--
-- O agendamento (pg_cron chamando a função a cada 15 min) fica em
-- athoslife_push_relogio_migration.sql: só depois da função publicada e da
-- chave do Firebase no Secret.

create table if not exists public.push_dispositivos (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plataforma text not null check (plataforma in ('android', 'ios')),
  criado_em timestamptz not null default now(),
  visto_em timestamptz not null default now()
);
create index if not exists push_dispositivos_user_idx on public.push_dispositivos (user_id);

alter table public.push_dispositivos enable row level security;
drop policy if exists "dono vê os próprios aparelhos" on public.push_dispositivos;
create policy "dono vê os próprios aparelhos" on public.push_dispositivos
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.push_dispositivos from anon, authenticated;

create table if not exists public.life_push_envios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  motivo text not null,
  texto text not null,
  ia boolean not null default false,
  criado_em timestamptz not null default now(),
  aberto_em timestamptz
);
create index if not exists life_push_envios_user_idx on public.life_push_envios (user_id, criado_em desc);

alter table public.life_push_envios enable row level security;
drop policy if exists "dono vê os próprios push" on public.life_push_envios;
create policy "dono vê os próprios push" on public.life_push_envios
  for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.life_push_envios from anon, authenticated;

-- O app registra o aparelho ao abrir. Token que já era de outra conta (troca
-- de login no mesmo celular) passa pra conta atual.
create or replace function public.registrar_push_dispositivo(p_token text, p_plataforma text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_token is null or length(p_token) < 20 or length(p_token) > 4096 then raise exception 'token_invalido'; end if;
  if p_plataforma not in ('android', 'ios') then raise exception 'plataforma_invalida'; end if;
  insert into public.push_dispositivos (token, user_id, plataforma)
  values (p_token, auth.uid(), p_plataforma)
  on conflict (token) do update set user_id = excluded.user_id, plataforma = excluded.plataforma, visto_em = now();
  -- Teto por conta: 5 aparelhos (os mais antigos saem).
  delete from public.push_dispositivos
  where user_id = auth.uid()
    and token not in (select token from public.push_dispositivos where user_id = auth.uid() order by visto_em desc limit 5);
end;
$$;

create or replace function public.remover_push_dispositivo(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.push_dispositivos where token = p_token and user_id = auth.uid();
$$;

create or replace function public.marcar_push_aberto(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.life_push_envios set aberto_em = coalesce(aberto_em, now())
  where id = p_id and user_id = auth.uid();
$$;

revoke all on function public.registrar_push_dispositivo(text, text) from public, anon;
revoke all on function public.remover_push_dispositivo(text) from public, anon;
revoke all on function public.marcar_push_aberto(uuid) from public, anon;
grant execute on function public.registrar_push_dispositivo(text, text) to authenticated;
grant execute on function public.remover_push_dispositivo(text) to authenticated;
grant execute on function public.marcar_push_aberto(uuid) to authenticated;

-- Senha do relógio: gerada aqui, nunca sai do banco.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'life_push_relogio') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'life_push_relogio', 'Senha do pg_cron pra chamar a função life-push');
  end if;
end $$;

create or replace function public.conferir_relogio_push(p_senha text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'life_push_relogio' and decrypted_secret = p_senha);
$$;
revoke all on function public.conferir_relogio_push(text) from public, anon, authenticated;
grant execute on function public.conferir_relogio_push(text) to service_role;

alter table public.ai_audit_logs drop constraint if exists ai_audit_logs_tipo_chamada_check;
alter table public.ai_audit_logs add constraint ai_audit_logs_tipo_chamada_check
  check (tipo_chamada in ('vision', 'chat', 'barcode', 'acao', 'estimar', 'recipe', 'checkin', 'memoria', 'alternativas', 'push'));
