-- ATHOSlife — Cozinha v2 (2026-10-05)
--
-- 1) 3 receitas grátis (provinha pra quem é free — antes as 25 eram
--    pagas e o free via uma parede de cadeados). Troque os títulos aqui se
--    quiser outras.
-- 2) "Minhas criações": receitas que o Life montou com o que a pessoa tem
--    em casa, salvas por ela, com a foto do prato que ela fez.
-- 3) Bucket PRIVADO das fotos (foto de comida da casa da pessoa não é
--    pública): receitas-criadas/<user_id>/<arquivo>, só a dona lê/escreve.
-- 4) Life-chef aberto pro grátis (decisão do dono 2026-10-05: nada de
--    cadeado, o pago só destrava MAIS): grátis 1 receita POR SEMANA
--    (segunda a domingo, no fuso da pessoa) e até 3 criações guardadas;
--    pago 10/dia e até 300. 1/dia no grátis foi descartado: atenderia quem
--    cozinha uma vez por dia e tiraria o motivo de assinar.
--
-- Reversível; pode rodar de novo sem quebrar (if not exists / drop if exists).

begin;

-- ── 1) Receitas grátis ─────────────────────────────────────────────────
update public.receitas_cozinha
   set premium = false
 where titulo in (
   'Salada que Mata a Fome',
   'Panqueca de Banana e Aveia',
   'Pipoca Salgada Consciente'
 );

-- ── 2) Minhas criações ─────────────────────────────────────────────────
create table if not exists public.receitas_criadas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  titulo      text not null check (char_length(titulo) between 1 and 80),
  -- A receita inteira como o Life devolveu (ingredientes, preparo, macros…).
  dados       jsonb not null check (jsonb_typeof(dados) = 'object' and pg_column_size(dados) < 16000),
  -- Caminho no bucket; tem que estar na pasta da própria pessoa.
  foto_path   text,
  feita_em    timestamptz,
  created_at  timestamptz not null default now(),
  constraint receitas_criadas_foto_na_pasta_da_dona
    check (foto_path is null or foto_path like user_id::text || '/%')
);

create index if not exists receitas_criadas_user_idx
  on public.receitas_criadas (user_id, created_at desc);

alter table public.receitas_criadas enable row level security;

drop policy if exists receitas_criadas_dona_select on public.receitas_criadas;
drop policy if exists receitas_criadas_dona_insert on public.receitas_criadas;
drop policy if exists receitas_criadas_dona_update on public.receitas_criadas;
drop policy if exists receitas_criadas_dona_delete on public.receitas_criadas;

create policy receitas_criadas_dona_select on public.receitas_criadas
  for select using (user_id = auth.uid());
create policy receitas_criadas_dona_insert on public.receitas_criadas
  for insert with check (user_id = auth.uid());
create policy receitas_criadas_dona_update on public.receitas_criadas
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy receitas_criadas_dona_delete on public.receitas_criadas
  for delete using (user_id = auth.uid());

revoke all on public.receitas_criadas from anon, authenticated;
grant select, delete on public.receitas_criadas to authenticated;
grant insert (titulo, dados) on public.receitas_criadas to authenticated;
grant update (titulo, foto_path, feita_em) on public.receitas_criadas to authenticated;

-- Teto por pessoa (evita usar a tabela como depósito).
create or replace function public.receitas_criadas_limite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total  integer;
  v_limite integer;
begin
  -- (sem CASE dentro do IF: o PL/pgSQL corta a condição no 1º THEN)
  select count(*) into v_total from public.receitas_criadas where user_id = new.user_id;
  v_limite := case when public.is_premium_like(new.user_id) then 300 else 3 end;
  if v_total >= v_limite then
    raise exception 'limite_criacoes' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists receitas_criadas_limite on public.receitas_criadas;
create trigger receitas_criadas_limite
  before insert on public.receitas_criadas
  for each row execute function public.receitas_criadas_limite();

revoke all on function public.receitas_criadas_limite() from public, anon, authenticated;

-- ── 4) Cota do Life-chef: grátis passa de 0 pra 1 receita POR SEMANA ───
-- Mesma tabela única de limites (athoslife_ia_cotas_chat_migration.sql);
-- só a linha 'recipe' muda. O "por semana" sai do dia_da_cota abaixo:
-- grátis + recipe conta tudo na segunda-feira da semana (mesma tabela
-- ia_uso_diario, sem coluna nova).
create or replace function public.limite_ia(p_tipo text, p_pago boolean)
returns integer
language sql
immutable
set search_path = public
as $$
  select case p_tipo
    when 'chat'   then case when p_pago then 40 else 4 end
    when 'vision' then case when p_pago then 5  else 0 end
    when 'recipe' then case when p_pago then 10 else 1 end
    when 'life'   then case when p_pago then 6  else 0 end
    else 0
  end;
$$;

-- Em que "dia" de ia_uso_diario o uso conta. Regra única pras 3 funções.
create or replace function public.dia_da_cota(p_user_id uuid, p_tipo text)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_tipo = 'recipe' and not public.is_premium_like(p_user_id)
      then date_trunc('week', public.hoje_do_usuario(p_user_id))::date
    else public.hoje_do_usuario(p_user_id)
  end;
$$;

revoke all on function public.dia_da_cota(uuid, text) from public, anon;
grant execute on function public.dia_da_cota(uuid, text) to authenticated, service_role;

-- Iguais às de athoslife_globalizacao_onboarding_migration.sql, trocando
-- hoje_do_usuario(...) por dia_da_cota(..., p_tipo).
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
     where data >= (v_dia_br::timestamp at time zone 'America/Sao_Paulo');
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
$function$;

create or replace function public.cota_ia_status(p_tipo text)
returns table(usados_hoje integer, limite_hoje integer)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    coalesce((select usados from public.ia_uso_diario
               where user_id = auth.uid()
                 and dia = public.dia_da_cota(auth.uid(), p_tipo)
                 and tipo = p_tipo), 0),
    public.limite_ia(p_tipo, public.is_premium_like(auth.uid()));
$function$;

create or replace function public.devolver_cota_ia(p_user_id uuid, p_tipo text)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.ia_uso_diario
     set usados = greatest(usados - 1, 0)
   where user_id = p_user_id
     and dia = public.dia_da_cota(p_user_id, p_tipo)
     and tipo = p_tipo;
$function$;

-- ── 3) Bucket privado das fotos ────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receitas-criadas', 'receitas-criadas', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
   set public = false,
       file_size_limit = excluded.file_size_limit,
       allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists receitas_criadas_foto_select on storage.objects;
drop policy if exists receitas_criadas_foto_insert on storage.objects;
drop policy if exists receitas_criadas_foto_update on storage.objects;
drop policy if exists receitas_criadas_foto_delete on storage.objects;

create policy receitas_criadas_foto_select on storage.objects
  for select using (bucket_id = 'receitas-criadas' and (storage.foldername(name))[1] = (auth.uid())::text);
create policy receitas_criadas_foto_insert on storage.objects
  for insert with check (bucket_id = 'receitas-criadas' and (storage.foldername(name))[1] = (auth.uid())::text);
create policy receitas_criadas_foto_update on storage.objects
  for update
  using      (bucket_id = 'receitas-criadas' and (storage.foldername(name))[1] = (auth.uid())::text)
  with check (bucket_id = 'receitas-criadas' and (storage.foldername(name))[1] = (auth.uid())::text);
create policy receitas_criadas_foto_delete on storage.objects
  for delete using (bucket_id = 'receitas-criadas' and (storage.foldername(name))[1] = (auth.uid())::text);

commit;
