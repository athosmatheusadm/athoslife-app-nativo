# Story Studio — análise antes de integrar (21/10/2026)

Origem: `ATHOS_Story_Capacitor.zip` (V3) trazido de outra sessão. O guia
original está em `STORY_STUDIO_INTEGRACAO_v3.md`. O HTML do editor (V3,
~415 KB) e o zip ficam na raiz como material de referência (não commitar).

## O que é
Editor de Stories 1080×1920: a pessoa escolhe a foto, põe os números do
treino/refeição por cima, escolhe um modelo e toca em "Postar nos Stories".
Um plugin nativo abre o Instagram com a imagem (Meta "Sharing to Stories");
sem Instagram, abre o menu de compartilhar do sistema.

## Pontos bons
- Nenhuma chamada a site externo, sem eval; foto fica no aparelho.
- Desfazer/refazer, layout lembrado por modalidade, faixas da área coberta
  pelo Instagram, "≈" nas calorias que vêm do scanner.
- `res/xml/file_paths.xml` do app já tem o `cache-path` que o plugin usa.

## O que não pode entrar como veio
1. `MainActivity.java` do zip **substitui** o nosso e apaga o registro do
   `LiveActivityPlugin` e do `WidgetAguaPlugin`. Fazer: só acrescentar
   `registerPlugin(AthosInstagramPlugin.class)`. Pacote certo:
   `br.com.athoslife.app` (o zip usa `com.athoslife.app`).
2. Textos só em português (regra do app: pt/en/es) e números sempre pt-BR.
3. Paleta e fonte próprias (`#101411`, `#d3f6a2`), não os tokens do app;
   layout de desktop em 3 colunas; botão "Sobre o protótipo".
4. Corrida e Jiu-Jitsu: o app não registra esses treinos (só dado de
   exemplo). Imagem do Life Jiu-Jitsu veio quebrada (o próprio guia avisa).
5. Abre como página separada (`window.location` → `/story/index.html`):
   sai do app React; voltar depende do histórico.
6. Precisa de **Facebook App ID** (developers.facebook.com) em
   `capacitor.config.ts` → `plugins.AthosInstagram.facebookAppId`, e
   `<queries><package android:name="com.instagram.android"/></queries>` no
   AndroidManifest.
7. Plugin escrito pra Capacitor 6/7; o app está no 8 (API Java igual, testar).

## Proposta (aguardando o dono)
Fase 1: Alimentação (do scanner, com "≈") + Musculação (do treino: volume,
séries, recorde quando houver histórico), com tokens do app e pt/en/es,
plugin Android com 1 linha no MainActivity. Corrida e Jiu-Jitsu depois.
Dono: criar o Facebook App ID.
