-- =====================================================================
-- ATHOSlife — receitas temáticas (24/10/2026, ideia do dono)
--
-- Em época de festa (Natal, Ano-Novo, Páscoa, Festa Junina) a Cozinha
-- ganha um expositor com as receitas da data. `temas` marca a receita;
-- a janela de cada data é decidida no app (src/domain/rules/temasSazonais.ts).
-- Receita sem tema continua igual.
-- =====================================================================
alter table public.receitas_cozinha
  add column if not exists temas text[] not null default '{}';

alter table public.receitas_cozinha drop constraint if exists receitas_cozinha_temas_check;
alter table public.receitas_cozinha add constraint receitas_cozinha_temas_check
  check (temas <@ array['natal', 'ano_novo', 'pascoa', 'festa_junina']::text[]);

-- A tabela libera leitura coluna por coluna (o `conteudo` só sai pela RPC
-- do plano). Alérgenos e temas são vitrine: o app lê direto.
grant select (alergenos, temas) on public.receitas_cozinha to authenticated;
