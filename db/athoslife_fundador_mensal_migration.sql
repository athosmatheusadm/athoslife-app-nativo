-- ATHOSlife — Fundador vale no mensal e no anual (dono, 15/11/2026)
-- Os 300 primeiros assinantes viram Fundador, qualquer que seja o plano.
-- Aplicado em 15/11/2026 pelo conector do Supabase.
update public.billing_config
   set planos_fundador = array['mensal', 'anual'], atualizado_em = now()
 where id = 1;
