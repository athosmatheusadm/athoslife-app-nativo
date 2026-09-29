-- ATHOSlife — CORREÇÃO URGENTE da triagem de saúde (2026-09-29)
--
-- Achado ao testar o plano de dieta: a versão de avaliar_triagem() que está
-- NO SERVIDOR monta os motivos com `v_motivos || 'texto'`. Em text[] o
-- Postgres lê 'texto' como literal de ARRAY e estoura:
--   malformed array literal: "transtorno_alimentar"
-- Ou seja: qualquer "Sim" na triagem (gravidez, doença, cirurgia...), menor
-- de idade, idade divergente ou IMC baixo -> o INSERT falha e a pessoa vê
-- erro genérico em vez da orientação. Só triagem 100% "Não" passava.
--
-- O arquivo db/athoslife_planos_triagem_migration.sql já tinha a versão
-- certa (array_append); esta é a mesma função, pra rodar de novo.

create or replace function public.avaliar_triagem()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_chaves text[] := array['q1','q2','q3','q4','q5','q6','q7','q8','q9','q10','q11'];
  v_k text;
  v_motivos text[] := '{}';
  v_treino boolean := true;
  v_dieta boolean := true;
  v_hoje date := public.hoje_do_usuario(new.user_id);
  v_idade_perfil integer;
  v_peso numeric;
  v_altura integer;
  v_imc numeric;
begin
  if new.declaracao_aceita is not true then
    raise exception 'declaracao_obrigatoria';
  end if;

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

  -- Perguntas que bloqueiam treino / dieta (tabela da diretriz, seção 2).
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

  if new.idade_calculada < 18 then
    v_treino := false; v_dieta := false; v_motivos := array_append(v_motivos, 'menor_de_idade');
  end if;

  select idade, peso_atual, altura_cm into v_idade_perfil, v_peso, v_altura
  from public.profiles where id = new.user_id;

  -- Pega quem muda a idade pra passar: perfil e nascimento têm de bater.
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
