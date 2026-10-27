-- Busca de alimentos com o básico primeiro (revisão de 26/10: "frango"
-- trazia "Frango xadrez" antes do frango; "chicken" trazia taco, pizza e
-- sfiha; "egg" mostrava "Eggplant lasagna" entre os 5 primeiros).
-- Ordem nova, nesta sequência:
--   1. nome igual ao termo;
--   2. alimento simples antes de prato pronto e doce ("whey" ainda acha o suplemento);
--   3. alimento da TACO (in natura/básico) antes;
--   4. o termo como palavra inteira ("Boiled egg") > começa com o termo
--      > palavra que começa com o termo ("eggplant") > resto;
--   5. nome mais curto.
-- Conferido no banco antes de aplicar: frango, chicken, pollo, egg, ovo,
-- arroz, rice e banana trazem o alimento simples nos 5 primeiros.
-- Mesma assinatura e mesmo retorno; o app faz a mesma ordem na busca sem
-- internet (alimentosRepository.buscarNaBase).

create or replace function public.buscar_alimentos(
  p_termo text, p_idioma text default 'pt-BR', p_pais text default null, p_limite integer default 20
)
returns table(id uuid, nome text, porcao_g integer, calorias integer, proteina numeric, carboidrato numeric, gordura numeric, categoria text)
language sql
stable
set search_path to 'public'
as $function$
  with t as (select public.normalizar_texto(p_termo) as termo),
  base as (
    select a.*,
      case
        when p_idioma = 'en' then coalesce(a.nome_en, a.nome)
        when p_idioma = 'es' then coalesce(a.nome_es, a.nome)
        else a.nome
      end as nome_local
    from public.alimentos a
  ),
  achados as (
    select b.*, public.normalizar_texto(b.nome_local) as n
    from base b, t
    where t.termo <> ''
      and (b.regioes is null or (p_pais is not null and p_pais = any(b.regioes)) or (p_pais is null and 'BR' = any(b.regioes)))
      and (
        public.normalizar_texto(b.nome) like '%' || t.termo || '%'
        or public.normalizar_texto(b.nome_en) like '%' || t.termo || '%'
        or public.normalizar_texto(b.nome_es) like '%' || t.termo || '%'
      )
  )
  select a.id, a.nome_local, a.porcao_g, a.calorias, a.proteina, a.carboidrato, a.gordura, a.categoria
  from achados a, t
  order by
    case when a.n = t.termo then 0 else 1 end,
    case when a.categoria in ('refeicao', 'doce') then 1 else 0 end,
    case when a.taco_id is not null then 0 else 1 end,
    case
      when (' ' || a.n || ' ') like '% ' || t.termo || ' %' or a.n like t.termo || ',%' or a.n like '% ' || t.termo || ',%' then 0
      when a.n like t.termo || '%' then 1
      when a.n like '% ' || t.termo || '%' then 2
      else 3
    end,
    length(a.nome_local)
  limit least(greatest(p_limite, 1), 50);
$function$;
