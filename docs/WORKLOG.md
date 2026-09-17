# ATHOSlife — Diário de trabalho

Log do que foi mexido em cada sessão. Vamos acumulando itens aqui e,
quando fechar um bloco de trabalho, sobe tudo com um commit + push só.

## 2026-08-18

- Migração de navegação para 5 abas raiz (Home, Dieta, Treinos, Hábitos,
  Scanner) + Perfil como tela cheia separada, sem bottom nav.
  Conquistas deixou de ser aba fixa e virou sub-página do Perfil, acessada
  via `ProfileAvatar` no header de cada tela raiz.
  Commit local: `7c8eb15` (ainda não empurrado — push falhou por falta de
  autenticação com o GitHub; resolver antes do próximo push).

## 2026-08-20

- Corrigido `MealCards` da Home: estava com `refeicoes={[]}` fixo (sempre
  "—" de kcal). Novo `refeicoesRepository.doDia()` soma calorias por tipo
  de refeição do dia; `MealCards` passou a buscar seus próprios dados.
- Correção de consistência de datas: `aguaRepository.adicionar()` e
  `refeicoesRepository.salvarDoScanner()` não gravavam a coluna `data`
  explicitamente (dependiam de default do banco), enquanto a leitura
  filtra por "hoje" calculado no app (UTC). Agora gravam `data` explícita,
  igual ao padrão que `pesoRepository`/`passosRepository`/`humorRepository`
  já usavam.
- Home reconstruída a partir de referência HTML entregue pelo usuário
  (`athoslife-home-funcional.html`, fora do repo — é spec de design, não
  código do projeto):
  - `TodayActivity.tsx`: os 4 discos (água/calorias/proteína/passos) agora
    abrem um painel único compartilhado embaixo da fileira (só um aberto
    por vez), em vez de ficarem mudos ao toque.
  - Água deixou de ter card próprio (`WaterCard.tsx` removido) — a função
    inteira (atalhos, valor customizado, editar meta, histórico do dia)
    virou o painel do disco de água. O "−" do valor customizado vira
    "desfazer último registro" (schema não aceita `quantidade_ml` negativo,
    diferente do protótipo estático).
  - Passos: painel informativo (contagem/km/kcal) + "Registrar manualmente"
    novo (usa `passosRepository.registrar()`, que já existia sem UI). Fica
    valendo mesmo depois do Health Connect existir — decisão do usuário.
  - `StreakCard.tsx` novo (dias + recorde). Sem a barra de "próximo nível"
    do mockup: decisão de não fabricar threshold sem a RPC de conquistas
    ligada (ver STATUS.md).
  - `profileRepository.atualizarMetaAgua()` novo, `ProgressRing` ganhou
    estado `ativo` (destaque quando o disco está aberto).
- `Login.tsx` estava um esqueleto (Fase 0, sem formulário). Construído de
  verdade: email/senha via novo `authRepository.ts` (login/logout —
  primeira tela a seguir a regra de "nenhuma tela fala com supabase
  direto"). `Consentimento.tsx`/`Onboarding.tsx` continuam esqueleto.
- `tsc --noEmit` estrito e `npm run build` sem erros. Não foi possível
  verificar visualmente neste ambiente (sem Chromium/Playwright) — testado
  via `npm run dev --host`, usuário confirmando na própria máquina.
- Push pro GitHub segue pendente (sem `gh` CLI nem credencial configurada
  neste ambiente); usuário optou por instalar o GitHub Desktop e empurrar
  manualmente por lá.

## 2026-08-24

- **Navegação Home → Dieta corrigida**: tocar num card de refeição na Home
  (`MealCards.tsx`) já mandava `?refeicao=tipo` na URL, mas `Dieta.tsx`
  ignorava esse parâmetro e sempre abria com o acordeão de café. Agora
  `Dieta.tsx` lê via `useSearchParams` e passa pra `DietScreen.tsx`
  (`abrirRefeicao`), que usa isso como estado inicial de `abertaTipo` em vez
  de `'cafe'` fixo. Clicar em "Almoço" agora abre direto no Almoço.
- **Home revisada de ponta a ponta** (a pedido do usuário, antes de mexer em
  Dieta): confirmado que todos os blocos (check-in emocional, discos,
  streak, refeições, peso) leem/gravam dado real, sem stub escondido.
- **Levantamento de falhas da Dieta** (não corrigidas ainda, só documentadas
  a pedido do usuário — evitar mexer nela até termos plano):
  1. Botão "+" (extra) não leva a lugar nenhum de verdade — `Dieta.tsx` só
     lista café/almoço/lanche/jantar (`REFEICOES_VAZIAS`), não existe um 5º
     acordeão pra "extra". Banco também trava `refeicoes.tipo` num `CHECK`
     com só esses 5 valores fixos — não dá pra ter refeição com nome livre
     sem migração de schema.
  2. Nenhum item de comida adicionado é salvo — `InlineFoodSearch.tsx` gera
     um ID falso no cliente (`item-${Date.now()}`) e `adicionarItem` em
     `DietScreen.tsx` só mexe em estado local do React. Sai da tela, some.
  3. `REFEICOES_VAZIAS` é hardcoded — a tela nunca busca o que o usuário já
     registrou no dia (não existe repositório de itens por refeição ainda).
  4. "Editar refeição" / "Excluir refeição" / checkbox de concluída em
     `MealAccordion.tsx` estão ligados a no-ops (`() => {}`) em
     `DietScreen.tsx` — clicáveis, mas não fazem nada.
  5. A tira de dias no topo (`diaSel`) é decorativa — nem os macros
     (`macrosRepository.doDia()` sempre busca hoje, sem parâmetro de data)
     nem a lista de refeições reagem à seleção de outro dia.
  6. Bug de texto: `DietScreen.tsx:92` mostra `metas.kcal` (a meta) com o
     rótulo "kcal registradas" — deveria mostrar `consumido.kcal`.
  7. Aba "Shakes & Chás" é só texto estático, sem conteúdo.
- **Saga de login resolvida** (usuário travado há ~4 dias tentando acessar
  `localhost:5173`):
  - `Login.tsx` mostrava sempre a mensagem genérica "Email ou senha
    incorretos" pra qualquer erro do Supabase — trocado pra mostrar
    `err.message` real, essencial pro diagnóstico.
  - Adicionado fluxo de **"Criar conta"** na tela de Login (`authRepository
    .criarConta()` → `supabase.auth.signUp`), com aviso de confirmação de
    email quando a sessão não vem ativa na hora.
  - Causa raiz provável do "Invalid login credentials" mesmo após trocar a
    senha: o email já tinha sido usado em tentativas anteriores (dias
    atrás) e ficou num estado não confirmado — `signUp` repetido nesse
    estado reenvia o email de confirmação mas **não atualiza a senha**, então
    a senha "válida" continuava sendo a de uma tentativa antiga.
  - Solução aplicada: **desligamos temporariamente "Confirm email"** em
    Authentication → Providers → Email no Supabase (⚠️ ver risco #4 em
    `STATUS.md` — reativar antes de produção), apagamos os usuários velhos
    presos, e criamos conta nova (`matheusecomerc@gmail.com`,
    id `573253e0-da61-46a1-92fb-acff2be6a8f4`) — login funcionou de primeira.
  - **Gap real descoberto**: `Consentimento.tsx` (e por extensão
    `Onboarding.tsx`) não tem NENHUM redirecionamento automático — a rota
    `/consentimento` fica fora do `RequireAuth` em `router.tsx`, então
    mesmo com `consentimento_aceito`/`onboarding_completo` = `true` no
    banco, ficar parado nessa tela não te move sozinho pra `/home`; é
    preciso navegar manualmente (digitar a URL). Isso vai morder de novo
    quando essas telas forem construídas de verdade — pensar nisso no
    design delas.
  - Pra destravar o teste, rodamos um `UPDATE public.profiles SET
    consentimento_aceito=true, onboarding_completo=true, ...metas padrão
    WHERE id = (usuário mais recente por last_app_open)` direto no SQL
    Editor do Supabase — é gambiarra de teste, não fluxo real de produto.
  - **Login confirmado funcionando, usuário chegou na Home.** Sessão
    encerrada aqui a pedido do usuário (ia desligar o PC).
- **Próximos passos sugeridos** (não decididos ainda, perguntar ao
  retomar): priorizar as falhas da Dieta listadas acima, ou construir
  Consentimento/Onboarding reais, ou seguir pro Scanner/Cozinha (STATUS.md).

## 2026-08-25

- **Home — ajustes de design pedidos pelo usuário:**
  - Tirado o emoji 🤔 do lado de "Como você está hoje?" (`EmotionalCheckin.tsx`).
  - "Café da manhã" → "Café" no card da Home (`MealCards.tsx`) e na Dieta
    (`Dieta.tsx`).
  - `WeightCard.tsx`/`weight.ts`: o gráfico de peso exigia 2+ registros pra
    aparecer (com 0 ou 1, só mostrava texto) — usuário pediu que o gráfico
    **sempre** exista, mesmo vazio. `gerarPathPeso()` agora sempre devolve um
    traçado (reta cinza pontilhada como placeholder com <2 pontos; curva
    verde real com 2+).
- **Dieta — as 7 falhas do levantamento de 2026-08-24, todas com código
  escrito** (ver detalhe de arquivos abaixo) **+ clonar refeição** (pedido
  novo: copiar itens de uma refeição pra outra do mesmo dia, ex. Almoço →
  Jantar) **+ nome customizável do slot "Extra"** (pedido novo, já que
  "Extra" antes não tinha como virar "Ceia"/"Pós-treino"/etc.) **+ régua de
  macro da Dieta trocou "kcal consumidas" por "gordura"** (kcal já mora no
  disco da Home, decisão do usuário: mapear os 3 macros reais na Dieta em
  vez de repetir kcal).
  - Novo `itensRefeicaoRepository.ts`: CRUD de itens por (user, dia, tipo),
    clonar, status "concluída" + nome customizado do Extra.
  - `refeicoesRepository.doDia()` e `macrosRepository.doDia(data?)` passaram
    a somar também os itens manuais da Dieta, não só o que vem do scanner —
    os discos/cards da Home agora batem com o que foi adicionado na Dieta.
  - `Dieta.tsx` simplificado (perdeu o estado estático); `DietScreen.tsx`
    passou a buscar os dados de verdade a cada troca de dia na tira.
  - `MealAccordion.tsx`: modo de edição (✕ por item), excluir com
    confirmação, checkbox persistente, "⧉ Copiar de outra refeição", campo
    de nome pro Extra.
  - Aba "Shakes & Chás" trocou o texto estático por uma lista real vinda de
    `cozinhaService.listar()` filtrada por categoria — **mas isso é só um
    aproveitamento rápido**, ver item da Cozinha abaixo.
  - ⚠️ **BLOQUEADO — migração SQL ainda não confirmada rodando com
    sucesso.** Depurado ao vivo com o usuário: erro de sintaxe ao colar SQL
    do chat (resolvido copiando de arquivo `.sql` em vez do chat — parece
    ser corrupção de caractere no copiar/colar do chat pro SQL Editor).
    Mesmo copiando de arquivo, a criação de `itens_refeicao` continuou
    falhando silenciosamente (confirmado via 404 no console do navegador —
    a tabela nunca existiu). Duas correções aplicadas no arquivo de
    migração (`db/athoslife_dieta_itens_migration.sql`) sem confirmação
    final de que resolveram:
    1. Removida a coluna `alimento_id UUID REFERENCES alimentos(id)` — como
       `alimentos` é tabela pré-existente sem migração neste repo, é
       possível que `id` lá não seja `UUID` (tipo diferente = a criação
       inteira da tabela falha). A coluna nunca foi usada no código mesmo,
       então foi só removida.
    2. O reforço do `CHECK` em `refeicoes.tipo` (passo 3 da migração) saiu
       do mesmo `BEGIN/COMMIT` das tabelas novas e virou uma transação
       separada — se esse passo falhar por causa de dado legado em
       `refeicoes`, agora não derruba mais a criação de `itens_refeicao`/
       `refeicoes_status` junto.
    **Próxima sessão: primeira coisa a fazer é confirmar com o usuário se
    essa versão do arquivo rodou sem erro** (ele ia testar e reportar, mas
    precisou desligar o PC antes de confirmar). Só depois disso faz sentido
    testar item/clone/editar/excluir de verdade.
  - Deixei `console.error` de depuração em `DietScreen.tsx` (`carregarDia`
    e `renomearExtra`) — tirar assim que a persistência for confirmada
    funcionando, não são pra ficar em produção.
- **Alimentos (`alimentos`) confirmada rala** — usuário acessou e viu a base
  pequena. Ele mesmo já preparou um SQL com ~500 alimentos novos pra rodar
  por conta própria (não é ação minha).
- **Cozinha ATHOS — usuário quer a implementação de verdade agora**, não só
  o reaproveitamento rápido que virou a aba "Shakes & Chás" hoje. Vai
  mandar referência visual na próxima sessão antes de eu desenhar o plano.
  Contexto já levantado pra quando isso continuar: 25 receitas já seedadas
  (`db/athoslife_cozinha_seed.sql`, todas `premium=true`), `cozinhaService`/
  `receitasRepository` já prontos (listar/favoritar/bloqueio premium), mas
  **não existe nenhuma tela de Cozinha ainda** — nem rota em `router.tsx`.
  A geração de receita por IA (`recipeAi.ts`, "Life monta receita") está
  **de propósito não implementada no backend** (comentário no próprio
  código: "para não fingir que a feature está pronta") — não é escopo do
  MVP da tela, só o catálogo curado + favoritos.
- **Sessão encerrada a pedido do usuário (ia desligar o PC).** Commit/push
  do que foi mexido hoje (e do que já estava pendente de sessões
  anteriores — ver `git status`) ficou combinado para amanhã, não foi
  feito. Servidor Vite local (`localhost:5173`) estava rodando em segundo
  plano; precisa subir de novo na próxima sessão (`npm run dev`).

## 2026-08-26

- **Migração de 2026-08-25 confirmada rodando sem erro** pelo usuário.
- **"Extra" redesenhado — de slot fixo pra refeições extras livres**:
  usuário explicou que "Extra" não deveria ser um 5º acordeão sempre
  presente (só 1 por dia); o pedido real é poder criar quantas refeições
  quiser, com nome livre (Colação, Ceia, Pós-treino...), cada uma
  arrastável pra qualquer posição da lista (ex.: Colação encaixada entre
  Café e Almoço).
  - Nova migração `db/athoslife_refeicoes_extra_migration.sql`: tabela
    `refeicoes_extra` (uma linha por refeição extra, com `nome`, `ordem`
    arrastável, `concluida` própria) + `itens_refeicao.refeicao_extra_id`
    (liga cada item à extra específica a que pertence). **Ainda não
    confirmada rodando** — primeiro passo da próxima sessão, junto com o
    lembrete de recarregar o schema cache do PostgREST depois (Project
    Settings → API → Reload schema / `NOTIFY pgrst, 'reload schema';`),
    causa mais provável do 404 que travou os testes de ontem.
  - `itensRefeicaoRepository.ts`: `doDia()` agora devolve itens já
    particionados (`fixos` por tipo, `extras` por id da extra) em vez de
    só por `tipo`; novos métodos `listarExtras`, `criarExtra`,
    `renomearExtraPorId`, `definirConcluidaExtra`, `excluirExtra`,
    `reordenarExtra`. `adicionar`/`clonar` passaram a receber um
    `RefeicaoAlvo` (tipo fixo, ou `{tipo:'extra', extraId}`) em vez de só
    `tipo`.
  - `domain/entities/meal.ts`: `Refeicao` ganhou `chave` (identificador
    único por linha — antes o estado de "qual está aberta" comparava por
    `tipo`, o que juntaria todas as extras numa só, já que compartilham
    `tipo='extra'`), `id` (null pros 4 fixos) e `ordem`.
  - `DietScreen.tsx`: lista renderizada = 4 fixas (ordem 10/20/30/40) +
    extras carregadas (`listarExtras`), tudo ordenado por `ordem`. Estados
    de aberta/busca/clonando/editando trocaram de `TipoRefeicao` pra
    `chave` (a correção acima). Novo botão "+ Nova refeição" no fim da
    lista, mesma ação do "+" da Home.
  - Drag-and-drop: adicionado `@dnd-kit/core` + `@dnd-kit/sortable` +
    `@dnd-kit/utilities`. Só as extras têm handle de arraste (ícone "⋮⋮" no
    header, com `stopPropagation` pra não abrir/fechar o acordeão junto);
    as 4 fixas participam do reflow visual mas não se movem. `onDragEnd`
    calcula a nova `ordem` como ponto médio entre os vizinhos e persiste
    via `reordenarExtra`.
  - Home (`MealCards.tsx`/`HomeScreen.tsx`): o "+" trocou de "abrir o slot
    Extra" pra "criar refeição extra nova e abrir na Dieta já nela"
    (`onCriarNovaRefeicao` → `/dieta?novaExtra=1`; `Dieta.tsx` lê o
    parâmetro, cria via `DietScreen`, e limpa a URL depois).
  - `npm run typecheck` limpo. `npm run lint` não roda neste ambiente
    (`eslint` não está instalado como dependência do projeto nem
    globalmente — não é algo desta sessão, script já estava assim).
  - **Confirmado funcionando pelo usuário** ("simplesmente sensacional")
    depois de rodar a migração nova + reload do schema cache do PostgREST.
    Criar extra, renomear, arrastar, tudo testado ao vivo.
- **Commit/push ainda pendente** (mesma pendência de ontem, acumulada).
- **Cozinha ATHOS — tela real construída.** Usuário mandou a referência
  visual antiga (`athoslife_v7_3.html`); ao investigar achei que já existia
  spec + conteúdo prontos no repo (`COZINHA_DIRECTIVE.md`,
  `docs/cozinha-athoslife-amostras.md`) que eu não conhecia, incluindo as
  **25 receitas completas** já escritas em `db/athoslife_cozinha_seed.sql`
  (o `COZINHA_DIRECTIVE.md` estava desatualizado dizendo que eram "cascas"
  sem conteúdo — não é mais o caso).
  - **Bug achado**: `db/athoslife_cozinha_migration.sql` já registrava a
    troca de categorias `ansiedade`/`vicios` → `vegano`/`habitos` no banco,
    mas `src/domain/entities/receita.ts` nunca foi atualizado e ainda
    listava as categorias antigas. Corrigido (`CATEGORIAS_RECEITA`,
    `CATEGORIA_META` — cores batendo com as do seed, `emoji` novo por
    categoria).
  - Aba "Shakes & Chás" da Dieta (era só um aproveitamento rápido) virou
    aba "🍳 Cozinha" de verdade: chips de filtro por categoria + grid 2
    colunas de cards (cadeado se `bloqueada`, coração de favoritar direto
    no card) — tudo em `CozinhaTab` dentro de `DietScreen.tsx`.
  - Nova rota `/dieta/cozinha/:id` (`src/app/router.tsx`) → `Cozinha.tsx`
    (busca a receita via `cozinhaService.listar()`, acha pelo id — lista
    pequena, 25 linhas, não precisa endpoint por id) →
    `src/ui/screens/cozinha/ReceitaDetalheScreen.tsx` (tela cheia, mesmo
    padrão de `/perfil/conquistas`). Novo helper
    `formatarConteudo()` em `receita.ts`: quebra o texto por parágrafo e
    trata a primeira linha como rótulo em negrito quando tem ":" logo no
    início — tolera as variações reais do conteúdo ("PREPARO" vs "MODO DE
    PREPARO", "DICA DO LIFE" vs "UM PAPO DO LIFE") sem parser rígido.
  - Receita bloqueada nunca expõe `conteudo`: a tela de detalhe mostra
    cadeado + CTA "Ver planos". CTA aponta pro `/perfil` (não
    `/perfil/plano` — essa rota nunca foi registrada em `router.tsx`,
    mesmo link pendente que já existia em `ProfileScreen.tsx`; achei mas
    não corrigi, fora do escopo de hoje).
  - "Life monta receita" (IA) continua de propósito fora — backend
    `'recipe'` não existe ainda (confirmado em `COZINHA_DIRECTIVE.md` e
    `STATUS.md`).
  - `npm run typecheck` limpo, HMR aceitou tudo sem erro.
  - **SQL ainda não rodado com sucesso** — usuário tentou rodar o seed
    (`athoslife_cozinha_seed.sql`) antes da migração por engano: deu erro
    `23514` (CHECK `receitas_cozinha_categoria_check` rejeitou `categoria =
    'vegano'`), porque a trava do banco ainda só aceitava as categorias
    antigas. **Confirmado com o usuário: a migração
    (`db/athoslife_cozinha_migration.sql`) ainda não tinha rodado.** Ordem
    certa pra retomar: 1) migração de categorias primeiro, confirmar
    sucesso sem erro; 2) só depois o seed (25 receitas) de novo. Sessão
    encerrada a pedido do usuário (ia desligar o PC) antes de confirmar o
    passo 1 — **primeira coisa da próxima sessão**.
- **Sessão encerrada a pedido do usuário (ia desligar o PC).** Commit/push
  do que foi mexido hoje (e do pendente de sessões anteriores) segue sem
  fazer. Servidor Vite local (`localhost:5173`) estava rodando em segundo
  plano; precisa subir de novo na próxima sessão (`npm run dev`).

## 2026-08-27

- **Migração + seed da Cozinha confirmados rodando com sucesso no
  Supabase**: `db/athoslife_cozinha_migration.sql` (troca de categorias
  `ansiedade`/`vicios` → `vegano`/`habitos`) e `db/athoslife_cozinha_seed.sql`
  (25 receitas) subiram sem erro, na ordem certa. Bloqueio do fim de
  2026-08-26 resolvido — ainda não testado ao vivo na tela "🍳 Cozinha" da
  Dieta nesta sessão (próximo passo natural: abrir `/dieta` (aba Cozinha) e
  confirmar que as 25 receitas aparecem, filtro por categoria funciona e
  bloqueio premium/favoritar batem).
- Commit/push de todo o trabalho acumulado (várias sessões, ver `git
  status`) segue pendente.
- **Cards da Cozinha redesenhados** a pedido do usuário, a partir de uma
  referência visual (print de outro app): trocou o grid de 2 colunas por
  fileira horizontal com scroll (`flex overflow-x-auto`), banner do ícone
  maior, três selos de macro por card (kcal na cor da categoria, `Ng prot`
  em rosa `#f43f5e`, `Ng carb` em azul `#3b82f6` — mesmas cores que
  `MacroBar` já usa na Dieta, não inventei paleta nova) e ícone de coração
  no lugar da estrela de favoritar. Mesmos ajustes replicados na tela de
  detalhe (`ReceitaDetalheScreen.tsx`): selo de carboidrato e de tempo
  adicionados, estrela trocada por coração.
  - **Novo dado real: tempo de preparo.** Não existia no banco. Nova
    migração `db/athoslife_cozinha_tempo_preparo_migration.sql` adiciona
    `tempo_preparo_min` em `receitas_cozinha` e preenche as 25 receitas —
    valores lidos do próprio texto de PREPARO de cada receita (tempos
    explícitos somados, ou estimado pelo tipo/quantidade de passos quando
    a receita não citava tempo), não chutados aleatoriamente. **Ainda não
    rodada no Supabase** — depende do seed já estar rodado (usa `titulo`
    pra achar a linha). Enquanto não rodar, os cards mostram sem o selo de
    tempo (`tempoPreparoMin` fica `null`, condicional já trata isso).
  - `Receita.tempoPreparoMin: number | null` novo em
    `domain/entities/receita.ts`; `receitasRepository.ts` mapeia a coluna
    nova. `npm run tsc --noEmit` limpo.
- **Cozinha deixou de ser aba separada** — usuário viu o novo visual dos
  cards e achou legal, mas não queria isso numa aba à parte, e sim junto das
  refeições do dia (referência: mesmo print, que mostra "Cozinha Athos" logo
  abaixo do acordeão de refeições, na mesma rolagem da página). Removido o
  botão "Meu Plano / 🍳 Cozinha" e o estado `aba` de `DietScreen.tsx`; a
  seção `CozinhaTab` (filtros + fileira horizontal de cards) agora aparece
  sempre, depois do botão "+ Nova refeição", como parte única da tela da
  Dieta — sem "Ver todas" pra lugar nenhum, já que não existe mais uma
  segunda tela pra levar (evita link morto). A rota `/dieta/cozinha/:id`
  (tela de detalhe da receita) continua igual. `npm run tsc --noEmit` limpo.
  - Servidor Vite local subiu numa configuração incomum: `npm`/`node` deste
    ambiente resolvem para o Node **Windows nativo** (`/mnt/c/Program
    Files/nodejs`), não um Node do WSL — então o processo do dev server
    roda fora do namespace de rede do WSL e não responde a `curl` de dentro
    do WSL, só do lado Windows (`curl.exe`/navegador). Isso já causou uma
    leva de processos `node.exe` órfãos no Gerenciador de Tarefas durante
    esta sessão (várias tentativas de depuração via `timeout`/Ctrl+C do
    lado Linux não mataram o processo Windows) — todos identificados por
    PID exato e encerrados via `taskkill.exe /PID`. Ficou só um
    `npm run dev -- --host` rodando, confirmado em `localhost:5173` via
    `curl.exe` (HTTP 200). Se sobrar `node.exe` estranho no Task Manager
    numa próxima sessão, é provável resquício do mesmo padrão.
- **Commit local feito** (`a6aa819`, mensagem cobrindo Dieta/Home/Login/
  Cozinha acumulados desde 2026-08-18): branch `main` agora 2 commits à
  frente do `origin/main`. **Push combinado para a próxima sessão**, a
  pedido do usuário (ia desligar o PC agora). `tsconfig.tsbuildinfo` foi pro
  `.gitignore` (artefato de build, não deveria ter sido commitado antes). A
  imagem de referência (`WhatsApp Image 2026-08-27...jpeg`, usada só pra
  desenhar os cards da Cozinha) ficou de propósito fora do commit — não é
  asset do app.

## 2026-08-28

- Sessão curta: recuperado contexto da sessão anterior (STATUS.md +
  WORKLOG.md + `git status`) e subido o servidor Vite local (`npm run dev
  -- --host`, porta 5173) só pra o usuário olhar o app rodando.
- `git status` confirmado: branch `main` está **3 commits à frente** do
  `origin/main` (inclui `a5c02ea`, que já registrava esse push pendente).
  Nenhum push feito ainda nesta sessão.
- **Usuário sinalizou 3 itens pra próxima sessão, nesta ordem:**
  1. Fazer o **push pro GitHub** de tudo que já está commitado localmente
     (os 3 commits pendentes).
  2. Rodar um **SQL novo com ~1500 alimentos** que o usuário já preparou
     por conta própria (expande a base `alimentos`, hoje rala — ver
     WORKLOG 2026-08-25). Ainda não recebido/revisado nesta sessão.
  3. Começar a **tela de Treinos** — usuário está preparando conteúdo
     visual + mini-animações pra trazer como referência (mesmo padrão já
     usado pra Home e Cozinha: manda referência, aí desenha o plano).
     Treinos hoje está só listado em "Ainda nem começamos (código)" no
     `STATUS.md` — nenhuma tela real existe.
- Sessão encerrada a pedido do usuário (ia desligar o PC). Servidor Vite
  local ficou rodando em segundo plano; precisa subir de novo na próxima
  sessão (`npm run dev -- --host`).

## 2026-09-02

- **Supabase MCP conectado com sucesso** (leitura+escrita, projeto
  `gsdwsxwbmxcvutpvpkyi`) — Claude passou a ter acesso direto ao banco via
  ferramentas `mcp__supabase__*`, não só a chave anônima. Nota: `claude mcp
  list` não lista esse servidor mesmo funcionando — checar pela presença
  das ferramentas, não por esse comando.
- Confirmado (fora de sessão, entre a última e esta) que os 3 commits
  pendentes do WORKLOG de 2026-08-28 **já foram enviados pro GitHub** —
  `main` está atualizado com `origin/main`.
- **Corrigido problema de segurança real**: `public.fundador_vagas` estava
  com RLS desligado (exposta a leitura/escrita por qualquer um com a chave
  anônima). Tabela é só um contador singleton (`total_vagas`/`vagas_usadas`)
  sem nenhum código no app usando ela ainda. Corrigido manualmente pelo
  usuário no SQL Editor do Supabase (o MCP tentou `apply_migration` e
  `execute_sql`, mas o classificador do modo Auto do Claude Code bloqueou
  as duas chamadas de escrita — sem prompt de confirmação aparecendo nesse
  modo): RLS ligado + policy de leitura pública pra `anon`/`authenticated`,
  sem policy de escrita. Confirmado via `list_tables` depois: `rls_enabled:
  true`.
- **Revisão de 3 arquivos que o usuário recebeu de outra IA (GPT)**,
  pensando em deixar o Life mais adaptativo/proativo — detalhe completo e
  plano de fases salvos em `docs/ATHOSlife_Notificacoes_Life.md` (seção
  "Pacote externo recebido"). Resumo: dois dos arquivos (v1) eram só o
  documento de design, sem nenhum código novo de verdade (o zip continha
  uma cópia idêntica do `ai-proxy` atual). Um terceiro zip, esquecido pelo
  usuário e subido depois (`ATHOSlife_Life_Intelligence_v2.zip`), é o
  pacote real — migration + `ai-proxy/index.ts` novo. Revisado linha por
  linha, achados 4 problemas concretos (bug no `next_reset` do limite de
  scan, regressão de personalidade no chat, chat acoplado às tabelas novas
  sem tolerância a falha, fila `life_push_outbox` criada mas nunca usada).
  **Nada disso foi implementado** — combinado explicitamente que é só
  planejamento por enquanto, guardado pra quando Treinos/Hábitos/push
  básico existirem.
- Pendências que continuam de sessões anteriores, ainda não retomadas
  nesta sessão: SQL de ~1500 alimentos (arquivo já está no projeto, tabela
  `alimentos` confirmada com 0 linhas no Supabase), e a tela de Treinos
  (usuário ainda preparando o pacote de artes/mini-animações de
  referência — não chegou a subir nesta sessão).
- Sessão encerrada a pedido do usuário (ia desligar o PC).

## 2026-09-08

- **Banco de ~1500 alimentos confirmado rodando** — sessão anterior não
  documentada (usuário desligou o PC sem salvar contexto) já tinha rodado o
  SQL. Confirmado agora direto no Supabase: `public.alimentos` com 1506
  linhas reais (antes o WORKLOG dizia 0 — estava desatualizado, não o banco).
- **Migração `tempo_preparo_min` da Cozinha rodada com sucesso** (usuário
  colou o `.sql` manualmente no SQL Editor, já era pendência de 2026-08-27).
  Confirmado direto no banco: as 25 receitas com tempo preenchido, nenhuma
  nula. Selo de tempo de preparo já deve aparecer nos cards da Cozinha.
- **Tela de Treino construída do zero** — usuário mandou mockup de
  referência (6 telas) com um modelo diferente do código antigo: em vez de
  "Local → Treino nomeado (Peito/Costas) → Exercícios", virou
  **"Local → Dia da semana (Seg..Dom, com 'Hoje' destacado) → Exercícios do
  dia"**. O código antigo (`treino.ts`/`treinoRepository.ts`/
  `WorkoutScreen.tsx`, do commit inicial do projeto) nunca teve as tabelas
  rodadas no Supabase (`db/athoslife_treinos_v2.sql` nunca foi aplicada) —
  então trocar o modelo não teve nenhum dado real em risco.
  - **36 exercícios de catálogo** vieram de 12 imagens de referência do
    usuário (zip `WhatsApp Unknown 2026-09-08 at 12.10.05.zip`, 3 exercícios
    por imagem: diagrama de músculo + foto INÍCIO + foto EXECUÇÃO). Cortadas
    via script (`sharp`, detecção automática das frestas pretas entre as
    caixas — corte por coordenada fixa não funcionava porque a altura de
    cada caixa varia com o tamanho da legenda). As 36 imagens finais
    (diagrama+início+execução juntos, como o usuário pediu, ~1MB no total)
    foram salvas em `public/exercicios/<slug>.jpg` — asset estático do
    app, não Supabase Storage (catálogo pequeno e curado, mesmo raciocínio
    dos ícones SVG que já existiam; evita todo o problema de permissão de
    upload que teríamos sem uma service role key).
  - Nova migração `db/athoslife_treinos_catalogo_v3.sql`: tabela
    `exercicios_catalogo` (conteúdo curado, RLS só leitura autenticada,
    igual `receitas_cozinha`) + tabela `treino_plano` (atribuição pessoal
    por local+dia_semana+exercício, RLS pessoal, igual `itens_refeicao`) +
    seed dos 36 exercícios. **Ainda não rodada no Supabase** — o MCP tentou
    `apply_migration` e foi bloqueado pelo classificador do modo Auto (sem
    prompt de confirmação, mesma limitação já vista em 2026-09-02 e nesta
    mesma sessão com a migração da Cozinha) — precisa ser colada manualmente
    no SQL Editor. **Primeira coisa da próxima sessão: confirmar que rodou.**
  - Código novo: `domain/entities/treino.ts` reescrito (catálogo +
    atribuição pessoal, sem mais "Treino nomeado"),
    `exercicioCatalogoRepository.ts` e `treinoPlanoRepository.ts` novos
    (substituindo `treinoRepository.ts`, removido), `WorkoutScreen.tsx`
    reescrito (toggle Casa/Academia + tira de dias da semana com data real
    calculada no cliente + "Hoje" destacado), `ExerciseCard.tsx` novo
    (fechado: miniatura+nome+séries×reps; expandido: foto grande com
    diagrama já embutido na mesma imagem + "Como executar" + séries/reps
    editáveis com steppers −/+ + excluir), `AddExercisePanel.tsx` novo
    (busca + chips de grupo muscular calculados a partir do catálogo
    carregado — nunca mostra filtro vazio —, mesma pegada visual do
    `FoodSearchScreen.tsx` da Dieta). `AddExerciseDrawer.tsx` antigo
    removido.
  - Grupo muscular ganhou categorias novas além das 4 do mockup
    (Peito/Costas/Pernas/Braços): `ombro`, `gluteos`, `panturrilha`,
    `lombar` — os 36 exercícios reais cobrem essas áreas e não fazia
    sentido forçar tudo em só 4 categorias. "Braços" fica sem exercício
    nenhum por enquanto (nenhuma das 12 imagens tinha bíceps/tríceps
    isolado) — filtro não quebra, só fica vazio até o usuário mandar mais.
  - `ambientes` (quais exercícios aparecem em casa vs. academia) foi
    decidido por mim com base no equipamento visível nas fotos (barra/
    máquina = só academia; halteres sem banco = casa+academia; peso do
    corpo = casa+academia) — é um chute razoável, não confirmado com o
    usuário exercício por exercício. Editável depois.
  - `npm run tsc --noEmit` e `npm run build` limpos. Não foi possível testar
    visualmente neste ambiente (Playwright headless sem libs de sistema,
    precisa de `sudo` interativo que não rodou) — mesma limitação de
    sessões anteriores. **Usuário precisa confirmar rodando `npm run dev`
    na própria máquina.**
- Pendências pra próxima sessão: rodar `athoslife_treinos_catalogo_v3.sql`
  manualmente no Supabase (bloqueante — sem isso a tela de Treino não
  carrega nada), testar visualmente o fluxo completo (trocar local, trocar
  dia, adicionar exercício, expandir card, editar séries/reps, excluir).
  Push do trabalho desta sessão ainda não foi feito (usuário decide quando).
- **Migração rodada, feedback do usuário depois de testar de verdade** (3
  pontos): miniaturas ruins, botão "Concluir" de sair do painel de adicionar
  nunca aparecia (ele usava o "×" sempre), e o check de concluído marcava
  mas não desmarcava.
  - **Miniaturas corrigidas**: antes eu espremia a imagem larga (diagrama+
    início+execução, pensada pra tela expandida) num quadrado de 56px, ficava
    ilegível. Novo script (`build_thumbs.mjs`, mesma técnica de detecção de
    fresta preta) gera um recorte quadrado dedicado só na foto de execução,
    36 arquivos `public/exercicios/<slug>-thumb.jpg` novos. Helper
    `imagemMiniatura()` em `treino.ts` deriva o nome do arquivo. **Usuário
    disse que vai cuidar da qualidade de imagem por conta própria daqui pra
    frente** — não é mais pauta minha.
  - **Bug de CSS real encontrado no botão "Concluir"**: `AddExercisePanel`
    usava `h-full` (a mesma receita do `FoodSearchScreen` da Dieta), mas o
    `AppShell` que envolve todas as abas usa `min-h-full` no wrapper, não
    `h-full` — altura em porcentagem não se propaga por um ancestral sem
    altura definida. Resultado: o painel nunca vira "tela cheia com rolagem
    interna" de verdade, a lista de 36 exercícios só empurra a página pra
    baixo, e o botão "Concluir" (e possivelmente o fim da lista) ficava
    escondido bem lá embaixo, atrás da `BottomNav` (que é `fixed`).
    Corrigido trocando pra `fixed inset-0` (tela cheia real, ignora a cadeia
    de altura do pai, cobre a `BottomNav`). **`FoodSearchScreen.tsx` da
    Dieta provavelmente tem o mesmo problema latente** (não notado lá
    porque não tem botão fixo no rodapé) — não mexi nele, fora do escopo
    pedido, mas fica registrado pra quando for notado por lá também.
  - **Check de concluído (marca e não desmarca)**: revisado o código com
    calma (repositório, estado otimista, RLS) e não achei nenhuma
    assimetria — a lógica trata marcar/desmarcar exatamente igual. Minha
    hipótese é que o usuário estava vendo a mesma versão travada pelo bug
    do CSS acima (o app inteiro ficava com rolagem estranha). **Não
    confirmado ainda — próxima sessão: confirmar se ainda acontece depois
    do fix do CSS**, com o usuário testando via `npm run dev` direto no
    Windows (não mais pela ponte WSL↔Windows, que já causou confusão de
    "localhost não funciona" nesta sessão).
  - `tsc --noEmit` limpo depois do fix. Não testado visualmente por mim
    (Playwright headless trava sem erro neste ambiente, tentativa abandonada
    depois de instalar as libs via `apt-get download` sem sudo — funcionou
    baixar, mas o Chromium trava no lançamento mesmo assim).
- **Usuário pediu pra rodar `npm run dev` direto no Windows (não mais pela
  ponte WSL↔Windows) e reportou "não rodou, tá bugado ainda"** — sessão
  encerrada por precisar desligar o PC antes de detalhar se foi o
  `npm run dev` que falhou de cara ou se rodou e os bugs de UI persistiram.
  **Suspeita forte, a investigar primeiro na próxima sessão**: nesta mesma
  sessão eu rodei `npm install` **dentro do WSL** (Node via nvm,
  `v24.20.0`) pra corrigir o erro `Cannot find module
  @rollup/rollup-linux-x64-gnu` — isso reescreveu `node_modules` com
  binários nativos (rollup/esbuild) **compilados pra Linux**. Se o usuário
  rodou `npm run dev` com o Node/npm **do Windows** (não WSL) em cima
  desse `node_modules` linux-only, o binário nativo do rollup não existe
  pra Windows nele e o `vite build`/`dev` provavelmente falha na hora —
  seria o oposto do problema original de 2026-08-27 (lá o `node_modules`
  era Windows-only rodando por engano com Node do WSL; agora pode ter
  virado Linux-only rodando por engano com Node do Windows). **Primeira
  coisa a checar**: se for isso, rodar `npm install` de novo, mas dessa vez
  com o Node/npm do Windows (`node -v`/`where node` no PowerShell pra
  confirmar qual está sendo usado), ou manter todo mundo testando só pelo
  lado WSL (`http://localhost:5173`/IP que eu deixo rodando) até decidir
  um único ambiente fixo pra isso, em vez de alternar.
- Sessão encerrada a pedido do usuário (precisou desligar o PC). Nenhum
  commit/push feito nesta sessão — fica tudo como está no working tree pra
  revisar na próxima (`git status` vai mostrar bastante coisa: migrações
  novas em `db/`, código novo/reescrito de Treino, `public/exercicios/`
  com 72 arquivos novos — 36 imagens + 36 miniaturas —, e os ajustes de
  WORKLOG/STATUS).

## 2026-09-13

- **Sessão anterior caiu sozinha** no meio de uma conversa sobre "a Life e
  seus estados" (o personagem/companheiro reativo — atleta no Treino, chef
  na Dieta, hidratado/seco na Água, roxo preocupado quando falha um hábito,
  some depois de 8s parado, pensa quando o usuário escreve). Nada disso
  tinha virado arquivo ainda, então não tinha como recuperar o conteúdo
  exato — retomado do zero nesta sessão.
- **Decisão de arquitetura da Life (não implementada ainda, só decidida)**:
  usuário temia que tantos estados/animações por tela pudessem forçar uma
  migração de Capacitor pra React Native. Avaliado e descartado — Capacitor
  é só uma WebView, o gargalo de performance seria layout thrashing/
  re-render, não "ser web"; o projeto já tem `lottie-react` instalado como
  dependência, sinal de que essa já era a ideia. Reescrever em React Native
  agora jogaria fora Home/Dieta/Treino/Cozinha já codados só por um medo de
  performance que a stack atual já foi montada pra suportar. Combinado:
  manter Capacitor, construir a Life como um componente global único
  (overlay fixo + estado central tipo `lifeStateStore` atualizado por cada
  tela), animações via Lottie pros humores + timer de 8s pro sumiço por
  inatividade. **Ainda não construído** — só a decisão ficou registrada
  aqui pra quando chegar a vez.
- **Bug real corrigido na Dieta**: não dava pra excluir um alimento errado
  de uma refeição sem apagar a refeição inteira — o `✕` por item
  (`MealAccordion.tsx`) já existia no código, mas ficava escondido atrás de
  um modo "✎ Editar refeição" que precisava ser ativado antes, e o usuário
  nunca tinha achado esse botão. Trocado pelo mesmo padrão de dois toques
  do `ExerciseCard` do Treino: toca no alimento da lista → aparece um 🗑 só
  dele → toca no 🗑 → exclui. Removido o modo "editar refeição" inteiro
  (`editandoChave`/`onEditar` em `DietScreen.tsx`/`MealAccordion.tsx`), já
  que não tinha mais nenhuma outra função além de mostrar esse `✕`.
  - Feedback seguinte do usuário: o 🗑 novo e o "‹" (desistir do alimento
    antes de adicionar, na tela de porção do `InlineFoodSearch.tsx`) eram
    pequenos demais, passavam despercebidos. Os dois viraram botões de
    36×36px com borda (`h-9 w-9 rounded-lg border`), bem mais fáceis de ver
    e tocar.
  - `tsc --noEmit` limpo depois de cada mudança.
- **Hábitos — descoberta de que a tela já existia de verdade**, não
  "ainda nem começamos" como o `STATUS.md` dizia (dado desatualizado — a
  base veio do commit inicial do projeto, com print de referência próprio,
  nunca auditada de novo até agora): `HabitsScreen`/`HabitCard`/
  `CravingAssistant` já liam/gravavam dado real contra `vicios_user`/
  `recaidas` no Supabase (RLS conferido, `auth.uid() = user_id`), com
  streak, "Estou com vontade" (assistente que orienta esperar 10min) e
  "Hoje eu cedi" (tropeço, zera streak, sem punir — texto e cor roxa
  fazem parte do produto, não são bug) funcionando. O único ponto morto
  era o "+ Acompanhar novo hábito" (`onAdicionar` era um no-op).
  - Construído `AddHabitSheet.tsx`: mesmo padrão de bottom sheet do
    `CravingAssistant` (aqui também vale interromper — é decisão pontual de
    configuração, não registro do dia a dia como na Dieta). Nome livre,
    categoria em chips (Doce, Fast food, Álcool, Cigarro, Refrigerante,
    Outro — mesmas categorias que `habitosRepository` já mapeia pra
    emoji), intensidade (Leve/Médio/Forte). `HabitsScreen.tsx` ganhou o
    estado local `mostrarAdicionar` (mesmo padrão do `vontadeDe` que já
    existia); `Habitos.tsx` liga `onCriarHabito` em
    `habitosRepository.criar()` de verdade + recarrega a lista.
  - Conferido no Supabase antes de codar: colunas de `vicios_user` batem
    exatamente com o que o repositório já enviava (`nome`/`categoria`/
    `intensidade`, resto com default) e a policy de INSERT já libera
    `auth.uid() = user_id` — **fluxo funciona sem migração nova**.
  - `tsc --noEmit` limpo. **Ainda não testado ao vivo pelo usuário** —
    primeira coisa a confirmar na próxima vez que abrir Hábitos.
  - O que continua de propósito fora (não é bug, é escopo): `insightIA`
    sempre `null` (sem fonte real de IA ainda), `onAbrirChat` no-op (chat
    com a Life não existe), os 3 caminhos da vontade (esperar/alternativa/
    já passou) não gravam nada — só orientam no momento, mesma decisão de
    quando essa tela foi feita.
  - `STATUS.md` atualizado: Hábitos ganhou linha própria no quadro de
    Módulos (saiu de "ainda nem começamos"); Treino documentado como
    **pausado de propósito** — usuário está esperando um conjunto novo de
    imagens sendo feito por um amigo designer, retoma quando chegarem.
- Servidor Vite local (`npm run dev -- --host`) subiu e ficou rodando a
  sessão inteira em `localhost:5173` — confirmado respondendo tanto de
  dentro do WSL quanto do lado Windows (`curl.exe`, 200 nos dois), ao
  contrário do problema de ponte WSL↔Windows de 2026-09-08. Um momento em
  que o usuário viu "não subiu nada" na aba já aberta foi só a aba antiga
  ficando presa numa conexão de hot-reload morta — resolvido reabrindo a
  aba, não era o servidor.
- **Nenhum commit feito** — segue tudo acumulado no working tree: o que já
  vinha pendente de 2026-09-08/11/12 (ícones + reescrita do Treino) mais o
  fix da Dieta e o `AddHabitSheet` de hoje. `git status` mostra a lista
  completa. Push também segue pendente.

## 2026-09-16/17

- Sessão de "retomar de onde paramos": nada das sessões de 09-08 a 09-13
  tinha sido commitado ainda (Treino reescrito, `AddHabitSheet`, fixes da
  Dieta). Servidor Vite subido de novo (`npm run dev -- --host`,
  `localhost:5173`) pra trabalhar ao vivo na tela de Treino.
- **Bug real encontrado e corrigido: por isso a tela de Treino aparecia sem
  nenhum exercício.** A migração `athoslife_treinos_icones_v2_correcao.sql`
  (sessão 09-11/12, nunca rodada) era quem adicionava a coluna
  `exercicios_catalogo.icone_url` — como nunca rodou, toda consulta de
  Treino (`exercicios_catalogo`/`treino_plano`) pedia uma coluna inexistente,
  o Postgrest devolvia erro, e o app engolia isso em silêncio como lista
  vazia (`.catch(() => setItens([]))`). Não era falta de dado do dia, como
  cheguei a supor no começo da sessão (achei que fosse só o local/dia
  selecionado sem exercício atribuído — descartado depois de olhar o banco
  de verdade).
- **Pacote definitivo de ícones do designer chegou**
  (`ATHOSlife_icones_FINAL_100.zip`, 100 exercícios, 1920×1920px cada,
  ~290MB total). Recortados/comprimidos pra 300×300 JPEG (~18KB cada, 1.8MB
  no total) via `npx sharp-cli` (sem instalar `sharp` no projeto), salvos em
  `public/exercicios/icones/`.
  - Migração `db/athoslife_treinos_catalogo_v4_expansao_100.sql`: corrige
    `icone_url`/`imagem_url` dos 36 exercícios que já existiam (a v1 tinha
    zoado o `imagem_url`, sobrescrevendo a foto grande de execução pelo
    ícone antigo) e **expande o catálogo pra 100 exercícios** — os outros
    64 entraram só com ícone, **sem foto de execução nem "como executar"
    ainda, de propósito**: o usuário vai preparar isso depois, exercício
    por exercício. `grupo_muscular`/`ambientes` desses 64 foi chute meu em
    cima do nome/equipamento de cada um, não confirmado um por um.
  - Categoria nova `abdominal` criada em `GrupoMuscular`
    (`src/domain/entities/treino.ts`) pra cobrir ~10 exercícios de core que
    não cabiam nas 8 categorias antigas — precisou atualizar o CHECK
    constraint do banco também (só previa as categorias antigas).
  - No caminho, a migração falhou 2x por engano meu (constraint de
    `grupo_muscular` sem `abdominal`, depois sintaxe de agregação num
    `UPDATE`) — cada erro rodava dentro de uma transação só, então nada
    ficou pela metade no banco; corrigido e confirmado no final
    (100 exercícios, 100 com ícone, 36 com foto de execução).
- **Botão do card de exercício reestruturado**, a pedido do usuário, que
  mandou uma referência (`ExerciseCard.jsx`, depois `exercise-card.html`
  como artifact): ícone (miniatura) e card (nome/reps) viraram dois toggles
  **independentes** — antes os dois abriam a mesma coisa junto. Tocar no
  ícone só mostra/esconde a foto grande de execução; tocar no card só
  abre/fecha o formulário de séries. `ExerciseCard.tsx` reescrito.
- **Modelo de série mudou**: de um total agregado (`series` count +
  `repeticoes` count) pra **série individual com reps + carga (kg)**, cada
  uma sua própria linha editável (+ adicionar série, ✕ remover série) —
  pra bater com o mockup do usuário. O ✓ de marcar concluído e o ✕ de
  excluir exercício ficaram exatamente como estavam, não foi pedido mexer
  neles. Migração `db/athoslife_treino_series_detalhe_migration.sql`:
  coluna `treino_plano.series_detalhe` (jsonb), backfill dos 18 registros
  que já existiam (mesma reps de antes, carga em branco — nunca tinha sido
  registrada). Colunas antigas `series`/`repeticoes` ficaram no banco sem
  uso, não removidas de propósito (não quebra nada deixar).
- **Bug de ambiente descoberto**: o Vite roda dentro do WSL mas o projeto
  mora em `/mnt/c/...` (disco do Windows) — nesse tipo de pasta o WSL não
  recebe eventos de mudança de arquivo (inotify não funciona em DrvFs), só
  detectava mudança no próprio `vite.config.ts` por um mecanismo à parte.
  Por isso uma edição inteira (a primeira versão do botão independente)
  nunca chegou ao navegador, e pareceu que tinha sido "ignorada". Corrigido
  com `server.watch.usePolling: true` em `vite.config.ts` + restart
  completo do servidor. Deixa registrado: qualquer sessão futura que edite
  código com o Vite já rodando deve lembrar disso se o navegador não
  refletir a mudança.
- `tsc --noEmit` limpo depois de cada mudança.
- **Primeiro commit real desta leva de trabalho** (tudo que vinha
  acumulado desde 09-08 mais o desta sessão) feito nesta sessão, a pedido
  do usuário antes de desligar o PC — ver `git log` pra mensagem exata.
  Deixados de propósito fora do commit (mesma regra de sempre: não são
  asset do app): `ATHOSlife_icones_FINAL_100.zip` (290MB — não dá nem pra
  subir no GitHub sem problema), outros zips/imagens de referência soltos
  na raiz (`ExerciseCard.jsx`, `exercise-card.html`,
  `supino-*.jpg.jpeg`, `WhatsApp *`, `MAPA_DE_SUBSTITUICAO.md`,
  `ATHOSlife_Life_Intelligence_*`, `ai-proxy.zip`,
  `icones-exercicios-athoslife.zip`, `recortes_teste/`,
  `athoslife_banco_alimentos_1500 (1).sql`).
- **Pendências pra próxima sessão**:
  1. Usuário vai preparar as fotos de execução + "como executar" dos 64
     exercícios novos, exercício por exercício (nada bloqueado, só falta
     conteúdo).
  2. Testar ao vivo o formulário de séries novo (reps + carga por série)
     de ponta a ponta — só testado visualmente até agora, não confirmado
     pelo usuário salvando/recarregando.
  3. Confirmar se decidiu algo sobre a pergunta do Flutter (09-15, ainda em
     aberto na última vez que foi tocada).
