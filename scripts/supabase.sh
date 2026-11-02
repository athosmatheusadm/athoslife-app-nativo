#!/usr/bin/env bash
# Publica no Supabase do ATHOSlife com o token salvo em ~/.supabase/access-token.
#   bash scripts/supabase.sh migrar db/arquivo_migration.sql   (roda numa transação)
#   bash scripts/supabase.sh deploy ai-proxy                    (Edge Function)
#   bash scripts/supabase.sh segredo NOME=valor
# Vários passos numa linha: bash scripts/supabase.sh migrar a.sql deploy ai-proxy
set -euo pipefail

REF=gsdwsxwbmxcvutpvpkyi
TOKEN="$(cat ~/.supabase/access-token)"
cd "$(dirname "$0")/.."

while [ $# -gt 0 ]; do
  acao="$1"; alvo="${2:?falta o argumento de $1}"; shift 2
  case "$acao" in
    migrar)
      echo "Migração: $alvo"
      resposta="$(node -e 'const fs=require("fs");process.stdout.write(JSON.stringify({query:"begin;\n"+fs.readFileSync(process.argv[1],"utf8")+"\ncommit;"}))' "$alvo" |
        curl -s -w '\n%{http_code}' -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
          -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data @-)"
      codigo="${resposta##*$'\n'}"
      if [ "$codigo" != "201" ] && [ "$codigo" != "200" ]; then echo "Falhou (HTTP $codigo): ${resposta%$'\n'*}"; exit 1; fi
      echo "   ok" ;;
    deploy)
      echo "Deploy: $alvo"
      SUPABASE_ACCESS_TOKEN="$TOKEN" npx supabase functions deploy "$alvo" --project-ref "$REF" --use-api --workdir . ;;
    segredo)
      echo "Segredo: ${alvo%%=*}"
      SUPABASE_ACCESS_TOKEN="$TOKEN" npx supabase secrets set "$alvo" --project-ref "$REF" ;;
    *) echo "Ação desconhecida: $acao"; exit 1 ;;
  esac
done
echo "Pronto."
