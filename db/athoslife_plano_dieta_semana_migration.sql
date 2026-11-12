-- ATHOSlife — cardápio de referência por dia da semana (12/11/2026)
--
-- Pedido do dono: o cardápio do plano de dieta era UM dia-modelo, igual todo
-- dia. Agora o app manda até 7 dias (segunda a domingo), cada um com as
-- mesmas metas e alimentos diferentes.
--
-- Como:
--   * aplicar_plano_dieta() NÃO muda. O dia 1 passa por ela inteira: plano
--     pago, check de saúde, metas recalculadas pelo perfil, pisos e cardápio.
--   * Os outros dias passam pela MESMA conferência de cardápio (refeições,
--     alimento existe, nada de suplemento, gramas 5–600, total a até 15% da
--     meta), feita em _plano_dieta_dia().
--   * A semana fica em planos_gerados.parametros->'semana'; a coluna `plano`
--     continua com o dia 1, então APK antigo segue funcionando.
--
-- O app novo tenta esta função e, se ela não existir, cai na antiga com o
-- dia 1 — dá pra publicar o JS antes ou depois de aplicar isto.

create or replace function public._plano_dieta_dia(
  p_cardapio jsonb,
  p_refeicoes integer,
  p_kcal numeric
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_ref jsonb;
  v_item jsonb;
  v_itens jsonb;
  v_plano jsonb := '[]';
  v_tipos text[] := '{}';
  v_alim public.alimentos%rowtype;
  v_gramas numeric;
  v_total_kcal numeric := 0;
begin
  if jsonb_typeof(p_cardapio) <> 'array' or jsonb_array_length(p_cardapio) <> p_refeicoes then
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

  if abs(v_total_kcal - p_kcal) > p_kcal * 0.15 then raise exception 'plano_invalido: cardapio_fora_da_meta'; end if;
  return v_plano;
end;
$$;
revoke all on function public._plano_dieta_dia(jsonb, integer, numeric) from public, anon, authenticated;

create or replace function public.aplicar_plano_dieta_semana(
  p_parametros jsonb,
  p_metas jsonb,
  p_semana jsonb,
  p_gerador_versao text
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_dia jsonb;
  v_dias jsonb := '[]';
  v_kcal numeric := (p_metas->>'kcal')::numeric;
  v_refeicoes integer := (p_parametros->>'refeicoes')::integer;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if jsonb_typeof(p_semana) <> 'array' or jsonb_array_length(p_semana) not between 1 and 7 then
    raise exception 'plano_invalido: semana';
  end if;

  -- Dia 1: todas as travas de sempre (e é ele que grava metas e a linha do plano).
  v_id := public.aplicar_plano_dieta(p_parametros - 'semana', p_metas, p_semana->0, p_gerador_versao);

  -- Todos os dias: mesma conferência de cardápio, com a meta já validada acima.
  for v_dia in select * from jsonb_array_elements(p_semana) loop
    v_dias := v_dias || jsonb_build_array(public._plano_dieta_dia(v_dia, v_refeicoes, v_kcal));
  end loop;

  update public.planos_gerados
  set parametros = parametros || jsonb_build_object('semana', v_dias)
  where id = v_id and user_id = v_uid;

  return v_id;
end;
$$;
revoke all on function public.aplicar_plano_dieta_semana(jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.aplicar_plano_dieta_semana(jsonb, jsonb, jsonb, text) to authenticated;
