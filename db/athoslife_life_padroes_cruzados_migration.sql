-- =====================================================================
-- ATHOSlife · Life: padrões cruzados, costumes e sinais com menos dados
-- =====================================================================
-- O que muda:
--   1. life_padroes_salvos: os padrões passam a ficar guardados, com força
--      (palpite / tendência / regra) e a resposta da pessoa (confirmou/negou).
--   2. life_padroes_calcular: cálculo novo. Mantém os padrões de hoje com
--      mínimos menores e acrescenta costumes (período e duração do treino,
--      comidas frequentes, refeição pouco registrada) e os cruzamentos de
--      tropeço (dia da semana, período, treino, ânimo).
--   3. life_padroes: MESMA assinatura e MESMO retorno (text[]), então a
--      ai-proxy continua funcionando sem novo deploy. Agora salva o que
--      calculou e não devolve o que a pessoa negou.
--   4. responder_padrao: o app chama quando a pessoa confirma ou nega.
--   5. Consentimento: desligou a memória, apaga os padrões salvos; desligou
--      os hábitos, apaga os padrões de tropeço.
--
-- Padrões de tropeço só são calculados com consentimento_habitos = true.
-- Nada aqui é enviado por push: o texto só entra no prompt do chat.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabela
-- ---------------------------------------------------------------------
create table if not exists public.life_padroes_salvos (
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  chave          text        not null check (char_length(chave) between 3 and 60),
  texto          text        not null check (char_length(texto) between 3 and 240),
  evidencias     integer     not null default 0,
  forca          text        not null check (forca in ('palpite', 'tendencia', 'regra')),
  sensivel       boolean     not null default false,
  resposta       text        check (resposta in ('confirmado', 'negado')),
  respondido_em  timestamptz,
  primeiro_visto date        not null,
  ultimo_visto   date        not null,
  atualizado_em  timestamptz not null default now(),
  primary key (user_id, chave)
);

alter table public.life_padroes_salvos enable row level security;

drop policy if exists life_padroes_salvos_ler on public.life_padroes_salvos;
create policy life_padroes_salvos_ler on public.life_padroes_salvos
  for select using (user_id = (select auth.uid()));

drop policy if exists life_padroes_salvos_apagar on public.life_padroes_salvos;
create policy life_padroes_salvos_apagar on public.life_padroes_salvos
  for delete using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 2. Cálculo
-- ---------------------------------------------------------------------
create or replace function public.life_padroes_calcular(p_user_id uuid, p_hoje date)
returns table (chave text, texto text, evidencias integer, forca text, sensivel boolean)
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_de      date := p_hoje - 27;           -- janela dos costumes: 28 dias
  v_de60    date := p_hoje - 59;           -- janela dos tropeços: 60 dias
  v_fuso    text;
  v_habitos boolean;
  v_criado  date;
  v_criado_ts timestamptz;
  v_meta    int;
  v_dias    text[] := array['domingos', 'segundas', 'terças', 'quartas', 'quintas', 'sextas', 'sábados'];
  v_dias_ch text[] := array['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  v_n       int;
  v_pior    record; v_melhor record;
  v_com     numeric; v_sem numeric; v_nc int; v_ns int;
  v_top     text;  v_max int;
  v_ok      int;
  v_r       record;
  v_total   int;
  v_td      int; v_rd int; v_rd_sem int;
  v_base    numeric; v_rel numeric;
begin
  select coalesce(nullif(p.fuso, ''), 'America/Sao_Paulo'), p.consentimento_habitos is true,
         coalesce(p.agua_meta_ml, 2500), p.created_at
    into v_fuso, v_habitos, v_meta, v_criado_ts
    from public.profiles p where p.id = p_user_id;
  if not found then return; end if;
  begin
    perform now() at time zone v_fuso;
  exception when others then
    v_fuso := 'America/Sao_Paulo';
  end;
  v_criado := coalesce((v_criado_ts at time zone v_fuso)::date, v_de60);

  sensivel := false;

  -- ===== Ânimo por dia da semana (5+ check-ins; antes eram 8) =====
  select count(*) into v_n from public.life_checkins c where c.user_id = p_user_id and c.data between v_de and p_hoje;
  if v_n >= 5 then
    select d.dow, d.media into v_pior from (
      select extract(dow from c.data)::int as dow, avg(c.agradavel) as media
        from public.life_checkins c where c.user_id = p_user_id and c.data between v_de and p_hoje
       group by 1 having count(*) >= 2
    ) d order by d.media asc, d.dow limit 1;
    select d.dow, d.media into v_melhor from (
      select extract(dow from c.data)::int as dow, avg(c.agradavel) as media
        from public.life_checkins c where c.user_id = p_user_id and c.data between v_de and p_hoje
       group by 1 having count(*) >= 2
    ) d order by d.media desc, d.dow limit 1;
    if v_pior.dow is not null and v_melhor.dow is not null and v_melhor.media - v_pior.media >= 0.8 then
      chave := 'animo.dia_semana.' || v_dias_ch[v_pior.dow + 1];
      texto := format('Ânimo (%s check-ins em 28 dias): costuma ser mais baixo às %s e melhor às %s.',
                      v_n, v_dias[v_pior.dow + 1], v_dias[v_melhor.dow + 1]);
      evidencias := v_n;
      forca := case when v_n >= 12 then 'regra' when v_n >= 8 then 'tendencia' else 'palpite' end;
      return next;
    end if;
  end if;

  -- ===== Treino x ânimo (2+2 dias; antes eram 3+3) =====
  select avg(c.agradavel) filter (where t.data is not null), count(*) filter (where t.data is not null),
         avg(c.agradavel) filter (where t.data is null),     count(*) filter (where t.data is null)
    into v_com, v_nc, v_sem, v_ns
    from public.life_checkins c
    left join (select distinct h.data from public.treinos_historico h
                where h.user_id = p_user_id and h.data between v_de and p_hoje) t on t.data = c.data
   where c.user_id = p_user_id and c.data between v_de and p_hoje;
  if v_nc >= 2 and v_ns >= 2 and abs(v_com - v_sem) >= 0.5 then
    chave := 'animo.treino.' || case when v_com > v_sem then 'melhor' else 'pior' end;
    texto := format('Nos dias com treino o ânimo foi %s (%s vs %s, numa escala de 1 a 4).',
                    case when v_com > v_sem then 'melhor' else 'mais baixo' end,
                    replace(to_char(v_com, 'FM9.0'), '.', ','), replace(to_char(v_sem, 'FM9.0'), '.', ','));
    evidencias := v_nc + v_ns;
    forca := case when least(v_nc, v_ns) >= 5 then 'regra' when least(v_nc, v_ns) >= 3 then 'tendencia' else 'palpite' end;
    return next;
  end if;

  -- ===== Sentimentos mais frequentes (2+ vezes; antes eram 3) =====
  select string_agg(format('%s (%sx)', x.palavra, x.n), ', ' order by x.n desc, x.palavra), max(x.n)
    into v_top, v_max from (
      select c.palavra, count(*)::int as n from public.life_checkins c
       where c.user_id = p_user_id and c.data between v_de and p_hoje and coalesce(c.palavra, '') <> ''
       group by c.palavra having count(*) >= 2 order by count(*) desc, c.palavra limit 2
    ) x;
  if v_top is not null then
    chave := 'animo.sentimentos';
    texto := 'Sentimentos que mais apareceram: ' || v_top || '.';
    evidencias := v_max;
    forca := case when v_max >= 6 then 'regra' when v_max >= 3 then 'tendencia' else 'palpite' end;
    return next;
  end if;

  -- ===== Água (3+ dias com registro; antes eram 5) =====
  select count(*), count(*) filter (where a.total >= v_meta) into v_n, v_ok from (
    select g.data, sum(g.quantidade_ml) as total from public.registros_agua g
     where g.user_id = p_user_id and g.data between v_de and p_hoje group by g.data
  ) a;
  if v_n >= 3 then
    chave := 'agua.meta';
    texto := format('Água: bateu a meta em %s de %s dias com registro.', v_ok, v_n);
    evidencias := v_n;
    forca := case when v_n >= 10 then 'regra' when v_n >= 5 then 'tendencia' else 'palpite' end;
    return next;
  end if;

  -- ===== Refeições: constância =====
  select count(distinct i.data) into v_n from public.itens_refeicao i
   where i.user_id = p_user_id and i.data between v_de and p_hoje;
  if v_n >= 3 then
    chave := 'refeicao.registro';
    texto := format('Registrou refeições em %s dos últimos 28 dias.', v_n);
    evidencias := v_n;
    forca := case when v_n >= 10 then 'regra' when v_n >= 5 then 'tendencia' else 'palpite' end;
    return next;
  end if;

  -- ===== Refeições: o que mais come (mesmo item em 3+ dias) =====
  select string_agg(x.nome, ', ' order by x.d desc, x.nome), max(x.d) into v_top, v_max from (
    select left(lower(btrim(i.nome)), 40) as nome, count(distinct i.data)::int as d
      from public.itens_refeicao i
     where i.user_id = p_user_id and i.data between v_de and p_hoje and char_length(btrim(coalesce(i.nome, ''))) >= 2
     group by 1 having count(distinct i.data) >= 3 order by 2 desc, 1 limit 3
  ) x;
  if v_top is not null then
    chave := 'refeicao.frequentes';
    texto := left(format('Come com frequência: %s.', v_top), 240);
    evidencias := v_max;
    forca := case when v_max >= 8 then 'regra' when v_max >= 5 then 'tendencia' else 'palpite' end;
    return next;
  end if;

  -- ===== Refeições: a que quase não aparece (5+ dias com registro) =====
  if v_n >= 5 then
    select t.tipo, t.d into v_r from (
      select k.tipo, (select count(distinct i.data) from public.itens_refeicao i
                       where i.user_id = p_user_id and i.data between v_de and p_hoje and i.tipo = k.tipo)::int as d
        from (values ('cafe'), ('almoco'), ('jantar')) k(tipo)
    ) t where t.d::numeric / v_n <= 0.2 order by t.d, t.tipo limit 1;
    if v_r.tipo is not null then
      chave := 'refeicao.pouco_registrada.' || v_r.tipo;
      texto := format('Quase não registra %s (%s de %s dias com registro).',
                      case v_r.tipo when 'cafe' then 'café da manhã' when 'almoco' then 'almoço' else 'jantar' end, v_r.d, v_n);
      evidencias := v_n;
      forca := case when v_n >= 12 then 'regra' when v_n >= 8 then 'tendencia' else 'palpite' end;
      return next;
    end if;
  end if;

  -- ===== Treino: dias (3+ dias; antes eram 4) =====
  select count(distinct h.data) into v_n from public.treinos_historico h
   where h.user_id = p_user_id and h.data between v_de and p_hoje;
  if v_n >= 3 then
    select string_agg(v_dias[x.dow + 1], ' e ' order by x.n desc, x.dow) into v_top from (
      select extract(dow from d.data)::int as dow, count(*) as n
        from (select distinct h.data from public.treinos_historico h
               where h.user_id = p_user_id and h.data between v_de and p_hoje) d
       group by 1 order by 2 desc, 1 limit 2
    ) x;
    chave := 'treino.dias';
    texto := format('Treinou em %s dias nos últimos 28, mais às %s.', v_n, v_top);
    evidencias := v_n;
    forca := case when v_n >= 8 then 'regra' when v_n >= 5 then 'tendencia' else 'palpite' end;
    return next;
  end if;

  -- ===== Treino: período do dia (3+ treinos com hora; 60% no mesmo período) =====
  select count(*)::int into v_total from public.treinos_historico h
   where h.user_id = p_user_id and h.data between v_de and p_hoje and h.iniciado_em is not null;
  if v_total >= 3 then
    select x.periodo, x.n into v_r from (
      select case when extract(hour from h.iniciado_em at time zone v_fuso) between 5 and 11 then 'manha'
                  when extract(hour from h.iniciado_em at time zone v_fuso) between 12 and 17 then 'tarde'
                  else 'noite' end as periodo, count(*)::int as n
        from public.treinos_historico h
       where h.user_id = p_user_id and h.data between v_de and p_hoje and h.iniciado_em is not null
       group by 1 order by 2 desc, 1 limit 1
    ) x;
    if v_r.n::numeric / v_total >= 0.6 then
      chave := 'treino.periodo.' || v_r.periodo;
      texto := format('Costuma treinar %s (%s de %s treinos).',
                      case v_r.periodo when 'manha' then 'de manhã' when 'tarde' then 'à tarde' else 'à noite' end, v_r.n, v_total);
      evidencias := v_total;
      forca := case when v_total >= 8 then 'regra' when v_total >= 5 then 'tendencia' else 'palpite' end;
      return next;
    end if;
  end if;

  -- ===== Treino: duração típica (mediana de 3+ treinos) =====
  select count(*)::int, round(percentile_cont(0.5) within group (order by h.duracao_min))::int
    into v_total, v_n from public.treinos_historico h
   where h.user_id = p_user_id and h.data between v_de and p_hoje and h.duracao_min between 5 and 300;
  if v_total >= 3 then
    chave := 'treino.duracao';
    texto := format('Os treinos costumam durar uns %s min.', v_n);
    evidencias := v_total;
    forca := case when v_total >= 8 then 'regra' when v_total >= 5 then 'tendencia' else 'palpite' end;
    return next;
  end if;

  -- =================================================================
  -- Tropeços e vontades (só com consentimento de hábitos) — 60 dias
  -- =================================================================
  if not v_habitos then return; end if;
  sensivel := true;

  -- ===== Dia da semana (3+ eventos; metade no mesmo dia) =====
  select count(*)::int into v_total from (
    select r.data from public.recaidas r where r.user_id = p_user_id and r.data between v_de60 and p_hoje
    union all
    select w.data from public.habitos_vontades w where w.user_id = p_user_id and w.data between v_de60 and p_hoje
  ) ev;
  if v_total >= 3 then
    select x.dow, x.n into v_r from (
      select extract(dow from ev.data)::int as dow, count(*)::int as n from (
        select r.data from public.recaidas r where r.user_id = p_user_id and r.data between v_de60 and p_hoje
        union all
        select w.data from public.habitos_vontades w where w.user_id = p_user_id and w.data between v_de60 and p_hoje
      ) ev group by 1 order by 2 desc, 1 limit 1
    ) x;
    if v_r.n >= 2 and v_r.n::numeric / v_total >= 0.5 then
      chave := 'tropeco.dia_semana.' || v_dias_ch[v_r.dow + 1];
      texto := format('Tropeços e vontades se concentram às %s (%s de %s em 60 dias).', v_dias[v_r.dow + 1], v_r.n, v_total);
      evidencias := v_total;
      forca := case when v_total >= 8 then 'regra' when v_total >= 5 then 'tendencia' else 'palpite' end;
      return next;
    end if;
  end if;

  -- ===== Período do dia (3+ eventos com hora; 60% no mesmo período) =====
  select count(*)::int into v_total from (
    select r.horario from public.recaidas r where r.user_id = p_user_id and r.data between v_de60 and p_hoje and r.horario is not null
    union all
    select w.horario from public.habitos_vontades w where w.user_id = p_user_id and w.data between v_de60 and p_hoje and w.horario is not null
  ) ev;
  if v_total >= 3 then
    select x.periodo, x.n into v_r from (
      select case when extract(hour from ev.horario) between 5 and 11 then 'manha'
                  when extract(hour from ev.horario) between 12 and 17 then 'tarde'
                  else 'noite' end as periodo, count(*)::int as n from (
        select r.horario from public.recaidas r where r.user_id = p_user_id and r.data between v_de60 and p_hoje and r.horario is not null
        union all
        select w.horario from public.habitos_vontades w where w.user_id = p_user_id and w.data between v_de60 and p_hoje and w.horario is not null
      ) ev group by 1 order by 2 desc, 1 limit 1
    ) x;
    if v_r.n::numeric / v_total >= 0.6 then
      chave := 'tropeco.periodo.' || v_r.periodo;
      texto := format('Tropeços e vontades aparecem mais %s (%s de %s).',
                      case v_r.periodo when 'manha' then 'de manhã' when 'tarde' then 'à tarde' else 'à noite' end, v_r.n, v_total);
      evidencias := v_total;
      forca := case when v_total >= 8 then 'regra' when v_total >= 5 then 'tendencia' else 'palpite' end;
      return next;
    end if;
  end if;

  -- ===== Tropeço x treino =====
  -- Só vale se os tropeços caem em dias sem treino BEM mais do que o acaso
  -- explicaria (20 pontos acima da proporção normal de dias sem treino).
  v_total := greatest(1, p_hoje - greatest(v_de60, v_criado) + 1);
  select count(distinct h.data)::int into v_td from public.treinos_historico h
   where h.user_id = p_user_id and h.data between greatest(v_de60, v_criado) and p_hoje;
  select count(*)::int, count(*) filter (where not exists (
           select 1 from public.treinos_historico h where h.user_id = p_user_id and h.data = d.data))::int
    into v_rd, v_rd_sem
    from (select distinct r.data from public.recaidas r
           where r.user_id = p_user_id and r.data between greatest(v_de60, v_criado) and p_hoje) d;
  if v_rd >= 3 and v_td >= 3 then
    v_base := 1 - least(v_td, v_total)::numeric / v_total;
    v_rel  := v_rd_sem::numeric / v_rd;
    if v_rel - v_base >= 0.2 then
      chave := 'tropeco.treino.sem_treino';
      texto := format('%s de %s tropeços foram em dias sem treino (treinou em %s dos últimos %s dias).', v_rd_sem, v_rd, v_td, v_total);
      evidencias := v_rd;
      forca := case when v_rd >= 8 then 'regra' when v_rd >= 5 then 'tendencia' else 'palpite' end;
      return next;
    end if;
  end if;

  -- ===== Tropeço x ânimo (2+ check-ins de cada lado) =====
  select avg(c.agradavel) filter (where t.data is not null), count(*) filter (where t.data is not null),
         avg(c.agradavel) filter (where t.data is null),     count(*) filter (where t.data is null)
    into v_com, v_nc, v_sem, v_ns
    from public.life_checkins c
    left join (select distinct r.data from public.recaidas r
                where r.user_id = p_user_id and r.data between v_de60 and p_hoje) t on t.data = c.data
   where c.user_id = p_user_id and c.data between v_de60 and p_hoje;
  if v_nc >= 2 and v_ns >= 2 and v_sem - v_com >= 0.5 then
    chave := 'tropeco.animo.baixo';
    texto := format('Nos dias de tropeço o ânimo estava mais baixo (%s vs %s, numa escala de 1 a 4).',
                    replace(to_char(v_com, 'FM9.0'), '.', ','), replace(to_char(v_sem, 'FM9.0'), '.', ','));
    evidencias := v_nc + v_ns;
    forca := case when v_nc >= 5 then 'regra' when v_nc >= 3 then 'tendencia' else 'palpite' end;
    return next;
  end if;

  return;
end;
$function$;

revoke all on function public.life_padroes_calcular(uuid, date) from public, anon, authenticated;
grant execute on function public.life_padroes_calcular(uuid, date) to service_role;

-- ---------------------------------------------------------------------
-- 3. life_padroes: mesma assinatura que a ai-proxy já chama
-- ---------------------------------------------------------------------
create or replace function public.life_padroes(p_user_id uuid, p_hoje date)
returns text[]
language plpgsql
volatile security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_calc    jsonb;
  v_memoria boolean;
  v_linhas  text[];
begin
  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb) into v_calc
    from public.life_padroes_calcular(p_user_id, p_hoje) c;

  select p.consentimento_memoria is true into v_memoria from public.profiles p where p.id = p_user_id;

  -- Guarda (só com a memória ligada). Grava no máximo uma vez por dia por
  -- padrão, a não ser que o texto tenha mudado. A resposta da pessoa fica.
  if coalesce(v_memoria, false) then
    insert into public.life_padroes_salvos as s
      (user_id, chave, texto, evidencias, forca, sensivel, primeiro_visto, ultimo_visto)
    select p_user_id, c.chave, c.texto, c.evidencias, c.forca, c.sensivel, p_hoje, p_hoje
      from jsonb_to_recordset(v_calc) as c(chave text, texto text, evidencias int, forca text, sensivel boolean)
    on conflict (user_id, chave) do update
       set texto = excluded.texto, evidencias = excluded.evidencias, forca = excluded.forca,
           sensivel = excluded.sensivel, ultimo_visto = excluded.ultimo_visto, atualizado_em = now()
     where s.texto is distinct from excluded.texto or s.ultimo_visto is distinct from excluded.ultimo_visto;
  end if;

  -- Devolve até 8 linhas. Ordem: o que ela confirmou; depois cruzamentos
  -- (tropeço, ânimo x treino, ânimo x dia), costumes e, por último, contagens.
  -- Dentro de cada grupo: regra > tendência > palpite. O que a pessoa negou
  -- não volta. Palpite vai marcado, pra o Life comentar como pergunta.
  select array_agg(x.linha order by x.confirmado desc, x.grupo, x.ordem, x.evidencias desc, x.chave) into v_linhas from (
    select c.chave, c.evidencias,
           case when s.resposta = 'confirmado' then 'Ela confirmou: ' || c.texto
                when c.forca = 'palpite' then 'Primeiro sinal, com poucos dados (comente como pergunta, sem afirmar): ' || c.texto
                when c.forca = 'tendencia' then 'Tendência: ' || c.texto
                else c.texto end as linha,
           (s.resposta is not distinct from 'confirmado') as confirmado,
           case when c.chave like 'tropeco.%' or c.chave like 'animo.treino.%' or c.chave like 'animo.dia_semana.%' then 0
                when c.chave like 'treino.periodo.%' or c.chave = 'treino.duracao'
                  or c.chave = 'refeicao.frequentes' or c.chave like 'refeicao.pouco_registrada.%' then 1
                else 2 end as grupo,
           case c.forca when 'regra' then 1 when 'tendencia' then 2 else 3 end as ordem
      from jsonb_to_recordset(v_calc) as c(chave text, texto text, evidencias int, forca text, sensivel boolean)
      left join public.life_padroes_salvos s on s.user_id = p_user_id and s.chave = c.chave
     where s.resposta is distinct from 'negado'
     order by 4 desc, 5, 6, 2 desc, 1
     limit 8
  ) x;

  return coalesce(v_linhas, '{}');
end;
$function$;

-- (create or replace mantém as permissões atuais: só service_role executa)

-- ---------------------------------------------------------------------
-- 4. Resposta da pessoa (o app chama com a sessão dela)
-- ---------------------------------------------------------------------
create or replace function public.responder_padrao(p_chave text, p_resposta text)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then return false; end if;
  if p_resposta is not null and p_resposta not in ('confirmado', 'negado') then return false; end if;
  update public.life_padroes_salvos
     set resposta = p_resposta,
         respondido_em = case when p_resposta is null then null else now() end,
         atualizado_em = now()
   where user_id = v_uid and chave = p_chave;
  return found;
end;
$function$;

revoke all on function public.responder_padrao(text, text) from public, anon;
grant execute on function public.responder_padrao(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Consentimento desligado apaga o que foi guardado
-- ---------------------------------------------------------------------
create or replace function public.life_padroes_sem_consentimento()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.consentimento_memoria is distinct from true and old.consentimento_memoria is true then
    delete from public.life_padroes_salvos where user_id = new.id;
  elsif new.consentimento_habitos is distinct from true and old.consentimento_habitos is true then
    delete from public.life_padroes_salvos where user_id = new.id and sensivel;
  end if;
  return new;
end;
$function$;

revoke all on function public.life_padroes_sem_consentimento() from public, anon, authenticated;

drop trigger if exists life_padroes_sem_consentimento on public.profiles;
create trigger life_padroes_sem_consentimento
  after update of consentimento_memoria, consentimento_habitos on public.profiles
  for each row execute function public.life_padroes_sem_consentimento();
