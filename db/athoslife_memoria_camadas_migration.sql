-- ================================================================
-- ATHOSlife · Memória em camadas do Life (01/11/2026)
-- Guia "Life: conversa e memória" do dono, seção Memória.
--
-- Antes: 1 marca por resposta, até 80 por pessoa, eventos APAGADOS 7 dias
-- depois, 10 por resposta disputando a vaga com o que é essencial.
-- Agora: seis níveis (núcleo, fato, estilo, evento, contexto, fragmento),
-- chave estável por assunto (correção substitui no lugar), eventos viram
-- história (estado 'fechado'), contexto expira sozinho, núcleo sempre no
-- prompt e até 400 memórias por pessoa.
--
-- Compatível com a ai-proxy v37 e com o APK atual: colunas novas têm
-- padrão, life_guardar_memoria mantém a assinatura e life_memorias_contexto
-- mantém os parâmetros (ganha p_tudo, opcional).
-- ================================================================

-- 1. Colunas novas
alter table public.life_memorias
  add column if not exists nivel text
    check (nivel in ('nucleo', 'fato', 'estilo', 'evento', 'contexto', 'fragmento')),
  add column if not exists chave text check (chave is null or char_length(chave) between 3 and 80),
  add column if not exists importancia smallint not null default 2 check (importancia between 1 and 3),
  add column if not exists estado text not null default 'ativo'
    check (estado in ('ativo', 'aberto', 'fechado')),
  add column if not exists retomar_em date,
  add column if not exists expira_em date,
  add column if not exists confianca real not null default 1 check (confianca between 0 and 1);

-- 2. Categoria nova: fragmento (momento marcante, nas palavras da pessoa)
alter table public.life_memorias drop constraint if exists life_memorias_categoria_check;
alter table public.life_memorias add constraint life_memorias_categoria_check
  check (categoria in ('gosto', 'rotina', 'objetivo', 'evento', 'pessoa', 'estilo', 'contexto', 'fragmento'));

-- 3. Uma versão viva por chave
create unique index if not exists life_memorias_chave_viva
  on public.life_memorias (user_id, chave) where chave is not null and estado in ('ativo', 'aberto');

-- 4. Nível das que já existem
create or replace function public.life_nivel_da_categoria(p_categoria text)
returns text language sql immutable set search_path = public as $$
  select case p_categoria
    when 'objetivo' then 'nucleo' when 'pessoa' then 'nucleo'
    when 'gosto' then 'fato'      when 'rotina' then 'fato'
    when 'estilo' then 'estilo'   when 'evento' then 'evento'
    when 'contexto' then 'contexto' when 'fragmento' then 'fragmento'
    else 'fato' end
$$;
update public.life_memorias set nivel = public.life_nivel_da_categoria(categoria) where nivel is null;

-- 5. Faxina: só apaga as menos importantes e menos usadas acima de 400 (nunca as fixadas).
create or replace function public.life_memorias_faxina(p_user_id uuid)
returns void language sql security definer set search_path = public, pg_temp as $$
  delete from public.life_memorias
   where id in (
     select id from public.life_memorias
      where user_id = p_user_id and not fixada
      order by (estado <> 'fechado') desc, importancia desc, coalesce(usado_em, atualizado_em) desc
      offset 400
   );
$$;

-- 6. Guardar pela marca [[LEMBRAR]] (antes do consentimento e no APK atual): mesma assinatura.
create or replace function public.life_guardar_memoria(p_user_id uuid, p_texto text, p_categoria text, p_data date default null)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_txt text := btrim(regexp_replace(coalesce(p_texto, ''), '\s+', ' ', 'g'));
  v_id  uuid;
begin
  if not exists (select 1 from public.profiles where id = p_user_id and consentimento_memoria is true) then
    return 'sem_consentimento';
  end if;
  if char_length(v_txt) < 3 or char_length(v_txt) > 200
     or p_categoria not in ('gosto', 'rotina', 'objetivo', 'evento', 'pessoa', 'estilo', 'contexto', 'fragmento') then
    return 'invalida';
  end if;

  select id into v_id from public.life_memorias
   where user_id = p_user_id and estado <> 'fechado' and similarity(texto, v_txt) > 0.55
   order by similarity(texto, v_txt) desc limit 1;

  if v_id is not null then
    update public.life_memorias
       set texto = v_txt, categoria = p_categoria, nivel = public.life_nivel_da_categoria(p_categoria),
           data_referencia = coalesce(p_data, data_referencia), atualizado_em = now()
     where id = v_id;
    return 'atualizada';
  end if;

  insert into public.life_memorias (user_id, texto, categoria, nivel, data_referencia, origem)
  values (p_user_id, v_txt, p_categoria, public.life_nivel_da_categoria(p_categoria), p_data, 'chat');
  perform public.life_memorias_faxina(p_user_id);
  return 'salva';
end;
$$;

-- 7. Operações da extração em segundo plano (ai-proxy, service role).
--    p_ops: [{faz: criar|corrigir|fechar, nivel, categoria, chave, texto, importancia,
--             data_referencia, estado, retomar_em, expira_em, confianca}]
--    criar e corrigir são o mesmo upsert pela chave (correção vence, no lugar);
--    sem chave igual, uma memória muito parecida no mesmo nível é atualizada.
create or replace function public.life_memoria_aplicar(p_user_id uuid, p_ops jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
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

    if v_id is not null then
      update public.life_memorias set
        texto = v_txt, categoria = v_cat, nivel = v_niv,
        chave = coalesce(v_chv, chave),
        importancia = greatest(importancia, v_imp),
        confianca = case when v_niv = 'estilo' then least(1, greatest(confianca, v_conf)) else v_conf end,
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
$$;
revoke execute on function public.life_memoria_aplicar(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.life_memorias_faxina(uuid) from public, anon, authenticated;

-- 8. O que entra em cada resposta, por camada.
--    Parâmetros antigos iguais (a v37 continua funcionando); p_tudo = "o que você lembra?".
drop function if exists public.life_memorias_contexto(uuid, text, date, integer);
create or replace function public.life_memorias_contexto(
  p_user_id uuid, p_mensagem text, p_hoje date, p_limite integer default 20, p_tudo boolean default false
)
returns table(id uuid, texto text, categoria text, data_referencia date, fixada boolean, nivel text, estado text, chave text)
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_msg text := coalesce(p_mensagem, '');
  v_fatos int := case when p_tudo then 60 else greatest(1, least(coalesce(p_limite, 20), 40)) end;
begin
  -- Evento antigo vira história (antes era apagado); contexto vencido expira.
  update public.life_memorias m set estado = 'fechado', atualizado_em = now()
   where m.user_id = p_user_id and m.nivel = 'evento' and not m.fixada and m.estado <> 'fechado'
     and m.data_referencia is not null and m.data_referencia < p_hoje - 7
     and (m.retomar_em is null or m.retomar_em < p_hoje - 7);
  update public.life_memorias m set estado = 'fechado', atualizado_em = now()
   where m.user_id = p_user_id and m.nivel = 'contexto' and not m.fixada and m.estado <> 'fechado'
     and m.expira_em is not null and m.expira_em < p_hoje;

  return query
  with vivas as (
    select m.*, greatest(similarity(m.texto, v_msg), word_similarity(v_msg, m.texto)) as parecido
      from public.life_memorias m
     where m.user_id = p_user_id and (m.estado <> 'fechado' or m.fixada)
  ), escolhidas as (
    -- núcleo e fixadas: sempre
    (select v.*, 100.0 + v.importancia as pontos from vivas v
      where v.nivel = 'nucleo' or v.fixada
      order by v.importancia desc, v.atualizado_em desc limit 15)
    union all
    -- estilo: sempre, como instrução
    (select v.*, 90.0 + v.confianca from vivas v
      where v.nivel = 'estilo' and not v.fixada
      order by v.confianca desc, v.atualizado_em desc limit 6)
    union all
    -- fatos: os mais importantes e os mais ligados à mensagem
    (select v.*, 50.0 + v.importancia + v.parecido * 3
           + 1.0 / (1 + extract(epoch from (now() - coalesce(v.usado_em, v.atualizado_em))) / 86400 / 90) from vivas v
      where v.nivel = 'fato' and not v.fixada
      order by v.importancia + v.parecido * 3 desc, v.atualizado_em desc limit v_fatos)
    union all
    -- contexto que ainda vale
    (select v.*, 40.0 + v.importancia from vivas v
      where v.nivel = 'contexto' and not v.fixada
      order by v.atualizado_em desc limit 5)
    union all
    -- eventos: próximos 7 dias (e ontem) + abertos com retorno vencido
    (select v.*, 30.0 + v.importancia from vivas v
      where v.nivel = 'evento' and not v.fixada
        and ((v.data_referencia between p_hoje - 1 and p_hoje + 7)
             or (v.estado = 'aberto' and v.retomar_em is not null and v.retomar_em <= p_hoje))
      order by coalesce(v.retomar_em, v.data_referencia) limit case when p_tudo then 6 else 3 end)
    union all
    -- fragmento: no máximo 1, só se for parecido com a conversa
    (select v.*, 20.0 + v.parecido from vivas v
      where v.nivel = 'fragmento' and not v.fixada and v.parecido > 0.25
      order by v.parecido desc limit 1)
  ), marcadas as (
    update public.life_memorias m set usado_em = now() from escolhidas e where m.id = e.id returning m.id
  )
  select e.id, e.texto, e.categoria, e.data_referencia, e.fixada, e.nivel, e.estado, e.chave
    from escolhidas e order by e.pontos desc;
end;
$$;
revoke execute on function public.life_memorias_contexto(uuid, text, date, integer, boolean) from public, anon, authenticated;

-- 9. Custo da extração em segundo plano no log (e no teto global do dia).
alter table public.ai_audit_logs drop constraint if exists ai_audit_logs_tipo_chamada_check;
alter table public.ai_audit_logs add constraint ai_audit_logs_tipo_chamada_check
  check (tipo_chamada in ('vision', 'chat', 'barcode', 'acao', 'estimar', 'recipe', 'checkin', 'memoria'));
