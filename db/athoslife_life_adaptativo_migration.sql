-- ================================================================
-- ATHOSlife — Life adaptativo: memória, check-in novo, padrões e abertura
--
-- * Memória: fatos que a pessoa contou (gostos, rotina, objetivos, eventos),
--   só com consentimento. Ela vê, fixa e apaga tudo pelo app.
-- * Check-in v3: palavra de sentimento + energia/agradável (1–4) +
--   etiquetas + nota, até 3 por dia (manhã, tarde, noite). Mantém
--   checkins_emocionais.humor atualizado para as telas que já existem.
-- * Padrões: observações dos últimos 28 dias calculadas no banco, sem IA.
-- * Abertura: no máximo uma mensagem do Life puxando assunto por dia.
-- Nada existente é apagado.
-- ================================================================

begin;

-- ---------- Log da IA aceita todos os tipos que a ai-proxy grava ----------
-- Antes só aceitava vision/chat/barcode: acao, estimar, recipe (e agora
-- checkin) falhavam sem erro. O teto de 3 respostas de IA por dia no
-- check-in conta por este log, então ele precisa gravar.
alter table public.ai_audit_logs drop constraint if exists ai_audit_logs_tipo_chamada_check;
alter table public.ai_audit_logs add constraint ai_audit_logs_tipo_chamada_check
  check (tipo_chamada in ('vision', 'chat', 'barcode', 'acao', 'estimar', 'recipe', 'checkin'));

-- ---------- Consentimento de memória ----------
alter table public.profiles add column if not exists consentimento_memoria boolean;     -- null = ainda não perguntado
alter table public.profiles add column if not exists consentimento_memoria_em timestamptz;
grant update (consentimento_memoria, consentimento_memoria_em) on public.profiles to authenticated;

-- ---------- Memórias do Life ----------
create table if not exists public.life_memorias (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  texto            text not null check (char_length(texto) between 3 and 200),
  categoria        text not null check (categoria in ('gosto', 'rotina', 'objetivo', 'evento', 'pessoa', 'estilo', 'contexto')),
  data_referencia  date,                         -- para eventos ("prova de 10 km dia 20")
  fixada           boolean not null default false,
  origem           text not null default 'chat' check (origem in ('chat', 'usuario')),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  usado_em         timestamptz
);
create index if not exists life_memorias_user_idx on public.life_memorias (user_id, criado_em desc);
create index if not exists life_memorias_texto_trgm on public.life_memorias using gin (texto gin_trgm_ops);

alter table public.life_memorias enable row level security;
revoke all on public.life_memorias from anon, authenticated;
grant all on public.life_memorias to service_role;
grant select, delete on public.life_memorias to authenticated;
grant update (fixada) on public.life_memorias to authenticated;
grant insert (user_id, texto, categoria, data_referencia, origem) on public.life_memorias to authenticated;

drop policy if exists life_memorias_ler on public.life_memorias;
drop policy if exists life_memorias_apagar on public.life_memorias;
drop policy if exists life_memorias_fixar on public.life_memorias;
drop policy if exists life_memorias_contar on public.life_memorias;
create policy life_memorias_ler on public.life_memorias for select to authenticated using (user_id = (select auth.uid()));
create policy life_memorias_apagar on public.life_memorias for delete to authenticated using (user_id = (select auth.uid()));
create policy life_memorias_fixar on public.life_memorias for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- A própria pessoa pode contar algo ao Life pela tela "O que o Life lembra" (com consentimento ligado).
create policy life_memorias_contar on public.life_memorias for insert to authenticated
  with check (
    user_id = (select auth.uid()) and origem = 'usuario'
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.consentimento_memoria is true)
  );

-- ---------- Check-ins v3 ----------
create table if not exists public.life_checkins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  data          date not null,
  momento       text not null check (momento in ('manha', 'tarde', 'noite')),
  palavra       text not null,
  energia       smallint not null check (energia between 1 and 4),
  agradavel     smallint not null check (agradavel between 1 and 4),
  etiquetas     text[] not null default '{}' check (cardinality(etiquetas) <= 6),
  nota          text check (nota is null or char_length(nota) <= 140),
  resposta_life text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (user_id, data, momento)
);
create index if not exists life_checkins_user_data_idx on public.life_checkins (user_id, data desc);

alter table public.life_checkins enable row level security;
revoke all on public.life_checkins from anon, authenticated;
grant all on public.life_checkins to service_role;
grant select, delete on public.life_checkins to authenticated; -- gravar é pelo servidor (valida o vocabulário)
drop policy if exists life_checkins_ler on public.life_checkins;
drop policy if exists life_checkins_apagar on public.life_checkins;
create policy life_checkins_ler on public.life_checkins for select to authenticated using (user_id = (select auth.uid()));
create policy life_checkins_apagar on public.life_checkins for delete to authenticated using (user_id = (select auth.uid()));

-- Mantém checkins_emocionais.humor (1–5) com o check-in mais recente do dia,
-- para as telas e o contexto que já usam essa tabela.
create or replace function public.life_checkin_sincronizar_humor()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_humor int := case new.agradavel when 1 then 1 when 2 then 2 when 3 then 4 else 5 end;
begin
  insert into public.checkins_emocionais (user_id, humor, data)
  values (new.user_id, v_humor, new.data)
  on conflict (user_id, data) do update set humor = excluded.humor;
  return new;
end;
$$;
revoke execute on function public.life_checkin_sincronizar_humor() from public, anon, authenticated;
drop trigger if exists life_checkin_humor on public.life_checkins;
create trigger life_checkin_humor after insert or update of agradavel on public.life_checkins
  for each row execute function public.life_checkin_sincronizar_humor();

-- ---------- Mensagens que o Life inicia (uma por dia) ----------
create table if not exists public.life_iniciativas (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  dia       date not null,
  motivo    text not null,
  texto     text not null,
  criado_em timestamptz not null default now(),
  primary key (user_id, dia)
);
alter table public.life_iniciativas enable row level security;
revoke all on public.life_iniciativas from anon, authenticated;
grant all on public.life_iniciativas to service_role;
comment on table public.life_iniciativas is 'Somente servidor: mensagens que o Life iniciou (máx. 1 por dia). RLS sem regras de propósito.';

-- Tipo da mensagem no chat (para o app mostrar check-in e abertura com outro visual).
alter table public.life_chat_mensagens add column if not exists tipo text not null default 'conversa';
do $$ begin
  alter table public.life_chat_mensagens add constraint life_chat_mensagens_tipo_check check (tipo in ('conversa', 'checkin', 'iniciativa'));
exception when duplicate_object then null; end $$;

-- ================================================================
-- Guardar memória (servidor). Sem consentimento não guarda.
-- Parecida com uma que já existe (trigramas): atualiza em vez de duplicar.
-- Mantém no máximo 80 por pessoa (as mais antigas não fixadas saem).
-- ================================================================
create or replace function public.life_guardar_memoria(
  p_user_id uuid, p_texto text, p_categoria text, p_data date default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_txt  text := btrim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
  v_id   uuid;
begin
  if not exists (select 1 from public.profiles where id = p_user_id and consentimento_memoria is true) then
    return 'sem_consentimento';
  end if;
  if char_length(v_txt) < 3 or char_length(v_txt) > 200
     or p_categoria not in ('gosto', 'rotina', 'objetivo', 'evento', 'pessoa', 'estilo', 'contexto') then
    return 'invalida';
  end if;

  select id into v_id from public.life_memorias
   where user_id = p_user_id and similarity(texto, v_txt) > 0.55
   order by similarity(texto, v_txt) desc limit 1;

  if v_id is not null then
    update public.life_memorias
       set texto = v_txt, categoria = p_categoria, data_referencia = coalesce(p_data, data_referencia), atualizado_em = now()
     where id = v_id;
    return 'atualizada';
  end if;

  insert into public.life_memorias (user_id, texto, categoria, data_referencia, origem)
  values (p_user_id, v_txt, p_categoria, p_data, 'chat');

  delete from public.life_memorias
   where id in (
     select id from public.life_memorias
      where user_id = p_user_id and not fixada
      order by coalesce(usado_em, atualizado_em) desc
      offset 80
   );
  return 'salva';
end;
$$;

-- "Esquece isso": apaga a memória mais parecida com o trecho (se for parecida o bastante).
create or replace function public.life_esquecer_memoria(p_user_id uuid, p_trecho text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid; v_txt text;
begin
  select id, texto into v_id, v_txt from public.life_memorias
   where user_id = p_user_id
     and greatest(similarity(texto, coalesce(p_trecho, '')), word_similarity(coalesce(p_trecho, ''), texto)) > 0.35
   order by greatest(similarity(texto, coalesce(p_trecho, '')), word_similarity(coalesce(p_trecho, ''), texto)) desc
   limit 1;
  if v_id is null then return null; end if;
  delete from public.life_memorias where id = v_id;
  return v_txt;
end;
$$;

-- Memórias para o contexto de uma conversa: fixadas, eventos próximos e as
-- mais ligadas à mensagem. Eventos que passaram há mais de 7 dias saem.
create or replace function public.life_memorias_contexto(
  p_user_id uuid, p_mensagem text, p_hoje date, p_limite int default 10
)
returns table (id uuid, texto text, categoria text, data_referencia date, fixada boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.life_memorias m
   where m.user_id = p_user_id and m.categoria = 'evento' and not m.fixada
     and m.data_referencia is not null and m.data_referencia < p_hoje - 7;

  return query
  with pontuadas as (
    select m.id, m.texto, m.categoria, m.data_referencia, m.fixada,
           (case when m.fixada then 3 else 0 end)
         + (case when m.data_referencia between p_hoje - 1 and p_hoje + 14 then 2 else 0 end)
         + (case when m.categoria = 'estilo' then 1.5 else 0 end)
         + greatest(similarity(m.texto, coalesce(p_mensagem, '')), word_similarity(coalesce(p_mensagem, ''), m.texto)) * 2
         + 1.0 / (1 + extract(epoch from (now() - m.atualizado_em)) / 86400 / 30) as pontos
      from public.life_memorias m
     where m.user_id = p_user_id
  ), escolhidas as (
    select * from pontuadas order by pontos desc limit greatest(1, least(p_limite, 20))
  ), marcadas as (
    update public.life_memorias m set usado_em = now() from escolhidas e where m.id = e.id returning m.id
  )
  select e.id, e.texto, e.categoria, e.data_referencia, e.fixada from escolhidas e order by e.pontos desc;
end;
$$;

-- ================================================================
-- Padrões dos últimos 28 dias, em frases curtas para o Life.
-- Só aparece o que tem dados suficientes. Nada de diagnóstico.
-- ================================================================
create or replace function public.life_padroes(p_user_id uuid, p_hoje date)
returns text[]
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_de      date := p_hoje - 27;
  v_linhas  text[] := '{}';
  v_n       int;
  v_dias    text[] := array['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
  v_pior    record; v_melhor record;
  v_com     numeric; v_sem numeric; v_nc int; v_ns int;
  v_top     text;
  v_meta    int;
  v_agua_d  int; v_agua_ok int;
  v_ref_d   int;
  v_treinos int; v_dias_treino text;
begin
  -- Ânimo por dia da semana (agradável 1–4 dos check-ins novos)
  select count(*) into v_n from public.life_checkins where user_id = p_user_id and data between v_de and p_hoje;
  if v_n >= 8 then
    select dow, media into v_pior from (
      select extract(dow from data)::int as dow, avg(agradavel) as media
        from public.life_checkins where user_id = p_user_id and data between v_de and p_hoje
       group by 1 having count(*) >= 2
    ) d order by media asc, dow limit 1;
    select dow, media into v_melhor from (
      select extract(dow from data)::int as dow, avg(agradavel) as media
        from public.life_checkins where user_id = p_user_id and data between v_de and p_hoje
       group by 1 having count(*) >= 2
    ) d order by media desc, dow limit 1;
    if v_pior.dow is not null and v_melhor.dow is not null and v_melhor.media - v_pior.media >= 0.8 then
      v_linhas := v_linhas || format('Ânimo (%s check-ins em 28 dias): costuma ser mais baixo às %s e melhor às %s.',
                                     v_n, v_dias[v_pior.dow + 1], v_dias[v_melhor.dow + 1]);
    end if;
  end if;

  -- Treino x ânimo
  select avg(c.agradavel) filter (where t.data is not null), count(*) filter (where t.data is not null),
         avg(c.agradavel) filter (where t.data is null),     count(*) filter (where t.data is null)
    into v_com, v_nc, v_sem, v_ns
    from public.life_checkins c
    left join (select distinct data from public.treinos_historico where user_id = p_user_id and data between v_de and p_hoje) t on t.data = c.data
   where c.user_id = p_user_id and c.data between v_de and p_hoje;
  if v_nc >= 3 and v_ns >= 3 and abs(v_com - v_sem) >= 0.5 then
    v_linhas := v_linhas || format('Nos dias com treino o ânimo foi %s (%s vs %s, numa escala de 1 a 4).',
                                   case when v_com > v_sem then 'melhor' else 'mais baixo' end,
                                   replace(to_char(v_com, 'FM9.0'), '.', ','), replace(to_char(v_sem, 'FM9.0'), '.', ','));
  end if;

  -- Sentimentos mais frequentes
  select string_agg(format('%s (%sx)', palavra, n), ', ') into v_top from (
    select palavra, count(*) as n from public.life_checkins
     where user_id = p_user_id and data between v_de and p_hoje
     group by palavra having count(*) >= 3 order by count(*) desc, palavra limit 2
  ) x;
  if v_top is not null then v_linhas := v_linhas || ('Sentimentos que mais apareceram: ' || v_top || '.'); end if;

  -- Água
  select coalesce(agua_meta_ml, 2500) into v_meta from public.profiles where id = p_user_id;
  select count(*), count(*) filter (where total >= v_meta) into v_agua_d, v_agua_ok from (
    select data, sum(quantidade_ml) as total from public.registros_agua
     where user_id = p_user_id and data between v_de and p_hoje group by data
  ) a;
  if v_agua_d >= 5 then
    v_linhas := v_linhas || format('Água: bateu a meta em %s de %s dias com registro.', v_agua_ok, v_agua_d);
  end if;

  -- Refeições
  select count(distinct data) into v_ref_d from public.itens_refeicao where user_id = p_user_id and data between v_de and p_hoje;
  if v_ref_d >= 3 then
    v_linhas := v_linhas || format('Registrou refeições em %s dos últimos 28 dias.', v_ref_d);
  end if;

  -- Treinos
  select count(distinct data) into v_treinos from public.treinos_historico where user_id = p_user_id and data between v_de and p_hoje;
  if v_treinos >= 4 then
    select string_agg(v_dias[dow + 1], ' e ' order by n desc, dow) into v_dias_treino from (
      select extract(dow from data)::int as dow, count(*) as n
        from (select distinct data from public.treinos_historico where user_id = p_user_id and data between v_de and p_hoje) d
       group by 1 order by 2 desc, 1 limit 2
    ) x;
    v_linhas := v_linhas || format('Treinou em %s dias nos últimos 28, mais às %s.', v_treinos, v_dias_treino);
  end if;

  return v_linhas;
end;
$$;

-- Funções do servidor: só a ai-proxy (service_role) chama.
revoke all on function public.life_guardar_memoria(uuid, text, text, date) from public, anon, authenticated;
revoke all on function public.life_esquecer_memoria(uuid, text) from public, anon, authenticated;
revoke all on function public.life_memorias_contexto(uuid, text, date, int) from public, anon, authenticated;
revoke all on function public.life_padroes(uuid, date) from public, anon, authenticated;
grant execute on function public.life_guardar_memoria(uuid, text, text, date) to service_role;
grant execute on function public.life_esquecer_memoria(uuid, text) to service_role;
grant execute on function public.life_memorias_contexto(uuid, text, date, int) to service_role;
grant execute on function public.life_padroes(uuid, date) to service_role;

commit;
