-- ATHOSlife — limites do plano grátis travados no servidor (2026-09-27)
--
-- Sem begin/commit de propósito: o SQL Editor já roda o script como um bloco
-- único (um begin/commit explícito causou rollback em 2026-09-26).
--
-- 1) Receitas da Cozinha: vitrine pra todos, conteúdo só pra quem é pago.
--    Antes: a tela mostrava cadeado, mas `select *` pela API entregava o
--    conteúdo inteiro das 25 receitas pagas pra qualquer usuário grátis.
--    Agora a coluna `conteudo` sai do SELECT direto e só é entregue pela
--    função receitas_conteudo_liberado(), que confere is_premium_like().
--
-- 2) Hábitos: grátis = 1 hábito ativo. Trigger barra o 2º (insert ou
--    reativação de um antigo). Quem já tinha mais de 1 quando era pago
--    continua com os que tem — só não cria/reativa outro.
--
-- 3) is_premium_like(): trial com trial_expira NULL contava como pago pra
--    sempre. Alinhado com o app (access.ts): trial sem data = sem acesso.
--    Hoje nenhum perfil está nesse caso (conferido 2026-09-27).


-- ── 1) Receitas: vitrine + conteúdo protegido ────────────────────────────

revoke all on public.receitas_cozinha from anon, authenticated;

grant select (
  id, titulo, subtitulo, categoria, macros, kcal, mascote_modo, cor_tema,
  premium, destaque, ordem, created_at, tempo_preparo_min
) on public.receitas_cozinha to authenticated;

create or replace function public.receitas_conteudo_liberado()
returns table (id uuid, conteudo text)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.conteudo
  from public.receitas_cozinha r
  where auth.uid() is not null
    and (not coalesce(r.premium, false) or public.is_premium_like(auth.uid()));
$$;

revoke all on function public.receitas_conteudo_liberado() from public, anon;
grant execute on function public.receitas_conteudo_liberado() to authenticated;


-- ── 2) Hábitos: 1 ativo no grátis ────────────────────────────────────────

create or replace function public.limitar_habitos_gratis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not coalesce(new.ativo, true) then
    return new;
  end if;
  if tg_op = 'UPDATE' and coalesce(old.ativo, true) then
    return new; -- já estava ativo: edição comum, não conta como hábito novo
  end if;
  if public.is_premium_like(new.user_id) then
    return new;
  end if;
  if exists (
    select 1 from public.vicios_user v
    where v.user_id = new.user_id and v.ativo and v.id <> new.id
  ) then
    raise exception 'limite_habitos_gratis'
      using hint = 'Plano grátis acompanha 1 hábito por vez.';
  end if;
  return new;
end;
$$;

revoke all on function public.limitar_habitos_gratis() from public, anon, authenticated;

drop trigger if exists trg_limitar_habitos_gratis on public.vicios_user;
create trigger trg_limitar_habitos_gratis
  before insert or update of ativo on public.vicios_user
  for each row execute function public.limitar_habitos_gratis();


-- ── 3) is_premium_like: trial sem data não é acesso ──────────────────────

create or replace function public.is_premium_like(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and (
        plano in ('premium', 'vip', 'fundador', 'vitalicio')
        or (plano = 'trial' and trial_expira is not null and trial_expira > now())
      )
  );
$$;
