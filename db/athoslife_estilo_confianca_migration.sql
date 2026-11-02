-- ================================================================
-- ATHOSlife · Jeito de falar com confiança (02/11/2026)
-- docs/PLANO_LIFE_ACOES.md, Fase 6 (guia item 10).
--
-- 1. life_memorias_contexto devolve também a confiança (estilo com
--    confiança baixa entra no prompt como "parece preferir", alta como regra).
-- 2. life_memoria_aplicar: estilo confirmado (texto parecido) sobe +0,15;
--    estilo contrariado na mesma chave é trocado com a confiança nova
--    (antes só subia, e o palpite errado ficava firme).
-- Aplicar ANTES do deploy da ai-proxy que lê `confianca`.
-- ================================================================

-- o tipo de retorno muda: precisa dropar
drop function if exists public.life_memorias_contexto(uuid, text, date, integer, boolean);
create or replace function public.life_memorias_contexto(
  p_user_id uuid, p_mensagem text, p_hoje date, p_limite integer default 20, p_tudo boolean default false
)
returns table(id uuid, texto text, categoria text, data_referencia date, fixada boolean, nivel text, estado text, chave text, confianca real)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_msg text := coalesce(p_mensagem, '');
  v_fatos int := case when p_tudo then 60 else greatest(1, least(coalesce(p_limite, 20), 40)) end;
begin
  -- Evento antigo vira história; contexto vencido expira.
  update public.life_memorias m set estado = 'fechado', atualizado_em = now()
   where m.user_id = p_user_id and m.nivel = 'evento' and not m.fixada and m.estado <> 'fechado'
     and m.data_referencia is not null and m.data_referencia < p_hoje - 7
     and (m.retomar_em is null or m.retomar_em < p_hoje - 7);
  update public.life_memorias m set estado = 'fechado', atualizado_em = now()
   where m.user_id = p_user_id and m.nivel = 'contexto' and not m.fixada and m.estado <> 'fechado'
     and m.expira_em is not null and m.expira_em < p_hoje;

  return query
  with todas as (
    select m.*, greatest(similarity(m.texto, v_msg), word_similarity(v_msg, m.texto)) as parecido
      from public.life_memorias m
     where m.user_id = p_user_id
  ), vivas as (
    select * from todas t where t.estado <> 'fechado' or t.fixada
  ), escolhidas as (
    (select v.*, 100.0 + v.importancia as pontos from vivas v
      where v.nivel = 'nucleo' or v.fixada
      order by v.importancia desc, v.atualizado_em desc limit 15)
    union all
    (select v.*, 90.0 + v.confianca from vivas v
      where v.nivel = 'estilo' and not v.fixada
      order by v.confianca desc, v.atualizado_em desc limit 6)
    union all
    (select v.*, 50.0 + v.importancia + v.parecido * 3
           + 1.0 / (1 + extract(epoch from (now() - coalesce(v.usado_em, v.atualizado_em))) / 86400 / 90) from vivas v
      where v.nivel = 'fato' and not v.fixada
      order by v.importancia + v.parecido * 3 desc, v.atualizado_em desc limit v_fatos)
    union all
    (select v.*, 40.0 + v.importancia from vivas v
      where v.nivel = 'contexto' and not v.fixada
      order by v.atualizado_em desc limit 5)
    union all
    -- eventos vivos: próximos 7 dias (e ontem) + abertos com retorno vencido; importantes primeiro
    (select v.*, 30.0 + v.importancia from vivas v
      where v.nivel = 'evento' and not v.fixada
        and ((v.data_referencia between p_hoje - 1 and p_hoje + 7)
             or (v.estado = 'aberto' and v.retomar_em is not null and v.retomar_em <= p_hoje))
      order by v.importancia desc, coalesce(v.retomar_em, v.data_referencia) limit case when p_tudo then 6 else 3 end)
    union all
    -- história: evento importante que já passou volta quando a conversa toca nele,
    -- no aniversário da data (±1 dia, mais de 300 dias atrás) ou no "o que você lembra?"
    (select t.*, 25.0 + t.parecido from todas t
      where t.nivel = 'evento' and t.estado = 'fechado' and not t.fixada and t.importancia >= 3
        and (t.parecido > 0.5
             or public.life_palavra_comum(v_msg, t.texto)
             or p_tudo
             or (t.data_referencia is not null and t.data_referencia < p_hoje - 300
                 and abs((p_hoje - (t.data_referencia + make_interval(years => extract(year from age(p_hoje, t.data_referencia))::int))::date)) <= 1))
      order by t.parecido desc, t.data_referencia desc limit case when p_tudo then 4 else 2 end)
    union all
    (select v.*, 20.0 + v.parecido from vivas v
      where v.nivel = 'fragmento' and not v.fixada and v.parecido > 0.25
      order by v.parecido desc limit 1)
  ), marcadas as (
    update public.life_memorias m set usado_em = now() from escolhidas e where m.id = e.id returning m.id
  )
  select e.id, e.texto, e.categoria, e.data_referencia, e.fixada, e.nivel, e.estado, e.chave, e.confianca
    from escolhidas e order by e.pontos desc;
end;
$$;
revoke execute on function public.life_memorias_contexto(uuid, text, date, integer, boolean) from public, anon, authenticated;

create or replace function public.life_memoria_aplicar(p_user_id uuid, p_ops jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  op     jsonb;
  v_faz  text;
  v_cat  text;
  v_niv  text;
  v_chv  text;
  v_txt  text;
  v_id   uuid;
  v_imp  smallint;
  v_conf real;
  v_salvas int := 0;
  v_fechadas int := 0;
begin
  if not exists (select 1 from public.profiles where id = p_user_id and consentimento_memoria is true) then
    return jsonb_build_object('status', 'sem_consentimento');
  end if;
  if jsonb_typeof(p_ops) <> 'array' then return jsonb_build_object('status', 'invalida'); end if;

  for op in select * from jsonb_array_elements(p_ops) limit 12 loop
   begin
    v_faz := op->>'faz';
    v_chv := nullif(lower(btrim(coalesce(op->>'chave', ''))), '');
    if v_chv is not null and (char_length(v_chv) < 3 or char_length(v_chv) > 80) then continue; end if;

    if v_faz = 'fechar' then
      if v_chv is null then continue; end if;
      update public.life_memorias set estado = 'fechado', atualizado_em = now()
       where user_id = p_user_id and chave = v_chv and estado in ('ativo', 'aberto') and not fixada;
      if found then v_fechadas := v_fechadas + 1; end if;
      continue;
    end if;
    if v_faz not in ('criar', 'corrigir') then continue; end if;

    v_txt := btrim(regexp_replace(coalesce(op->>'texto', ''), '\s+', ' ', 'g'));
    v_cat := op->>'categoria';
    if char_length(v_txt) < 3 or char_length(v_txt) > 200
       or v_cat not in ('gosto', 'rotina', 'objetivo', 'evento', 'pessoa', 'estilo', 'contexto', 'fragmento') then
      continue;
    end if;
    v_niv := coalesce(nullif(op->>'nivel', ''), public.life_nivel_da_categoria(v_cat));
    if v_niv not in ('nucleo', 'fato', 'estilo', 'evento', 'contexto', 'fragmento') then
      v_niv := public.life_nivel_da_categoria(v_cat);
    end if;
    v_imp := least(greatest(coalesce(round((op->>'importancia')::numeric)::smallint, 2), 1), 3);
    v_conf := least(greatest(coalesce((op->>'confianca')::real, 1), 0), 1);

    v_id := null;
    if v_chv is not null then
      select id into v_id from public.life_memorias
       where user_id = p_user_id and chave = v_chv and estado in ('ativo', 'aberto');
    end if;
    if v_id is null then
      select id into v_id from public.life_memorias
       where user_id = p_user_id and estado in ('ativo', 'aberto') and nivel = v_niv
         and similarity(texto, v_txt) > 0.55
       order by similarity(texto, v_txt) desc limit 1;
    end if;

    -- o que ela pediu (confiança 1) não é trocado por palpite deduzido
    if v_id is not null and v_niv = 'estilo' and v_conf < 1 and exists (
         select 1 from public.life_memorias
          where id = v_id and confianca >= 1 and similarity(texto, v_txt) <= 0.55) then
      continue;
    end if;

    if v_id is not null then
      update public.life_memorias set
        texto = v_txt, categoria = v_cat, nivel = v_niv,
        chave = coalesce(v_chv, chave),
        importancia = greatest(importancia, v_imp),
        -- estilo: palpite confirmado (texto parecido) ganha confiança; contrariado é trocado (Fase 6)
        confianca = case when v_niv = 'estilo' and similarity(texto, v_txt) > 0.55
                         then least(1, greatest(confianca, v_conf) + 0.15)
                         else v_conf end,
        data_referencia = coalesce((op->>'data_referencia')::date, data_referencia),
        estado = case when op->>'estado' in ('ativo', 'aberto') then op->>'estado' else estado end,
        retomar_em = coalesce((op->>'retomar_em')::date, retomar_em),
        expira_em = coalesce((op->>'expira_em')::date, expira_em),
        atualizado_em = now()
       where id = v_id;
    else
      insert into public.life_memorias
        (user_id, texto, categoria, nivel, chave, importancia, confianca, data_referencia, estado, retomar_em, expira_em, origem)
      values
        (p_user_id, v_txt, v_cat, v_niv, v_chv, v_imp, v_conf, (op->>'data_referencia')::date,
         case when op->>'estado' = 'aberto' then 'aberto' else 'ativo' end,
         (op->>'retomar_em')::date, (op->>'expira_em')::date, 'chat');
    end if;
    v_salvas := v_salvas + 1;
   exception when others then
    -- operação torta (data inválida, número estranho): perde só ela
    raise warning 'life_memoria_aplicar: op ignorada: %', left(sqlerrm, 200);
   end;
  end loop;

  perform public.life_memorias_faxina(p_user_id);
  return jsonb_build_object('status', 'ok', 'salvas', v_salvas, 'fechadas', v_fechadas);
end;
$function$;
revoke execute on function public.life_memoria_aplicar(uuid, jsonb) from public, anon, authenticated;
