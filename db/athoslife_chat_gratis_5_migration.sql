-- ATHOSlife — chat grátis 10 → 5 mensagens por dia (2026-11-08)
--
-- Dono 05/11, junto com a troca do chat pro gpt-6-luna (Haiku 5.5 de
-- reserva). Desabafo continua fora da cota (até 5 extras, no ai-proxy).
-- Pago fica em 80. Os outros tipos continuam iguais.
-- Aplicar junto com o deploy da ai-proxy v4.7 (não depende dela, mas é a
-- mesma decisão).

create or replace function public.limite_ia(p_tipo text, p_pago boolean)
returns integer
language sql
immutable
set search_path to 'public'
as $$
  select case p_tipo
    when 'chat'    then case when p_pago then 80 else 5 end
    when 'vision'  then case when p_pago then 5  else 0 end
    when 'recipe'  then case when p_pago then 10 else 1 end
    when 'life'    then case when p_pago then 6  else 0 end
    when 'estimar' then case when p_pago then 20 else 1 end
    else 0
  end;
$$;
