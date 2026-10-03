-- ATHOSlife — preferências de contato (2026-10-03, autorizado pelo dono)
--
-- Perfil > Notificações ganha duas escolhas, ambas DESLIGADAS por padrão:
--   1. Life no chat: o Life pode puxar conversa sozinho, e em quais momentos
--      (manha = sono, meio_dia = refeição, noite = treino/dia).
--   2. WhatsApp: quais mensagens a pessoa aceita (resgate, lembretes,
--      resumo_semana, conversa) + o número.
--
-- Regras (servidor manda, a tela só espelha):
--   - O app NÃO grava essas colunas direto (fora do GRANT de profiles); só
--     pela RPC salvar_preferencias_contato, que valida tudo.
--   - Cada "aceitei"/"tirei o aceite" vira uma linha em
--     contato_preferencias_log, append-only (prova de consentimento pra LGPD
--     e pra política de opt-in do WhatsApp). Nem o próprio usuário apaga.
--   - WhatsApp exige número no formato internacional (+5511999998888).
--     Trocar o número zera whatsapp_verificado.
--   - Quem um dia enviar mensagem (Life proativo, WhatsApp) TEM que checar
--     estas colunas antes de mandar.

alter table public.profiles
  add column if not exists life_chat_ligado boolean not null default false,
  add column if not exists life_chat_momentos text[] not null default '{}',
  add column if not exists whatsapp_opcoes text[] not null default '{}',
  add column if not exists whatsapp_aceite_em timestamptz;

alter table public.profiles
  drop constraint if exists profiles_life_chat_momentos_validos,
  add constraint profiles_life_chat_momentos_validos
    check (life_chat_momentos <@ array['manha', 'meio_dia', 'noite']::text[]),
  drop constraint if exists profiles_whatsapp_opcoes_validas,
  add constraint profiles_whatsapp_opcoes_validas
    check (whatsapp_opcoes <@ array['resgate', 'lembretes', 'resumo_semana', 'conversa']::text[]);

create table if not exists public.contato_preferencias_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  canal text not null check (canal in ('life_chat', 'whatsapp')),
  opcao text not null,
  aceito boolean not null,
  telefone text,
  criado_em timestamptz not null default now()
);

create index if not exists contato_preferencias_log_user_idx
  on public.contato_preferencias_log (user_id, criado_em desc);

alter table public.contato_preferencias_log enable row level security;

drop policy if exists "dono lê o próprio histórico de contato" on public.contato_preferencias_log;
create policy "dono lê o próprio histórico de contato"
  on public.contato_preferencias_log for select
  to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.contato_preferencias_log from anon, authenticated;

-- Append-only de verdade: nem service_role altera/apaga linha (exclusão da
-- conta apaga em cascata pelo auth.users, que é o direito de exclusão).
create or replace function public.contato_log_imutavel()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' and not exists (select 1 from auth.users where id = old.user_id) then
    return old; -- cascata da exclusão da conta
  end if;
  raise exception 'contato_log_append_only';
end;
$$;

drop trigger if exists trg_contato_log_imutavel on public.contato_preferencias_log;
create trigger trg_contato_log_imutavel
  before update or delete on public.contato_preferencias_log
  for each row execute function public.contato_log_imutavel();

create or replace function public.salvar_preferencias_contato(
  p_life_ligado boolean,
  p_life_momentos text[],
  p_whatsapp_opcoes text[],
  p_telefone text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_atual public.profiles%rowtype;
  v_momentos text[] := coalesce(array(select distinct unnest(p_life_momentos) order by 1), '{}');
  v_opcoes text[] := coalesce(array(select distinct unnest(p_whatsapp_opcoes) order by 1), '{}');
  v_tel text := nullif(regexp_replace(coalesce(p_telefone, ''), '[^0-9+]', '', 'g'), '');
  v_op text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if not v_momentos <@ array['manha', 'meio_dia', 'noite']::text[] then
    raise exception 'momento_invalido';
  end if;
  if not v_opcoes <@ array['resgate', 'lembretes', 'resumo_semana', 'conversa']::text[] then
    raise exception 'opcao_whatsapp_invalida';
  end if;
  if v_tel is not null and v_tel !~ '^\+[1-9][0-9]{9,14}$' then
    raise exception 'telefone_invalido';
  end if;
  if cardinality(v_opcoes) > 0 and v_tel is null then
    raise exception 'whatsapp_sem_telefone';
  end if;

  select * into v_atual from public.profiles where id = v_uid for update;
  if not found then
    raise exception 'profile_not_found';
  end if;

  -- Log do que mudou (uma linha por opção ligada/desligada).
  if coalesce(p_life_ligado, false) is distinct from v_atual.life_chat_ligado then
    insert into public.contato_preferencias_log (user_id, canal, opcao, aceito)
    values (v_uid, 'life_chat', 'geral', coalesce(p_life_ligado, false));
  end if;
  foreach v_op in array array['manha', 'meio_dia', 'noite'] loop
    if (v_op = any (v_momentos)) is distinct from (v_op = any (v_atual.life_chat_momentos)) then
      insert into public.contato_preferencias_log (user_id, canal, opcao, aceito)
      values (v_uid, 'life_chat', v_op, v_op = any (v_momentos));
    end if;
  end loop;
  foreach v_op in array array['resgate', 'lembretes', 'resumo_semana', 'conversa'] loop
    if (v_op = any (v_opcoes)) is distinct from (v_op = any (v_atual.whatsapp_opcoes))
       or (v_op = any (v_opcoes) and v_tel is distinct from v_atual.telefone) then
      insert into public.contato_preferencias_log (user_id, canal, opcao, aceito, telefone)
      values (v_uid, 'whatsapp', v_op, v_op = any (v_opcoes), v_tel);
    end if;
  end loop;

  update public.profiles set
    life_chat_ligado = coalesce(p_life_ligado, false),
    life_chat_momentos = v_momentos,
    whatsapp_opcoes = v_opcoes,
    whatsapp_aceite_em = case
      when cardinality(v_opcoes) = 0 then null
      when cardinality(v_atual.whatsapp_opcoes) = 0 or v_tel is distinct from v_atual.telefone then now()
      else v_atual.whatsapp_aceite_em
    end,
    telefone = v_tel,
    whatsapp_verificado = case when v_tel is distinct from v_atual.telefone then false
                               else v_atual.whatsapp_verificado end
  where id = v_uid;
end;
$$;

revoke all on function public.salvar_preferencias_contato(boolean, text[], text[], text) from public, anon;
grant execute on function public.salvar_preferencias_contato(boolean, text[], text[], text) to authenticated;

-- Telefone agora só pela RPC (senão daria pra trocar o número sem zerar a
-- verificação nem registrar no log).
revoke update (telefone) on public.profiles from authenticated;
