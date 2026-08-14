# ATHOSlife — App Android

Reconstrução do ATHOSlife como aplicativo Android nativo (Capacitor) com TypeScript strict.
O PWA foi aposentado; ele existe apenas como documentação de regras de negócio.

## Status: Fase 0 concluída (fundação)

| Item | Estado |
|------|--------|
| React + Vite + TypeScript strict | ✅ 0 erros |
| Design tokens (do mockup) | ✅ |
| Capacitor + plataforma Android | ✅ `android/` gerada |
| Guards de rota na ordem correta | ✅ |
| Botão físico "Voltar" | ✅ |
| Sessão via Preferences (não localStorage) | ✅ |
| Build na nuvem (.aab sem PC potente) | ✅ GitHub Actions |
| Camada de domínio completa | ⬜ Fase 1 |
| Telas reais | ⬜ Fases 2–4 |
| Google Play Billing | ⬜ Fase 5 |

## Rodar

```bash
npm install
cp .env.example .env    # preencha com suas chaves do Supabase
npm run dev             # abre em http://localhost:5173
```

Para testar no celular na mesma rede Wi-Fi, use o IP que o Vite mostrar
(o `host: true` já está configurado). **Não precisa de emulador.**

## Gerar o .aab sem compilar no seu PC

1. Suba este projeto para um repositório no GitHub.
2. Em **Settings → Secrets and variables → Actions**, cadastre:
   `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`,
   `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
3. Aba **Actions → Build Android (.aab) → Run workflow**.
4. Baixe o `.aab` em **Artifacts** e envie na Play Console.

O servidor do GitHub compila. Sua máquina não precisa do Android Studio.

## Arquitetura

```
src/
  domain/      TypeScript puro. Sem React, sem Supabase, sem Capacitor.
               Regras de negócio. Android e iOS reusam 100% desta camada.
  data/        Repositories + Supabase + ai-proxy. Traduz snake_case -> domínio.
               Único lugar que conhece o banco.
  ui/          Só apresentação. Nunca contém regra de negócio.
  app/         Sessão, roteador, guards, ciclo de vida do Android.
```

**Regra de ouro:** a UI nunca importa `@data/supabase/client` diretamente.
Sempre via Repository.

### Fronteira de autoridade

A decisão de acesso é **do Postgres** (`check_access_status`, `is_premium_like`, RLS).
`src/domain/rules/access.ts` é apenas espelho para a interface.
Nunca libere conteúdo pago com base só no client.

## Regras de plataforma

- Venda de assinatura: **só** Google Play Billing (Stripe/Kiwify aposentados).
- Trial de 30 dias e acesso VIP/admin **não** são venda → fora da Play.
- Animações: só `transform` e `opacity`. Mascote em Lottie.
- Nada de `localStorage` para dados. Tudo Supabase; sessão em Preferences.

## Próxima fase

**Fase 1 — Camada de domínio e dados:** portar as regras do backend para
`src/domain` (metas, gamificação, mascote, vícios) e os repositories restantes.

Consulte `ATHOSlife_Regras_de_Negocio.md` — é o contrato do que não pode quebrar.
