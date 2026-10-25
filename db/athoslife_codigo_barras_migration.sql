-- ATHOSlife — base própria de códigos de barras (2026-10-25)
--
-- O Open Food Facts sozinho deixava muito produto brasileiro de fora.
-- Esta tabela guarda:
--   * o que o app achou nas bases públicas (Open Food Facts, USDA): da
--     próxima vez sai daqui, mais rápido;
--   * o que as pessoas cadastram pelo rótulo quando nenhuma base conhece o
--     produto: quem escanear depois já encontra.
--
-- Escrita só pela função `salvar_produto_codigo_barras` (checa os números e
-- limita 60 gravações por pessoa por dia). Produto novo entra; um que já
-- existe só muda pelo próprio autor, ou quando um cadastro de usuário é
-- trocado pelo dado de uma base pública.

create table if not exists public.produtos_codigo_barras (
  codigo        text primary key check (codigo ~ '^[0-9]{8,14}$'),
  nome          text not null check (char_length(nome) between 2 and 120),
  marca         text check (marca is null or char_length(marca) <= 80),
  kcal_100      numeric not null check (kcal_100 between 0 and 950),
  proteina_100  numeric not null check (proteina_100 between 0 and 100),
  carbo_100     numeric not null check (carbo_100 between 0 and 100),
  gordura_100   numeric not null check (gordura_100 between 0 and 100),
  porcao_g      numeric check (porcao_g is null or porcao_g between 1 and 2000),
  imagem_url    text check (imagem_url is null or imagem_url ~ '^https://'),
  fonte         text not null check (fonte in ('off', 'usda', 'usuario')),
  criado_por    uuid references auth.users (id) on delete set null,
  usos          integer not null default 1,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.produtos_codigo_barras enable row level security;

drop policy if exists produtos_codigo_barras_ler on public.produtos_codigo_barras;
create policy produtos_codigo_barras_ler on public.produtos_codigo_barras
  for select to authenticated using (true);

revoke all on public.produtos_codigo_barras from anon, authenticated;
grant select on public.produtos_codigo_barras to authenticated;

create or replace function public.salvar_produto_codigo_barras(
  p_codigo text,
  p_nome text,
  p_marca text,
  p_kcal numeric,
  p_proteina numeric,
  p_carbo numeric,
  p_gordura numeric,
  p_porcao_g numeric,
  p_imagem_url text,
  p_fonte text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_atual text;
  v_hoje integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_fonte not in ('off', 'usda', 'usuario') then
    raise exception 'fonte_invalida';
  end if;
  -- Rótulo coerente: macros não passam de 100 g por 100 g, e as calorias
  -- batem (com folga larga pra fibra/álcool/arredondamento).
  if coalesce(p_proteina, 0) + coalesce(p_carbo, 0) + coalesce(p_gordura, 0) > 100.5 then
    raise exception 'rotulo_invalido';
  end if;
  if p_kcal > (p_proteina * 4 + p_carbo * 4 + p_gordura * 9) * 1.6 + 40 then
    raise exception 'rotulo_invalido';
  end if;

  select count(*) into v_hoje
    from produtos_codigo_barras
   where criado_por = v_uid and atualizado_em > now() - interval '1 day';
  if v_hoje >= 60 then
    raise exception 'limite_cadastros';
  end if;

  select fonte into v_atual from produtos_codigo_barras where codigo = p_codigo;
  if v_atual is not null then
    select case when criado_por = v_uid then 'meu' else v_atual end into v_atual
      from produtos_codigo_barras where codigo = p_codigo;
  end if;

  if v_atual is null then
    insert into produtos_codigo_barras
      (codigo, nome, marca, kcal_100, proteina_100, carbo_100, gordura_100, porcao_g, imagem_url, fonte, criado_por)
    values
      (p_codigo, trim(p_nome), nullif(trim(p_marca), ''), round(p_kcal), round(p_proteina, 1), round(p_carbo, 1),
       round(p_gordura, 1), p_porcao_g, p_imagem_url, p_fonte, v_uid);
  elsif v_atual = 'meu' or (p_fonte <> 'usuario' and v_atual = 'usuario') then
    -- O autor corrige o que gravou; dado de base pública substitui cadastro de usuário.
    update produtos_codigo_barras set
      nome = trim(p_nome), marca = nullif(trim(p_marca), ''),
      kcal_100 = round(p_kcal), proteina_100 = round(p_proteina, 1), carbo_100 = round(p_carbo, 1),
      gordura_100 = round(p_gordura, 1), porcao_g = p_porcao_g,
      imagem_url = coalesce(p_imagem_url, imagem_url), fonte = p_fonte,
      criado_por = v_uid, usos = usos + 1, atualizado_em = now()
    where codigo = p_codigo;
  end if;
end;
$$;

revoke all on function public.salvar_produto_codigo_barras(text, text, text, numeric, numeric, numeric, numeric, numeric, text, text) from public, anon;
grant execute on function public.salvar_produto_codigo_barras(text, text, text, numeric, numeric, numeric, numeric, numeric, text, text) to authenticated;
