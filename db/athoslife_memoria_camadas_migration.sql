-- ATHOSlife — histórico do chat em camadas + tokens separados no log (2026-10-27)
--
-- 1. life_chat_mensagens.resumo: linha curta da troca, escrita pelo modelo
--    na própria resposta ([[RESUMO: ...]]). As mensagens antigas vão para o
--    modelo só por essa linha. Só o servidor grava (insert já é revogado do app).
-- 2. ai_audit_logs: entrada, saída, raciocínio e cache separados, modelo e
--    versão do contexto. Nulo = não medido (linhas antigas).

alter table public.life_chat_mensagens
  add column if not exists resumo text check (resumo is null or char_length(resumo) <= 200);

alter table public.ai_audit_logs
  add column if not exists tokens_entrada    integer,
  add column if not exists tokens_saida      integer,
  add column if not exists tokens_raciocinio integer,
  add column if not exists tokens_cache      integer,
  add column if not exists modelo            text,
  add column if not exists versao_contexto   text;
