-- ATHOSlife — TESTE da migração Life MVP (2026-10-08). NÃO GRAVA NADA.
-- Roda a migração inteira + testes e termina com um erro proposital
-- (RESULTADO: {...}) que desfaz tudo. Esperado no RESULTADO:
--   1_ok status ok / itens 2 · 2_ocupado destino_ocupado · 3_n 2 · 4_adicionar_n 4
--   5_extra_nova ok / 5_n 2 · 6_vazia origem_vazia · 7_extra_alheia invalido
--   8_pausa_dia true · 9_streak_com_pausa 5 · 10_streak_pausa_parcial 1
--   11_outro_usuario null · 12_retomar 0
-- Bateu? Rode db/athoslife_life_mvp_migration.sql de verdade.

begin;
-- ATHOSlife — Life MVP (2026-10-08)
--
-- 1) Pausa do Life: a pessoa pausa o dia (botão no chat ou pedindo pro
--    Life). Guarda SÓ o dia — nunca o motivo. Vale até o fim do dia no fuso
--    dela; no dia seguinte volta sozinho (não é preciso "despausar").
-- 2) Pausou, congela (decisão do dono 08/10): dia pausado não quebra
--    sequência nenhuma. registrar_checkin_habito e handle_recaida (hábitos
--    "construir") passam a pular os dias pausados ao medir o buraco entre
--    check-ins. "Evitar" já não perde nada (conta dias desde a recaída).
--    Recaída REGISTRADA pela própria pessoa num dia pausado continua valendo
--    (é um registro dela, não uma cobrança).
-- 3) Ações do Life (repetir refeição): tabela de idempotência + ação
--    pendente ("adicionar ou substituir?") e a função que copia uma
--    refeição — fixa ou extra — de um dia pro outro, tudo numa transação.
--    Só o servidor (ai-proxy, service_role) chama.
--
-- ANTES DE RODAR: registrar_checkin_habito e handle_recaida abaixo são
-- cópia de db/athoslife_globalizacao_onboarding_migration.sql + a regra da
-- pausa. Conferir no banco se ainda batem com aquele arquivo
-- (select pg_get_functiondef('public.registrar_checkin_habito(uuid)'::regprocedure);
--  select pg_get_functiondef('public.handle_recaida()'::regprocedure);)
--
-- Reversível; pode rodar de novo sem quebrar (if not exists / or replace).


-- ── 1) Pausa ─────────────────────────────────────────────────────────────
create table if not exists public.life_pausas (
  user_id   uuid not null references public.profiles(id) on delete cascade,
  dia       date not null,
  criado_em timestamptz not null default now(),
  primary key (user_id, dia)
);

alter table public.life_pausas enable row level security;

drop policy if exists "life_pausas: dona lê" on public.life_pausas;
create policy "life_pausas: dona lê"
  on public.life_pausas for select
  using (auth.uid() = user_id);

-- Escrita só pelas funções abaixo (o dia vem do fuso do perfil, não do app).
revoke all on public.life_pausas from anon, authenticated;
grant select on public.life_pausas to authenticated;

create or replace function public.pausar_life_hoje()
returns date
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_dia date;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  v_dia := public.hoje_do_usuario(v_uid);
  insert into public.life_pausas (user_id, dia) values (v_uid, v_dia)
  on conflict do nothing;
  return v_dia;
end;
$$;

create or replace function public.retomar_life_hoje()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  delete from public.life_pausas
   where user_id = v_uid and dia = public.hoje_do_usuario(v_uid);
end;
$$;

revoke all on function public.pausar_life_hoje() from public, anon;
revoke all on function public.retomar_life_hoje() from public, anon;
grant execute on function public.pausar_life_hoje() to authenticated;
grant execute on function public.retomar_life_hoje() to authenticated;

-- Quantos dias ESTRITAMENTE entre p_de e p_ate não estão pausados.
-- 0 = a sequência não quebrou (dias seguidos, ou só dias pausados no meio).
create or replace function public.dias_ativos_entre(p_user_id uuid, p_de date, p_ate date)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when auth.uid() is not null and auth.uid() <> p_user_id then null
    when p_de is null or p_ate is null or p_ate - p_de <= 1 then 0
    else (
      select count(*)::int
        from generate_series(p_de + 1, p_ate - 1, interval '1 day') g(d)
       where not exists (
         select 1 from public.life_pausas lp
          where lp.user_id = p_user_id and lp.dia = g.d::date
       )
    )
  end;
$$;

revoke all on function public.dias_ativos_entre(uuid, date, date) from public, anon;
grant execute on function public.dias_ativos_entre(uuid, date, date) to authenticated, service_role;

-- ── 2) Sequência congelada nos dias pausados ────────────────────────────
create or replace function public.registrar_checkin_habito(p_habito_id uuid)
returns table(streak_atual integer, melhor_streak integer, ultimo_checkin date)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_hoje date := public.hoje_do_usuario(auth.uid());
  v_ultimo date;
  v_streak integer;
  v_melhor integer;
  v_novo integer;
begin
  select vu.ultimo_checkin, vu.streak_atual, vu.melhor_streak
  into v_ultimo, v_streak, v_melhor
  from public.vicios_user vu
  where vu.id = p_habito_id and vu.user_id = v_user_id
  for update;

  if not found then
    raise exception 'habito_nao_encontrado_ou_nao_pertence_ao_usuario';
  end if;

  if v_ultimo = v_hoje then
    v_novo := v_streak;
  elsif v_ultimo is not null and v_ultimo < v_hoje
        and public.dias_ativos_entre(v_user_id, v_ultimo, v_hoje) = 0 then
    -- ontem, ou só dias pausados no meio: a sequência segue
    v_novo := v_streak + 1;
  else
    v_novo := 1;
  end if;

  update public.vicios_user vu
  set streak_atual   = v_novo,
      melhor_streak  = greatest(vu.melhor_streak, v_novo),
      ultimo_checkin = v_hoje
  where vu.id = p_habito_id;

  return query select v_novo, greatest(v_melhor, v_novo), v_hoje;
end;
$function$;

create or replace function public.handle_recaida()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_fuso text := public.fuso_do_usuario(new.user_id);
  v_hoje date := (now() at time zone v_fuso)::date;
  v_tipo_construir boolean;
  v_efetivo integer;
begin
  select categoria = 'leitura' into v_tipo_construir
  from public.vicios_user where id = new.vicio_id;

  if v_tipo_construir then
    select case
      when ultimo_checkin is null then 0
      when ultimo_checkin >= (v_hoje - 1) then streak_atual
      when public.dias_ativos_entre(new.user_id, ultimo_checkin, v_hoje) = 0 then streak_atual
      else 0
    end into v_efetivo
    from public.vicios_user where id = new.vicio_id;
  else
    select (v_hoje - greatest(
              (criado_em at time zone v_fuso)::date,
              coalesce((ultima_recaida at time zone v_fuso)::date,
                       (criado_em at time zone v_fuso)::date)))
    into v_efetivo
    from public.vicios_user where id = new.vicio_id;
  end if;

  update public.vicios_user
  set
    ultima_recaida = now(),
    total_recaidas = total_recaidas + 1,
    melhor_streak   = greatest(melhor_streak, coalesce(v_efetivo, 0)),
    streak_atual    = 0,
    ultimo_checkin  = null
  where id = new.vicio_id;

  return new;
end;
$function$;

-- ── 3) Ações do Life ─────────────────────────────────────────────────────
-- id = "id_envio" que o app gera por mensagem: reenviar a mesma mensagem
-- (timeout, toque duplo) devolve o mesmo resultado em vez de copiar 2x.
create table if not exists public.life_acoes (
  id        uuid primary key,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  tipo      text not null check (tipo in ('repetir_refeicao')),
  args      jsonb not null default '{}'::jsonb,
  status    text not null check (status in ('executando', 'pendente', 'feita', 'cancelada', 'falhou')),
  resultado jsonb,
  criado_em timestamptz not null default now(),
  expira_em timestamptz
);

create index if not exists idx_life_acoes_user on public.life_acoes (user_id, criado_em desc);

alter table public.life_acoes enable row level security;
-- Sem policy: só o service_role (ai-proxy) lê/escreve.
revoke all on public.life_acoes from anon, authenticated;

-- Copia os itens de uma refeição (fixa ou extra) pra outra, numa transação.
-- O ai-proxy resolve "o jantar de ontem" / "Pré-treino" em tipo + id antes.
--   p_modo: 'perguntar' (destino com itens -> devolve destino_ocupado),
--           'adicionar' ou 'substituir'.
--   Destino extra sem id: cria a refeição extra no dia, com p_destino_nome.
-- Devolve jsonb { status, itens, kcal, destino_extra_id }.
create or replace function public.life_repetir_refeicao(
  p_user_id           uuid,
  p_origem_data       date,
  p_origem_tipo       text,
  p_origem_extra_id   uuid,
  p_destino_data      date,
  p_destino_tipo      text,
  p_destino_extra_id  uuid,
  p_destino_nome      text,
  p_modo              text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_tipos text[] := array['cafe', 'almoco', 'lanche', 'jantar', 'extra'];
  v_origem_n integer;
  v_destino_n integer;
  v_destino_extra uuid := p_destino_extra_id;
  v_inseridos integer;
  v_kcal numeric;
begin
  if p_user_id is null
     or not (p_origem_tipo = any (v_tipos)) or not (p_destino_tipo = any (v_tipos))
     or p_modo not in ('perguntar', 'adicionar', 'substituir') then
    return jsonb_build_object('status', 'invalido');
  end if;
  if (p_origem_tipo = 'extra') <> (p_origem_extra_id is not null) then
    return jsonb_build_object('status', 'invalido');
  end if;
  if p_destino_tipo <> 'extra' and v_destino_extra is not null then
    return jsonb_build_object('status', 'invalido');
  end if;
  if p_origem_data = p_destino_data and p_origem_tipo = p_destino_tipo
     and p_origem_extra_id is not distinct from v_destino_extra then
    return jsonb_build_object('status', 'mesma_refeicao');
  end if;

  -- Extras têm que ser da pessoa e do dia certo.
  if p_origem_extra_id is not null and not exists (
    select 1 from public.refeicoes_extra
     where id = p_origem_extra_id and user_id = p_user_id and data = p_origem_data
  ) then
    return jsonb_build_object('status', 'invalido');
  end if;
  if v_destino_extra is not null and not exists (
    select 1 from public.refeicoes_extra
     where id = v_destino_extra and user_id = p_user_id and data = p_destino_data
  ) then
    return jsonb_build_object('status', 'invalido');
  end if;

  select count(*) into v_origem_n
    from public.itens_refeicao
   where user_id = p_user_id and data = p_origem_data and tipo = p_origem_tipo
     and refeicao_extra_id is not distinct from p_origem_extra_id;
  if v_origem_n = 0 then
    return jsonb_build_object('status', 'origem_vazia');
  end if;

  if v_destino_extra is not null or p_destino_tipo <> 'extra' then
    select count(*) into v_destino_n
      from public.itens_refeicao
     where user_id = p_user_id and data = p_destino_data and tipo = p_destino_tipo
       and refeicao_extra_id is not distinct from v_destino_extra;
  else
    v_destino_n := 0;
  end if;

  if v_destino_n > 0 and p_modo = 'perguntar' then
    return jsonb_build_object('status', 'destino_ocupado', 'itens_destino', v_destino_n);
  end if;

  if p_destino_tipo = 'extra' and v_destino_extra is null then
    insert into public.refeicoes_extra (user_id, data, nome, ordem)
    select p_user_id, p_destino_data,
           coalesce(nullif(left(trim(p_destino_nome), 40), ''), 'Refeição'),
           coalesce(max(ordem), 0) + 1
      from public.refeicoes_extra
     where user_id = p_user_id and data = p_destino_data
    returning id into v_destino_extra;
  end if;

  if p_modo = 'substituir' then
    delete from public.itens_refeicao
     where user_id = p_user_id and data = p_destino_data and tipo = p_destino_tipo
       and refeicao_extra_id is not distinct from v_destino_extra;
  end if;

  insert into public.itens_refeicao
    (user_id, data, tipo, refeicao_extra_id, nome, quantidade_texto,
     calorias, proteina, carboidrato, gordura)
  select p_user_id, p_destino_data, p_destino_tipo, v_destino_extra, nome, quantidade_texto,
         calorias, proteina, carboidrato, gordura
    from public.itens_refeicao
   where user_id = p_user_id and data = p_origem_data and tipo = p_origem_tipo
     and refeicao_extra_id is not distinct from p_origem_extra_id;
  get diagnostics v_inseridos = row_count;

  select coalesce(sum(calorias), 0) into v_kcal
    from public.itens_refeicao
   where user_id = p_user_id and data = p_origem_data and tipo = p_origem_tipo
     and refeicao_extra_id is not distinct from p_origem_extra_id;

  return jsonb_build_object(
    'status', 'ok',
    'itens', v_inseridos,
    'kcal', round(v_kcal),
    'destino_extra_id', v_destino_extra
  );
end;
$$;

revoke all on function public.life_repetir_refeicao(uuid, date, text, uuid, date, text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.life_repetir_refeicao(uuid, date, text, uuid, date, text, uuid, text, text)
  to service_role;





-- ── Testes (tudo dentro da mesma transação; o raise no fim desfaz tudo) ──
do $t$
declare
  uid uuid; outro uuid; hoje date; d0 date; d1 date; r jsonb; res jsonb := '{}'::jsonb; n int; hid uuid; s int;
begin
  -- Usuário que pode ganhar um hábito de teste (consentimento + pago ou sem hábito ativo).
  select p.id into uid from public.profiles p
   where coalesce(p.consentimento_habitos, false)
     and (public.is_premium_like(p.id) or not exists (select 1 from public.vicios_user v where v.user_id = p.id and v.ativo))
   order by p.created_at limit 1;
  if uid is null then
    raise exception 'Nenhum usuário com consentimento de hábitos pra testar — crie um hábito pelo app numa conta de teste antes.';
  end if;
  select id into outro from public.profiles where id <> uid order by created_at limit 1;
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  hoje := public.hoje_do_usuario(uid); d0 := hoje - 25; d1 := hoje - 24;
  delete from public.itens_refeicao where user_id = uid and data in (d0, d1);
  insert into public.itens_refeicao (user_id, data, tipo, nome, quantidade_texto, calorias, proteina, carboidrato, gordura)
  values (uid, d0, 'jantar', 'TESTE arroz', '100 g', 130, 3, 28, 0), (uid, d0, 'jantar', 'TESTE frango', '120 g', 200, 38, 0, 4);
  r := public.life_repetir_refeicao(uid, d0, 'jantar', null, d1, 'jantar', null, null, 'perguntar'); res := res || jsonb_build_object('1_ok', r);
  r := public.life_repetir_refeicao(uid, d0, 'jantar', null, d1, 'jantar', null, null, 'perguntar'); res := res || jsonb_build_object('2_ocupado', r ->> 'status');
  r := public.life_repetir_refeicao(uid, d0, 'jantar', null, d1, 'jantar', null, null, 'substituir');
  select count(*) into n from public.itens_refeicao where user_id = uid and data = d1 and tipo = 'jantar';
  res := res || jsonb_build_object('3_n', n);
  r := public.life_repetir_refeicao(uid, d0, 'jantar', null, d1, 'jantar', null, null, 'adicionar');
  select count(*) into n from public.itens_refeicao where user_id = uid and data = d1 and tipo = 'jantar';
  res := res || jsonb_build_object('4_adicionar_n', n);
  r := public.life_repetir_refeicao(uid, d0, 'jantar', null, d1, 'extra', null, 'TESTE Ceia', 'perguntar');
  select count(*) into n from public.itens_refeicao i join public.refeicoes_extra e on e.id = i.refeicao_extra_id
   where e.nome = 'TESTE Ceia' and e.data = d1 and e.user_id = uid;
  res := res || jsonb_build_object('5_extra_nova', r ->> 'status', '5_n', n);
  r := public.life_repetir_refeicao(uid, d0, 'lanche', null, d1, 'jantar', null, null, 'perguntar'); res := res || jsonb_build_object('6_vazia', r ->> 'status');
  r := public.life_repetir_refeicao(uid, d0, 'extra', gen_random_uuid(), d1, 'jantar', null, null, 'perguntar'); res := res || jsonb_build_object('7_extra_alheia', r ->> 'status');
  res := res || jsonb_build_object('8_pausa_dia', public.pausar_life_hoje() = hoje);
  insert into public.life_pausas (user_id, dia) values (uid, hoje - 1), (uid, hoje - 2) on conflict do nothing;
  insert into public.vicios_user (user_id, nome, categoria, streak_atual, melhor_streak, ultimo_checkin, ativo)
  values (uid, 'TESTE leitura', 'leitura', 4, 4, hoje - 3, true) returning id into hid;
  select streak_atual into s from public.registrar_checkin_habito(hid);
  res := res || jsonb_build_object('9_streak_com_pausa', s);
  delete from public.life_pausas where user_id = uid and dia = hoje - 2;
  update public.vicios_user set ultimo_checkin = hoje - 3, streak_atual = 4 where id = hid;
  select streak_atual into s from public.registrar_checkin_habito(hid);
  res := res || jsonb_build_object('10_streak_pausa_parcial', s);
  res := res || jsonb_build_object('11_outro_usuario', public.dias_ativos_entre(outro, hoje - 5, hoje));
  perform public.retomar_life_hoje();
  select count(*) into n from public.life_pausas where user_id = uid and dia = hoje;
  res := res || jsonb_build_object('12_retomar', n);
  raise exception 'RESULTADO: %', res;
end
$t$;

commit;
