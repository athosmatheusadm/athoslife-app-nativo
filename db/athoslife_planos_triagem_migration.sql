-- ATHOSlife — planos de referência (treino; dieta na etapa 2) + triagem de saúde
-- 2026-09-28. Regras: docs/PLANOS_TREINO_DIETA_DIRETRIZ.md
--
-- Princípio: o app NUNCA é a autoridade. Aptidão, idade e limites do plano
-- são calculados/validados aqui; o que o app manda é só pedido.
--
--   triagens_saude     append-only (sem UPDATE/DELETE pelo usuário): prova de
--                      que a pessoa declarou, quando e o quê.
--   planos_gerados     append-only: histórico de todo plano aplicado.
--   aplicar_plano_treino(...)  valida TUDO e só então troca a ficha.
--
-- Depende de: hoje_do_usuario (globalização), is_premium_like.

-- ----------------------------------------------------------------
-- 0. Nível mínimo por exercício (iniciante não recebe exercício técnico)
-- ----------------------------------------------------------------
alter table public.exercicios_catalogo
  add column if not exists nivel_minimo text not null default 'iniciante';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercicios_catalogo_nivel_minimo_check') then
    alter table public.exercicios_catalogo
      add constraint exercicios_catalogo_nivel_minimo_check
      check (nivel_minimo in ('iniciante', 'intermediario', 'avancado'));
  end if;
end $$;

update public.exercicios_catalogo set nivel_minimo = 'avancado'
where nome in ('Levantamento Terra (Deadlift)', 'Flexão Nórdica', 'Sissy Squat', 'Bom Dia com Barra');

update public.exercicios_catalogo set nivel_minimo = 'intermediario'
where nome in (
  'Barra Fixa', 'Barra Fixa Supinada (Chin-up)', 'Barra Fixa Pegada Neutra', 'Mergulho nas Paralelas',
  'Burpee', 'Abdominal Canivete', 'Remada Curvada com Barra', 'Agachamento Livre com Barra',
  'Agachamento Frontal', 'Agachamento Búlgaro', 'Flexão Declinada', 'Flexão Diamante', 'Stiff',
  'Supino Declinado', 'Remada Cavalinho (T-bar)', 'Prancha com Toque no Ombro'
);

-- ----------------------------------------------------------------
-- 1. Triagem de saúde
-- ----------------------------------------------------------------
create table if not exists public.triagens_saude (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  versao text not null,
  respostas jsonb not null,
  data_nascimento date not null,
  declaracao_versao text not null,
  declaracao_aceita boolean not null,
  -- Calculados pelo trigger (o que o app mandar aqui é sobrescrito):
  idade_calculada integer,
  apto_treino boolean not null default false,
  apto_dieta boolean not null default false,
  motivos text[] not null default '{}',
  criado_em timestamptz not null default now()
);

create index if not exists triagens_saude_user_idx on public.triagens_saude (user_id, criado_em desc);

alter table public.triagens_saude enable row level security;

drop policy if exists triagens_saude_select on public.triagens_saude;
create policy triagens_saude_select on public.triagens_saude
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists triagens_saude_insert on public.triagens_saude;
create policy triagens_saude_insert on public.triagens_saude
  for insert to authenticated with check (auth.uid() = user_id);
-- Sem política de UPDATE/DELETE: ninguém altera o que declarou.

revoke update, delete on public.triagens_saude from authenticated, anon;

create or replace function public.avaliar_triagem()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_chaves text[] := array['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11'];
  v_k text;
  v_motivos text[] := '{}';
  v_treino boolean := true;
  v_dieta boolean := true;
  v_hoje date := public.hoje_do_usuario(new.user_id);
  v_idade_perfil integer;
  v_peso numeric;
  v_altura integer;
  v_imc numeric;
begin
  if new.declaracao_aceita is not true then
    raise exception 'declaracao_obrigatoria';
  end if;

  foreach v_k in array v_chaves loop
    if jsonb_typeof(new.respostas -> v_k) is distinct from 'boolean' then
      raise exception 'triagem_incompleta';
    end if;
  end loop;

  if new.data_nascimento > v_hoje or new.data_nascimento < v_hoje - interval '110 years' then
    raise exception 'data_nascimento_invalida';
  end if;

  new.idade_calculada := extract(year from age(v_hoje, new.data_nascimento))::integer;
  new.criado_em := now();

  -- Perguntas que bloqueiam treino / dieta (tabela da diretriz, seção 2).
  if (new.respostas->>'q1')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'cardiaco_pressao'); end if;
  if (new.respostas->>'q2')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'dor_no_peito'); end if;
  if (new.respostas->>'q3')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'tontura_desmaio'); end if;
  if (new.respostas->>'q4')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'doenca_cronica'); end if;
  if (new.respostas->>'q5')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'remedio_continuo'); end if;
  if (new.respostas->>'q6')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'osteoarticular'); end if;
  if (new.respostas->>'q7')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'supervisao_medica'); end if;
  if (new.respostas->>'q8')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'gestacao_amamentacao'); end if;
  if (new.respostas->>'q9')::boolean then v_dieta := false; v_motivos := array_append(v_motivos, 'dieta_especial'); end if;
  if (new.respostas->>'q10')::boolean then v_dieta := false; v_motivos := array_append(v_motivos, 'transtorno_alimentar'); end if;
  if (new.respostas->>'q11')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'cirurgia_recente'); end if;

  if new.idade_calculada < 18 then
    v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'menor_de_idade');
  end if;

  select idade, peso_atual, altura_cm into v_idade_perfil, v_peso, v_altura
  from public.profiles where id = new.user_id;

  -- Pega quem muda a idade pra passar: perfil e nascimento têm de bater.
  if v_idade_perfil is not null and abs(v_idade_perfil - new.idade_calculada) > 1 then
    v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'idade_divergente');
  end if;

  if v_peso is not null and v_altura is not null and v_altura > 0 then
    v_imc := v_peso / ((v_altura / 100.0) ^ 2);
    if v_imc < 18.5 then
      v_dieta := false; v_motivos := array_append(v_motivos, 'imc_baixo');
    end if;
  end if;

  new.apto_treino := v_treino;
  new.apto_dieta := v_dieta;
  new.motivos := v_motivos;
  return new;
end;
$$;

drop trigger if exists trg_avaliar_triagem on public.triagens_saude;
create trigger trg_avaliar_triagem
  before insert on public.triagens_saude
  for each row execute function public.avaliar_triagem();

-- Triagem vigente (90 dias) do usuário logado.
create or replace function public.triagem_vigente()
returns table(id uuid, apto_treino boolean, apto_dieta boolean, motivos text[], criado_em timestamptz, vence_em timestamptz)
language sql
stable
security definer
set search_path to 'public'
as $$
  select t.id, t.apto_treino, t.apto_dieta, t.motivos, t.criado_em, t.criado_em + interval '90 days'
  from public.triagens_saude t
  where t.user_id = auth.uid() and t.criado_em > now() - interval '90 days'
  order by t.criado_em desc
  limit 1;
$$;

revoke all on function public.triagem_vigente() from public, anon;
grant execute on function public.triagem_vigente() to authenticated;

-- ----------------------------------------------------------------
-- 2. Histórico de planos aplicados
-- ----------------------------------------------------------------
create table if not exists public.planos_gerados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('treino', 'dieta')),
  triagem_id uuid not null references public.triagens_saude(id),
  parametros jsonb not null,
  plano jsonb not null,
  gerador_versao text not null,
  -- Quando um CRN/CREF revisar os modelos: {"nome": "...", "registro": "CREF ...", "data": "..."}
  revisao_profissional jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists planos_gerados_user_idx on public.planos_gerados (user_id, criado_em desc);

alter table public.planos_gerados enable row level security;

drop policy if exists planos_gerados_select on public.planos_gerados;
create policy planos_gerados_select on public.planos_gerados
  for select to authenticated using (auth.uid() = user_id);
-- Escrita só pela RPC (security definer).
revoke insert, update, delete on public.planos_gerados from authenticated, anon;

-- ----------------------------------------------------------------
-- 3. Aplicar plano de treino — valida tudo no servidor
-- ----------------------------------------------------------------
-- p_parametros: {"objetivo":"hipertrofia|condicionamento|saude","nivel":"iniciante|intermediario|avancado",
--                "dias":["seg","qua","sex"],"minutos":45}
-- p_itens: [{"dia_semana":"seg","exercicio_id":"uuid","ordem":0,"series":[{"reps":10,"segundos":null}, ...]}, ...]
create or replace function public.aplicar_plano_treino(
  p_local text,
  p_parametros jsonb,
  p_itens jsonb,
  p_gerador_versao text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_triagem public.triagens_saude%rowtype;
  v_nivel text := p_parametros->>'nivel';
  v_objetivo text := p_parametros->>'objetivo';
  v_dias text[];
  v_minutos integer := (p_parametros->>'minutos')::integer;
  v_max_ex integer;
  v_teto_grupo integer;
  v_item jsonb;
  v_serie jsonb;
  v_ex public.exercicios_catalogo%rowtype;
  v_n_series integer;
  v_plano_id uuid;
  v_rank_nivel constant jsonb := '{"iniciante":1,"intermediario":2,"avancado":3}';
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_premium_like(v_uid) then raise exception 'premium_required'; end if;

  select * into v_triagem from public.triagens_saude
  where user_id = v_uid and criado_em > now() - interval '90 days'
  order by criado_em desc limit 1;
  if not found then raise exception 'triagem_necessaria'; end if;
  if not v_triagem.apto_treino then raise exception 'triagem_inapta'; end if;

  -- Parâmetros
  if p_local not in ('casa', 'academia') then raise exception 'plano_invalido: local'; end if;
  if v_nivel not in ('iniciante', 'intermediario', 'avancado') then raise exception 'plano_invalido: nivel'; end if;
  if v_objetivo not in ('hipertrofia', 'condicionamento', 'saude') then raise exception 'plano_invalido: objetivo'; end if;
  select array_agg(d) into v_dias from jsonb_array_elements_text(p_parametros->'dias') d;
  if v_dias is null or array_length(v_dias, 1) not between 2 and 6
     or (select count(distinct d) from unnest(v_dias) d) <> array_length(v_dias, 1)
     or exists (select 1 from unnest(v_dias) d where d not in ('seg','ter','qua','qui','sex','sab','dom')) then
    raise exception 'plano_invalido: dias';
  end if;
  if v_nivel = 'iniciante' and array_length(v_dias, 1) > 4 then raise exception 'plano_invalido: dias_iniciante'; end if;
  if v_minutos is null or v_minutos not between 30 and 90 then raise exception 'plano_invalido: minutos'; end if;

  v_max_ex := case when v_nivel = 'iniciante' then 5 else 7 end;
  v_teto_grupo := case v_nivel when 'iniciante' then 10 when 'intermediario' then 16 else 20 end;

  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'plano_invalido: vazio';
  end if;

  -- Cada exercício
  for v_item in select * from jsonb_array_elements(p_itens) loop
    if not ((v_item->>'dia_semana') = any(v_dias)) then raise exception 'plano_invalido: dia_fora'; end if;
    select * into v_ex from public.exercicios_catalogo where id = (v_item->>'exercicio_id')::uuid;
    if not found then raise exception 'plano_invalido: exercicio'; end if;
    if not (p_local = any(v_ex.ambientes)) then raise exception 'plano_invalido: exercicio_local'; end if;
    if (v_rank_nivel->>v_ex.nivel_minimo)::int > (v_rank_nivel->>v_nivel)::int then
      raise exception 'plano_invalido: exercicio_nivel';
    end if;
    v_n_series := jsonb_array_length(v_item->'series');
    if v_n_series not between 1 and 5 then raise exception 'plano_invalido: series'; end if;
    for v_serie in select * from jsonb_array_elements(v_item->'series') loop
      if v_ex.medida = 'tempo' then
        if coalesce((v_serie->>'segundos')::int, 0) not between 10 and 120 then raise exception 'plano_invalido: segundos'; end if;
      else
        if coalesce((v_serie->>'reps')::int, 0) not between 1 and 20 then raise exception 'plano_invalido: reps'; end if;
      end if;
    end loop;
  end loop;

  -- Exercícios por dia
  if exists (
    select 1 from jsonb_array_elements(p_itens) i
    group by i->>'dia_semana' having count(*) > v_max_ex
  ) then raise exception 'plano_invalido: exercicios_por_dia'; end if;

  -- Volume semanal por grupo muscular
  if exists (
    select 1
    from jsonb_array_elements(p_itens) i
    join public.exercicios_catalogo c on c.id = (i->>'exercicio_id')::uuid
    group by c.grupo_muscular
    having sum(jsonb_array_length(i->'series')) > v_teto_grupo
  ) then raise exception 'plano_invalido: volume_grupo'; end if;

  -- Troca a ficha do local, preservando a última carga anotada por exercício.
  create temp table if not exists _cargas (exercicio_id uuid primary key, carga numeric) on commit drop;
  delete from _cargas;
  insert into _cargas
  select distinct on (exercicio_id) exercicio_id, nullif(series_detalhe->0->>'carga_kg', '')::numeric
  from public.treino_plano
  where user_id = v_uid and local = p_local
  order by exercicio_id, created_at desc
  on conflict do nothing;

  delete from public.treino_plano where user_id = v_uid and local = p_local;

  insert into public.treino_plano (user_id, local, dia_semana, exercicio_id, series, repeticoes, ordem, series_detalhe)
  select
    v_uid,
    p_local,
    i->>'dia_semana',
    (i->>'exercicio_id')::uuid,
    jsonb_array_length(i->'series'),
    greatest(coalesce((i->'series'->0->>'reps')::int, 1), 1),
    coalesce((i->>'ordem')::int, 0),
    (
      select jsonb_agg(jsonb_build_object(
        'reps', nullif(s->>'reps', '')::int,
        'segundos', nullif(s->>'segundos', '')::int,
        'carga_kg', (select carga from _cargas k where k.exercicio_id = (i->>'exercicio_id')::uuid)
      ))
      from jsonb_array_elements(i->'series') s
    )
  from jsonb_array_elements(p_itens) i;

  insert into public.planos_gerados (user_id, tipo, triagem_id, parametros, plano, gerador_versao)
  values (v_uid, 'treino', v_triagem.id, p_parametros || jsonb_build_object('local', p_local), p_itens, p_gerador_versao)
  returning id into v_plano_id;

  return v_plano_id;
end;
$$;

revoke all on function public.aplicar_plano_treino(text, jsonb, jsonb, text) from public, anon;
grant execute on function public.aplicar_plano_treino(text, jsonb, jsonb, text) to authenticated;
