-- ATHOSlife — CORREÇÃO: onboarding não salvava (2026-09-29) — RODADO
--
-- profiles usa lista de colunas que o usuário pode alterar (UPDATE por
-- coluna pro papel authenticated — protege plano/assinatura/is_admin).
-- A migração da globalização (28/09) criou idioma, pais, fuso, unidades e
-- onboarding_respostas SEM liberar UPDATE nelas: o fim do onboarding e
-- Perfil > Idioma e região levavam 403 (permission denied), e a tela dizia
-- "confere a internet". fuso inválido é seguro (fuso_do_usuario cai em
-- America/Sao_Paulo).
--
-- REGRA: coluna nova em profiles que o app grava -> incluir no GRANT.

grant update (idioma, pais, fuso, unidades, onboarding_respostas) on public.profiles to authenticated;
