-- ATHOSlife — IA: cotas por plano, anti-rajada, teto global e histórico do chat (2026-09-26)
--
-- Substitui o esquema antigo de cota (profiles.foto_scans_hoje /
-- chat_msgs_hoje + verificar_limite_*), que recebia a data do cliente e não
-- sabia de plano. As colunas/funções antigas ficam no banco, só param de ser
-- usadas pelo ai-proxy novo.
--
-- Limites por dia (decisão do dono, 2026-09-26) — fuso America/Sao_Paulo:
--   tipo     grátis   pago
--   chat        4      40
--   vision      0       5   (scanner é só do pago)
--   recipe      0      10   (receitas com o Life, só pago)
--   life        0       6   (Camada 2 — mensagens proativas, só pago)
-- Pago = is_premium_like(): premium/vip/fundador/vitalicio ou trial válido.
--
-- Defesas:
--   - cota consumida de forma atômica no servidor (sem data vinda do cliente);
--   - no máximo 6 chamadas de IA por minuto por usuário (anti-robô/token roubado);
--   - teto global de tokens por dia (se alguém abusar, o prejuízo tem limite);
--   - histórico do chat mora no servidor: o cliente não consegue "forjar"
--     falas do Life pra manipular a IA.
--
-- Rodar inteiro no SQL Editor (role: postgres). Idempotente.

-- ── 1. Uso diário por tipo ──────────────────────────────────────────
create table if not exists public.ia_uso_diario (
  user_id uuid    not null references auth.users(id) on delete cascade,
  dia     date    not null,
  tipo    text    not null check (tipo in ('chat','vision','recipe','life')),
  usados  integer not null default 0,
  primary key (user_id, dia, tipo)
);
alter table public.ia_uso_diario enable row level security;
drop policy if exists ia_uso_diario_select_own on public.ia_uso_diario;
create policy ia_uso_diario_select_own on public.ia_uso_diario
  for select using (auth.uid() = user_id);
revoke insert, update, delete, truncate on public.ia_uso_diario from anon, authenticated;

-- ── 2. Janela anti-rajada (1 minuto) ────────────────────────────────
create table if not exists public.ia_rajada (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  janela_inicio timestamptz not null default now(),
  qtd           integer not null default 0
);
alter table public.ia_rajada enable row level security;
revoke all on public.ia_rajada from anon, authenticated;

-- ── 3. Histórico do chat com o Life ─────────────────────────────────
create table if not exists public.life_chat_mensagens (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  autor     text not null check (autor in ('usuario','life')),
  texto     text not null check (char_length(texto) <= 2000),
  criado_em timestamptz not null default now()
);
create index if not exists life_chat_mensagens_user_idx
  on public.life_chat_mensagens (user_id, criado_em desc);
alter table public.life_chat_mensagens enable row level security;
drop policy if exists life_chat_select_own on public.life_chat_mensagens;
create policy life_chat_select_own on public.life_chat_mensagens
  for select using (auth.uid() = user_id);
-- Usuário pode apagar o próprio histórico (LGPD); só o proxy escreve.
drop policy if exists life_chat_delete_own on public.life_chat_mensagens;
create policy life_chat_delete_own on public.life_chat_mensagens
  for delete using (auth.uid() = user_id);
revoke insert, update, truncate on public.life_chat_mensagens from anon, authenticated;
revoke delete on public.life_chat_mensagens from anon;

-- ── 4. Índices pro teto global / auditoria ──────────────────────────
create index if not exists ai_audit_logs_data_idx      on public.ai_audit_logs (data);
create index if not exists ai_audit_logs_user_data_idx on public.ai_audit_logs (user_id, data desc);

-- ── 5. Tabela de limites (uma fonte só) ─────────────────────────────
create or replace function public.limite_ia(p_tipo text, p_pago boolean)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_tipo
    when 'chat'   then case when p_pago then 40 else 4 end
    when 'vision' then case when p_pago then 5  else 0 end
    when 'recipe' then case when p_pago then 10 else 0 end
    when 'life'   then case when p_pago then 6  else 0 end
    else 0
  end;
$$;

-- ── 6. Consumir cota (só servidor) ──────────────────────────────────
create or replace function public.consumir_cota_ia(
  p_user_id uuid,
  p_tipo text,
  p_teto_global_tokens bigint default null
)
returns table (permitido boolean, motivo text, usados_hoje integer, limite_hoje integer)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_dia    date := (now() at time zone 'America/Sao_Paulo')::date;
  v_limite integer;
  v_usados integer;
  v_rajada integer;
  v_gasto  bigint;
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    return query select false, 'sem_perfil', 0, 0; return;
  end if;

  v_limite := public.limite_ia(p_tipo, public.is_premium_like(p_user_id));
  if v_limite <= 0 then
    return query select false, 'premium_required', 0, 0; return;
  end if;

  if p_teto_global_tokens is not null then
    select coalesce(sum(tokens_usados), 0) into v_gasto
      from public.ai_audit_logs
     where data >= (v_dia::timestamp at time zone 'America/Sao_Paulo');
    if v_gasto >= p_teto_global_tokens then
      return query select false, 'teto_global', 0, v_limite; return;
    end if;
  end if;

  insert into public.ia_rajada as r (user_id, janela_inicio, qtd)
  values (p_user_id, now(), 1)
  on conflict (user_id) do update set
    qtd           = case when r.janela_inicio < now() - interval '1 minute' then 1 else r.qtd + 1 end,
    janela_inicio = case when r.janela_inicio < now() - interval '1 minute' then now() else r.janela_inicio end
  returning r.qtd into v_rajada;

  if v_rajada > 6 then
    return query select false, 'rajada', 0, v_limite; return;
  end if;

  insert into public.ia_uso_diario as u (user_id, dia, tipo, usados)
  values (p_user_id, v_dia, p_tipo, 1)
  on conflict (user_id, dia, tipo) do update set usados = u.usados + 1
    where u.usados < v_limite
  returning u.usados into v_usados;

  if v_usados is null then
    return query select false, 'limite_diario', v_limite, v_limite; return;
  end if;

  return query select true, 'ok', v_usados, v_limite;
end;
$$;

-- ── 7. Devolver cota quando a IA falha (só servidor) ────────────────
create or replace function public.devolver_cota_ia(p_user_id uuid, p_tipo text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ia_uso_diario
     set usados = greatest(usados - 1, 0)
   where user_id = p_user_id
     and dia = (now() at time zone 'America/Sao_Paulo')::date
     and tipo = p_tipo;
$$;

-- ── 8. Status da cota pro app mostrar "3 de 4 hoje" ─────────────────
create or replace function public.cota_ia_status(p_tipo text)
returns table (usados_hoje integer, limite_hoje integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select usados from public.ia_uso_diario
               where user_id = auth.uid()
                 and dia = (now() at time zone 'America/Sao_Paulo')::date
                 and tipo = p_tipo), 0),
    public.limite_ia(p_tipo, public.is_premium_like(auth.uid()));
$$;

revoke execute on function public.consumir_cota_ia(uuid, text, bigint) from public, anon, authenticated;
revoke execute on function public.devolver_cota_ia(uuid, text)         from public, anon, authenticated;
grant  execute on function public.consumir_cota_ia(uuid, text, bigint) to service_role;
grant  execute on function public.devolver_cota_ia(uuid, text)         to service_role;
revoke execute on function public.cota_ia_status(text) from public, anon;
grant  execute on function public.cota_ia_status(text) to authenticated;
