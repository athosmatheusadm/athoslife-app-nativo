-- ATHOSlife — triagem v2: 5 perguntas, uma vez só, e NÃO trava (2026-09-29)
--
-- Decisão do dono (29/09): a triagem é a nossa "apólice de seguro", não
-- uma catraca. Quem responde "Sim" recebe o conselho de procurar um médico;
-- se mesmo assim quiser o plano, DECLARA que está ciente (fica gravado,
-- append-only) e recebe. "Paguei o app e não recebo meu plano?" não pode
-- acontecer.
--
-- O que continua travando (não depende de aceite):
--   * menor de 18 anos (aceite de menor não vale) e idade do perfil que não
--     bate com a data de nascimento (é o que pega quem mente a idade);
--   * conteúdo do plano: com ressalva de TREINO, só nível iniciante; com
--     ressalva alimentar (transtorno, bariátrica, dieta médica), gravidez/
--     amamentação ou IMC baixo, a DIETA só sai em "manter" (nunca déficit
--     nem superávit). Os pisos de sempre (basal, 1.200 kcal, volume...)
--     seguem nas RPCs.
--
-- A triagem vale pra sempre (a última respondida); antes eram 90 dias.
-- As 11 perguntas da v1 seguem aceitas pro histórico.
-- Espelho no app: src/domain/rules/triagemSaude.ts.

alter table public.triagens_saude
  add column if not exists ciente_orientacao boolean not null default false,
  add column if not exists ciente_versao text;

create or replace function public.avaliar_triagem()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_chaves text[];
  v_k text;
  v_motivos text[] := '{}';
  v_treino boolean := true;
  v_dieta boolean := true;
  v_hoje date := public.hoje_do_usuario(new.user_id);
  v_idade_perfil integer;
  v_peso numeric;
  v_altura integer;
  v_imc numeric;
  v_v2 boolean := new.versao like 'triagem-v2%';
begin
  if new.declaracao_aceita is not true then
    raise exception 'declaracao_obrigatoria';
  end if;
  if new.ciente_orientacao and coalesce(new.ciente_versao, '') = '' then
    raise exception 'ciente_sem_versao';
  end if;

  v_chaves := case when v_v2
    then array['t1','t2','t3','t4','t5']
    else array['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11'] end;
  foreach v_k in array v_chaves loop
    if jsonb_typeof(new.respostas -> v_k) is distinct from 'boolean' then
      raise exception 'triagem_incompleta';
    end if;
  end loop;

  if new.data_nascimento > v_hoje or new.data_nascimento < v_hoje - interval '110 years' then
    raise exception 'data_nascimento_invalida';
  end if;

  new.idade_calculada := extract(year from age(v_hoje, new.data_nascimento))::integer;
  new.criado_em := now();

  if v_v2 then
    -- t1 coração/pressão/dor no peito/tontura/desmaio
    if (new.respostas->>'t1')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'coracao'); end if;
    -- t2 doença crônica / remédio contínuo / exercício só com supervisão
    if (new.respostas->>'t2')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'condicao_medica'); end if;
    -- t3 lesão em osso/articulação/músculo ou cirurgia recente
    if (new.respostas->>'t3')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'lesao_cirurgia'); end if;
    -- t4 gravidez / amamentação
    if (new.respostas->>'t4')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'gestacao_amamentacao'); end if;
    -- t5 transtorno alimentar / bariátrica / dieta especial por orientação médica
    if (new.respostas->>'t5')::boolean then v_dieta := false; v_motivos := array_append(v_motivos, 'alimentar_especial'); end if;
  else
    if (new.respostas->>'q1')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'cardiaco_pressao'); end if;
    if (new.respostas->>'q2')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'dor_no_peito'); end if;
    if (new.respostas->>'q3')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'tontura_desmaio'); end if;
    if (new.respostas->>'q4')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'doenca_cronica'); end if;
    if (new.respostas->>'q5')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'remedio_continuo'); end if;
    if (new.respostas->>'q6')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'osteoarticular'); end if;
    if (new.respostas->>'q7')::boolean then v_treino := false; v_motivos := array_append(v_motivos, 'supervisao_medica'); end if;
    if (new.respostas->>'q8')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'gestacao_amamentacao'); end if;
    if (new.respostas->>'q9')::boolean then v_dieta := false; v_motivos := array_append(v_motivos, 'dieta_especial'); end if;
    if (new.respostas->>'q10')::boolean then v_dieta := false; v_motivos := array_append(v_motivos, 'transtorno_alimentar'); end if;
    if (new.respostas->>'q11')::boolean then v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'cirurgia_recente'); end if;
  end if;

  if new.idade_calculada < 18 then
    v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'menor_de_idade');
  end if;

  select idade, peso_atual, altura_cm into v_idade_perfil, v_peso, v_altura
  from public.profiles where id = new.user_id;

  if v_idade_perfil is not null and abs(v_idade_perfil - new.idade_calculada) > 1 then
    v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'idade_divergente');
  end if;

  if v_peso is not null and v_altura is not null and v_altura > 0 then
    v_imc := v_peso / ((v_altura / 100.0) ^ 2);
    if v_imc < 18.5 then
      v_dieta := false; v_motivos := array_append(v_motivos, 'imc_baixo');
    end if;
  end if;

  new.apto_treino := v_treino;
  new.apto_dieta := v_dieta;
  new.motivos := v_motivos;
  return new;
end;
$$;

-- Última triagem, sem prazo. Muda o retorno (ciente) -> drop + create.
drop function if exists public.triagem_vigente();
create function public.triagem_vigente()
returns table(id uuid, apto_treino boolean, apto_dieta boolean, motivos text[], ciente_orientacao boolean, criado_em timestamptz)
language sql
stable security definer
set search_path to 'public'
as $$
  select t.id, t.apto_treino, t.apto_dieta, t.motivos, t.ciente_orientacao, t.criado_em
  from public.triagens_saude t
  where t.user_id = auth.uid()
  order by t.criado_em desc
  limit 1;
$$;
revoke all on function public.triagem_vigente() from public, anon;
grant execute on function public.triagem_vigente() to authenticated;

-- RPCs dos planos: troca só o bloco da triagem (o resto das validações
-- fica igual). Feito por substituição no texto da função que está no
-- servidor, com checagem de que o trecho existia.
do $$
declare
  v_def text;
  v_novo text;
  v_antigo_treino constant text :=
$old$  select * into v_triagem from public.triagens_saude
  where user_id = v_uid and criado_em > now() - interval '90 days'
  order by criado_em desc limit 1;
  if not found then raise exception 'triagem_necessaria'; end if;
  if not v_triagem.apto_treino then raise exception 'triagem_inapta'; end if;$old$;
  v_novo_treino constant text :=
$new$  select * into v_triagem from public.triagens_saude
  where user_id = v_uid
  order by criado_em desc limit 1;
  if not found then raise exception 'triagem_necessaria'; end if;
  -- Trava dura (não depende de aceite): menor de idade / idade divergente.
  if v_triagem.motivos && array['menor_de_idade', 'idade_divergente'] then raise exception 'triagem_bloqueada'; end if;
  -- Ressalva de saúde: só com a declaração de ciente, e só nível iniciante.
  if not v_triagem.apto_treino then
    if not v_triagem.ciente_orientacao then raise exception 'triagem_ciente_necessaria'; end if;
    if p_parametros->>'nivel' is distinct from 'iniciante' then raise exception 'plano_invalido: nivel_restrito'; end if;
  end if;$new$;
  v_antigo_dieta constant text :=
$old$  select * into v_triagem from public.triagens_saude
  where user_id = v_uid and criado_em > now() - interval '90 days'
  order by criado_em desc limit 1;
  if not found then raise exception 'triagem_necessaria'; end if;
  if not v_triagem.apto_dieta then raise exception 'triagem_inapta'; end if;$old$;
  v_novo_dieta constant text :=
$new$  select * into v_triagem from public.triagens_saude
  where user_id = v_uid
  order by criado_em desc limit 1;
  if not found then raise exception 'triagem_necessaria'; end if;
  if v_triagem.motivos && array['menor_de_idade', 'idade_divergente'] then raise exception 'triagem_bloqueada'; end if;
  if not v_triagem.apto_dieta and not v_triagem.ciente_orientacao then raise exception 'triagem_ciente_necessaria'; end if;
  -- Ressalva alimentar, gravidez ou IMC baixo: só "manter" (sem déficit nem superávit).
  if v_triagem.motivos && array['alimentar_especial', 'transtorno_alimentar', 'dieta_especial', 'gestacao_amamentacao', 'imc_baixo', 'cirurgia_recente']
     and (p_parametros->>'objetivo') is distinct from 'manter' then
    raise exception 'plano_invalido: objetivo_restrito';
  end if;$new$;
begin
  select pg_get_functiondef('public.aplicar_plano_treino(text, jsonb, jsonb, text)'::regprocedure) into v_def;
  v_novo := replace(v_def, v_antigo_treino, v_novo_treino);
  if v_novo = v_def and position('triagem_ciente_necessaria' in v_def) = 0 then
    raise exception 'aplicar_plano_treino: trecho da triagem não encontrado';
  end if;
  execute v_novo;

  select pg_get_functiondef('public.aplicar_plano_dieta(jsonb, jsonb, jsonb, text)'::regprocedure) into v_def;
  v_novo := replace(v_def, v_antigo_dieta, v_novo_dieta);
  if v_novo = v_def and position('triagem_ciente_necessaria' in v_def) = 0 then
    raise exception 'aplicar_plano_dieta: trecho da triagem não encontrado';
  end if;
  execute v_novo;
end $$;
