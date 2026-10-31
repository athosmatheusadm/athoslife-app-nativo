-- ATHOSlife — limite diário do chat com o Life ampliado (2026-10-27)
--
-- Dono 27/10: chat grátis 4 → 10 e pago 40 → 80 por dia. Custo medido em
-- ai_audit_logs: ~US$0,0011 por mensagem, então o pior caso de quem usa o
-- limite todo dia fica em ~US$0,33/mês (grátis) e ~US$2,60/mês (pago).
-- Os outros tipos continuam iguais.

create or replace function public.limite_ia(p_tipo text, p_pago boolean)
returns integer
language sql
immutable
set search_path to 'public'
as $$
  select case p_tipo
    when 'chat'    then case when p_pago then 80 else 10 end
    when 'vision'  then case when p_pago then 5  else 0 end
    when 'recipe'  then case when p_pago then 10 else 1 end
    when 'life'    then case when p_pago then 6  else 0 end
    when 'estimar' then case when p_pago then 20 else 1 end
    else 0
  end;
$$;
