-- ATHOSlife — fim do teste / do Premium (dono, 17-18/11/2026).
--
-- Regra: quando o Premium acaba (teste ou assinatura), o app mostra uma vez o
-- cartão do Premium e depois Treino e Dieta ficam limpos — só some o que o
-- Life montou; o que a pessoa montou sozinha continua.
--
-- * treino_plano.do_life: marca interna (não aparece pra pessoa) do que o
--   Life montou enquanto ela era Premium — o plano inteiro e o treino rápido
--   do Premium. O treino rápido semanal do grátis NÃO leva a marca: é dela.
-- * Dieta: o plano do Life é a linha de planos_gerados (tipo dieta) que a tela
--   Dieta mostra; refeicoes_planejadas são refeições que a pessoa programou e
--   ficam. As metas do perfil também ficam.
-- * limpar_plano_do_life(): apaga só o marcado, e só se ela não é mais Premium.

alter table public.treino_plano
  add column if not exists do_life boolean not null default false;

comment on column public.treino_plano.do_life is
  'Montado pelo Life enquanto a pessoa era Premium (plano ou treino rápido). Some quando o Premium acaba (limpar_plano_do_life). Interno, não aparece no app.';

-- Planos já aplicados: o insert da ficha e o registro em planos_gerados saem
-- na mesma transação, então created_at = criado_em.
update public.treino_plano t
   set do_life = true
  from public.planos_gerados p
 where p.user_id = t.user_id
   and p.tipo = 'treino'
   and p.parametros->>'local' = t.local
   and t.created_at = p.criado_em
   and not t.do_life;

-- Plano inteiro: igual à versão no ar, só grava do_life = true.
create or replace function public.aplicar_plano_treino(p_local text, p_parametros jsonb, p_itens jsonb, p_gerador_versao text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_triagem public.triagens_saude%rowtype;
  v_nivel text := p_parametros->>'nivel';
  v_objetivo text := p_parametros->>'objetivo';
  v_dias text[];
  v_minutos integer := (p_parametros->>'minutos')::integer;
  v_max_ex integer;
  v_teto_grupo integer;
  v_item jsonb;
  v_serie jsonb;
  v_ex public.exercicios_catalogo%rowtype;
  v_n_series integer;
  v_plano_id uuid;
  v_rank_nivel constant jsonb := '{"iniciante":1,"intermediario":2,"avancado":3}';
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.is_premium_like(v_uid) then raise exception 'premium_required'; end if;

  select * into v_triagem from public.triagens_saude
  where user_id = v_uid
  order by criado_em desc limit 1;
  if not found then raise exception 'triagem_necessaria'; end if;
  if v_triagem.motivos && array['menor_de_idade', 'idade_divergente'] then raise exception 'triagem_bloqueada'; end if;
  if not v_triagem.apto_treino then
    if not v_triagem.ciente_orientacao then raise exception 'triagem_ciente_necessaria'; end if;
    if p_parametros->>'nivel' is distinct from 'iniciante' then raise exception 'plano_invalido: nivel_restrito'; end if;
  end if;

  if p_local not in ('casa', 'academia') then raise exception 'plano_invalido: local'; end if;
  if v_nivel not in ('iniciante', 'intermediario', 'avancado') then raise exception 'plano_invalido: nivel'; end if;
  if v_objetivo not in ('hipertrofia', 'condicionamento', 'saude') then raise exception 'plano_invalido: objetivo'; end if;
  select array_agg(d) into v_dias from jsonb_array_elements_text(p_parametros->'dias') d;
  if v_dias is null or array_length(v_dias, 1) not between 2 and 6
     or (select count(distinct d) from unnest(v_dias) d) <> array_length(v_dias, 1)
     or exists (select 1 from unnest(v_dias) d where d not in ('seg','ter','qua','qui','sex','sab','dom')) then
    raise exception 'plano_invalido: dias';
  end if;
  if v_nivel = 'iniciante' and array_length(v_dias, 1) > 4 then raise exception 'plano_invalido: dias_iniciante'; end if;
  if v_minutos is null or v_minutos not between 30 and 90 then raise exception 'plano_invalido: minutos'; end if;

  v_max_ex := case when v_nivel = 'iniciante' then 5 else 7 end;
  v_teto_grupo := case v_nivel when 'iniciante' then 10 when 'intermediario' then 16 else 20 end;

  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'plano_invalido: vazio';
  end if;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    if not ((v_item->>'dia_semana') = any(v_dias)) then raise exception 'plano_invalido: dia_fora'; end if;
    select * into v_ex from public.exercicios_catalogo where id = (v_item->>'exercicio_id')::uuid;
    if not found then raise exception 'plano_invalido: exercicio'; end if;
    if not (p_local = any(v_ex.ambientes)) then raise exception 'plano_invalido: exercicio_local'; end if;
    if (v_rank_nivel->>v_ex.nivel_minimo)::int > (v_rank_nivel->>v_nivel)::int then
      raise exception 'plano_invalido: exercicio_nivel';
    end if;
    v_n_series := jsonb_array_length(v_item->'series');
    if v_n_series not between 1 and 5 then raise exception 'plano_invalido: series'; end if;
    for v_serie in select * from jsonb_array_elements(v_item->'series') loop
      if v_ex.medida = 'tempo' then
        if coalesce((v_serie->>'segundos')::int, 0) not between 10 and 120 then raise exception 'plano_invalido: segundos'; end if;
      else
        if coalesce((v_serie->>'reps')::int, 0) not between 1 and 20 then raise exception 'plano_invalido: reps'; end if;
      end if;
    end loop;
  end loop;

  if exists (
    select 1 from jsonb_array_elements(p_itens) i
    group by i->>'dia_semana' having count(*) > v_max_ex
  ) then raise exception 'plano_invalido: exercicios_por_dia'; end if;

  if exists (
    select 1
    from jsonb_array_elements(p_itens) i
    join public.exercicios_catalogo c on c.id = (i->>'exercicio_id')::uuid
    group by c.grupo_muscular
    having sum(jsonb_array_length(i->'series')) > v_teto_grupo
  ) then raise exception 'plano_invalido: volume_grupo'; end if;

  create temp table if not exists _cargas (exercicio_id uuid primary key, carga numeric) on commit drop;
  delete from _cargas;
  insert into _cargas
  select distinct on (exercicio_id) exercicio_id, nullif(series_detalhe->0->>'carga_kg', '')::numeric
  from public.treino_plano
  where user_id = v_uid and local = p_local
  order by exercicio_id, created_at desc
  on conflict do nothing;

  delete from public.treino_plano where user_id = v_uid and local = p_local;

  insert into public.treino_plano (user_id, local, dia_semana, exercicio_id, series, repeticoes, ordem, series_detalhe, do_life)
  select
    v_uid,
    p_local,
    i->>'dia_semana',
    (i->>'exercicio_id')::uuid,
    jsonb_array_length(i->'series'),
    greatest(coalesce((i->'series'->0->>'reps')::int, 1), 1),
    coalesce((i->>'ordem')::int, 0),
    (
      select jsonb_agg(jsonb_build_object(
        'reps', nullif(s->>'reps', '')::int,
        'segundos', nullif(s->>'segundos', '')::int,
        'carga_kg', (select carga from _cargas k where k.exercicio_id = (i->>'exercicio_id')::uuid)
      ))
      from jsonb_array_elements(i->'series') s
    ),
    true
  from jsonb_array_elements(p_itens) i;

  insert into public.planos_gerados (user_id, tipo, triagem_id, parametros, plano, gerador_versao)
  values (v_uid, 'treino', v_triagem.id, p_parametros || jsonb_build_object('local', p_local), p_itens, p_gerador_versao)
  returning id into v_plano_id;

  return v_plano_id;
end;
$function$;

-- Copiar treino pelo chat: a cópia de um dia montado pelo Life continua do
-- Life (senão bastava copiar pra outro dia pra ficar com o plano).
create or replace function public.life_copiar_treino(p_user_id uuid, p_local text, p_destino_dia text, p_origem_dia text default null::text, p_origem_data date default null::date, p_modo text default 'perguntar'::text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_destino int;
  v_base int;
  v_n int;
begin
  if p_local not in ('casa', 'academia') or p_destino_dia not in ('seg','ter','qua','qui','sex','sab','dom')
     or p_modo not in ('perguntar', 'adicionar', 'substituir') then
    return jsonb_build_object('status', 'invalido');
  end if;

  create temp table if not exists _origem (exercicio_id uuid, series_detalhe jsonb, ordem int, do_life boolean) on commit drop;
  truncate _origem;

  if p_origem_data is not null then
    insert into _origem
    select (e->>'exercicio_id')::uuid,
           coalesce((select jsonb_agg(s - 'feita_em') from jsonb_array_elements(e->'series') s), '[]'),
           (row_number() over ())::int,
           false
      from treinos_historico h, jsonb_array_elements(h.series_feitas) e
     where h.user_id = p_user_id and h.data = p_origem_data and (e->>'exercicio_id') is not null
       and exists (select 1 from exercicios_catalogo c where c.id = (e->>'exercicio_id')::uuid);
  else
    if p_origem_dia not in ('seg','ter','qua','qui','sex','sab','dom') then
      return jsonb_build_object('status', 'invalido');
    end if;
    insert into _origem
    select exercicio_id, series_detalhe, ordem, do_life from treino_plano
     where user_id = p_user_id and local = p_local and dia_semana = p_origem_dia;
  end if;

  if not exists (select 1 from _origem) then
    return jsonb_build_object('status', 'origem_vazia');
  end if;
  if p_origem_data is null and p_origem_dia = p_destino_dia then
    return jsonb_build_object('status', 'mesmo_dia');
  end if;

  select count(*), coalesce(max(ordem), -1) into v_destino, v_base from treino_plano
   where user_id = p_user_id and local = p_local and dia_semana = p_destino_dia;

  if v_destino > 0 and p_modo = 'perguntar' then
    return jsonb_build_object('status', 'destino_ocupado', 'itens_destino', v_destino);
  end if;
  if p_modo = 'substituir' then
    delete from treino_plano where user_id = p_user_id and local = p_local and dia_semana = p_destino_dia;
    v_base := -1;
  end if;

  insert into treino_plano (user_id, local, dia_semana, exercicio_id, series, repeticoes, series_detalhe, ordem, do_life)
  select p_user_id, p_local, p_destino_dia, o.exercicio_id,
         greatest(jsonb_array_length(o.series_detalhe), 1),
         greatest(coalesce((o.series_detalhe->0->>'reps')::int, 12), 1),
         o.series_detalhe,
         v_base + row_number() over (order by o.ordem),
         o.do_life
    from (select distinct on (exercicio_id) * from _origem order by exercicio_id, ordem) o
   where not exists (select 1 from treino_plano d
                      where d.user_id = p_user_id and d.local = p_local
                        and d.dia_semana = p_destino_dia and d.exercicio_id = o.exercicio_id);
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', 'ok', 'itens', v_n);
end $function$;

-- O que o Life montou e ainda está com a pessoa (o app usa pra decidir se
-- mostra o cartão do fim do Premium). Zero se ela ainda é Premium.
create or replace function public.plano_do_life_vencido()
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select case when auth.uid() is null or public.is_premium_like(auth.uid())
    then jsonb_build_object('treino', 0, 'dieta', 0)
    else jsonb_build_object(
      'treino', (select count(*) from public.treino_plano where user_id = auth.uid() and do_life),
      'dieta',  (select count(*) from public.planos_gerados where user_id = auth.uid() and tipo = 'dieta'))
  end;
$function$;

-- Depois do cartão: limpa só o que o Life montou. Não faz nada se ela é Premium.
create or replace function public.limpar_plano_do_life()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_treino int;
  v_dieta int;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if public.is_premium_like(v_uid) then
    return jsonb_build_object('status', 'premium', 'treino', 0, 'dieta', 0);
  end if;
  delete from public.treino_plano where user_id = v_uid and do_life;
  get diagnostics v_treino = row_count;
  delete from public.planos_gerados where user_id = v_uid and tipo = 'dieta';
  get diagnostics v_dieta = row_count;
  return jsonb_build_object('status', 'ok', 'treino', v_treino, 'dieta', v_dieta);
end;
$function$;

revoke all on function public.plano_do_life_vencido() from public, anon;
revoke all on function public.limpar_plano_do_life() from public, anon;
grant execute on function public.plano_do_life_vencido() to authenticated;
grant execute on function public.limpar_plano_do_life() to authenticated;

-- A marca só o servidor mexe: pelo app (role authenticated) ela não muda.
create or replace function public.treino_plano_trava_do_life()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if current_user = 'authenticated' then
    new.do_life := old.do_life;
  end if;
  return new;
end $function$;

drop trigger if exists treino_plano_trava_do_life on public.treino_plano;
create trigger treino_plano_trava_do_life
  before update of do_life on public.treino_plano
  for each row execute function public.treino_plano_trava_do_life();
