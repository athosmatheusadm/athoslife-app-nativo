-- Contorno da verificação de idade (revisão de 26/10, seção 6).
-- Antes: o servidor só olhava o check mais recente e comparava com a idade
-- do perfil, que a pessoa edita. Um menor bloqueado mudava a idade no perfil,
-- refazia o check com outra data de nascimento e ficava liberado quantas
-- vezes quisesse.
--
-- Agora (versão revisada com o dono em 27/10: "não limitar uma correção"):
--  1. A data de nascimento pode ser corrigida UMA vez (quem digitou errado
--     não fica preso). O app mostra "Digitei minha data errada" só no aviso
--     de bloqueio, sem explicar a regra.
--  2. Uma terceira data diferente na mesma conta sai 'idade_divergente' e
--     trava de vez (só o suporte desfaz, apagando os checks antigos).
--  3. A idade do perfil segue a data de nascimento do check mais recente:
--     o que a pessoa digitar em Perfil > Conta não vale mais que o check.
--     Na correção, a comparação com a idade antiga do perfil é ignorada
--     (o perfil é alinhado à data nova logo depois).
-- As funções aplicar_plano_treino/dieta já recusam esses dois motivos.

-- Roda depois de trg_avaliar_triagem (triggers BEFORE disparam em ordem de nome).
create or replace function public.triagem_trava_idade()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_datas integer;
begin
  -- Datas diferentes já usadas na conta, contando a deste check.
  select count(distinct d) into v_datas
  from (
    select t.data_nascimento as d from public.triagens_saude t where t.user_id = new.user_id
    union all
    select new.data_nascimento
  ) x;

  if v_datas > 2 then
    -- Terceira data: trava de vez (a contagem nunca diminui).
    if not ('idade_divergente' = any(new.motivos)) then
      new.motivos := array_append(new.motivos, 'idade_divergente');
    end if;
  elsif v_datas = 2 and exists (
    select 1 from public.triagens_saude t
    where t.user_id = new.user_id and t.data_nascimento is distinct from new.data_nascimento
  ) and not exists (
    select 1 from public.triagens_saude t
    where t.user_id = new.user_id and t.data_nascimento = new.data_nascimento
  ) then
    -- A correção: a idade do perfil ainda é a da data antiga, então a
    -- comparação com o perfil (avaliar_triagem) não vale aqui. O perfil é
    -- alinhado logo depois (trg_zz_triagem_alinha_perfil).
    new.motivos := array_remove(new.motivos, 'idade_divergente');
    if not (new.motivos && array['coracao', 'condicao_medica', 'lesao_cirurgia', 'gestacao_amamentacao', 'menor_de_idade',
            'cardiaco_pressao', 'dor_no_peito', 'tontura_desmaio', 'doenca_cronica', 'remedio_continuo', 'osteoarticular',
            'supervisao_medica', 'cirurgia_recente']) then
      new.apto_treino := true;
    end if;
    if not (new.motivos && array['condicao_medica', 'gestacao_amamentacao', 'alimentar_especial', 'menor_de_idade', 'imc_baixo',
            'doenca_cronica', 'remedio_continuo', 'dieta_especial', 'transtorno_alimentar', 'cirurgia_recente']) then
      new.apto_dieta := true;
    end if;
  end if;

  if new.motivos && array['menor_de_idade', 'idade_divergente'] then
    new.apto_treino := false;
    new.apto_dieta := false;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_zz_triagem_trava_idade on public.triagens_saude;
create trigger trg_zz_triagem_trava_idade
  before insert on public.triagens_saude
  for each row execute function public.triagem_trava_idade();

-- Idade do perfil presa à data de nascimento do check mais recente.
create or replace function public.perfil_idade_pela_triagem()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_nasc date;
begin
  -- Vindo do alinhamento logo após um check novo: a idade já é a certa.
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  select t.data_nascimento into v_nasc
  from public.triagens_saude t
  where t.user_id = new.id
  order by t.criado_em desc
  limit 1;
  if v_nasc is not null then
    new.idade := extract(year from age(public.hoje_do_usuario(new.id), v_nasc))::integer;
  end if;
  return new;
end;
$$;

drop trigger if exists perfil_idade_pela_triagem on public.profiles;
create trigger perfil_idade_pela_triagem
  before update of idade on public.profiles
  for each row
  when (new.idade is distinct from old.idade)
  execute function public.perfil_idade_pela_triagem();

-- Depois de gravar o check, a idade do perfil passa a ser a desta data.
create or replace function public.triagem_alinha_perfil()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.profiles
  set idade = new.idade_calculada
  where id = new.user_id and idade is distinct from new.idade_calculada;
  return null;
end;
$$;

drop trigger if exists trg_zz_triagem_alinha_perfil on public.triagens_saude;
create trigger trg_zz_triagem_alinha_perfil
  after insert on public.triagens_saude
  for each row execute function public.triagem_alinha_perfil();

revoke execute on function public.triagem_trava_idade() from public, anon, authenticated;
revoke execute on function public.perfil_idade_pela_triagem() from public, anon, authenticated;
revoke execute on function public.triagem_alinha_perfil() from public, anon, authenticated;
