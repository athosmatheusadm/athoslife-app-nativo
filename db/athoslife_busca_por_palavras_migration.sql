-- ATHOSlife — busca de alimentos por palavras (11/11/2026)
--
-- Problema (teste do dono no APK de 11/11): no chat, "arroz cozido" virava
-- "Macarrão de arroz cozido". A busca só aceitava o termo inteiro grudado no
-- nome, e esse era o único alimento com "arroz cozido" junto; "Arroz branco
-- cozido" ficava de fora por ter "branco" no meio. Pelo mesmo motivo
-- "macarrão cozido" e "ovos fritos" não achavam nada e "frango grelhado" caía
-- num prato pronto.
--
-- O que muda:
--   1. Além do termo grudado, vale o nome que tem TODAS as palavras do termo,
--      em qualquer ordem (cada palavra casa com o começo de uma palavra do
--      nome; plural simples com "s" no fim é tolerado: "ovos fritos" acha
--      "Ovo frito"). Palavras de ligação (de, com, e...) não contam.
--   2. Na ordem entram dois critérios novos, depois de "prato pronto por
--      último" e só quando o termo tem 2+ palavras: o alimento cujo nome
--      COMEÇA pela primeira palavra do termo vem antes ("arroz cozido" ->
--      "Arroz ..." antes de "Macarrão de arroz ..."), e entre esses o básico
--      daquela palavra (o que a tem como apelido). Busca de uma palavra só
--      ("arroz", "coca", "guaraná") dá exatamente o mesmo resultado de antes.
--
-- O que NÃO muda: a ordem aprovada pelo dono em 27/10 (igual exato primeiro,
-- nome antes de apelido de marca, básico antes de prato pronto, TACO antes).
-- Assinatura, retorno e permissões são os mesmos.

create or replace function public.buscar_alimentos(
  p_termo text,
  p_idioma text default 'pt-BR',
  p_pais text default null,
  p_limite integer default 20
)
returns table (
  id uuid, nome text, porcao_g integer, calorias integer,
  proteina numeric, carboidrato numeric, gordura numeric, categoria text
)
language sql
stable
set search_path = public
as $$
  with t as (
    select btrim(public.normalizar_texto(p_termo)) as termo
  ),
  -- Palavras do termo, sem as de ligação. Se sobrar nenhuma (termo só com
  -- ligação), a busca por palavras não entra e vale só a busca grudada.
  p as (
    select array(
      select w
      from unnest(string_to_array((select termo from t), ' ')) with ordinality as x(w, ord)
      where length(w) >= 2
        and w not in ('de','da','do','das','dos','com','sem','e','em','no','na','ao','a','o',
                      'the','of','with','and','con','sin','y','el','la','los','las','del',
                      'du','des','et','au','aux','le','les','avec')
      order by ord
    ) as palavras
  ),
  base as (
    select a.*,
      case
        when p_idioma = 'en' then coalesce(a.nome_en, a.nome)
        when p_idioma = 'es' then coalesce(a.nome_es, a.nome)
        when p_idioma = 'fr' then coalesce(a.nome_fr, a.nome_en, a.nome)
        when p_idioma = 'hi' then coalesce(a.nome_hi, a.nome_en, a.nome)
        else a.nome
      end as nome_local
    from public.alimentos a
  ),
  achados as (
    select b.*, btrim(public.normalizar_texto(b.nome_local)) as n,
      (
        public.normalizar_texto(b.nome) like '%' || t.termo || '%'
        or public.normalizar_texto(b.nome_en) like '%' || t.termo || '%'
        or public.normalizar_texto(b.nome_es) like '%' || t.termo || '%'
        or public.normalizar_texto(b.nome_fr) like '%' || t.termo || '%'
        or public.normalizar_texto(b.nome_hi) like '%' || t.termo || '%'
      ) as grudado,
      -- Todas as palavras do termo no nome (no idioma da pessoa ou em pt).
      (
        cardinality(p.palavras) >= 2
        and (
          not exists (
            select 1 from unnest(p.palavras) w
            where not (
              (' ' || btrim(public.normalizar_texto(b.nome_local))) like '% ' || w || '%'
              or (length(w) >= 4 and right(w, 1) = 's'
                  and (' ' || btrim(public.normalizar_texto(b.nome_local))) like '% ' || left(w, length(w) - 1) || '%')
            )
          )
          or not exists (
            select 1 from unnest(p.palavras) w
            where not (
              (' ' || btrim(public.normalizar_texto(b.nome))) like '% ' || w || '%'
              or (length(w) >= 4 and right(w, 1) = 's'
                  and (' ' || btrim(public.normalizar_texto(b.nome))) like '% ' || left(w, length(w) - 1) || '%')
            )
          )
        )
      ) as por_palavras,
      p.palavras[1] as primeira,
      cardinality(p.palavras) as qtd
    from base b, t, p
    where t.termo <> ''
      and (b.regioes is null or (p_pais is not null and p_pais = any(b.regioes)) or (p_pais is null and 'BR' = any(b.regioes)))
  )
  select a.id, a.nome_local, a.porcao_g, a.calorias, a.proteina, a.carboidrato, a.gordura, a.categoria
  from achados a, t
  where a.grudado
     or a.por_palavras
     or exists (select 1 from unnest(a.aliases) al where public.normalizar_texto(al) like '%' || t.termo || '%')
  order by
    case when a.n = t.termo or exists (select 1 from unnest(a.aliases) al where btrim(public.normalizar_texto(al)) = t.termo) then 0 else 1 end,
    case when a.grudado or a.por_palavras then 0 else 1 end,
    case when a.categoria in ('refeicao', 'doce') then 1 else 0 end,
    -- Novo: o nome começa pela primeira palavra do termo ("arroz ..." antes
    -- de "macarrão de arroz ..."). Plural simples tolerado dos dois lados.
    -- Só para termo com 2+ palavras: busca de uma palavra só fica como era.
    case
      when a.qtd < 2 then 0
      when regexp_replace(split_part(a.n, ' ', 1), 's$', '') = regexp_replace(a.primeira, 's$', '') then 0
      else 1
    end,
    -- Novo, também só com 2+ palavras: o básico daquela palavra primeiro (o
    -- alimento que tem a primeira palavra como apelido: "arroz" -> Arroz
    -- branco cozido, "feijão" -> Feijão carioca cozido).
    case
      when a.qtd < 2 then 0
      when exists (select 1 from unnest(a.aliases) al where btrim(public.normalizar_texto(al)) = a.primeira) then 0
      else 1
    end,
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
$$;
