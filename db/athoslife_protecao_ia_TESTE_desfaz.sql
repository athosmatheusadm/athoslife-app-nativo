-- ATHOSlife — TESTE da migração de proteção da IA (2026-10-08). NÃO GRAVA NADA.
-- Roda a migração inteira + testes com 4 contas falsas e termina com um erro
-- proposital (RESULTADO: {...}) que desfaz tudo. Esperado no RESULTADO:
--   1_nasce_sem_dias true · 2_nasce_sem_premium true · 3_plano_apos_check trial ou free
--   4_libera liberado · 4_premium true · 5_de_novo ja_liberado
--   6_mesmo_aparelho aparelho_ja_usou · 7_aparelho_curto aparelho_invalido
--   8_sem_confirmar email_nao_confirmado · 9_descartavel email_descartavel
--   10_conta_antiga conta_ja_usou (ou ja_liberado / nao_elegivel, se ela for paga)
--   11_teto_gratis teto_global · 12_teto_pago ok
--   13_com_9 ok · 14_conta_10 10 · 15_com_10 restrito · 16_pausa_ate_meia_noite true
--   17_repetida 1 · 18_na_visao 10
-- Bateu? Rode db/athoslife_protecao_ia_migration.sql de verdade.

-- ATHOSlife — Proteção contra abuso da IA (2026-10-08)
--
-- 1) Teste grátis (7 dias de Premium) só sai UMA vez por aparelho e por
--    conta, com e-mail confirmado e que não seja de e-mail descartável.
--    Antes: toda conta nova já nascia com 7 dias de Premium (default de
--    trial_expira) — 50 e-mails = 50 testes de 40 mensagens/dia.
--    Agora a conta nasce sem dias (trial sem data = sem acesso pago, regra
--    de is_premium_like) e o app pede o teste com o id do aparelho
--    (liberar_teste_gratis). O id nunca é guardado: só um hash dele, sem
--    ligação com a conta (sobrevive à exclusão da conta, de propósito).
--    Quem já tem conta hoje fica marcado como "já usou" — quem está no
--    teste agora continua com os dias que tem.
-- 2) Teto global de tokens/dia: o plano grátis só usa até 60% dele. Os 40%
--    restantes ficam reservados pra quem paga (o grátis nunca derruba a IA
--    de um assinante).
-- 3) Sinais de abuso do chat (pedido fora do tema — código, redação,
--    tradução, lição de casa —, mensagem repetida). Contados por dia, sem
--    guardar texto. 10 pedidos fora do tema no mesmo dia = chat pausado até
--    o fim do dia dela (gente que usa o Life de verdade não chega perto).
--    Visão vw_ia_sinais_abuso pro dono olhar no SQL Editor.
--
-- Só o servidor (ai-proxy, service_role) grava sinais e restrições.
-- Rodar inteiro no SQL Editor (role postgres). Pode rodar de novo.

begin;

-- ── 1) Teste grátis ────────────────────────────────────────────────────

-- Contas que já usaram (ou não podem mais usar) o teste.
create table if not exists public.testes_gratis_contas (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  origem      text not null check (origem in ('aparelho', 'antes_da_regra')),
  liberado_em timestamptz not null default now()
);

-- Aparelhos que já deram um teste. Só o hash, sem user_id.
create table if not exists public.testes_gratis_aparelhos (
  aparelho_hash text primary key,
  liberado_em   timestamptz not null default now()
);

alter table public.testes_gratis_contas    enable row level security;
alter table public.testes_gratis_aparelhos enable row level security;
revoke all on public.testes_gratis_contas    from anon, authenticated;
revoke all on public.testes_gratis_aparelhos from anon, authenticated;

-- Todo mundo que já tem conta: já usou (ou está usando) o teste.
insert into public.testes_gratis_contas (user_id, origem)
select id, 'antes_da_regra' from public.profiles
on conflict (user_id) do nothing;

-- Conta nova nasce sem dias de teste, venha o valor de onde vier
-- (default da coluna ou handle_new_user).
alter table public.profiles alter column trial_expira drop default;

create or replace function public.perfil_novo_sem_teste()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  new.trial_expira := null;
  return new;
end;
$$;

drop trigger if exists perfil_novo_sem_teste on public.profiles;
create trigger perfil_novo_sem_teste
  before insert on public.profiles
  for each row execute function public.perfil_novo_sem_teste();

-- Domínios de e-mail temporário mais comuns. Bloqueia só o TESTE, não a
-- conta (a pessoa usa o grátis normalmente).
create or replace function public.email_descartavel(p_email text)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select lower(split_part(coalesce(p_email, ''), '@', 2)) = any (array[
    'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
    'sharklasers.com', 'grr.la', '10minutemail.com', '10minutemail.net',
    'temp-mail.org', 'tempmail.com', 'tempmail.net', 'temp-mail.io', 'tempmailo.com',
    'tempail.com', 'tempr.email', 'throwawaymail.com', 'yopmail.com', 'yopmail.net',
    'yopmail.fr', 'getnada.com', 'nada.email', 'dispostable.com', 'maildrop.cc',
    'mailnesia.com', 'mintemail.com', 'mohmal.com', 'emailondeck.com',
    'fakeinbox.com', 'trashmail.com', 'trashmail.de', 'mytemp.email',
    'moakt.com', 'spamgourmet.com', 'mailcatch.com', 'burnermail.io',
    'tmpmail.org', 'tmpmail.net', 'emailfake.com', 'fakemail.net',
    'linshiyouxiang.net', 'mail.tm', 'inboxkitten.com', 'mailpoof.com',
    'discard.email', 'spambox.us', 'byom.de', 'crazymailing.com',
    'mail-temp.com', 'tempinbox.com', 'emailtemporario.com.br', 'mailtemp.com.br'
  ]);
$$;

-- Pedido do app ao abrir. Devolve o motivo em código (o app traduz):
-- liberado · ja_liberado · nao_elegivel · conta_ja_usou · email_nao_confirmado
-- · email_descartavel · aparelho_invalido · aparelho_ja_usou · sem_sessao
create or replace function public.liberar_teste_gratis(p_aparelho text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $$
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
     set plano = 'trial', trial_expira = now() + interval '7 days'
   where id = v_uid;
  return 'liberado';
end;
$$;

revoke all on function public.liberar_teste_gratis(text) from public, anon;
grant execute on function public.liberar_teste_gratis(text) to authenticated;
revoke all on function public.email_descartavel(text) from public, anon, authenticated;
revoke all on function public.perfil_novo_sem_teste() from public, anon, authenticated;

-- ── 3) Sinais de abuso (antes do 2, porque a cota lê a restrição) ──────

create table if not exists public.ia_sinais_uso (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  dia       date not null,
  fora_tema integer not null default 0,
  repetidas integer not null default 0,
  ultimo_em timestamptz not null default now(),
  primary key (user_id, dia)
);

create table if not exists public.ia_restricoes (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  ate       timestamptz not null,
  motivo    text not null,
  criado_em timestamptz not null default now()
);

alter table public.ia_sinais_uso enable row level security;
alter table public.ia_restricoes enable row level security;
revoke all on public.ia_sinais_uso from anon, authenticated;
revoke all on public.ia_restricoes from anon, authenticated;

-- Conta um sinal no dia da pessoa. 'fora_tema' chegando a 10 pausa o chat
-- até a meia-noite dela. Devolve o total do sinal no dia.
create or replace function public.registrar_sinal_ia(p_user_id uuid, p_sinal text)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_dia date := public.hoje_do_usuario(p_user_id);
  v_n   integer;
begin
  if p_sinal not in ('fora_tema', 'repetida') then return 0; end if;

  insert into public.ia_sinais_uso as s (user_id, dia, fora_tema, repetidas)
  values (p_user_id, v_dia,
          case when p_sinal = 'fora_tema' then 1 else 0 end,
          case when p_sinal = 'repetida'  then 1 else 0 end)
  on conflict (user_id, dia) do update set
    fora_tema = s.fora_tema + case when p_sinal = 'fora_tema' then 1 else 0 end,
    repetidas = s.repetidas + case when p_sinal = 'repetida'  then 1 else 0 end,
    ultimo_em = now()
  returning case when p_sinal = 'fora_tema' then s.fora_tema else s.repetidas end into v_n;

  if p_sinal = 'fora_tema' and v_n >= 10 then
    insert into public.ia_restricoes (user_id, ate, motivo)
    values (p_user_id, (v_dia + 1)::timestamp at time zone public.fuso_do_usuario(p_user_id), 'fora_tema')
    on conflict (user_id) do update set ate = excluded.ate, motivo = excluded.motivo, criado_em = now();
  end if;
  return v_n;
end;
$$;

revoke all on function public.registrar_sinal_ia(uuid, text) from public, anon, authenticated;
grant execute on function public.registrar_sinal_ia(uuid, text) to service_role;

-- Pro dono: quem anda usando o chat de um jeito estranho nos últimos 7 dias.
create or replace view public.vw_ia_sinais_abuso as
select p.id as user_id,
       p.email,
       p.plano,
       coalesce(sum(s.fora_tema), 0)::int                                     as fora_tema_7d,
       coalesce(sum(s.repetidas), 0)::int                                     as repetidas_7d,
       (select count(*) from public.ia_uso_diario u
         where u.user_id = p.id and u.tipo = 'chat'
           and u.dia >= current_date - 7
           and u.usados >= public.limite_ia('chat', public.is_premium_like(p.id)))::int as dias_no_limite_7d,
       r.ate as chat_pausado_ate
  from public.profiles p
  left join public.ia_sinais_uso s on s.user_id = p.id and s.dia >= current_date - 7
  left join public.ia_restricoes r on r.user_id = p.id and r.ate > now()
 group by p.id, p.email, p.plano, r.ate
having coalesce(sum(s.fora_tema), 0) > 0 or coalesce(sum(s.repetidas), 0) > 0 or r.ate is not null;

revoke all on public.vw_ia_sinais_abuso from public, anon, authenticated;

-- ── 2) Cota: restrição + reserva do teto pra quem paga ─────────────────
-- Igual à de db/athoslife_cozinha_v2_migration.sql, com:
--  · chat pausado por abuso -> 'restrito'
--  · grátis barra em 60% do teto global; pago usa os 100%.
create or replace function public.consumir_cota_ia(p_user_id uuid, p_tipo text, p_teto_global_tokens bigint default null::bigint)
returns table(permitido boolean, motivo text, usados_hoje integer, limite_hoje integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
#variable_conflict use_column
declare
  v_dia    date := public.dia_da_cota(p_user_id, p_tipo);
  -- Teto global = gasto da empresa, contado no dia de Brasília.
  v_dia_br date := (now() at time zone 'America/Sao_Paulo')::date;
  v_pago   boolean;
  v_limite integer;
  v_usados integer;
  v_rajada integer;
  v_gasto  bigint;
  v_teto   bigint;
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    return query select false, 'sem_perfil', 0, 0; return;
  end if;

  v_pago   := public.is_premium_like(p_user_id);
  v_limite := public.limite_ia(p_tipo, v_pago);
  if v_limite <= 0 then
    return query select false, 'premium_required', 0, 0; return;
  end if;

  if p_tipo = 'chat' and exists (
    select 1 from public.ia_restricoes where user_id = p_user_id and ate > now()
  ) then
    return query select false, 'restrito', 0, v_limite; return;
  end if;

  if p_teto_global_tokens is not null then
    select coalesce(sum(tokens_usados), 0) into v_gasto
      from public.ai_audit_logs
     where data >= (v_dia_br::timestamp at time zone 'America/Sao_Paulo');
    -- Grátis: até 60% do teto; o resto fica pra quem paga.
    v_teto := p_teto_global_tokens;
    if not v_pago then v_teto := v_teto * 6 / 10; end if;
    if v_gasto >= v_teto then
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
$function$;

revoke execute on function public.consumir_cota_ia(uuid, text, bigint) from public, anon, authenticated;
grant  execute on function public.consumir_cota_ia(uuid, text, bigint) to service_role;


-- ── Testes (tudo se desfaz no raise do fim) ────────────────────────────
do $t$
declare
  u1 uuid := gen_random_uuid(); u2 uuid := gen_random_uuid();
  u3 uuid := gen_random_uuid(); u4 uuid := gen_random_uuid();
  res jsonb := '{}'::jsonb; c record; g bigint; i int;
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
  values
    (u1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste1.' || u1 || '@exemplo.com', '', now(), now(), now(), '{}', '{}'),
    (u2, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste2.' || u2 || '@exemplo.com', '', now(), now(), now(), '{}', '{}'),
    (u3, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste3.' || u3 || '@exemplo.com', '', null,  now(), now(), '{}', '{}'),
    (u4, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'teste4.' || u4 || '@mailinator.com', '', now(), now(), now(), '{}', '{}');
  -- Se o handle_new_user não criou o perfil, cria aqui (o trigger novo vale igual).
  insert into public.profiles (id, email) select x, 'teste.' || x || '@exemplo.com' from unnest(array[u1, u2, u3, u4]) x
   where not exists (select 1 from public.profiles where id = x);

  res := res || jsonb_build_object('1_nasce_sem_dias', (select trial_expira is null from public.profiles where id = u1),
                                   '2_nasce_sem_premium', not public.is_premium_like(u1));

  perform set_config('request.jwt.claims', json_build_object('sub', u1, 'role', 'authenticated')::text, true);
  perform public.check_access_status();
  res := res || jsonb_build_object('3_plano_apos_check', (select plano from public.profiles where id = u1));
  res := res || jsonb_build_object('4_libera', public.liberar_teste_gratis('aparelho-teste-0001'),
                                   '4_premium', public.is_premium_like(u1),
                                   '5_de_novo', public.liberar_teste_gratis('aparelho-teste-0001'));

  perform set_config('request.jwt.claims', json_build_object('sub', u2, 'role', 'authenticated')::text, true);
  res := res || jsonb_build_object('6_mesmo_aparelho', public.liberar_teste_gratis('aparelho-teste-0001'),
                                   '7_aparelho_curto', public.liberar_teste_gratis('abc'));
  perform set_config('request.jwt.claims', json_build_object('sub', u3, 'role', 'authenticated')::text, true);
  res := res || jsonb_build_object('8_sem_confirmar', public.liberar_teste_gratis('aparelho-teste-0003'));
  perform set_config('request.jwt.claims', json_build_object('sub', u4, 'role', 'authenticated')::text, true);
  res := res || jsonb_build_object('9_descartavel', public.liberar_teste_gratis('aparelho-teste-0004'));

  -- Conta antiga qualquer: não ganha teste de novo.
  perform set_config('request.jwt.claims', json_build_object('sub',
    (select user_id from public.testes_gratis_contas where origem = 'antes_da_regra' limit 1), 'role', 'authenticated')::text, true);
  res := res || jsonb_build_object('10_conta_antiga', public.liberar_teste_gratis('aparelho-teste-0010'));

  -- Teto: o gasto de hoje fica entre 60% e 100% do teto -> grátis barra, pago passa.
  insert into public.ai_audit_logs (user_id, tipo_chamada, status, tokens_usados, custo_estimado, data)
  values (u1, 'chat', 'teste', 1000, 0, now());
  select coalesce(sum(tokens_usados), 0) into g from public.ai_audit_logs
   where data >= (((now() at time zone 'America/Sao_Paulo')::date)::timestamp at time zone 'America/Sao_Paulo');
  select * into c from public.consumir_cota_ia(u2, 'chat', g + g / 2);
  res := res || jsonb_build_object('11_teto_gratis', c.motivo);
  select * into c from public.consumir_cota_ia(u1, 'chat', g + g / 2);
  res := res || jsonb_build_object('12_teto_pago', c.motivo);

  -- Sinais: 9 fora do tema não pausa; o 10º pausa o chat (só o chat).
  for i in 1..9 loop perform public.registrar_sinal_ia(u2, 'fora_tema'); end loop;
  select * into c from public.consumir_cota_ia(u2, 'chat', null);
  res := res || jsonb_build_object('13_com_9', c.motivo);
  res := res || jsonb_build_object('14_conta_10', public.registrar_sinal_ia(u2, 'fora_tema'));
  select * into c from public.consumir_cota_ia(u2, 'chat', null);
  res := res || jsonb_build_object('15_com_10', c.motivo,
    '16_pausa_ate_meia_noite', (select ate > now() and ate <= now() + interval '24 hours' from public.ia_restricoes where user_id = u2),
    '17_repetida', public.registrar_sinal_ia(u2, 'repetida'),
    '18_na_visao', (select fora_tema_7d from public.vw_ia_sinais_abuso where user_id = u2));

  raise exception 'RESULTADO: %', res;
end
$t$;

commit;
