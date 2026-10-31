-- =====================================================================
-- ATHOSlife — limpeza do Stripe (24/10/2026, autorizado pelo dono)
--
-- Assinatura é pelo RevenueCat. Os 4 índices de Stripe em profiles
-- (dois pares duplicados) só pesavam nas gravações do perfil. As tabelas
-- stripe_events / stripe_payments e as colunas stripe_* ficam: guardam o
-- histórico de quem pagou pelo Stripe. As funções stripe_webhook e
-- create-checkout foram apagadas no painel/CLI (Edge Functions).
-- WhatsApp fica (planos futuros do dono).
-- =====================================================================
drop index if exists public.profiles_stripe_customer_idx;
drop index if exists public.idx_profiles_stripe_customer_id;
drop index if exists public.idx_profiles_stripe_subscription_id;
drop index if exists public.profiles_stripe_subscription_idx;
