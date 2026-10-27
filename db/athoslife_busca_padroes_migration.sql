-- Busca com o alimento "padrão" primeiro (27/10, conferindo a refeição
-- digitada no chat). O chat pega só o 1º resultado, e ele estava errado:
-- "arroz" virava Farinha de arroz, "rice" virava Rice flour, "taco" no
-- México virava Água de coco Vita Coco (o apelido "vitacoco" contém "taco").
--
-- Mudanças:
--  1. Apelidos padrão no alimento que a pessoa quer dizer quando fala só a
--     palavra: arroz -> Arroz branco cozido, feijão -> carioca, ovo -> cozido,
--     banana -> prata, frango -> peito grelhado, bife -> contrafilé,
--     pão -> francês, leite -> integral, taco -> Taco de carne.
--  2. Ordem: nome igual/apelido exato > casou pelo NOME (casou só pelo
--     apelido vai depois; mantém "refrigerante" com o genérico antes das
--     marcas, como o dono aprovou) > simples antes de prato pronto/doce >
--     TACO > o termo como 1ª palavra > palavra inteira > começa com > resto
--     > nome curto.
--  3. Sai o apelido "vitacoco".
-- Conferido antes com uma consulta só de leitura igual a esta ordem: arroz,
-- rice, feijão, ovo, egg, banana, frango, chicken, pollo, pão, taco (MX),
-- coca, refrigerante, whey e suco de laranja vêm com o esperado no topo.

update public.alimentos a
set aliases = (select array_agg(distinct x) from unnest(a.aliases || p.al) x)
from (values
  ('Arroz branco cozido', array['arroz', 'rice', 'white rice']),
  ('Feijão carioca cozido', array['feijao', 'beans']),
  ('Ovo cozido', array['ovo', 'egg', 'huevo']),
  ('Banana prata', array['banana']),
  ('Frango peito grelhado', array['frango', 'chicken', 'pollo']),
  ('Contrafilé grelhado', array['bife', 'steak']),
  ('Pão francês', array['pao', 'pao frances']),
  ('Leite integral', array['leite', 'milk', 'leche']),
  ('Taco de carne', array['taco'])
) as p(nome, al)
where a.nome = p.nome;

update public.alimentos set aliases = array_remove(aliases, 'vitacoco')
where nome = 'Água de coco Vita Coco';

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
    select b.*, public.normalizar_texto(b.nome_local) as n,
      (
        public.normalizar_texto(b.nome) like '%' || t.termo || '%'
        or public.normalizar_texto(b.nome_en) like '%' || t.termo || '%'
        or public.normalizar_texto(b.nome_es) like '%' || t.termo || '%'
      ) as pelo_nome
    from base b, t
    where t.termo <> ''
      and (b.regioes is null or (p_pais is not null and p_pais = any(b.regioes)) or (p_pais is null and 'BR' = any(b.regioes)))
  )
  select a.id, a.nome_local, a.porcao_g, a.calorias, a.proteina, a.carboidrato, a.gordura, a.categoria
  from achados a, t
  where a.pelo_nome
     or exists (select 1 from unnest(a.aliases) al where public.normalizar_texto(al) like '%' || t.termo || '%')
  order by
    case when a.n = t.termo or exists (select 1 from unnest(a.aliases) al where public.normalizar_texto(al) = t.termo) then 0 else 1 end,
    case when a.pelo_nome then 0 else 1 end,
    case when a.categoria in ('refeicao', 'doce') then 1 else 0 end,
    case when a.taco_id is not null then 0 else 1 end,
    case
      when a.n = t.termo or a.n like t.termo || ' %' then 0
      when (' ' || a.n || ' ') like '% ' || t.termo || ' %' then 1
      when a.n like t.termo || '%' then 2
      when a.n like '% ' || t.termo || '%' then 3
      else 4
    end,
    length(a.nome_local)
  limit least(greatest(p_limite, 1), 50);
$function$;
