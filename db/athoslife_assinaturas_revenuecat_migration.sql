begin;

-- ================================================================
-- ATHOSlife — Assinaturas pelo RevenueCat (Google Play) + 300 vagas de Fundador
-- (O revoke das funções antigas do Stripe está em athoslife_seguranca_dados_migration.sql.)
--
-- Fluxo:
--   * O app compra com o SDK do RevenueCat, usando o id do usuário do
--     Supabase como appUserID.
--   * O RevenueCat confere a compra no Google e avisa nosso servidor por
--     webhook (rc-webhook). O app também pede uma sincronização logo depois
--     de comprar (rc-sync).
--   * Nos dois casos o servidor lê o cliente na API do RevenueCat e chama
--     aplicar_cliente_rc(). O app nunca decide o plano.
--   * Os primeiros 300 com assinatura ANUAL ativa (fora de sandbox) viram
--     Fundador, numerados. Cancelar não devolve a vaga; reembolso devolve.
--
-- Perfil resultante (padrão que o app já usa):
--   plano = 'premium', plano_tipo = 'fundador' | 'premium',
--   assinatura_ativa, assinatura_expira. 'vip' e 'vitalicio' não são tocados.
-- ================================================================

-- ---------- Configuração (uma linha, editável sem nova migração) ----------
create table if not exists public.billing_config (
  id                   int primary key default 1 check (id = 1),
  entitlement          text    not null default 'premium',           -- ID do entitlement no RevenueCat
  produtos             text[]  not null default array['athos_premium'], -- IDs de assinatura do Google Play
  planos_fundador      text[]  not null default array['anual'],      -- base plans que contam para Fundador
  total_fundadores     int     not null default 300 check (total_fundadores >= 0),
  teste_conta_fundador boolean not null default false,               -- compra sandbox ocupa vaga?
  atualizado_em        timestamptz not null default now()
);
insert into public.billing_config (id) values (1) on conflict (id) do nothing;

-- ---------- Assinaturas como o RevenueCat informa (uma linha por produto) ----------
create table if not exists public.rc_assinaturas (
  user_id            uuid not null references auth.users (id) on delete cascade,
  produto            text not null,       -- ex.: athos_premium:anual
  plano_base         text,                -- ex.: anual
  loja               text,                -- play_store, promotional...
  expira_em          timestamptz,
  carencia_ate       timestamptz,         -- período de carência do Google
  sandbox            boolean not null default false,
  reembolsada_em     timestamptz,
  cancelada_em       timestamptz,         -- pediu para não renovar (continua até expirar)
  problema_cobranca_em timestamptz,
  transacao          text,                -- store_transaction_id
  periodo            text,                -- normal, trial, intro
  atualizado_em      timestamptz not null default now(),
  primary key (user_id, produto)
);

-- ---------- Webhooks recebidos (idempotência e auditoria) ----------
create table if not exists public.rc_eventos (
  id            bigserial primary key,
  evento_id     text not null unique,     -- event.id do RevenueCat (igual nas tentativas)
  tipo          text not null,
  app_user_id   text,
  ambiente      text,
  status        text not null default 'recebido',  -- recebido | ok | ignorado | erro
  tentativas    int not null default 1,
  erro          text,
  recebido_em   timestamptz not null default now(),
  processado_em timestamptz
);

-- ---------- Fundadores (no máximo total_fundadores) ----------
create table if not exists public.fundadores (
  numero        int primary key check (numero >= 1),
  user_id       uuid unique references auth.users (id) on delete set null, -- conta excluída mantém a vaga ocupada
  produto       text not null,
  transacao     text,
  concedido_em  timestamptz not null default now()
);

-- ---------- Segurança ----------
alter table public.billing_config enable row level security;
alter table public.rc_assinaturas enable row level security;
alter table public.rc_eventos     enable row level security;
alter table public.fundadores     enable row level security;

revoke all on public.billing_config, public.rc_assinaturas, public.rc_eventos, public.fundadores from anon, authenticated;
revoke all on sequence public.rc_eventos_id_seq from anon, authenticated;
grant all on public.billing_config, public.rc_assinaturas, public.rc_eventos, public.fundadores to service_role;
grant usage, select on sequence public.rc_eventos_id_seq to service_role;

-- O usuário só lê as próprias assinaturas e o próprio número de Fundador.
grant select on public.rc_assinaturas, public.fundadores to authenticated;
drop policy if exists rc_assinaturas_ler_proprias on public.rc_assinaturas;
create policy rc_assinaturas_ler_proprias on public.rc_assinaturas
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists fundadores_ler_proprio on public.fundadores;
create policy fundadores_ler_proprio on public.fundadores
  for select to authenticated using (user_id = (select auth.uid()));

-- ================================================================
-- Aplica o estado do cliente lido na API do RevenueCat.
--   p_acesso_ate       fim do acesso ao entitlement (já inclui carência); null = sem acesso
--   p_acesso_vitalicio entitlement sem data de fim (ex.: concedido pelo painel)
--   p_assinaturas      [{produto, plano_base, loja, expira_em, carencia_ate, sandbox,
--                        reembolsada_em, cancelada_em, problema_cobranca_em, transacao, periodo}]
-- Só o servidor chama.
-- ================================================================
create or replace function public.aplicar_cliente_rc(
  p_user_id          uuid,
  p_acesso_ate       timestamptz,
  p_acesso_vitalicio boolean,
  p_assinaturas      jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cfg      public.billing_config;
  v_plano    text;
  v_anual    record;
  v_ocup     int;
  v_fundador int;
  v_tem_acesso boolean;
  v_anual_ativo boolean;
  v_tipo     text;
begin
  if p_user_id is null then raise exception 'dados_invalidos'; end if;
  select * into v_cfg from public.billing_config where id = 1;

  select plano into v_plano from public.profiles where id = p_user_id for update;
  if not found then return jsonb_build_object('erro', 'sem_perfil'); end if;

  -- 1) Espelha as assinaturas do RevenueCat (só produtos do ATHOSlife).
  delete from public.rc_assinaturas where user_id = p_user_id;
  insert into public.rc_assinaturas (
    user_id, produto, plano_base, loja, expira_em, carencia_ate, sandbox,
    reembolsada_em, cancelada_em, problema_cobranca_em, transacao, periodo
  )
  select p_user_id, s.produto, s.plano_base, s.loja, s.expira_em, s.carencia_ate, coalesce(s.sandbox, false),
         s.reembolsada_em, s.cancelada_em, s.problema_cobranca_em, s.transacao, s.periodo
    from jsonb_to_recordset(coalesce(p_assinaturas, '[]'::jsonb)) as s(
      produto text, plano_base text, loja text, expira_em timestamptz, carencia_ate timestamptz, sandbox boolean,
      reembolsada_em timestamptz, cancelada_em timestamptz, problema_cobranca_em timestamptz, transacao text, periodo text)
   where s.produto is not null
     and split_part(s.produto, ':', 1) = any (v_cfg.produtos)
  on conflict (user_id, produto) do nothing;

  -- 2) Reembolso da compra que deu a vaga: a vaga volta.
  delete from public.fundadores f
   using public.rc_assinaturas a
   where f.user_id = p_user_id and a.user_id = p_user_id
     and a.reembolsada_em is not null
     and f.produto = a.produto
     and (f.transacao is null or a.transacao is null or f.transacao = a.transacao);

  -- 3) Assinatura anual ativa (fora de sandbox, salvo configuração) => vaga de Fundador.
  select * into v_anual
    from public.rc_assinaturas
   where user_id = p_user_id
     and plano_base = any (v_cfg.planos_fundador)
     and reembolsada_em is null
     and greatest(expira_em, coalesce(carencia_ate, expira_em)) > now()
     and (not sandbox or v_cfg.teste_conta_fundador)
   order by expira_em desc
   limit 1;
  v_anual_ativo := found;

  -- A mesma compra do Google (transferida entre contas) não dá uma segunda vaga.
  if v_anual_ativo
     and not exists (select 1 from public.fundadores where user_id = p_user_id)
     and not exists (select 1 from public.fundadores
                      where v_anual.transacao is not null and transacao = v_anual.transacao
                        and user_id is distinct from p_user_id)
  then
    -- Uma concessão por vez: nunca passa do total, mesmo com compras simultâneas.
    perform pg_advisory_xact_lock(hashtext('athoslife_fundadores'));
    select count(*) into v_ocup from public.fundadores;
    if v_ocup < v_cfg.total_fundadores and not exists (select 1 from public.fundadores where user_id = p_user_id) then
      insert into public.fundadores (numero, user_id, produto, transacao)
      values ((select coalesce(max(numero), 0) + 1 from public.fundadores), p_user_id, v_anual.produto, v_anual.transacao);
    end if;
  end if;
  select numero into v_fundador from public.fundadores where user_id = p_user_id;

  -- 4) Perfil.
  v_tem_acesso := coalesce(p_acesso_vitalicio, false) or (p_acesso_ate is not null and p_acesso_ate > now());
  if v_plano in ('vip', 'vitalicio') then
    null; -- concedidos à parte; não mexe
  elsif v_tem_acesso then
    -- "Fundador" exige anual ativo; em sandbox o selo não aparece (a menos da configuração).
    v_tipo := case when v_fundador is not null and v_anual_ativo then 'fundador' else 'premium' end;
    update public.profiles
       set plano = 'premium', plano_tipo = v_tipo, assinatura_ativa = true,
           assinatura_expira = case when coalesce(p_acesso_vitalicio, false) then null else p_acesso_ate end
     where id = p_user_id;
    v_plano := 'premium';
  elsif v_plano = 'premium' then
    -- Só rebaixa quem estava premium. Teste grátis ativo continua.
    update public.profiles
       set plano = 'free', plano_tipo = null, assinatura_ativa = false, assinatura_expira = null
     where id = p_user_id;
    v_plano := 'free';
  end if;

  return jsonb_build_object(
    'plano', v_plano,
    'plano_tipo', (select plano_tipo from public.profiles where id = p_user_id),
    'assinatura_expira', (select assinatura_expira from public.profiles where id = p_user_id),
    'fundador_numero', v_fundador
  );
end;
$$;

-- Vagas de Fundador restantes (mesmo nome e retorno da função que já existe).
create or replace function public.vagas_fundador_disponiveis()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select greatest(
    (select total_fundadores from public.billing_config where id = 1) - (select count(*)::int from public.fundadores),
    0
  );
$$;

revoke all on function public.aplicar_cliente_rc(uuid, timestamptz, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.aplicar_cliente_rc(uuid, timestamptz, boolean, jsonb) to service_role;
grant execute on function public.vagas_fundador_disponiveis() to anon, authenticated, service_role;

-- ================================================================
-- Proteção extra: "premium" só vale enquanto não venceu.
-- Hoje is_premium_like olha só o nome do plano; se um aviso de vencimento
-- se perdesse, a pessoa continuaria premium. Fundador/vitalício/vip/trial iguais.
-- ================================================================
create or replace function public.is_premium_like(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and (
        plano in ('vip', 'fundador', 'vitalicio')
        or (plano = 'premium' and (assinatura_expira is null or assinatura_expira > now()))
        or (plano = 'trial' and trial_expira is not null and trial_expira > now())
      )
  );
$$;

commit;
