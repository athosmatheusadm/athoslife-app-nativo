# Teste do widget Android — 12/10/2026

Aparelho reconhecido pelo ADB: modelo 2511FPC34G, Android 16. ATHOSlife não estava instalado no início da sessão.

Preparação: ferramentas Java 21, SDK 36 e Gradle 8.14.3 preparadas em pasta temporária do Windows. Tentativa anterior no WSL abandonada após lentidão e timeout de conexão. Build web Windows passou; Capacitor sync passou. Binários Windows de Rollup 4.62.2 e esbuild 0.21.5 adicionados somente em node_modules; versões/lockfile não alterados.

## Roteiro ainda a executar no aparelho

- Instalar APK debug atualizado e abrir. Entrar pelo próprio celular, sem compartilhar senha.
- Adicionar o widget à tela inicial. Conferir estado/meta inicial com a Home.
- Tocar copo com app em segundo plano; confirmar incremento no widget, Home e persistência após reabrir.
- Trocar volume entre 250, 500 e 1000 ml; conferir incremento correspondente.
- Testar fila offline e reenvio, sem duplicação, ao retomar o aplicativo.
- Testar Life/contador -> Home e câmera -> scanner com abertura fria e app já aberto.
- Abrir câmera/leitor a partir do scanner; conferir permissões, cancelamento e retorno ao app.
- Remover somente registros criados durante o teste e conferir totais restaurados.

Até aqui nenhuma dessas etapas de execução integrada foi concluída. Os 10 testes de lógica da sessão anterior não substituem este roteiro.
