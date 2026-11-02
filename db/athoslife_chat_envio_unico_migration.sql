-- Respostas duplicadas do Life (revisão de 26/10: uma pergunta recebeu duas
-- respostas parecidas com 1 minuto de diferença). O app já manda um
-- id_envio por mensagem e reusa o mesmo id quando reenvia depois de falha
-- de rede. Esta tabela guarda a resposta de cada envio: se o mesmo id chegar
-- de novo, a ai-proxy devolve a mesma resposta, sem IA e sem gastar cota.
-- Só o servidor (service role) lê e grava; linhas com mais de 2 dias somem.

create table if not exists public.life_chat_envios (
  user_id uuid not null references auth.users (id) on delete cascade,
  id_envio uuid not null,
  corpo jsonb,              -- null = ainda respondendo
  criado_em timestamptz not null default now(),
  primary key (user_id, id_envio)
);

alter table public.life_chat_envios enable row level security;
revoke all on public.life_chat_envios from anon, authenticated;
