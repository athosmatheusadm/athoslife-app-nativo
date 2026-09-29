-- ATHOSlife — plano de referência de DIETA (etapa 2) — 2026-09-29
-- Regras: docs/PLANOS_TREINO_DIETA_DIRETRIZ.md (seção 5). Espelho no app:
-- src/domain/rules/geradorDieta.ts (mesmos números — mudou lá, muda aqui).
--
-- O app manda: parâmetros, metas e cardápio (alimento_id + gramas).
-- O servidor NÃO confia em nada disso:
--   * exige pago + triagem vigente com apto_dieta (calculada no servidor);
--   * recalcula basal/gasto pelo PERFIL (peso, altura, idade, sexo) e só
--     aceita metas dentro das faixas: nunca abaixo do basal nem de 1.200 kcal,
--     perda de no máximo 1% do peso por semana, ganho de no máximo +10%,
--     proteína 1,2–2,2 g/kg, carboidrato >= 130 g, gordura >= 20% das kcal;
--   * emagrecer exige IMC >= 20;
--   * cardápio: 3 ou 4 refeições fixas, alimento existente e fora da
--     categoria 'suplemento' (sem dose de suplemento, nunca), 5–600 g por
--     item, total em kcal (calculado AQUI pela base) a ±15% da meta;
--   * grava as metas no perfil e o plano (com nomes/macros tirados da base)
--     em planos_gerados (append-only, só via esta RPC).
--
-- Depende de: triagens_saude / planos_gerados (athoslife_planos_triagem_migration.sql),
-- is_premium_like.

create or replace function public.aplicar_plano_dieta(
  p_parametros jsonb,
  p_metas jsonb,
  p_cardapio jsonb,
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
  v_perfil public.profiles%rowtype;
  v_objetivo text := p_parametros->>'objetivo';
  v_ritmo text := p_parametros->>'ritmo';
  v_atividade text := p_parametros->>'atividade';
  v_refeicoes integer := (p_parametros->>'refeicoes')::integer;
  v_kcal integer := (p_metas->>'kcal')::integer;
  v_prot integer := (p_metas->>'proteina')::integer;
  v_carb integer := (p_metas->>'carboidrato')::integer;
  v_gord integer := (p_metas->>'gordura')::integer;
  v_fator numeric;
  v_basal numeric;
  v_gasto numeric;
  v_imc numeric;
  v_piso numeric;
  v_peso_prot numeric;
  v_ref jsonb;
  v_item jsonb;
  v_alim public.alimentos%rowtype;
  v_gramas numeric;
  v_total_kcal numeric := 0;
  v_tipos text[] := '{}';
  v_plano jsonb := '[]';
  v_itens jsonb;
  v_plano_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_premium_like(v_uid) then raise exception 'premium_required'; end if;

  select * into v_triagem from public.triagens_saude
  where user_id = v_uid and criado_em > now() - interval '90 days'
  order by criado_em desc limit 1;
  if not found then raise exception 'triagem_necessaria'; end if;
  if not v_triagem.apto_dieta then raise exception 'triagem_inapta'; end if;

  -- Parâmetros
  if v_objetivo not in ('emagrecer', 'manter', 'massa') then raise exception 'plano_invalido: objetivo'; end if;
  if v_ritmo not in ('leve', 'moderado') then raise exception 'plano_invalido: ritmo'; end if;
  v_fator := case v_atividade
    when 'sedentario' then 1.2 when 'leve' then 1.375 when 'moderado' then 1.55 when 'alto' then 1.725 end;
  if v_fator is null then raise exception 'plano_invalido: atividade'; end if;
  if v_refeicoes not in (3, 4) then raise exception 'plano_invalido: refeicoes'; end if;

  -- Corpo: SEMPRE do perfil, nunca do que o app mandou.
  select * into v_perfil from public.profiles where id = v_uid;
  if v_perfil.peso_atual is null or v_perfil.altura_cm is null or v_perfil.idade is null then
    raise exception 'perfil_incompleto';
  end if;
  v_basal := 10 * v_perfil.peso_atual + 6.25 * v_perfil.altura_cm - 5 * v_perfil.idade
    + case v_perfil.sexo when 'masculino' then 5 when 'feminino' then -161 else -78 end;
  v_gasto := v_basal * v_fator;
  v_imc := v_perfil.peso_atual / ((v_perfil.altura_cm / 100.0) ^ 2);

  if v_objetivo = 'emagrecer' and v_imc < 20 then raise exception 'plano_invalido: imc_emagrecer'; end if;

  -- Metas (folga de 10 kcal pro arredondamento do app)
  if v_kcal is null or v_prot is null or v_carb is null or v_gord is null then
    raise exception 'plano_invalido: metas';
  end if;
  v_piso := greatest(v_basal, 1200);
  if v_kcal < v_piso - 10 then raise exception 'plano_invalido: abaixo_do_basal'; end if;
  if v_objetivo = 'emagrecer' then
    -- Perda máxima: 1% do peso por semana (7.700 kcal/kg), nunca mais que 25%
    -- do gasto e nunca abaixo do piso. (O app usa no máximo 0,75%.)
    if v_kcal > greatest(v_gasto, v_piso) + 10 then raise exception 'plano_invalido: kcal'; end if;
    if v_kcal < greatest(v_gasto - least(v_perfil.peso_atual * 0.01 * 7700 / 7, v_gasto * 0.25), v_piso) - 10 then
      raise exception 'plano_invalido: deficit';
    end if;
  elsif v_objetivo = 'massa' then
    if v_kcal < v_gasto - 10 or v_kcal > v_gasto * 1.10 + 10 then raise exception 'plano_invalido: kcal'; end if;
  else
    if abs(v_kcal - v_gasto) > v_gasto * 0.10 then raise exception 'plano_invalido: kcal'; end if;
  end if;

  -- Proteína: 1,2 g/kg (peso ajustado se IMC >= 30) até 2,2 g/kg do peso.
  v_peso_prot := case when v_imc >= 30
    then 25 * (v_perfil.altura_cm / 100.0) ^ 2 + 0.25 * (v_perfil.peso_atual - 25 * (v_perfil.altura_cm / 100.0) ^ 2)
    else v_perfil.peso_atual end;
  if v_prot < v_peso_prot * 1.2 - 1 or v_prot > v_perfil.peso_atual * 2.2 then
    raise exception 'plano_invalido: proteina';
  end if;
  if v_carb < 130 then raise exception 'plano_invalido: carboidrato'; end if;
  if v_gord * 9 < v_kcal * 0.2 - 9 then raise exception 'plano_invalido: gordura'; end if;
  if abs(v_prot * 4 + v_carb * 4 + v_gord * 9 - v_kcal) > v_kcal * 0.05 then
    raise exception 'plano_invalido: soma_macros';
  end if;

  -- Cardápio: macros calculados aqui, pela base.
  if jsonb_typeof(p_cardapio) <> 'array' or jsonb_array_length(p_cardapio) <> v_refeicoes then
    raise exception 'plano_invalido: cardapio';
  end if;

  for v_ref in select * from jsonb_array_elements(p_cardapio) loop
    if (v_ref->>'tipo') not in ('cafe', 'almoco', 'lanche', 'jantar') or (v_ref->>'tipo') = any(v_tipos) then
      raise exception 'plano_invalido: refeicao';
    end if;
    v_tipos := array_append(v_tipos, v_ref->>'tipo');
    if jsonb_typeof(v_ref->'itens') <> 'array' or jsonb_array_length(v_ref->'itens') not between 1 and 8 then
      raise exception 'plano_invalido: itens';
    end if;

    v_itens := '[]';
    for v_item in select * from jsonb_array_elements(v_ref->'itens') loop
      select * into v_alim from public.alimentos where id = (v_item->>'alimento_id')::uuid;
      if not found then raise exception 'plano_invalido: alimento'; end if;
      if v_alim.categoria = 'suplemento' then raise exception 'plano_invalido: suplemento'; end if;
      v_gramas := (v_item->>'gramas')::numeric;
      if v_gramas is null or v_gramas not between 5 and 600 then raise exception 'plano_invalido: gramas'; end if;

      v_total_kcal := v_total_kcal + coalesce(v_alim.calorias, 0) * v_gramas / greatest(coalesce(v_alim.porcao_g, 100), 1);
      v_itens := v_itens || jsonb_build_object(
        'alimento_id', v_alim.id,
        'nome', v_alim.nome,
        'nome_en', v_alim.nome_en,
        'nome_es', v_alim.nome_es,
        'porcao_g', v_alim.porcao_g,
        'gramas', v_gramas,
        'calorias', round(coalesce(v_alim.calorias, 0) * v_gramas / greatest(coalesce(v_alim.porcao_g, 100), 1)),
        'proteina', round(coalesce(v_alim.proteina, 0) * v_gramas / greatest(coalesce(v_alim.porcao_g, 100), 1), 1),
        'carboidrato', round(coalesce(v_alim.carboidrato, 0) * v_gramas / greatest(coalesce(v_alim.porcao_g, 100), 1), 1),
        'gordura', round(coalesce(v_alim.gordura, 0) * v_gramas / greatest(coalesce(v_alim.porcao_g, 100), 1), 1)
      );
    end loop;
    v_plano := v_plano || jsonb_build_object('tipo', v_ref->>'tipo', 'itens', v_itens);
  end loop;

  if abs(v_total_kcal - v_kcal) > v_kcal * 0.15 then raise exception 'plano_invalido: cardapio_fora_da_meta'; end if;

  -- Aplica: metas no perfil (água por 35 ml/kg, de 250 em 250).
  update public.profiles set
    kcal_meta = v_kcal,
    prot_meta = v_prot,
    carbo_meta = v_carb,
    gord_meta = v_gord,
    agua_meta_ml = (round(v_perfil.peso_atual * 35 / 250.0) * 250)::integer
  where id = v_uid;

  insert into public.planos_gerados (user_id, tipo, triagem_id, parametros, plano, gerador_versao)
  values (
    v_uid, 'dieta', v_triagem.id,
    p_parametros || jsonb_build_object(
      'metas', p_metas,
      'basal', round(v_basal), 'gasto', round(v_gasto),
      'peso_kg', v_perfil.peso_atual, 'total_cardapio_kcal', round(v_total_kcal)
    ),
    v_plano,
    p_gerador_versao
  )
  returning id into v_plano_id;

  return v_plano_id;
end;
$$;

revoke all on function public.aplicar_plano_dieta(jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.aplicar_plano_dieta(jsonb, jsonb, jsonb, text) to authenticated;
