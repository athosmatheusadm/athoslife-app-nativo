# Como subir o ATHOSlife no GitHub

Objetivo: guardar **tudo** (código + docs + SQL) num repositório. Isso é
guardar o trabalho, não terminar o app — e é rápido. Seu Dell de 4GB dá conta,
e boa parte dá pra fajardo até pelo celular.

## O que vai pra dentro do repositório

```
athoslife/
  src/            código do app (React + TS)
  android/        projeto nativo (gerado pelo Capacitor)
  db/             SQL: migração + seed da Cozinha
  docs/           regras de negócio, status, diretrizes
  .github/        build do .aab na nuvem (já pronto)
  README.md, package.json, etc.
```

## Caminho A — pelo Claude Code (recomendado, roda leve no 4GB)

1. Descompacte o zip do projeto numa pasta.
2. No terminal, dentro da pasta:
   ```bash
   git init
   git add .
   git commit -m "ATHOSlife: fundação + scanner + água + perfil + cozinha"
   ```
3. Crie um repositório vazio no GitHub (site ou app), **sem** README.
4. Ligue e envie:
   ```bash
   git remote add origin https://github.com/SEU_USUARIO/athoslife.git
   git branch -M main
   git push -u origin main
   ```

O Claude Code faz tudo isso pra você — é só pedir "sobe esse projeto no meu GitHub".

## Caminho B — direto no site do GitHub (dá pra fazer no celular)

1. Cria um repositório novo no github.com.
2. "uploading an existing file" → arrasta os arquivos do projeto.
   (Funciona, mas é chato pra muitas pastas — o Caminho A é melhor.)

## Depois de subir: o build do .aab

O arquivo `.github/workflows/android-build.yml` já está pronto. Assim que o
código estiver no GitHub, você cadastra os segredos (Settings → Secrets) e
dispara o build pela aba **Actions** — o servidor do GitHub monta o `.aab`,
seu note não compila nada. (Isso é pra quando o app estiver mais adiante;
não precisa ser agora.)

## O que NÃO sobe (já está no .gitignore)

`node_modules/`, `dist/`, `.env` (suas chaves — nunca vão pro GitHub),
builds do Android. Isso é de propósito: chave de API em repositório é furo
de segurança.

## Ordem pra rodar o SQL da Cozinha (quando for popular o banco)

No Supabase, SQL Editor, nesta ordem:
1. `db/athoslife_cozinha_migration.sql`
2. `db/athoslife_cozinha_seed.sql`
