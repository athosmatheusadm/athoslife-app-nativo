-- ================================================================
-- ATHOSlife · Treino pelo chat (02/11/2026)
-- docs/PLANO_LIFE_ACOES.md, Fase 3 (guia "Ações no treino").
--
-- 1. life_copiar_treino: copia a ficha de um dia (ou o que a pessoa FEZ numa
--    data, com as cargas dela) pra outro dia da semana. Dia ocupado sem modo
--    → pergunta (somar ou trocar). Rodar de novo não duplica.
-- 2. exercicios_pedidos: o que pediram e o catálogo não tem (pra decidir o
--    que vale incluir).
-- 3. life_acoes aceita adicionar_exercicio e copiar_treino (um toque).
-- ================================================================

create or replace function public.life_copiar_treino(
  p_user_id uuid, p_local text, p_destino_dia text,
  p_origem_dia text default null, p_origem_data date default null,
  p_modo text default 'perguntar'   -- 'perguntar' | 'adicionar' | 'substituir'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_destino int;
  v_base int;
  v_n int;
begin
  if p_local not in ('casa', 'academia') or p_destino_dia not in ('seg','ter','qua','qui','sex','sab','dom')
     or p_modo not in ('perguntar', 'adicionar', 'substituir') then
    return jsonb_build_object('status', 'invalido');
  end if;

  create temp table if not exists _origem (exercicio_id uuid, series_detalhe jsonb, ordem int) on commit drop;
  truncate _origem;

  if p_origem_data is not null then
    insert into _origem
    select (e->>'exercicio_id')::uuid,
           coalesce((select jsonb_agg(s - 'feita_em') from jsonb_array_elements(e->'series') s), '[]'),
           (row_number() over ())::int
      from treinos_historico h, jsonb_array_elements(h.series_feitas) e
     where h.user_id = p_user_id and h.data = p_origem_data and (e->>'exercicio_id') is not null
       and exists (select 1 from exercicios_catalogo c where c.id = (e->>'exercicio_id')::uuid);
  else
    if p_origem_dia not in ('seg','ter','qua','qui','sex','sab','dom') then
      return jsonb_build_object('status', 'invalido');
    end if;
    insert into _origem
    select exercicio_id, series_detalhe, ordem from treino_plano
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

  insert into treino_plano (user_id, local, dia_semana, exercicio_id, series, repeticoes, series_detalhe, ordem)
  select p_user_id, p_local, p_destino_dia, o.exercicio_id,
         greatest(jsonb_array_length(o.series_detalhe), 1),
         greatest(coalesce((o.series_detalhe->0->>'reps')::int, 12), 1),
         o.series_detalhe,
         v_base + row_number() over (order by o.ordem)
    from (select distinct on (exercicio_id) * from _origem order by exercicio_id, ordem) o
   where not exists (select 1 from treino_plano d
                      where d.user_id = p_user_id and d.local = p_local
                        and d.dia_semana = p_destino_dia and d.exercicio_id = o.exercicio_id);
  get diagnostics v_n = row_count;
  return jsonb_build_object('status', 'ok', 'itens', v_n);
end $$;
revoke execute on function public.life_copiar_treino(uuid, text, text, text, date, text) from public, anon, authenticated;

create table if not exists public.exercicios_pedidos (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete set null,
  texto text not null check (char_length(texto) between 1 and 120),
  criado_em timestamptz not null default now()
);
alter table public.exercicios_pedidos enable row level security;
-- Só o servidor (service role) grava e lê; ninguém pelo app.

alter table public.life_acoes drop constraint if exists life_acoes_tipo_check;
alter table public.life_acoes add constraint life_acoes_tipo_check
  check (tipo in ('repetir_refeicao', 'salvar_restricao', 'registrar_tropeco', 'adicionar_exercicio', 'copiar_treino'));
