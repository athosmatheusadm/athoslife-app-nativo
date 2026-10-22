-- ATHOSlife — scanner v1.1, etapa 2 (motor) — 2026-10-21
--
-- Base: ATHOSlife_Scanner_Especificacao_Tecnica_v1.1.md.
-- RODAR DEPOIS de athoslife_taco_referencia_migration.sql (usa taco_id).
-- A ai-proxy nova só usa isto com SCANNER_V2=true; sem a variável o app
-- continua no scanner antigo (type=vision).
--
-- 1. Catálogo: preparo, porção típica, regra de prato composto, gordura de
--    preparo ("como servido normalmente"), densidade e se entra no scanner.
-- 2. Medidas caseiras (alimentos_medidas).
-- 3. scan_jobs (análise persistida + idempotência), scan_correcoes,
--    scan_nao_resolvidos (fila pra crescer o catálogo, sem user_id).
-- 4. RPC scanner_confirmar: grava a refeição numa transação só, com
--    commit_key idempotente (tocar duas vezes não duplica).
--
-- Idempotente. Valores marcados 'estimativa_equipe' são ponto de partida,
-- não fonte verificada: o backend só os usa como pista de revisão (porção)
-- ou como premissa visível (óleo de preparo).

-- ----------------------------------------------------------------
-- 1. Catálogo
-- ----------------------------------------------------------------
alter table public.alimentos
  add column if not exists preparo text,
  add column if not exists aliases text[] not null default '{}',
  add column if not exists porcao_tipica_g numeric,
  add column if not exists representacao text,
  add column if not exists gordura_preparo_pct numeric,
  add column if not exists densidade_g_ml numeric,
  add column if not exists scanner boolean not null default true;

do $$ begin
  alter table public.alimentos add constraint alimentos_preparo_chk
    check (preparo in ('raw', 'boiled', 'grilled', 'fried', 'baked'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.alimentos add constraint alimentos_representacao_chk
    check (representacao in ('componentes', 'prato'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.alimentos add constraint alimentos_gordura_preparo_chk
    check (gordura_preparo_pct >= 0 and gordura_preparo_pct <= 30);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.alimentos add constraint alimentos_densidade_chk check (densidade_g_ml > 0);
exception when duplicate_object then null; end $$;

comment on column public.alimentos.preparo is 'raw|boiled|grilled|fried|baked; null = não se aplica/desconhecido. Scanner nunca casa cru com cozido.';
comment on column public.alimentos.porcao_tipica_g is 'Porção mediana brasileira (g). Estimativa fora de 0,25×–4× pede revisão.';
comment on column public.alimentos.representacao is 'componentes = prato montado (arroz+feijão+carne): scanner registra as partes, não usa esta linha. prato = receita inteira (lasanha, feijoada).';
comment on column public.alimentos.gordura_preparo_pct is 'Óleo de preparo caseiro, % do peso (estimativa da equipe). Só alimentos SEM óleo na base (TACO cozido/grelhado). Variantes: sem óleo 0×, caseiro 1×, bastante óleo 2×.';
comment on column public.alimentos.densidade_g_ml is 'g por ml, pra converter bebida em ml. Sem densidade o scanner não converte.';

-- Preparo pelo nome (só onde ainda não tem).
update public.alimentos set preparo = case
    when nome ~* '\m(cru|crua|crus|cruas)\M' then 'raw'
    when nome ~* '\m(frit[oa]s?|empanad[oa]s?|à milanesa)\M' then 'fried'
    when nome ~* '\m(grelhad[oa]s?|na chapa)\M' then 'grilled'
    when nome ~* '\m(assad[oa]s?|de forno|air fryer)\M' then 'baked'
    when nome ~* '\m(cozid[oa]s?|no vapor|ao vapor)\M' then 'boiled'
  end
where preparo is null
  and nome ~* '\m(cru|crua|crus|cruas|frit[oa]s?|empanad[oa]s?|milanesa|grelhad[oa]s?|chapa|assad[oa]s?|forno|fryer|cozid[oa]s?|vapor)\M';

-- Fora do scanner: variações de porção (mesmo alimento) e suplementos.
update public.alimentos set scanner = false
where scanner and (nome ~ ' — porção ' or categoria = 'suplemento');

-- Prato montado (arroz + feijão + mistura): o scanner separa as partes.
update public.alimentos set representacao = 'componentes'
where representacao is null and categoria in ('refeicao', 'leguminosa')
  and (nome ~* '^arroz,? (com |e )?feij' or nome ~* '^feij[aã]o com arroz' or nome ~* '^prato feito');
update public.alimentos set representacao = 'prato'
where representacao is null and categoria = 'refeicao';

-- Bebidas: ~água (estimativa da equipe). Leite/iogurte líquidos idem.
update public.alimentos set densidade_g_ml = 1.0
where densidade_g_ml is null and categoria = 'bebida';
update public.alimentos set densidade_g_ml = 1.03
where densidade_g_ml is null and nome ~* '^(leite|bebida láctea|iogurte líquido|kefir)';

-- Óleo de preparo caseiro (estimativa da equipe; TACO cozinhou sem óleo):
-- arroz ~2,5% (1 colher de sopa de óleo por xícara de arroz cru), feijão
-- ~1,5% (tempero), carne/frango na chapa ~2%. Só em quem tem pouca gordura
-- na base — "Arroz com alho", "Arroz frito" já trazem o óleo.
update public.alimentos set gordura_preparo_pct = 2.5
where gordura_preparo_pct is null and nome ~* '^arroz (branco|integral|parboilizado|tipo)[^,]* cozido'
  and gordura <= 1.5 * porcao_g / 100.0;
update public.alimentos set gordura_preparo_pct = 1.5
where gordura_preparo_pct is null and nome ~* '^feij[aã]o [a-zà-ú -]+ cozido'
  and gordura <= 1.0 * porcao_g / 100.0;
update public.alimentos set gordura_preparo_pct = 2.0
where gordura_preparo_pct is null and categoria = 'proteina' and preparo = 'grilled'
  and nome ~* '^(frango|carne|bife|patinho|alcatra|contra|file|filé)' and nome !~* 'sem óleo';

-- Porção típica (estimativa da equipe, a calibrar com o beta).
update public.alimentos set porcao_tipica_g = v.g
from (values
  ('^arroz [^,]*cozido', 120), ('^feij[aã]o [^,]*cozido', 140), ('^macarr[aã]o [^,]*cozido', 180),
  ('^(frango|carne bovina|bife|patinho|alcatra)[^,]*(grelhad|assad|cozid)', 120),
  ('^batata (inglesa|doce)[^,]*(cozid|assad)', 120), ('^mandioca cozida|^aipim cozido', 120),
  ('^(alface|rúcula|agrião|acelga)', 30), ('^tomate', 60), ('^ovo (inteiro|cozido|frito|pochê)', 50),
  ('^pão francês$', 50), ('^banana (prata|nanica|maçã|ouro)$', 70), ('^maçã', 130)
) as v(padrao, g)
where public.alimentos.porcao_tipica_g is null and public.alimentos.nome ~* v.padrao;

-- ----------------------------------------------------------------
-- 2. Medidas caseiras
-- ----------------------------------------------------------------
create table if not exists public.alimentos_medidas (
  id           bigint generated always as identity primary key,
  alimento_id  uuid    not null references public.alimentos(id) on delete cascade,
  medida       text    not null, -- normalizada: 'colher de servir', 'concha media', 'unidade'
  gramas       numeric not null check (gramas > 0),
  fonte        text    not null check (fonte in ('tbca', 'pesagem', 'estimativa_equipe')),
  unique (alimento_id, medida)
);
comment on table public.alimentos_medidas is 'Medida caseira -> gramas. Só tbca/pesagem é conversão confiável; estimativa_equipe só sinaliza revisão (e converte "unidade" com premissa visível).';
alter table public.alimentos_medidas enable row level security;
drop policy if exists "alimentos_medidas: leitura" on public.alimentos_medidas;
create policy "alimentos_medidas: leitura" on public.alimentos_medidas for select using (true);
grant select on public.alimentos_medidas to anon, authenticated;

insert into public.alimentos_medidas (alimento_id, medida, gramas, fonte)
select a.id, v.medida, v.g, 'estimativa_equipe'
from public.alimentos a
join (values
  ('^arroz (branco|integral|parboilizado)[^,]* cozido', 'colher de sopa', 25),
  ('^arroz (branco|integral|parboilizado)[^,]* cozido', 'colher de servir', 45),
  ('^arroz (branco|integral|parboilizado)[^,]* cozido', 'escumadeira', 90),
  ('^feij[aã]o [^,]* cozido', 'concha', 140),
  ('^feij[aã]o [^,]* cozido', 'colher de servir', 50),
  ('^macarr[aã]o [^,]* cozido', 'pegador', 110),
  ('^(farofa|farinha de mandioca)', 'colher de sopa', 15),
  ('^ovo (inteiro|cozido|frito|pochê|caipira)', 'unidade', 50),
  ('^ovo de codorna', 'unidade', 10),
  ('^pão francês$', 'unidade', 50),
  ('^pão de queijo$', 'unidade', 40),
  ('^banana (prata|nanica|maçã|ouro)$', 'unidade', 70),
  ('^maçã', 'unidade', 130),
  ('^laranja', 'unidade', 180),
  ('^tomate', 'fatia', 15),
  ('^queijo (muçarela|mussarela|prato|minas)', 'fatia', 20),
  ('^presunto', 'fatia', 15)
) as v(padrao, medida, g) on a.nome ~* v.padrao
where a.scanner
on conflict (alimento_id, medida) do nothing;

-- ----------------------------------------------------------------
-- 3. Análises
-- ----------------------------------------------------------------
create table if not exists public.scan_jobs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  request_id    uuid not null,
  payload_hash  text not null,
  status        text not null check (status in ('processing', 'ready', 'needs_review', 'failed', 'committed')),
  revisao       integer not null default 1,
  tentativa     integer not null default 1,
  lease_ate     timestamptz,
  modelo        text,
  prompt_versao text,
  schema_versao text,
  resultado     jsonb,
  erro          text,
  tempos        jsonb,
  tokens        integer,
  custo         numeric,
  cota_devolvida boolean not null default false,
  commit_key    uuid,
  itens_criados uuid[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, request_id)
);
create unique index if not exists scan_jobs_commit_key on public.scan_jobs (user_id, commit_key) where commit_key is not null;
create index if not exists scan_jobs_user_created on public.scan_jobs (user_id, created_at desc);
comment on table public.scan_jobs is 'Uma análise do scanner. Sem imagem (só o resultado). Escrita só pela ai-proxy (service role).';
alter table public.scan_jobs enable row level security;
drop policy if exists "scan_jobs: leitura pessoal" on public.scan_jobs;
create policy "scan_jobs: leitura pessoal" on public.scan_jobs for select using (auth.uid() = user_id);

create table if not exists public.scan_correcoes (
  id         bigint generated always as identity primary key,
  scan_id    uuid not null references public.scan_jobs(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  revisao    integer not null,
  item_id    text not null,
  campo      text not null check (campo in ('gramas', 'alimento', 'variante', 'removido')),
  antes      jsonb,
  depois     jsonb,
  created_at timestamptz not null default now()
);
alter table public.scan_correcoes enable row level security;
drop policy if exists "scan_correcoes: leitura pessoal" on public.scan_correcoes;
create policy "scan_correcoes: leitura pessoal" on public.scan_correcoes for select using (auth.uid() = user_id);

-- Sem user_id de propósito: serve pra crescer o catálogo, não pra perfilar.
create table if not exists public.scan_nao_resolvidos (
  id             bigint generated always as identity primary key,
  nome_visto     text not null,
  canonical_hint text,
  candidatos     jsonb not null default '[]',
  escolha_final  uuid references public.alimentos(id) on delete set null,
  idioma         text,
  created_at     timestamptz not null default now()
);
alter table public.scan_nao_resolvidos enable row level security;

-- ----------------------------------------------------------------
-- 4. Confirmar (transação única, idempotente)
-- ----------------------------------------------------------------
-- p_itens: [{nome, quantidade_texto, calorias, proteina, carboidrato, gordura}]
--          (calculados NO SERVIDOR pela ai-proxy, nunca vindos do app)
-- p_correcoes: [{item_id, campo, antes, depois}]
-- p_nao_resolvidos: [{nome_visto, canonical_hint, candidatos, escolha_final, idioma}]
create or replace function public.scanner_confirmar(
  p_user_id uuid, p_scan_id uuid, p_revisao integer, p_commit_key uuid,
  p_data date, p_tipo text, p_extra_id uuid,
  p_itens jsonb, p_correcoes jsonb, p_nao_resolvidos jsonb,
  p_descricao text, p_confianca integer, p_resultado_final jsonb
) returns table (status text, itens uuid[])
language plpgsql security definer set search_path = public as $$
declare
  j public.scan_jobs%rowtype;
  ids uuid[];
begin
  select * into j from public.scan_jobs where id = p_scan_id and user_id = p_user_id for update;
  if not found then return query select 'nao_encontrado'::text, null::uuid[]; return; end if;

  if j.status = 'committed' then
    if j.commit_key = p_commit_key then
      return query select 'ja_confirmado'::text, j.itens_criados; return;
    end if;
    return query select 'ja_confirmado_outro'::text, j.itens_criados; return;
  end if;
  if j.status not in ('ready', 'needs_review') then
    return query select 'estado_invalido'::text, null::uuid[]; return;
  end if;
  if j.revisao <> p_revisao then
    return query select 'conflito_revisao'::text, null::uuid[]; return;
  end if;
  if p_tipo not in ('cafe', 'almoco', 'lanche', 'jantar', 'extra') then
    return query select 'tipo_invalido'::text, null::uuid[]; return;
  end if;
  if p_tipo = 'extra' and not exists (
    select 1 from public.refeicoes_extra where id = p_extra_id and user_id = p_user_id
  ) then
    return query select 'tipo_invalido'::text, null::uuid[]; return;
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 or jsonb_array_length(p_itens) > 20 then
    return query select 'itens_invalidos'::text, null::uuid[]; return;
  end if;

  with novos as (
    insert into public.itens_refeicao
      (user_id, data, tipo, refeicao_extra_id, nome, quantidade_texto, calorias, proteina, carboidrato, gordura)
    select p_user_id, p_data, p_tipo, case when p_tipo = 'extra' then p_extra_id end,
           left(i->>'nome', 120), left(i->>'quantidade_texto', 40),
           (i->>'calorias')::numeric, (i->>'proteina')::numeric,
           (i->>'carboidrato')::numeric, (i->>'gordura')::numeric
    from jsonb_array_elements(p_itens) i
    returning id
  )
  select array_agg(id) into ids from novos;

  update public.scan_jobs
     set status = 'committed', commit_key = p_commit_key, itens_criados = ids, updated_at = now()
   where id = p_scan_id;

  insert into public.scan_correcoes (scan_id, user_id, revisao, item_id, campo, antes, depois)
  select p_scan_id, p_user_id, p_revisao, left(c->>'item_id', 40), c->>'campo', c->'antes', c->'depois'
  from jsonb_array_elements(coalesce(p_correcoes, '[]')) c
  where c->>'campo' in ('gramas', 'alimento', 'variante', 'removido');

  insert into public.scan_nao_resolvidos (nome_visto, canonical_hint, candidatos, escolha_final, idioma)
  select left(n->>'nome_visto', 80), left(n->>'canonical_hint', 120), coalesce(n->'candidatos', '[]'),
         (select a.id from public.alimentos a where a.id::text = n->>'escolha_final'), left(n->>'idioma', 8)
  from jsonb_array_elements(coalesce(p_nao_resolvidos, '[]')) n;

  insert into public.scan_historico (user_id, descricao_ia, resultado_final, confianca, data)
  values (p_user_id, left(p_descricao, 200), p_resultado_final, p_confianca, p_data);

  return query select 'ok'::text, ids;
end $$;

revoke all on function public.scanner_confirmar(uuid, uuid, integer, uuid, date, text, uuid, jsonb, jsonb, jsonb, text, integer, jsonb) from public, anon, authenticated;
grant execute on function public.scanner_confirmar(uuid, uuid, integer, uuid, date, text, uuid, jsonb, jsonb, jsonb, text, integer, jsonb) to service_role;
