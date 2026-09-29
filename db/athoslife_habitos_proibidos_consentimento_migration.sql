-- ATHOSlife — Hábitos: sem álcool/cigarro/drogas/apostas + consentimento (2026-09-28)
--
-- Decisão do dono: o app NÃO acompanha cerveja, álcool, cigarro (nem nada
-- parecido). Isso é dado sensível de dependência química e fora do escopo
-- do produto. Trava no servidor (o app também avisa antes, mas quem manda
-- é aqui): nome do hábito com termo proibido -> erro 'habito_nao_permitido'.
--
-- Também passa a exigir profiles.consentimento_habitos = true pra criar ou
-- reativar hábito (antes era gravado no consentimento e ignorado).
--
-- A lista é em pt/en/es e casa por palavra inteira, depois de tirar acento
-- e caixa. Palavras ambíguas ficaram de fora de propósito ("beber", "drink",
-- "erva", "trago", "pod") — bloqueariam "beber água" ou "chá de erva-doce".
-- Espelho no app: domain/entities/habito.ts (TERMOS_PROIBIDOS) — manter igual.

create or replace function public.normalizar_texto(p text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    lower(translate(coalesce(p, ''),
      'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
      'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn')),
    '[^a-z0-9]+', ' ', 'g');
$$;

create or replace function public.habito_nome_proibido(p_nome text)
returns boolean
language sql
immutable
as $$
  select public.normalizar_texto(p_nome) ~ (
    '\m(' ||
    -- álcool
    'cerveja|cervejas|breja|chopp|chope|alcool|alcoolica|alcoolicas|alcoolico|bebida alcoolica|bebidas alcoolicas|' ||
    'vinho|vinhos|vodka|vodca|whisky|whiskey|uisque|cachaca|pinga|caipirinha|caipiroska|tequila|gin|rum|licor|' ||
    'espumante|champagne|champanhe|sake|conhaque|absinto|cerveza|cervezas|vino|vinos|borrachera|' ||
    'beer|beers|alcohol|alcoholic|wine|liquor|booze|drunk|bebado|bebada|embriagar|ressaca|hangover|' ||
    -- tabaco / nicotina
    'cigarro|cigarros|cigarrinho|fumar|fumo|tabaco|nicotina|vape|vapes|vaper|cigarro eletronico|narguile|narguile|' ||
    'charuto|charutos|palheiro|cigarrillo|cigarrillos|cigarette|cigarettes|smoking|smoke|tobacco|cigar|cigars|' ||
    'hookah|shisha|juul|snus|' ||
    -- drogas
    'maconha|cannabis|marijuana|marihuana|weed|cocaina|cocaine|crack|droga|drogas|drug|drugs|' ||
    'heroina|heroin|metanfetamina|meth|ecstasy|mdma|lsd|cetamina|ketamine|lanca perfume|lolo|opioide|opioides|' ||
    'opioid|opioids|porro|porros|' ||
    -- apostas
    'aposta|apostas|apostar|bet|bets|cassino|casino|gambling|jogo do bicho|tigrinho|apuestas|' ||
    -- conteúdo sexual (dado sensível de vida sexual)
    'pornografia|porno|porn|masturbacao|masturbation' ||
    ')\M'
  );
$$;

create or replace function public.validar_habito()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if public.habito_nome_proibido(new.nome) then
    raise exception 'habito_nao_permitido'
      using hint = 'O ATHOSlife não acompanha álcool, cigarro, drogas nem apostas.';
  end if;

  -- Só ao criar ou reativar (desativar/excluir sempre pode).
  if coalesce(new.ativo, true)
     and (tg_op = 'INSERT' or not coalesce(old.ativo, true))
     and not exists (
       select 1 from public.profiles
       where id = new.user_id and coalesce(consentimento_habitos, false)
     ) then
    raise exception 'sem_consentimento_habitos';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_habito on public.vicios_user;
create trigger trg_validar_habito
  before insert or update of nome, ativo on public.vicios_user
  for each row execute function public.validar_habito();
