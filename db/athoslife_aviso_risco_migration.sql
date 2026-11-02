-- ================================================================
-- ATHOSlife · O "oi" do Life na semana seguinte a um tropeço (02/11/2026)
-- docs/PLANO_LIFE_ACOES.md, Fase 5 (guia "Aviso de recaída").
-- Depende de: treino_chat e agua_habito_desfazer (aplicar DEPOIS delas:
-- as três redefinem o check de tipos de life_acoes).
--
-- Começa DESLIGADO (life_config.aviso_risco = '0'): nada é perguntado nem
-- agendado até o dono ligar, depois de validar a régua com o psicólogo:
--   update life_config set valor = '1' where chave = 'aviso_risco';
--
-- Como funciona (ligado): a pessoa conta um tropeço → o Life pergunta UMA
-- vez se pode dar um oi na semana que vem, um pouco antes desse horário →
-- com "Pode", cada tropeço marca um alô (mesmo dia da semana, 7 dias
-- depois, 30 min antes, no fuso dela) → o app agenda a notificação neutra
-- ("Passando pra dar um oi") → ao tocar, o chat abre com um papo leve que
-- não cita o hábito. "Não precisa" vale até ela religar.
-- ================================================================

-- 0. Interruptor (só o servidor lê; ninguém pelo app)
create table if not exists public.life_config (
  chave text primary key,
  valor text not null
);
alter table public.life_config enable row level security;
insert into public.life_config (chave, valor) values ('aviso_risco', '0') on conflict (chave) do nothing;

create or replace function public.life_config_ligada(p_chave text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select valor = '1' from public.life_config where chave = p_chave), false)
$$;

-- 1. Licença: null = ainda não perguntado, true = pode, false = não precisa
alter table public.profiles add column if not exists avisos_risco boolean;

-- 2. Os alôs
create table if not exists public.life_avisos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  vicio_id uuid not null references public.vicios_user(id) on delete cascade,
  recaida_id uuid references public.recaidas(id) on delete set null,
  enviar_em timestamptz not null,
  estado text not null default 'proposto' check (estado in ('proposto', 'agendado', 'aberto', 'cancelado')),
  criado_em timestamptz not null default now()
);
create index if not exists life_avisos_user_estado_idx on public.life_avisos (user_id, estado, enviar_em);
alter table public.life_avisos enable row level security;
drop policy if exists "avisos: dono le" on public.life_avisos;
create policy "avisos: dono le" on public.life_avisos for select using (auth.uid() = user_id);

-- 3. Marca o alô a cada tropeço: agendado com licença, proposto se ainda não respondeu.
create or replace function public.life_agendar_aviso_risco()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_fuso text := public.fuso_do_usuario(new.user_id);
  v_ok boolean;
  v_licenca boolean;
  v_construir boolean;
  v_quando timestamptz;
  v_ignorados int;
begin
  if not public.life_config_ligada('aviso_risco') then return new; end if;

  select coalesce(consentimento_habitos, false) and coalesce(life_chat_ligado, true), avisos_risco
    into v_ok, v_licenca from profiles where id = new.user_id;
  select public.categoria_construir(categoria) into v_construir from vicios_user where id = new.vicio_id;
  if not coalesce(v_ok, false) or v_licenca is false or coalesce(v_construir, true) or new.horario is null then
    return new;
  end if;

  -- Dois alôs seguidos que ela não abriu: para de marcar pra esse hábito.
  select count(*) into v_ignorados from (
    select estado from life_avisos
     where user_id = new.user_id and vicio_id = new.vicio_id and estado in ('agendado', 'aberto') and enviar_em < now()
     order by enviar_em desc limit 2
  ) x where estado = 'agendado';
  if v_ignorados >= 2 then return new; end if;

  -- mesmo dia da semana, 7 dias depois, 30 min antes, no fuso da pessoa
  v_quando := (((new.data + 7) + new.horario) - interval '30 minutes') at time zone v_fuso;
  if v_quando <= now() then return new; end if;

  -- um alô por hábito por dia: vale o horário mais cedo
  update life_avisos set enviar_em = least(enviar_em, v_quando)
   where user_id = new.user_id and vicio_id = new.vicio_id
     and estado in ('proposto', 'agendado')
     and (enviar_em at time zone v_fuso)::date = (v_quando at time zone v_fuso)::date;
  if not found then
    insert into life_avisos (user_id, vicio_id, recaida_id, enviar_em, estado)
    values (new.user_id, new.vicio_id, new.id, v_quando, case when v_licenca then 'agendado' else 'proposto' end);
  end if;
  return new;
end $$;

drop trigger if exists recaidas_aviso_risco on public.recaidas;
create trigger recaidas_aviso_risco after insert on public.recaidas
  for each row execute function public.life_agendar_aviso_risco();

-- 4. Resposta da pessoa (pelo app: o usuário logado; pela ai-proxy: o id passado).
create or replace function public.life_responder_licenca_aviso(p_pode boolean, p_user_id uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := coalesce(auth.uid(), p_user_id);
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  update profiles set avisos_risco = p_pode where id = v_uid;
  update life_avisos
     set estado = case when p_pode then 'agendado' else 'cancelado' end
   where user_id = v_uid and estado = case when p_pode then 'proposto' else estado end
     and estado in ('proposto', 'agendado') and enviar_em > now();
end $$;
revoke execute on function public.life_responder_licenca_aviso(boolean, uuid) from public, anon;

-- 5. life_acoes: pedido de licença em um toque
alter table public.life_acoes drop constraint if exists life_acoes_tipo_check;
alter table public.life_acoes add constraint life_acoes_tipo_check
  check (tipo in ('repetir_refeicao', 'salvar_restricao', 'registrar_tropeco', 'adicionar_exercicio', 'copiar_treino',
                  'registrar_agua', 'marcar_habito', 'licenca_aviso'));
