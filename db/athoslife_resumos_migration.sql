-- ================================================================
-- ATHOSlife · Resumos do dia e da semana (02/11/2026)
-- docs/PLANO_LIFE_ACOES.md, Fase 9 (guia item 14: "A memória cresce sem o
-- prompt crescer").
--
-- Sem cron: a ai-proxy gera os resumos que faltam em segundo plano, na
-- primeira mensagem do dia de quem está ativo (os inativos não custam nada).
-- Só com a memória ligada. Dia com palavra de risco não é resumido.
--
-- texto '' = dia/semana visto, sem nada a resumir (não tenta de novo).
-- Some junto: memória desligada, todas as memórias apagadas, conta apagada.
-- Aplicar ANTES do deploy da ai-proxy que lê/grava life_resumos (ela
-- funciona sem a tabela, só não resume).
-- ================================================================

create table if not exists public.life_resumos (
  user_id   uuid not null references auth.users on delete cascade,
  tipo      text not null check (tipo in ('dia', 'semana')),
  inicio    date not null,              -- o dia, ou a segunda-feira da semana
  texto     text not null default '' check (char_length(texto) <= 600),
  criado_em timestamptz not null default now(),
  primary key (user_id, tipo, inicio)
);
alter table public.life_resumos enable row level security;
-- O servidor (service role) grava; a pessoa pode ler e apagar os dela.
drop policy if exists life_resumos_dono_le on public.life_resumos;
create policy life_resumos_dono_le on public.life_resumos
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists life_resumos_dono_apaga on public.life_resumos;
create policy life_resumos_dono_apaga on public.life_resumos
  for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.life_resumos to authenticated;

-- Memória desligada: os resumos vão embora na hora.
create or replace function public.life_resumos_sem_consentimento()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.consentimento_memoria is distinct from true and old.consentimento_memoria is true then
    delete from public.life_resumos where user_id = new.id;
  end if;
  return new;
end $$;
revoke execute on function public.life_resumos_sem_consentimento() from public, anon, authenticated;
drop trigger if exists life_resumos_sem_consentimento on public.profiles;
create trigger life_resumos_sem_consentimento
  after update of consentimento_memoria on public.profiles
  for each row execute function public.life_resumos_sem_consentimento();

-- "Apagar tudo" na tela de memórias: sem nenhuma memória, sem resumos também.
create or replace function public.life_resumos_memoria_apagada()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from public.life_resumos r
   using (select distinct user_id from apagadas) a
   where r.user_id = a.user_id
     and not exists (select 1 from public.life_memorias m where m.user_id = a.user_id);
  return null;
end $$;
revoke execute on function public.life_resumos_memoria_apagada() from public, anon, authenticated;
drop trigger if exists life_resumos_memoria_apagada on public.life_memorias;
create trigger life_resumos_memoria_apagada
  after delete on public.life_memorias
  referencing old table as apagadas
  for each statement execute function public.life_resumos_memoria_apagada();
