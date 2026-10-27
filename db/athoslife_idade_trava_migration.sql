-- Contorno da verificação de idade (revisão de 26/10, seção 6).
-- Antes: o servidor só olhava o check mais recente e comparava com a idade
-- do perfil, que a pessoa edita. Um menor bloqueado mudava a idade no perfil,
-- refazia o check com outra data de nascimento e ficava liberado.
--
-- Agora:
--  1. Se algum check da conta já deu menos de 18, todo check novo também
--     sai com 'menor_de_idade' (bloqueio permanente; só o suporte desfaz,
--     apagando os checks antigos).
--  2. Se a data de nascimento mudar entre checks, sai 'idade_divergente'
--     (também trava de vez).
--  3. Depois do primeiro check, a idade do perfil segue a data de nascimento
--     dele: o que a pessoa digitar em Perfil > Conta é ignorado.
-- As funções aplicar_plano_treino/dieta já recusam esses dois motivos.

-- Roda depois de trg_avaliar_triagem (triggers BEFORE disparam em ordem de nome).
create or replace function public.triagem_trava_idade()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (
    select 1 from public.triagens_saude t
    where t.user_id = new.user_id and 'menor_de_idade' = any(t.motivos)
  ) and not ('menor_de_idade' = any(new.motivos)) then
    new.motivos := array_append(new.motivos, 'menor_de_idade');
  end if;

  if exists (
    select 1 from public.triagens_saude t
    where t.user_id = new.user_id and t.data_nascimento is distinct from new.data_nascimento
  ) and not ('idade_divergente' = any(new.motivos)) then
    new.motivos := array_append(new.motivos, 'idade_divergente');
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

-- Idade do perfil presa à data de nascimento do primeiro check.
create or replace function public.perfil_idade_pela_triagem()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_nasc date;
begin
  select t.data_nascimento into v_nasc
  from public.triagens_saude t
  where t.user_id = new.id
  order by t.criado_em asc
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

revoke execute on function public.triagem_trava_idade() from public, anon, authenticated;
revoke execute on function public.perfil_idade_pela_triagem() from public, anon, authenticated;
