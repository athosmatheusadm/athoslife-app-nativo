-- =====================================================================
-- ATHOSlife · Life: antecipar (depende de 1_life_padroes_cruzados.sql)
-- =====================================================================
-- life_antecipar devolve, em formato estruturado, o que o life-push pode
-- antecipar HOJE para a pessoa. Só entra padrão firme (tendência ou regra)
-- ou que ela confirmou; o que ela negou nunca entra.
--
-- Interruptor: life_config.antecipar. Começa DESLIGADO ('0'), como o
-- aviso_risco. Pra ligar:
--   update public.life_config set valor = '1' where chave = 'antecipar';
-- =====================================================================

insert into public.life_config (chave, valor)
select 'antecipar', '0'
 where not exists (select 1 from public.life_config where chave = 'antecipar');

create or replace function public.life_antecipar(p_user_id uuid, p_hoje date)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_de      date := p_hoje - 27;
  v_fuso    text;
  v_dias_ch text[] := array['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  v_firmes  text[];
  v_chave   text;
  v_periodo text;
  v_dias    int[];
  v_min     int;
  v_treinou boolean;
  v_dow     int;
  v_out     jsonb := '{}'::jsonb;
begin
  if not public.life_config_ligada('antecipar') then return null; end if;

  select coalesce(nullif(p.fuso, ''), 'America/Sao_Paulo') into v_fuso from public.profiles p where p.id = p_user_id;
  if not found then return null; end if;
  begin
    perform now() at time zone v_fuso;
  exception when others then
    v_fuso := 'America/Sao_Paulo';
  end;

  -- Padrões firmes de hoje: tendência/regra, ou confirmados; nunca os negados.
  select array_agg(c.chave) into v_firmes
    from public.life_padroes_calcular(p_user_id, p_hoje) c
    left join public.life_padroes_salvos s on s.user_id = p_user_id and s.chave = c.chave
   where s.resposta is distinct from 'negado'
     and (c.forca in ('tendencia', 'regra') or s.resposta = 'confirmado');
  if v_firmes is null then return v_out; end if;

  -- ===== Treino: dias da semana e horário típico =====
  select k into v_chave from unnest(v_firmes) k where k like 'treino.periodo.%' limit 1;
  if v_chave is not null then
    v_periodo := split_part(v_chave, '.', 3);
    select array_agg(x.dow order by x.dow) into v_dias from (
      select extract(dow from d.data)::int as dow
        from (select distinct h.data from public.treinos_historico h
               where h.user_id = p_user_id and h.data between v_de and p_hoje) d
       group by 1 having count(*) >= 2
    ) x;
    select round(percentile_cont(0.5) within group (order by m.minuto))::int into v_min from (
      select (extract(hour from h.iniciado_em at time zone v_fuso) * 60
              + extract(minute from h.iniciado_em at time zone v_fuso))::int as minuto,
             case when extract(hour from h.iniciado_em at time zone v_fuso) between 5 and 11 then 'manha'
                  when extract(hour from h.iniciado_em at time zone v_fuso) between 12 and 17 then 'tarde'
                  else 'noite' end as periodo
        from public.treinos_historico h
       where h.user_id = p_user_id and h.data between v_de and p_hoje and h.iniciado_em is not null
    ) m where m.periodo = v_periodo;
    select exists (select 1 from public.treinos_historico h where h.user_id = p_user_id and h.data = p_hoje) into v_treinou;
    if v_dias is not null and v_min is not null then
      v_out := v_out || jsonb_build_object('treino',
        jsonb_build_object('dias', to_jsonb(v_dias), 'minuto', v_min, 'treinou_hoje', v_treinou));
    end if;
  end if;

  -- ===== Dia da semana em que o ânimo costuma ser mais baixo =====
  select k into v_chave from unnest(v_firmes) k where k like 'animo.dia_semana.%' limit 1;
  if v_chave is not null then
    v_dow := array_position(v_dias_ch, split_part(v_chave, '.', 3)) - 1;
    if v_dow is not null then v_out := v_out || jsonb_build_object('dia_dificil', v_dow); end if;
  end if;

  -- ===== Dia da semana (e período) em que os tropeços se concentram =====
  -- (life_padroes_calcular só devolve estes com consentimento de hábitos)
  select k into v_chave from unnest(v_firmes) k where k like 'tropeco.dia_semana.%' limit 1;
  if v_chave is not null then
    v_dow := array_position(v_dias_ch, split_part(v_chave, '.', 3)) - 1;
    select split_part(k, '.', 3) into v_periodo from unnest(v_firmes) k where k like 'tropeco.periodo.%' limit 1;
    if v_dow is not null then
      v_out := v_out || jsonb_build_object('dia_risco', jsonb_build_object('dow', v_dow, 'periodo', v_periodo));
    end if;
  end if;

  return v_out;
end;
$function$;

revoke all on function public.life_antecipar(uuid, date) from public, anon, authenticated;
grant execute on function public.life_antecipar(uuid, date) to service_role;
