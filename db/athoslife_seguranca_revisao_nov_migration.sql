-- ATHOSlife — revisão de segurança de 10/11/2026 (teste de invasão com 2 contas).
-- Pode rodar mais de uma vez.
--
-- 1. Catálogo de código de barras: a foto do produto é mostrada pra todo
--    mundo que ler o mesmo código. Qualquer conta conseguia gravar uma URL de
--    qualquer site (rastreio de IP / imagem imprópria). Agora só fica imagem
--    do Open Food Facts; qualquer outra vira nulo.
-- 2. Funções de gatilho não precisam ser chamáveis pela API.
-- 3. Quem não está logado não precisa de permissão em tabela nenhuma (as
--    regras por linha já barravam; isto é a segunda tranca).
-- 4. Bucket de avatares: a foto continua pública pelo link, mas ninguém mais
--    lista a pasta dos outros.

-- 1 ---------------------------------------------------------------
create or replace function public.produtos_codigo_barras_limpar_imagem()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.imagem_url is not null
     and new.imagem_url !~ '^https://([a-z0-9-]+\.)*openfoodfacts\.(org|net)/[^[:space:]]*$' then
    new.imagem_url := null;
  end if;
  return new;
end;
$$;

revoke all on function public.produtos_codigo_barras_limpar_imagem() from public, anon, authenticated;

drop trigger if exists produtos_codigo_barras_limpar_imagem on public.produtos_codigo_barras;
create trigger produtos_codigo_barras_limpar_imagem
  before insert or update of imagem_url on public.produtos_codigo_barras
  for each row execute function public.produtos_codigo_barras_limpar_imagem();

update public.produtos_codigo_barras
   set imagem_url = null
 where imagem_url is not null
   and imagem_url !~ '^https://([a-z0-9-]+\.)*openfoodfacts\.(org|net)/[^[:space:]]*$';

-- 2 ---------------------------------------------------------------
revoke all on function public.habito_aprender_trigger()   from public, anon, authenticated;
revoke all on function public.habitos_vontades_local()    from public, anon, authenticated;
revoke all on function public.life_agendar_aviso_risco()  from public, anon, authenticated;
revoke all on function public.recaidas_horario_local()    from public, anon, authenticated;
revoke all on function public.refeicoes_planejadas_teto() from public, anon, authenticated;
revoke all on function public.handle_streak_on_open()     from public, anon, authenticated;

revoke all on function public.life_config_ligada(text) from public, anon;
grant execute on function public.life_config_ligada(text) to authenticated, service_role;

-- 3 ---------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
-- Vagas de fundador: contagem pública (já tinha regra própria pra anon).
grant select on public.fundador_vagas to anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- 4 ---------------------------------------------------------------
drop policy if exists avatars_public_read on storage.objects;
drop policy if exists avatars_owner_select on storage.objects;
create policy avatars_owner_select on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
