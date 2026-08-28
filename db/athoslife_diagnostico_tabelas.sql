-- DIAGNÓSTICO — só leitura, não muda nada no banco.
-- Roda isso e me manda o resultado (as duas tabelas que aparecem).

-- 1) Quais das tabelas da Dieta já existem de verdade?
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('itens_refeicao', 'refeicoes_status', 'refeicoes_extra', 'refeicoes', 'profiles')
ORDER BY table_name;

-- 2) A extensão que gera UUID (uuid_generate_v4) está instalada?
SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp';
