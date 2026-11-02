-- ================================================================
-- ATHOSlife · Importância dos eventos na memória do Life (01/11/2026)
-- Depende de: athoslife_memoria_camadas_migration.sql (já aplicada).
--
-- Antes: todo evento era fechado 7 dias depois e saía da conversa — o dia
-- ruim e o resort com a família tinham o mesmo destino.
-- Agora:
--  - evento importante (importancia 3: família, viagem, conquista, data
--    especial, perda) fechado continua lembrável: volta quando a conversa
--    toca no assunto, no aniversário da data, e no "o que você lembra?";
--  - evento comum (importancia 1) fechado não volta mais e é o primeiro a
--    sair na faxina;
--  - a faxina protege o importante fechado acima do comum ativo.
-- Mesma assinatura de life_memorias_contexto (a v38 continua funcionando).
-- ================================================================

create or replace function public.life_memorias_faxina(p_user_id uuid)
returns void language sql security definer set search_path = public, pg_temp as $$
  delete from public.life_memorias
   where id in (
     select id from public.life_memorias
      where user_id = p_user_id and not fixada
      order by importancia * 2 + (case when estado <> 'fechado' then 1 else 0 end) desc,
               coalesce(usado_em, atualizado_em) desc
      offset 400
   );
$$;
revoke execute on function public.life_memorias_faxina(uuid) from public, anon, authenticated;

-- Palavra de verdade em comum (5+ letras, sem acento, sem as genéricas).
-- A semelhança por trigramas sozinha não separa: "dia ruim no serviço" dava
-- 0,33 contra o resort e "viagem com a família", 0,38.
create or replace function public.life_palavra_comum(p_msg text, p_texto text)
returns boolean language sql immutable set search_path = public as $$
  select exists (
    select 1
      from regexp_split_to_table(translate(lower(coalesce(p_msg, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '[^a-z0-9]+') w
     where char_length(w) >= 5
       and w not in ('porque', 'quando', 'sobre', 'depois', 'ainda', 'minha', 'minhas', 'nossa', 'nosso', 'estou', 'tenho',
                     'estava', 'muito', 'muita', 'coisa', 'coisas', 'agora', 'gente', 'dessa', 'desse', 'aquele', 'aquela',
                     'daquele', 'daquela', 'lembra', 'lembro', 'voce', 'vamos', 'sempre', 'nunca', 'outra', 'outro',
                     'about', 'remember', 'there', 'where', 'which', 'would', 'could', 'should', 'cuando', 'porque')
       and translate(lower(coalesce(p_texto, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') ~ ('\m' || w)
  )
$$;

create or replace function public.life_memorias_contexto(
  p_user_id uuid, p_mensagem text, p_hoje date, p_limite integer default 20, p_tudo boolean default false
)
returns table(id uuid, texto text, categoria text, data_referencia date, fixada boolean, nivel text, estado text, chave text)
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
  select e.id, e.texto, e.categoria, e.data_referencia, e.fixada, e.nivel, e.estado, e.chave
    from escolhidas e order by e.pontos desc;
end;
$$;
revoke execute on function public.life_memorias_contexto(uuid, text, date, integer, boolean) from public, anon, authenticated;
