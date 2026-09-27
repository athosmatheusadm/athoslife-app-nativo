-- ATHOSlife — alimentos favoritos (2026-09-24)
--
-- Suporte à estrela "salvar alimento" da Dieta: alimentos que o usuário
-- come com frequência ficam disponíveis no atalho "Alimentos salvos", sem
-- precisar pesquisar de novo toda vez. Mesmo padrão de receitas_favoritas
-- (join simples user_id/alimento_id, sem duplicar dado nutricional).

begin;

create table if not exists public.alimentos_favoritos (
  user_id uuid not null references public.profiles(id) on delete cascade,
  alimento_id uuid not null references public.alimentos(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (user_id, alimento_id)
);

alter table public.alimentos_favoritos enable row level security;

create policy "alimentos_favoritos_select_own"
  on public.alimentos_favoritos for select
  using (auth.uid() = user_id);

create policy "alimentos_favoritos_insert_own"
  on public.alimentos_favoritos for insert
  with check (auth.uid() = user_id);

create policy "alimentos_favoritos_delete_own"
  on public.alimentos_favoritos for delete
  using (auth.uid() = user_id);

commit;
