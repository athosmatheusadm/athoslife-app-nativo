-- ================================================================
-- ATHOSlife · Refeições planejadas pelo Life (02/11/2026)
-- docs/PLANO_LIFE_ACOES.md, Fase 1.
--
-- "Vamos pôr as refeições de amanhã no lugar, só faltando um ok quando
-- comer" (dono). O que o Life deixa no lugar fica AQUI, não em
-- itens_refeicao: não entra em nenhuma soma (Home, Dieta, gráfico,
-- conquistas, contexto do Life) até a pessoa tocar no ✓ da refeição, que
-- grava em itens_refeicao pelo caminho de sempre e apaga daqui. Assim o APK
-- antigo nunca conta comida planejada como comida comida.
--
-- Só as 4 refeições fixas (café, almoço, lanche, jantar). De hoje até 14
-- dias à frente (a ai-proxy confere; a tabela aceita qualquer data pra não
-- quebrar o fuso de quem viaja).
-- ================================================================

create table if not exists public.refeicoes_planejadas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  data date not null,
  tipo text not null check (tipo in ('cafe', 'almoco', 'lanche', 'jantar')),
  nome text not null check (char_length(nome) between 1 and 120),
  quantidade_texto text not null default '' check (char_length(quantidade_texto) <= 60),
  calorias numeric not null default 0 check (calorias between 0 and 5000),
  proteina numeric not null default 0 check (proteina between 0 and 500),
  carboidrato numeric not null default 0 check (carboidrato between 0 and 1000),
  gordura numeric not null default 0 check (gordura between 0 and 500),
  -- life = o Life programou pelo chat; dia = cópia de um dia que ela comeu
  origem text not null default 'life' check (origem in ('life', 'dia', 'usuario')),
  -- um "programar" do chat = um lote; o Desfazer apaga o lote inteiro
  lote uuid,
  criado_em timestamptz not null default now()
);

create index if not exists refeicoes_planejadas_user_data_idx on public.refeicoes_planejadas (user_id, data);
create index if not exists refeicoes_planejadas_lote_idx on public.refeicoes_planejadas (lote);

alter table public.refeicoes_planejadas enable row level security;

drop policy if exists "planejadas: dono le" on public.refeicoes_planejadas;
create policy "planejadas: dono le" on public.refeicoes_planejadas
  for select using (auth.uid() = user_id);
drop policy if exists "planejadas: dono insere" on public.refeicoes_planejadas;
create policy "planejadas: dono insere" on public.refeicoes_planejadas
  for insert with check (auth.uid() = user_id);
drop policy if exists "planejadas: dono altera" on public.refeicoes_planejadas;
create policy "planejadas: dono altera" on public.refeicoes_planejadas
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "planejadas: dono apaga" on public.refeicoes_planejadas;
create policy "planejadas: dono apaga" on public.refeicoes_planejadas
  for delete using (auth.uid() = user_id);

-- Teto anti-abuso: no máximo 200 itens planejados por pessoa (14 dias × 4 refeições × ~3,5 itens).
create or replace function public.refeicoes_planejadas_teto()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.refeicoes_planejadas where user_id = new.user_id) >= 200 then
    raise exception 'limite_planejadas' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists refeicoes_planejadas_teto on public.refeicoes_planejadas;
create trigger refeicoes_planejadas_teto before insert on public.refeicoes_planejadas
  for each row execute function public.refeicoes_planejadas_teto();

-- Faxina: planejado de mais de 7 dias atrás não serve mais (a pessoa não marcou).
create or replace function public.refeicoes_planejadas_faxina(p_user_id uuid, p_hoje date)
returns void language sql security definer set search_path = public as $$
  delete from public.refeicoes_planejadas where user_id = p_user_id and data < p_hoje - 7;
$$;
revoke execute on function public.refeicoes_planejadas_faxina(uuid, date) from public, anon, authenticated;
