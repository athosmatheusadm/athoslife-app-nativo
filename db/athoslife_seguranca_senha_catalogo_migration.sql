-- ATHOSlife — 10/11/2026: trava de senha errada e catálogo de código de
-- barras fechado pra escrita. Pode rodar mais de uma vez.
--
-- 1. Catálogo de código de barras: o app gravava na base o que achava nas
--    bases públicas e o que a pessoa copiava do rótulo. Como o dado vem do
--    celular, qualquer conta conseguia inventar produto pra todo mundo. O
--    dono decidiu tirar: ninguém mais grava pelo app. A leitura continua, e
--    o rótulo copiado fica só no celular de quem copiou.
-- 2. Senha errada repetida: 8 erros seguidos travam o login daquela conta
--    por 15 minutos (gancho "password verification" do Supabase Auth).
--    Depois da migração, ligar o gancho na configuração do Auth:
--    pg-functions://postgres/public/hook_tentativa_senha
--    ATENÇÃO (10/11): o plano atual do Supabase recusou ligar esse gancho
--    (HTTP 402). A função e a tabela ficam prontas, mas sem efeito. O que
--    protege hoje é o limite por IP do próprio Auth (~20 tentativas/5 min).

-- 1 ---------------------------------------------------------------
revoke all on function public.salvar_produto_codigo_barras(text, text, text, numeric, numeric, numeric, numeric, numeric, text, text)
  from public, anon, authenticated;

-- 2 ---------------------------------------------------------------
create table if not exists public.auth_tentativas_senha (
  user_id uuid primary key references auth.users(id) on delete cascade,
  falhas integer not null default 0,
  ultima_falha timestamptz not null default now()
);

alter table public.auth_tentativas_senha enable row level security;
revoke all on public.auth_tentativas_senha from public, anon, authenticated;

create or replace function public.hook_tentativa_senha(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (event->>'user_id')::uuid;
  v_valida boolean := coalesce((event->>'valid')::boolean, false);
  v_falhas integer;
  v_ultima timestamptz;
  c_max constant integer := 8;
  c_janela constant interval := interval '15 minutes';
begin
  select falhas, ultima_falha into v_falhas, v_ultima
    from auth_tentativas_senha where user_id = v_uid;

  -- Travado: recusa até a senha certa, senão o ataque continuaria testando.
  if v_falhas >= c_max and v_ultima > now() - c_janela then
    return jsonb_build_object('error', jsonb_build_object(
      'http_code', 429,
      'message', 'Too many attempts. Try again in a few minutes.'));
  end if;

  if v_valida then
    delete from auth_tentativas_senha where user_id = v_uid;
  else
    insert into auth_tentativas_senha (user_id, falhas, ultima_falha)
    values (v_uid, 1, now())
    on conflict (user_id) do update set
      falhas = case when auth_tentativas_senha.ultima_falha > now() - c_janela
                    then auth_tentativas_senha.falhas + 1 else 1 end,
      ultima_falha = now();
  end if;

  return jsonb_build_object('decision', 'continue');
end;
$$;

revoke all on function public.hook_tentativa_senha(jsonb) from public, anon, authenticated;
grant execute on function public.hook_tentativa_senha(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
