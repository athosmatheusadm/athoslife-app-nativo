# ATHOSlife — regras para quem mexe no código (Claude, GPT/Codex)

Duas IAs trabalham neste repositório. Siga isto antes de qualquer mudança.

## Antes de começar
1. `git pull` na `main`. Nunca comece de uma cópia velha.
2. Leia o fim de `docs/WORKLOG.md` (último bloco = pendências) e `docs/STATUS.md`.

## Ao terminar
1. Acrescente um bloco datado no fim de `docs/WORKLOG.md`: o que mudou,
   o que foi validado e as pendências.
2. Rode `npm run typecheck` e `npm run build` (e os testes que tocou).
3. Commit e `git push`. Nada fica só no PC.
4. Mudança grande ou arriscada: branch própria + PR, não direto na `main`.

## Regras do app
- **Todo texto visível em pt, en e es** (`src/i18n/`). Nada fixo em português.
- **Visual:** use os tokens do app (cores, `brand`, `accent-*`, `macro-*`).
  Não reestruture layouts nem redesenhe telas sem o dono pedir; polir é ok.
- **Banco primeiro:** se o JS depende de coluna/tabela nova, a migração
  (`db/*_migration.sql`) tem que estar aplicada antes de publicar o JS.
- **Edge Functions** em `supabase/functions/` (`ai-proxy`, `rc-sync`,
  `rc-webhook`, `_shared/`). Mudou uma? Avise no WORKLOG que precisa deploy.
- **Assinatura é pelo RevenueCat** (Play Billing por baixo). Não usar Stripe.
- **WhatsApp está fora** desta versão. Não reintroduzir.
- Custo de IA: teto diário baixo no lançamento; proteja contra abuso em vez
  de cortar benefício do plano pago.
- Pacotes/zips trazidos de outras sessões: conferir contra o código atual
  antes de aplicar (podem desfazer decisões já tomadas).

## Nunca
- Commitar `.env`, tokens, chaves (`sk_`, `sbp_`, `ghp_`, service role).
- Commitar os zips, imagens e HTMLs soltos da raiz (material de referência).
- `git push --force` na `main`.
