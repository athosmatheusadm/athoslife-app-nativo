#!/usr/bin/env bash
# Publica o scanner v1.1 no Supabase (projeto ATHOSlife), nesta ordem:
#   1. migração do banco (db/athoslife_scanner_v1_migration.sql, idempotente)
#   2. deploy da Edge Function ai-proxy (v4.2 peso + v4.3 scanner)
#   3. segredo SCANNER_V2=true (liga o scanner novo)
# Usa o token salvo em ~/.supabase/access-token. Rodar da raiz do repo:
#   bash scripts/publicar-scanner.sh
set -euo pipefail

REF=gsdwsxwbmxcvutpvpkyi
TOKEN="$(cat ~/.supabase/access-token)"
cd "$(dirname "$0")/.."

echo "1/3 Migração do scanner..."
resposta="$(node -e 'const fs=require("fs");process.stdout.write(JSON.stringify({query:"begin;\n"+fs.readFileSync("db/athoslife_scanner_v1_migration.sql","utf8")+"\ncommit;"}))' |
  curl -s -w '\n%{http_code}' -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
    -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data @-)"
codigo="${resposta##*$'\n'}"
if [ "$codigo" != "201" ] && [ "$codigo" != "200" ]; then
  echo "Falhou (HTTP $codigo): ${resposta%$'\n'*}"
  exit 1
fi
echo "   ok"

echo "2/3 Deploy da ai-proxy..."
SUPABASE_ACCESS_TOKEN="$TOKEN" npx supabase functions deploy ai-proxy --project-ref "$REF" --use-api --workdir .

echo "3/3 Segredo SCANNER_V2=true..."
SUPABASE_ACCESS_TOKEN="$TOKEN" npx supabase secrets set SCANNER_V2=true --project-ref "$REF"

echo "Pronto: scanner v1.1 publicado e ligado."
