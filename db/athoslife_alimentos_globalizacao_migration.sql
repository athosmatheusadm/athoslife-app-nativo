-- ATHOSlife — base de alimentos para outros países (2026-09-28)
--
-- 1. Nome em inglês e espanhol (nome_en/nome_es); `nome` segue pt-BR.
-- 2. regioes: países onde o item aparece (ISO alfa-2). NULL = mundo todo.
--    Ex.: marcas de suplemento vendidas só no Brasil = {BR}.
-- 3. RPC buscar_alimentos: busca no idioma da pessoa (sem acento/caixa),
--    filtra por país e devolve o nome já traduzido. Sem tradução, cai no pt.
--
-- Depende de public.normalizar_texto (db/athoslife_habitos_proibidos_consentimento_migration.sql).
--
-- DADOS (rodados via MCP em 2026-09-28, não repetidos aqui por tamanho):
--   * nome_en/nome_es preenchidos pra todos os 1.481 itens genéricos;
--   * 110 suplementos de marca brasileira (Growth, Max Titanium, Integralmedica,
--     Probiótica, Dux, Black Skull...) com regioes = {BR}, nome só em pt;
--   * 57 alimentos comuns de fora (pancakes, bagel já existia, tortilla chips,
--     salsa, refried beans, arepa, tamale, paella, kimchi, dal, shawarma,
--     ceviche, gallo pinto...) com porcao_g = 100 e valores médios USDA.
--   Fonte da verdade = a tabela (backup diário do Supabase).

alter table public.alimentos
  add column if not exists nome_en text,
  add column if not exists nome_es text,
  add column if not exists regioes text[];

create index if not exists alimentos_regioes_idx on public.alimentos using gin (regioes);

create or replace function public.buscar_alimentos(
  p_termo text,
  p_idioma text default 'pt-BR',
  p_pais text default null,
  p_limite integer default 20
)
returns table(id uuid, nome text, porcao_g integer, calorias integer, proteina numeric, carboidrato numeric, gordura numeric, categoria text)
language sql
stable
security invoker
set search_path to 'public'
as $$
  with t as (select public.normalizar_texto(p_termo) as termo),
  base as (
    select a.*,
      case
        when p_idioma = 'en' then coalesce(a.nome_en, a.nome)
        when p_idioma = 'es' then coalesce(a.nome_es, a.nome)
        else a.nome
      end as nome_local
    from public.alimentos a
  )
  select b.id, b.nome_local, b.porcao_g, b.calorias, b.proteina, b.carboidrato, b.gordura, b.categoria
  from base b, t
  where t.termo <> ''
    and (b.regioes is null or (p_pais is not null and p_pais = any(b.regioes)) or (p_pais is null and 'BR' = any(b.regioes)))
    and (
      public.normalizar_texto(b.nome) like '%' || t.termo || '%'
      or public.normalizar_texto(b.nome_en) like '%' || t.termo || '%'
      or public.normalizar_texto(b.nome_es) like '%' || t.termo || '%'
    )
  order by
    -- nome no idioma da pessoa que COMEÇA com o termo vem primeiro
    case when public.normalizar_texto(b.nome_local) like t.termo || '%' then 0 else 1 end,
    length(b.nome_local)
  limit least(greatest(p_limite, 1), 50);
$$;

grant execute on function public.buscar_alimentos(text, text, text, integer) to authenticated;
