-- =====================================================================
-- ATHOSlife — cota própria pro "Life estima" (24/10/2026, pedido do dono)
--
-- Código de barras é grátis pra todos (Open Food Facts, sem IA). Custo só
-- existe quando o produto não está na base e o Life estima com IA. Antes
-- isso gastava 1 mensagem do chat (grátis: 4/dia). Agora:
--   grátis: 1 estimativa por SEMANA (mesma regra da receita do Life);
--           depois disso o app mostra o plano pago;
--   pago:   20 por dia, separadas do chat (não come mensagem).
-- Vale pra busca da Dieta e pro código de barras não encontrado.
-- =====================================================================
alter table public.ia_uso_diario drop constraint if exists ia_uso_diario_tipo_check;
alter table public.ia_uso_diario add constraint ia_uso_diario_tipo_check
  check (tipo = any (array['chat', 'vision', 'recipe', 'life', 'estimar']));

create or replace function public.limite_ia(p_tipo text, p_pago boolean)
returns integer
language sql
immutable
set search_path to 'public'
as $function$
  select case p_tipo
    when 'chat'    then case when p_pago then 40 else 4 end
    when 'vision'  then case when p_pago then 5  else 0 end
    when 'recipe'  then case when p_pago then 10 else 1 end
    when 'life'    then case when p_pago then 6  else 0 end
    when 'estimar' then case when p_pago then 20 else 1 end
    else 0
  end;
$function$;

-- Grátis: receita e estimativa contam por semana (segunda a domingo).
create or replace function public.dia_da_cota(p_user_id uuid, p_tipo text)
returns date
language sql
stable
security definer
set search_path to 'public'
as $function$
  select case
    when p_tipo in ('recipe', 'estimar') and not public.is_premium_like(p_user_id)
      then date_trunc('week', public.hoje_do_usuario(p_user_id))::date
    else public.hoje_do_usuario(p_user_id)
  end;
$function$;
