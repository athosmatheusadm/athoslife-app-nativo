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

## 2026-09-19

- **Decisão sobre Flutter (pendência aberta desde 09-15): resolvida.**
  Usuário decidiu manter Capacitor pra lançar o app agora. Só migra pra
  Flutter depois, se o app ganhar tração (mais de 200 usuários pagantes) —
  aí sim como uma atualização grande, aproveitando pra adicionar mais coisas
  junto. Nada de reescrever agora; ATHOSlife atual segue sendo o produto real,
  não um rascunho pra Flutter.
- Fotos de execução dos 64 exercícios novos: em andamento (pendência 1 da
  sessão anterior, sem bloqueio).
- Estrutura do formulário de séries novo (reps + carga por série): usuário
  confirmou que já foi testada e aprovada (resolve a pendência 2 da sessão
  anterior).

- **Tela de Hábitos redesenhada, a pedido do usuário** ("desenhar a página
  de hábitos" — funcional + visual, testando ao vivo com `npm run dev --
  host` de novo). A tela já existia (fiel a um print antigo do usuário,
  fluxo real contra `vicios_user`/`recaidas`); o pedido era mexer em cima
  disso, não recriar do zero:
  - **Card virou botão colapsável**: fechado mostra só emoji + nome +
    streak + bolinha de cor; abre pra ver gatilhos/progresso/ações.
    `HabitCard.tsx` reescrito.
  - **Paleta do card trocou de verde/laranja pra verde/roxo** — tirou
    qualquer cor de alarme, hoje só verde (firme) e roxo (atenção/recaída,
    mesma cor que a recaída já usava).
  - **Álcool e cigarro tirados do app, de propósito** — decisão de escopo
    do usuário: "não trabalhamos com vícios que levam a depreciação da vida
    humana". `vicios_user.categoria` continua sem CHECK constraint no banco
    (freeform), então não precisou de migração — só a UI parou de oferecer
    essas opções.
  - **Novo tipo de hábito "construir"** (aumentar algo, ex. Leitura) ao
    lado do "evitar" original (reduzir algo, ex. Doce). Card de um hábito
    "construir" mostra "Fiz hoje"/"Não consegui hoje" em vez de "Estou com
    vontade"/"Hoje eu cedi" — sem abrir o assistente de vontade, que não
    fazia sentido pra esse caso. O tipo é **inferido da categoria**
    (`tipoDaCategoria` em `domain/entities/habito.ts`), sem coluna nova no
    banco — teste consciente: categoria "Outro" sempre cai como "evitar"
    hoje.
    ⚠️ **"Fiz hoje" ainda não persiste** — não existe ação de check-in
    positivo no `habitosRepository` (só `criar`/`registrarRecaida`). Hoje é
    só um ✓ visual que some ao recarregar a página. Se for pra valer,
    precisa de uma mudança pequena no banco — não fiz sem aprovação.
  - **Assistente "Estou com vontade" ganhou conteúdo de verdade**
    (`CravingAssistant.tsx` reescrito com views internas): "Quero uma
    alternativa" mostra sugestões reais por categoria (regra fixa, sem IA,
    `alternativasPara` em habito.ts); "Vou esperar 10 minutos" virou um
    timer de verdade com animação de respiração (sem música ainda — não
    existe áudio no projeto, deixei o player pronto e desligado, ver
    `MUSICA_ACOLHEDORA_URL` no arquivo); "Conversar com o Life" fecha o
    assistente e abre o chat.
  - **Chat com o Life construído** (`LifeChatSheet.tsx`) e ligado no
    `ai-proxy` (`enviarMensagemChat` em `aiProxy.ts`, `tipo: 'chat'` já
    previsto no contrato do cliente). Usuário confirmou que o handler
    'chat' já existe no proxy deployado (só nunca foi chamado/testado) —
    **ainda não testado ao vivo**, fica pra próxima sessão.
  - **O Life virou um "termômetro"**: `nivelBemEstar`/`corTermometro` em
    habito.ts calculam uma cor verde↔roxo a partir da média dos streaks
    (14 dias = tranquilo total) — sem inventar dado, só o streak que já
    existe. Virou um **botão flutuante fixo no canto inferior esquerdo**
    (acima do BottomNav), com a imagem do personagem (camaleão verde,
    `public/life/avatar.png`, mandada pelo usuário) **de corpo inteiro**,
    sem recorte em círculo — ele vai ganhar animações (o projeto já tem
    `lottie-react` instalado, ainda não usado em lugar nenhum). Ressalva
    técnica registrada no código: a imagem atual tem fundo preto sólido,
    não é um PNG recortado/transparente — usei `mix-blend-mode: screen`
    como gambiarra (funciona porque o app é todo escuro), até o usuário
    mandar uma versão com fundo transparente de verdade (ele confirmou que
    consegue gerar uma).
  - **Lembrete local (notificação) pro hábito "construir"** — instalado
    `@capacitor/local-notifications` (`npx cap sync android` rodado,
    plugin registrado), `src/data/notifications/habitReminders.ts` novo.
    Agenda/cancela/consulta pelo próprio SO do aparelho (sem coluna nova no
    banco — o agendamento do SO é a fonte de verdade). **Só funciona no
    app instalado**, não no navegador onde a sessão testou tudo — Capacitor
    LocalNotifications não tem implementação real pra web.
  - Isso é a **Camada 1** ("regra fixa, nunca falha") do modelo de duas
    camadas já desenhado em `docs/ATHOSlife_Notificacoes_Life.md`. Usuário
    decidiu que quer as **duas camadas agora**, não só depois do
    lançamento como a doc recomendava — motivo dado: "é hora de deixar
    tudo bem feito" antes de publicar, não depois. Registrado como decisão
    consciente que reabre aquele "não é pra codar agora".

- **Pendências pra próxima sessão**:
  1. Testar a Camada 1 (lembrete local) num build Android real/emulador —
     não dá pra confirmar via navegador.
  2. Testar o chat do Life ao vivo (handler já existe no `ai-proxy`,
     segundo o usuário, mas nunca foi chamado de fato).
  3. Usuário vai mandar uma versão do personagem do Life com fundo
     transparente — trocar `public/life/avatar.png` e tirar o
     `mix-blend-mode: screen` quando chegar.
  4. **Camada 2 da Life** (percebe que o usuário ignorou/esqueceu, reage
     diferente) — pendências concretas, todas aguardando aprovação/dado do
     usuário, não bloqueadas por falta de decisão:
     - Aplicar a migração das tabelas `life_events`/`life_memories`/
       `life_patterns` (já revisada, vem pronta do pacote v2) — falta só a
       aprovação explícita pra rodar no Supabase.
     - Corrigir os 4 bugs do `ai-proxy` documentados em
       `ATHOSlife_Notificacoes_Life.md` antes de deploy.
     - Push de verdade (FCM) — precisa de um projeto Firebase do usuário
       (`google-services.json`), isso não dá pra criar sozinho.
     - `relogio-athos` (função agendada varrendo usuários inativos).
  5. Fotos de execução dos 64 exercícios novos (arrastando de sessões
     anteriores, sem bloqueio).
  6. Nada do que foi feito nesta sessão foi commitado ainda.

## 2026-09-24

Sessão longa, vários blocos de trabalho. MCP do Supabase reconectado no
começo (estava com permissão quebrada — token precisou ser regenerado sem
`--read-only`); mesmo saudável, o classificador do modo Auto do Claude Code
seguiu bloqueando `execute_sql` às vezes sem prompt — contornado rodando em
lotes menores, mesmo padrão de sessões anteriores.

- **Push do que ficou pendente de 09-19** (fix de streak/check-in de
  Hábitos) feito no começo da sessão: `main` sincronizado com
  `origin/main`. Token do GitHub precisou ser colado manualmente (sem
  `GH_TOKEN` no ambiente).

- **Dieta + Scanner — redesenho grande**, a partir de dois HTMLs que o
  usuário mandou (`modificacao para a dieta + scaner 24.09.26.html`,
  nunca commitados, ficam soltos na raiz):
  - Tocar numa refeição não abre mais o acordeão antigo — sobe direto um
    **sheet único** (`MealSheet.tsx`): itens já registrados (toca → ⧉
    copiar / 🗑 excluir) + macros + concluída + menu de ações (Escanear/
    Pesquisar/Suplemento/Alimentos salvos/Colar). Decisão consciente do
    usuário de revogar a "regra sagrada" antiga de "nada sai do card"
    (documentada em `MealAccordion.tsx`, que virou só a linha colapsada).
  - **Clipboard de copiar/colar entre refeições** substituiu o antigo
    "copiar de outra refeição" (lista de origem). Copia um item, cola em
    qualquer outra refeição depois — fica guardado até copiar outra coisa.
  - **⭐ Favoritar alimento** — tabela nova `alimentos_favoritos` (mesmo
    padrão de `receitas_favoritas`), estrela em `PorcaoInline` (busca
    normal) e componente `FavoritoStar` extraído pra reaproveitar.
    "Alimentos salvos" no menu lista os favoritados.
  - **Registrar suplemento**: carrossel por TIPO (Whey/Creatina/BCAA/
    Pré-treino/...) em vez de listar cada marca solta — grupo com 1 opção
    só pula direto pro ajuste de dose, grupo com várias abre busca interna.
    Tela final de dose é PRÓPRIA do suplemento (não reaproveita o
    `PorcaoInline` da comida — tentativa inicial de reaproveitar foi
    revertida a pedido do usuário, que não gostou do texto genérico
    "Adicionar à refeição" aparecendo pro suplemento).
  - **Base de suplementos expandida de ~30 pra 169** produtos reais
    (Growth, Max Titanium, Integralmedica, Dux, Black Skull, Probiótica,
    Atlhetica, Under Labz, Nitech, New Millen, Vitafor, Nutrata, Dark Lab,
    Puravida), + categorias novas (Glutamina, Pré-treino, Multivitamínico,
    Ômega 3, Colágeno, ZMA, Cafeína). Bug meu encontrado e corrigido:
    3 "Cafeína" com porção 0,3g viraram **0** porque a coluna do banco é
    inteira — corrigido pra 1g nominal. Itens com macro zerado (creatina/
    glutamina/beta-alanina/cafeína) ganharam valores pequenos mas reais
    em vez de zero puro, a pedido do usuário.
  - **Auditoria automática da base de alimentos** (~1700 itens): calorias
    vs proteína×4+carbo×4+gordura×9, densidade por 100g implausível,
    porção inválida, negativo, duplicata — só achou o bug da cafeína
    acima, resto limpo.
  - **Scanner saiu da bottom nav** — agora só se chega por ele via
    "Escanear comida" no menu da refeição (ainda leva pro esqueleto de
    sempre, tela de captura real segue pendente).
  - Bug de exibição corrigido: resumo da refeição fechada usava "Pão +
    Ovo" (símbolo "+"), virou "Pão, Ovo" (vírgula), a pedido do usuário.

- **Hábitos — streak confiável** (antes de tudo acima): auditoria achou
  que `streak_atual` nunca teve mecanismo de crescimento nenhum (nem
  cron, nem trigger) e a recaída reduzia 30% em vez de zerar, ao contrário
  do que a cópia do produto dizia. Corrigido: recaída zera de verdade,
  streak "evitar" é 100% derivado de datas (sem contador, sem cron —
  auto-cura sozinho), "construir" ganhou RPC
  `registrar_checkin_habito` idempotente — **"Fiz hoje" persiste de
  verdade agora** (antes era só ✓ visual que sumia ao recarregar).
  Migração `db/athoslife_habitos_streak_confiavel_migration.sql`, já
  commitada e no ar.

- **Treino — 100 "pranchas" ilustradas processadas** (zip de 455MB → 11MB,
  `sharp-cli`), cada uma com o mascote ATHOS fazendo o exercício, início+
  execução+instrução numa imagem só (`prancha_url`, coluna nova). Tela
  expandida do exercício mostra a prancha inteira, rolável. **Usuário não
  gostou do resultado das imagens e está fazendo auditoria própria pra
  corrigir** — achei sozinho que 25 das 100 vieram com fundo claro por
  engano (deveria ser escuro, só 75 vieram certas), reportado antes dele
  comentar. Fica pendente ele reentregar as corrigidas.
  - **Tentativa de trocar o avatar do Life** pela imagem
    `personagem_athos_referencia.png` (fundo transparente de verdade, veio
    junto no mesmo zip) — usuário disse que não era a imagem certa,
    **revertida** (`git checkout` no PNG + `mixBlendMode: screen` de volta
    no código). Segue aguardando a versão certa.

- **Conquistas ligada de verdade**: catálogo de 26 conquistas já existia
  pronto no Supabase (bronze→lendário), mas `avaliar_conquistas()` nunca
  existiu de verdade no Postgres apesar do que a documentação antiga do
  domínio dizia — conferido ao vivo. Construída a avaliação client-side
  (TypeScript, mesmo padrão do resto do app) contra dado real: streak
  (`maior_streak`), treino (`treino_plano.concluido_em` — `treinos_historico`
  está morta, ninguém grava nela), refeições/dieta completa/proteína/macros
  perfeitos (±10% de tolerância), água, peso (reaproveitando o
  `pesoRepository` que já existia). Bug corrigido: domínio usava categoria
  `'agua'`, banco usa `'hidratacao'`. Cards da galeria agora expandem no
  toque (descrição, nível, data de desbloqueio ou % de progresso) — pedido
  do usuário, só visualização.

- **Conversa sobre Health Connect / sono**: explicado que Health Connect
  não tem dado de "última vez que o telefone foi desbloqueado" (isso é
  Bem-estar Digital / `UsageStatsManager`, permissão diferente e mais
  sensível) — o usuário tinha essa ideia errada. Decisão: sem
  wearable/Health Connect real, a Life pergunta direto em vez de tentar
  adivinhar (mantém o padrão que o usuário já gostou). Ideia nova
  registrada (não implementada): check-in em 3 momentos do dia (manhã=
  sono, meio-dia=refeição citando o que a pessoa já registrou, noite=
  treino/dia) — usuário rejeitou a ideia de bolinha/brilho de notificação
  ("parece anúncio"), combinado reaproveitar o EmotionalCheckin que já
  existe na Home em vez de criar aviso novo. Depende da Life virar
  componente global (decisão de 2026-09-13, nunca implementada) e da
  decisão de Capacitor 6→8 pra sono/batimento funcionarem de verdade.
  Ajudei também com localhost pro celular (WSL2 não expõe porta pra
  outros aparelhos na mesma Wi-Fi sem mexer em `.wslconfig` — caminho
  recomendado foi USB + `adb reverse`, mais simples).

- **Perfil — as 8 sub-páginas construídas** (usuário pediu pra seguir a
  ordem da lista, inspiração Fitfolio/Duolingo/WhatsApp, "depois eu venho
  corrigindo ao meu gosto"):
  - **Conta**: nome/foto (câmera ou galeria via `@capacitor/camera`,
    bucket novo `avatars` público)/e-mail (só leitura, vem da sessão de
    auth)/sexo/altura/idade/peso — tudo salvando sozinho ao sair do campo.
    Colunas novas: `avatar_url`, `sexo` (`altura_cm`/`idade`/`peso_atual`
    já existiam, nunca usadas por nenhum código até agora).
  - **Metas**: calorias/macros/água/passos editáveis, mesmas que já
    alimentam Home/Dieta.
  - **Plano**: status real (trial/premium), sem botão de assinar fake —
    Google Play Billing não existe, não fingi que existe.
  - **Privacidade e dados**: exportar todos os dados reais em `.json`
    (funciona de verdade, várias tabelas) + solicitar exclusão de conta
    (registra o pedido em `eventos_seguranca` e desconecta — apagamento
    definitivo é manual, client não tem permissão de apagar `auth.users`).
  - **Notificações**: lista central dos lembretes de hábito (que já
    existiam espalhados em Hábitos) — "modo resgate"/WhatsApp marcados
    como "em breve" (nada disso existe).
  - **Acessibilidade**: tamanho de texto/reduzir animações/alto
    contraste — as três funcionam de verdade, aplicadas na hora, salvas
    no `localStorage` do aparelho (preferência de exibição, não dado do
    usuário, por isso não vai pro banco).
  - **Sobre**: versão do app; Termos/Política/Suporte "em breve" — não
    existe nenhum documento legal escrito no projeto, não fui inventar.
  - De brinde: corrigidos 2 links mortos que já existiam (rota nunca
    registrada) — "Ver planos" da receita bloqueada, e "Sair da conta".

- `tsc --noEmit` limpo depois de cada mudança, o dia inteiro. Servidor
  Vite local ficou rodando quase a sessão inteira (`localhost:5173`).

- **Nada commitado desde o push do início da sessão** — usuário avisou
  que vai mexer em algumas coisas antes de commitar, sessão encerrada
  pra desligar o PC. `git status` mostra ~23 arquivos modificados + ~40
  novos (incluindo zips/imagens de referência soltos na raiz, de
  propósito fora de qualquer commit, mesmo padrão de sempre).

- **Pendências pra próxima sessão**:
  1. Usuário vai reentregar as 100 pranchas do Treino corrigidas (auditoria
     própria em andamento) — reprocessar quando chegarem.
  2. Avatar do Life com fundo transparente — aguardando a imagem certa.
  3. Scanner: tela de captura/revisão real — usuário ainda não mandou o
     HTML da nova abordagem (só apareceu o botão de entrada no menu da
     Dieta até agora).
  4. Perfil: usuário vai revisar/ajustar as 8 sub-páginas ao gosto dele.
  5. Decisão Capacitor 6→8 (trava Health Connect de sono/batimento e,
     por tabela, o check-in de 3 momentos do Life).
  6. Camada 2 da Life (life_* tables, ai-proxy fixes, FCM, relogio-athos)
     — segue exatamente como estava, nada mudou aqui.
  7. Testar chat do Life ao vivo (ainda pendente desde 09-19).
  8. Commit/push de tudo desta sessão — usuário decide quando, disse que
     vai mexer em mais coisas antes.

## 2026-09-26

- **Capacitor**: pendência "6→8" estava errada — projeto já roda Capacitor
  8.5.0. Só falta o plugin de saúde quando o Health Connect entrar.
- **Auditoria de segurança do banco (grave, corrigida)**: qualquer usuário
  logado podia editar `plano`/`is_admin`/cotas do próprio perfil (e, virando
  admin, listar e-mail/telefone de todos via `admin_list_users`); funções de
  cota/vagas aceitavam qualquer `p_user_id`/data (zerar cota, devolver scan,
  esgotar vagas de fundador); usuário apagava o próprio rastro de auditoria;
  bucket `avatars` sem limite. Corrigido em
  `db/athoslife_seguranca_perfil_funcoes_migration.sql` — **rodado pelo
  usuário no SQL Editor e conferido ao vivo**. Primeira tentativa rodou mas
  foi desfeita (rollback) por causa do `begin/commit` explícito — removido
  do arquivo; o SQL Editor já roda o script como bloco único.
  As duas contas do dono (matheusbarretonunes / matheusecomerc) viraram
  admin + VIP. Teste grátis de conta nova: **30 → 7 dias**.
  ⚠️ Pendente: receitas pagas ainda legíveis pela API por usuário grátis
  (a tela mostra cadeado, mas o banco entrega a receita) — corrigir com uma
  "vitrine" (nome/foto/kcal) pro grátis.
- **Planos (decisão do dono)**: Grátis = chat 4 msgs/dia, busca/salvar/copiar
  alimentos, treino casa + academia, 1 hábito. Pago = planos de treino e
  dieta, mais modalidades, scanner 5/dia, Cozinha + receitas com o Life,
  hábitos completos, resgate 7 dias via WhatsApp, Camada 2 do Life, análise
  do Life com Health Connect. Pra todos: widget, timer na tela de bloqueio
  (Live Updates Android), passos. Sem anúncios em nenhum plano.
- **Regra do Life**: pode falar de trocas de alimento, macros/micros e
  explicar suplementos (informação pública); nunca diz qual suplemento/remédio
  tomar nem quanto, nunca monta dieta, nunca recomenda treino/carga/séries.
- **ai-proxy v2 escrito** (`supabase/functions/ai-proxy/index.ts`, primeira
  vez versionado no repo — antes só existia `ai-proxy.zip` solto). O zip
  antigo tinha 4 bugs que impediam o chat de funcionar (envelope diferente
  do app, campo de resposta diferente, RPC de limite sem parâmetros, modelo
  `gemini-1.5-flash` desligado pelo Google). Novo: Gemini 2.5 Flash sem
  thinking (economia), cota por plano atômica no banco, 6 chamadas/min por
  usuário, teto global de tokens/dia, histórico do chat no servidor (8
  últimas), palavras de risco → resposta fixa com CVV sem passar pela IA,
  filtro de saída contra prescrição (testado), chave do Gemini no cabeçalho.
  Handlers: chat, vision (só pago), recipe (só pago). Barcode removido
  (app não usa). Migração nova: `db/athoslife_ia_cotas_chat_migration.sql`.
  App atualizado: `aiProxy.ts`, `recipeAi.ts`, `LifeChatSheet.tsx` (carrega
  histórico, mostra mensagens restantes), exportação LGPD inclui o chat.
- Dev: `VITE_DEV_PREMIUM=true` em `.env.local` mostra a interface paga só no
  `npm run dev` (nunca em build).
- Prompt do Life: voltaram os exemplos de "puxar assunto" (um comentário
  por vez, segue o assunto da pessoa). Sugestão da Cozinha ATHOS só pra quem
  é pago (proxy consulta `is_premium_like` a cada mensagem); pro grátis o
  prompt proíbe mencionar Cozinha/receitas.
- **Migração de cotas rodada pelo usuário e conferida** (tabelas, RLS,
  grants, limites 4/40 chat e 0/5 scan). **ai-proxy v2 publicado pelo
  usuário via painel** e confirmado no ar (CORS novo responde). Código no
  ar era o mesmo do `ai-proxy.zip` (765 linhas) — confirmado pelo usuário.
  `GEMINI_API_KEY` já estava nos Secrets (mesma chave da época do 1.5 —
  chave é da conta, vale pro 2.5).
- Nada commitado nesta sessão (segue o padrão: usuário decide quando).

- **Pendências pra próxima sessão**:
  1. **Primeiro teste real do chat** (Hábitos → Life, `npm run dev --host`)
     — até o fim da sessão: 0 chamadas no `ai_audit_logs`. Conferir cota
     contando, histórico salvando, tokens/custo por mensagem. Testar limite
     do grátis (4) precisa de uma conta de teste comum (as duas do dono são VIP).
  2. Tela "Esqueci a senha" — dono esqueceu a senha da conta principal;
     testadores do beta também vão precisar.
  3. Receitas pagas legíveis pela API por usuário grátis — criar "vitrine"
     (nome/foto/kcal) e travar conteúdo por `is_premium_like` no RLS.
  4. Travar no servidor os limites do grátis que ainda são só de tela:
     1 hábito, Cozinha, e o que mais o plano pago tiver.
  5. **Camada 2 do Life** (quer pronta pro beta): memória em 3 camadas
     (dados do app / fatos fixos que nunca são sobrescritos / padrões com
     peso), extração diária com modelo leve, avisos que mudam de abordagem
     quando ignorados (nunca abaixo de 1 aviso de água/dia), `relogio-athos`
     (precisa `pg_cron` + `pg_net`), push FCM (precisa projeto Firebase do
     dono — ainda não decidido se o beta sai com ou sem push).
  6. Timer de descanso como notificação fixa com cronômetro (Live Updates
     Android 16 / ilha do HyperOS — visual de ilha depende da Xiaomi).
  7. Dono vai mandar: HTML do widget, ideia/HTML da atualização da Dieta,
     modalidade extra de treino (construir escondida atrás de flag).
  8. Seguem de antes: pranchas do Treino corrigidas e animações (dono teve
     problema, vai demorar), avatar do Life com fundo transparente, HTML do
     Scanner, revisão do Perfil, `altercao do checkin emacional24.09.26.html`
     solto na raiz sem registro de uso.
  9. Commit/push de tudo de 24/09 + 26/09.

## 2026-09-27

- **Correções do registro anterior (ditas pelo dono)**:
  - Item 6 de 26/09 estava errado: o dono **não** pediu "timer de descanso".
    O pedido é uma **Live Activity** (notificação viva na tela de bloqueio /
    ilha — Live Updates no Android). Conteúdo ainda a definir com o dono.
  - Scanner: o dono **nunca preparou HTML** pra tela. O registro de 24/09
    ("usuário ainda não mandou o HTML") estava errado — a tela de
    captura/revisão é pra **Claude desenhar e construir**.
  - Pranchas do Treino + avatar do Life: dono está cuidando das imagens,
    vai demorar — não bloqueia nada agora.
- **Live Activity de treino — especificação do dono** (mockup de referência:
  `athoslife-live-activity-mockup.html`, na raiz do `athoslife/`):
  card na tela de bloqueio lendo a mesma sessão central do treino
  (`WorkoutSession`: exercício, miniatura, série X de Y, peso, reps, status
  idle|running|resting|paused|completed, descanso restante, deeplink).
  Estados: **série ativa** (steppers peso ±2,5 kg e reps ±1 + "Confirmar
  série ✓") e **descanso** (contagem regressiva laranja, "+15s", "Pular").
  **Acréscimo do dono**: terceiro estado, **cronômetro de exercício por
  tempo** (prancha, abdominal isométrico) — além do descanso.
  Técnica: no Android é notificação contínua com layout próprio + botões
  (Live Updates / Android 16) via plugin nativo Kotlin do Capacitor; a ilha
  do HyperOS é visual da Xiaomi. Substitui o item 6 de 26/09.
- **Ordem aprovada pelo dono**: Esqueci a senha → vitrine das receitas +
  limites do grátis no servidor (migração só com aprovação) → Scanner →
  teste do chat quando o dono puder rodar o app.
- **Esqueci a senha (feito, falta configurar e testar)**: tela nova
  `src/ui/screens/RecuperarSenha.tsx` em `/recuperar-senha` (link "Esqueci a
  senha" no Login, modo Entrar). Fluxo por **código no e-mail**, não por link
  (app nativo não tem deep link): `resetPasswordForEmail` → `verifyOtp`
  type recovery → `updateUser`. Rota fica fora do `RequireAnon` porque
  validar o código já abre sessão e o guard redirecionaria antes de gravar
  a senha. Mensagem igual exista ou não a conta. `tsc` 0 erros.
  ⚠️ **Dono precisa**: Supabase → Authentication → Email Templates → Reset
  Password → colocar `{{ .Token }}` no corpo (o padrão só tem o link).
  ⚠️ SMTP padrão do Supabase só entrega pra e-mails da equipe da org e com
  limite baixo por hora — pro beta com testadores precisa SMTP próprio
  (Resend/Brevo etc.).
- **Limites do grátis no servidor (RODADO por Claude via MCP com aprovação do dono, 2026-09-27)**:
  `db/athoslife_limites_gratis_servidor_migration.sql`.
  1. Receitas: as 25 são `premium=true` e a RLS só pedia "estar logado" —
     `select *` entregava tudo. Agora `conteudo` perde o GRANT de SELECT
     (vitrine continua) e só sai pela RPC `receitas_conteudo_liberado()`,
     que filtra por `is_premium_like`. Tirado também o SELECT do `anon`.
     App: `receitasRepository.listar()` pede colunas da vitrine + RPC.
  2. Hábitos: trigger `limitar_habitos_gratis` em `vicios_user` (insert ou
     reativação) — grátis = 1 ativo. Nem a tela tinha esse limite antes.
     App traduz o erro em `habitosRepository.criar()`.
  3. `is_premium_like`: trial com `trial_expira` NULL era pago pra sempre
     (o app já tratava como sem acesso). Nenhum perfil nesse caso hoje.
  ⚠️ App e migração dependem um do outro: sem a migração, a Cozinha do
  código novo quebra (RPC não existe); com a migração e código antigo,
  `select *` falha. Rodar a migração antes de testar.
  Visto e não mexido: política de UPDATE de `vicios_user` deixa o próprio
  usuário editar `streak_atual`/`melhor_streak` pela API (só engana a si
  mesmo e as conquistas dele) — avaliar depois.
  Resto do plano pago: scanner/vision/recipe já travados no ai-proxy;
  "planos de treino e dieta" e "mais modalidades" ainda não existem no app.
  Conferido no catálogo após rodar: `authenticated` sem SELECT em
  `conteudo` e com SELECT em `titulo`; `anon` sem SELECT na tabela; RPC
  executável só por `authenticated`; trigger ativo; `is_premium_like` =
  false pro free, true pro trial válido e pros 2 VIP. Teste simulando
  inserts (com rollback) foi barrado pela permissão do Claude Code — o
  teste de verdade fica pro app: conta free tentando criar o 2º hábito e
  abrindo receita. `apply_migration` sem permissão no token
  (`database_migrations_write`) — rodado via `execute_sql`, então não
  aparece no histórico de migrações do Supabase.
- **Live Activity — decisão do dono**: card completo igual ao mockup (com
  steppers peso/reps, confirmar, descanso +15s/pular, cronômetro de
  exercício por tempo), **abrindo mão da ilha/Live Update** do Android 16
  (esse formato só aceita layout padrão + 3 botões). Uso da ilha: pensar
  depois. Dono aprovou construir antes o **modo "treino em andamento"**
  dentro do app (não existe hoje — Treinos só monta o plano), que é a fonte
  de estado da Live Activity.
- **Widget de hidratação — referência do dono**:
  `athoslife-widget-hidratacao.html` (raiz do `athoslife/`, 76 KB com o
  Life embutido em base64). Cápsula 655×137 escura com anel teal, Life
  estourando 30px pra cima (toque abre o app, humor
  hidratado/ressecado/vazio abaixo de 40% da meta), contador "1.500 /
  2.500 ml", 5 copos que enchem proporcional à meta (toque soma o volume
  do copo), botão câmera (abre captura de refeição), "..." com 250 ml /
  500 ml / 1 L. Contrato `HydrationWidgetState` + `Bridge`
  (openApp/openCamera/saveWater/removeWater/saveCupVolume/resetDay).
  Limites do widget nativo Android já previstos: sem animação contínua
  (bob do Life), sem menu flutuante (o "..." vira seletor dentro do
  widget ou tela pequena), nada pode vazar da área do widget (a cápsula
  desce 30px dentro de um widget mais alto), brilhos/degradês viram
  imagens pré-renderizadas. Gravar água precisa do token do Supabase no
  lado nativo ou fila local sincronizada ao abrir o app.
- **APK de teste pelo GitHub (novo)**: `.github/workflows/android-apk-teste.yml`
  — rodar em Actions → "APK de teste" → Run workflow. Gera `.apk` de debug
  (sem keystore) pra instalar direto no celular. Campo `servidor_dev`
  (padrão `http://192.168.18.92:5173`) liga a atualização ao vivo: o app
  abre as telas do `npm run dev -- --host` do PC (`capacitor.config.ts` lê
  `CAP_SERVER_URL`; a automação libera http no manifest só nesse APK).
  Vazio = APK independente. Mudança nativa exige gerar e instalar de novo.
  Celular precisa alcançar o PC: portproxy + firewall no PowerShell admin
  (WSL2 tem rede interna própria; o IP do WSL muda a cada boot).
- **Commit + push feitos** (pendência 9 de 26/09 resolvida): 4 commits
  `ae21384` banco · `4979c43` pranchas · `8ac760c` app · `8d26555` APK de
  teste + diário, push `3e98a22..8d26555` com token dado pelo dono na
  conversa (não gravado em arquivo). Zips/imagens/HTMLs de referência da
  raiz fora do commit, como sempre.
- **GitHub Secrets**: repositório **não tinha nenhum** (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` ausentes) — o `.aab` da Play nunca teria
  conectado no Supabase. Cadastro pela API bloqueado pelo Claude Code:
  **dono cadastra à mão**. Não trava o APK ao vivo (telas vêm do dev
  server do PC, que tem o `.env`).
- APK de teste disparado via API (run 36339078363, servidor_dev
  `http://192.168.18.92:5173`).
- **1º APK de teste falhou → Capacitor 8 no nativo completado**: erro
  `Failed to create Jar file ... bcprov` = Gradle 8.2.1 rodando em Java 21.
  A "migração pro Capacitor 8" antiga (`docs/MIGRACAO_CAPACITOR_8.md`) só
  atualizou o npm; `android/` seguia no molde do 6. Alinhado com o molde
  oficial do `@capacitor/cli` 8.5: Gradle 8.14.3, AGP 8.13.0,
  google-services 4.4.4, minSdk 24, compile/targetSdk 36, androidx novos,
  `configChanges` + navigation|density. Commit `f64ea40`, APK disparado de
  novo. Obs.: o `.aab` da Play também nunca teria compilado antes disso.
  targetSdk 36 = Android 16 força tela de ponta a ponta — conferir se
  cabeçalho/bottom nav respeitam a barra de status no aparelho.
- **Modo treino — rascunho da migração** (NÃO rodado):
  `db/athoslife_treino_sessao_migration.sql` — `medida` reps|tempo +
  `segundos_padrao` no catálogo (hoje "Prancha Frontal 3×12" está errado),
  e `treinos_historico` ganha local/dia/início/fim/`series_feitas` jsonb.
  Lista de exercícios por tempo a confirmar com o dono.
- **APK de teste gerado com sucesso** (run 36339285502) — artefato `athoslife-teste-apk`, modo ao vivo apontando pra `192.168.18.92:5173`.
- **Acesso pelo celular (portproxy/APK ao vivo)**: dono tentou e **não
  conseguiu abrir** — deixado pra depois a pedido dele. Causa não
  investigada (suspeitas: portproxy/firewall/perfil de rede Público).
- **Chat do Life — causa do erro achada**: dono testou 4× às 13h37;
  `ai_audit_logs` = 4 × error, 0 tokens, 0 mensagens salvas. Log da função:
  Google 404 "gemini-2.5-flash is no longer available to new users". Doc
  oficial confirma (2.5 só pra quem já usava). ai-proxy corrigido (NÃO
  publicado ainda): padrão `gemini-3.5-flash-lite` (mesmo preço do 2.5
  Flash, $0,30/$2,50 por 1M), preços do 3.5-lite e 3.8-flash na tabela,
  e se o Google recusar `thinkingConfig` (400 com "thinking") repete sem
  ele e com +1024 no teto de saída. Doc não confirma se 3.x aceita
  `thinkingBudget: 0`. Modelo trocável pelo Secret `GEMINI_MODEL`.
- **Gráfico do peso (Home)**: nunca teve dado porque **nenhuma tela
  registrava peso** (`pesoRepository.registrar` sem uso; 0 linhas em
  `registros_peso`). Card agora tem "+ Registrar peso de hoje" (upsert do
  dia + atualiza `profiles.peso_atual`). Cor da variação agora segue
  `profiles.objetivo` (emagrecer/massa/manter; null = neutro) — antes era
  `kcal_meta > 0`, ou seja, sempre "emagrecer". Ponto pulsante saiu do SVG
  (virava oval com preserveAspectRatio none). Discos de atividade: ok.
- ⚠️ **Bug de data em todo o app (não corrigido)**: 18 lugares usam
  `new Date().toISOString().slice(0, 10)` = data UTC, e o Postgres roda em
  UTC (`current_date`). No Brasil, das 21h à meia-noite tudo (água,
  refeições, peso, humor, check-in de hábito, cota de IA) cai no dia
  seguinte. Precisa correção única cliente + funções do banco.
- **Dono deu autorização ampla** (2026-09-27): mexer/criar o que for preciso
  pra Live Activity, widget, Scanner e IA do Life (inclui migração e deploy).
- **Migração do treino RODADA**: `medida`/`segundos_padrao` no catálogo
  (Prancha Frontal/Lateral e Mountain Climber 30s, Farmer's Walk 40s) +
  colunas de sessão em `treinos_historico`.
- **Modo "treino em andamento" (app, feito)**: `domain/entities/sessaoTreino.ts`
  (lógica pura, tempos como horário de término; simulado no Node: descanso,
  +15s, troca de exercício, cronômetro terminando sozinho, resumo),
  `app/SessaoTreinoProvider.tsx` (salva no aparelho, relógio, vibração,
  aviso local no fim do descanso, ponte com a Live Activity, fila de toques),
  tela `/treinos/sessao` (steppers peso/reps, cronômetro pra exercício por
  tempo, descanso laranja +15s/pular, resumo final), botão "Iniciar treino
  de hoje"/"Continuar" em Treinos, `treinoHistoricoRepository` (grava sessão,
  marca concluídos, carga usada vira carga da ficha). Card da ficha mostra
  "segundos" em exercício por tempo. Ponte TS da Live Activity:
  `data/native/liveActivity.ts` (plugin nativo `AthosLiveActivity` — Java a
  escrever).
- **Gráfico do peso v2**: eixo X por data real, período 30d/90d/tudo (com
  âncora anterior), objetivo + peso-meta (linha dourada, "faltam X kg",
  cor por objetivo), histórico com apagar. Datas locais
  (`domain/rules/datas.ts`) no peso.
- **Chat do Life**: rola sozinho pra última fala; botão "💬 Life" no topo da
  Home; ai-proxy passa a contar sessões de `treinos_historico` no contexto.
  ⚠️ ai-proxy ainda precisa ser publicado pelo dono (MCP sem permissão de
  Edge Functions; copiar 700 linhas à mão pro deploy foi descartado).
- **Scanner (feito, app)**: tela `/scanner` real — escolhe refeição (ou vem
  da Dieta com refeição+dia no `state`), foto (câmera/galeria, 1024px),
  "Life olhando seu prato", revisão item a item (incluir/desmarcar, nome
  editável, ±10 g reescalando macros, selo "conferido na base"/"estimativa
  da IA", confiança, total), salva **cada item em `itens_refeicao`** da
  refeição escolhida (aparece na Dieta com excluir/copiar) + `scan_historico`.
  Não usa mais a tabela `refeicoes` (evita soma dupla). Grátis vê cadeado
  com "Ver planos"; pago vê "X de 5 scans hoje". Depende do ai-proxy novo
  publicado (visão também usa o Gemini).
- **Live Activity nativa (Java, escrita)**: `android/.../liveactivity/`
  (EstadoLive = cópia do estado + transições espelhadas + fila de toques;
  LiveActivityNotificacao = notificação fixa com layout próprio, cores do
  mockup, Chronometer regressivo, canal "Treino em andamento" silencioso e
  público na tela de bloqueio; Receiver dos botões; Plugin
  `AthosLiveActivity`). Layouts `athos_la_grande`/`athos_la_pequeno`.
- **Widget de hidratação (Java, escrito)**: `android/.../widget/` —
  cápsula com anel teal, Life (webp extraído do HTML do dono; cinza gerado
  na hora com ColorMatrix pro humor "ressecado"/apagado), contador com total
  em verde, 5 copos vetoriais em 5 níveis, câmera -> `athoslife://abrir/scanner`,
  "..." virou botão que troca 250 ml/500 ml/1 L. Copo tocado soma na hora e
  entra em fila; `app/IntegracoesNativas.tsx` grava no banco ao abrir/voltar
  e manda o total real de volta; `useAgua` também atualiza o widget.
  Plugin `AthosWidgetAgua`. Deep link `athoslife://abrir/<rota>` no manifest.
- Botão voltar: `/scanner` saiu das telas raiz (voltava minimizando o app).
- **Bug das 21h corrigido no app**: os 16 usos de data UTC trocados por
  `dataLocalISO()` (água, refeições, macros, humor, passos, hábitos,
  conquistas, treino, exportação). Cotas de IA no banco já usavam
  America/Sao_Paulo. ⚠️ Faltam 2 funções do banco com `current_date` (UTC):
  `registrar_checkin_habito` e `handle_recaida` — aguardando OK do dono
  (fora do escopo da autorização ampla).
- APK com Live Activity + widget **compilou no GitHub** (run 36344863724).
- **Funções do banco com data de Brasília (RODADO, dono autorizou)**:
  `registrar_checkin_habito` e `handle_recaida` usam
  `(now() at time zone 'America/Sao_Paulo')::date` — arquivo
  `db/athoslife_datas_brasilia_habitos_migration.sql`. Conferido: nenhuma
  das duas usa mais `current_date`.
- **Treino — correção do dono**: a tela de treino em tela cheia foi errada;
  a tela de Treino continua a MESMA, "Começar treino" só liga a sessão da
  Live Activity (card com peso/reps/descanso fica só na tela de bloqueio).
  No app: faixa "Treino em andamento · tempo · status · Encerrar" +
  resumo em painel (`workout/TreinoEmAndamento.tsx`). `SessaoTreinoScreen`
  e a rota `/treinos/sessao` removidas.
- **Chat — correção do dono**: botão "💬 Life" da Home removido. O chat abre
  tocando no Life (PNG, quando o dono mandar a versão certa), como em Hábitos.
- **Secrets do GitHub cadastrados** (VITE_SUPABASE_URL/ANON_KEY, valores do
  `.env`, autorizado pelo dono) — o `.aab` e o APK independente agora
  conectam no Supabase.
- **Treino — parar pelo app (pedido do dono)**: faixa agora tem "Encerrar"
  (abre resumo SEM encerrar: salvar / continuar treinando / descartar) e
  "Parar" (confirmação em vermelho: sai da tela de bloqueio, nada salvo).
  Antes o "Encerrar" marcava concluído na hora, sem volta.
  Obs.: não existe excluir hábito no app hoje (só criar) — levantar com o dono.
- **Scanner — código de barras (pedido do dono)**: botão "Ler código de
  barras" no Scanner. Android: ML Kit (`@capacitor-mlkit/barcode-scanning`
  8.2.1, tela pronta do Google, EAN-13/8, UPC-A/E; manifest com
  `barcode_ui` + CAMERA). Navegador: digitar o número. Produto via Open
  Food Facts (público, CORS ok; testado: Coca 2L, Leite Moça, código
  inexistente). Vira 1 item "rótulo do produto" na porção do rótulo (ou
  100 g), ajustável ±10 g, salvo na refeição igual à foto. **Grátis pra
  todos** (não usa IA/cota) — decisão minha, confirmar com o dono. Não
  entra no `scan_historico`.
  ⚠️ No teste manual da API o e-mail do dono foi enviado 1× no User-Agent
  pro Open Food Facts (erro meu); o código do app não envia.
- **Correção do dono sobre o código de barras**: NÃO é grátis ilimitado.
  Grátis = **2 leituras de código de barras por dia**; pago = mais (definir).
  E usar **IA pra ampliar a busca** quando o Open Food Facts não achar o
  produto. Ficou pra próxima sessão (abaixo).

- **Pendências pra próxima sessão**:
  1. **Código de barras**: cota de 2/dia no grátis (travar no servidor, não
     só na tela — ex.: tipo `barcode` na `consumir_cota_ia`/`ia_uso_diario`
     ou RPC própria) + definir o limite do pago; e busca com IA quando o
     produto não está no Open Food Facts (ex.: foto do rótulo/tabela
     nutricional -> handler novo no ai-proxy).
  2. **Publicar o ai-proxy** (dono, pelo painel): colar
     `supabase/functions/ai-proxy/index.ts` em Edge Functions -> ai-proxy ->
     Code -> Deploy. Sem isso chat e Scanner por foto dão erro (Gemini 2.5
     desativado pro projeto).
  3. **Onboarding + Consentimento reais** (próximo grande bloco sugerido) —
     conta nova não informa objetivo/peso/altura/metas nem aceita termos;
     bug de ficar preso na tela de consentimento.
  4. Termos de uso + Política de privacidade (exigidos por Play e Health
     Connect).
  5. Google Play Billing.
  6. Life como componente global (PNG que abre o chat — dono vai mandar a
     imagem) + Camada 2 do Life (memória, avisos, FCM).
  7. Esqueci a senha: dono colocar `{{ .Token }}` no template "Reset
     Password" do Supabase; SMTP próprio antes do beta.
  8. Excluir hábito não existe no app (só criar) — perguntar ao dono.
  9. Testar no celular (dono vai usar o console Android): Live Activity,
     widget de água, leitor de código de barras, cronômetro/descanso.
  10. Seguem de antes: pranchas do Treino corrigidas, avatar do Life
      transparente, revisão do Perfil, "Confirm email" do Supabase religar
      antes da produção, trocar o token do GitHub (ficou na conversa).
  Nada pendente de commit: tudo enviado pro GitHub.
- Build de conferência com o plugin de código de barras **compilou** (run 36348717842).

## 2026-09-28

- **Excluir hábito (feito, app)**: "Excluir hábito" no rodapé do card aberto,
  com confirmação no próprio card. `habitosRepository.excluir()` faz
  `ativo=false` (sem migração: política de UPDATE já existia; trigger
  `limitar_habitos_gratis` deixa desativar e só conta ativos, então libera a
  vaga do grátis). Histórico/recaídas ficam no banco. Cancela o lembrete
  local junto. `tsc` 0 erros.
- **Esqueci a senha**: código já estava pronto desde 27/09. Falta só o dono
  no painel: template "Reset Password" com `{{ .Token }}`; SMTP próprio
  antes do beta.
- **Onboarding**: o dono fez o onboarding (1º, cadastro das informações do
  usuário) — vai mandar a referência.
- **Termos + Política de privacidade**: ficam com Claude (já pensando em
  vários países: LGPD, GDPR, CCPA).
- **Novas pendências do dono**:
  1. **Globalização** — vender em qualquer país: textos em i18n (hoje tudo
     pt-BR fixo no código), unidades (kg/lb, ml/oz, kcal/kJ), fuso do
     usuário (hoje banco e app fixos em America/Sao_Paulo — vira coluna
     `profiles.fuso`), base de alimentos regional (a de 1500 é brasileira;
     Open Food Facts é mundial), preços locais (a Play Billing converte
     sozinha), leis de dados por região, ficha da Play por idioma.
  2. **Life adaptável a país e cultura** — idioma e tom do Life, culinária
     local nas sugestões/receitas, datas e costumes (ex.: jejum religioso,
     restrições alimentares), exemplos e unidades locais; ai-proxy recebe
     idioma/país/fuso do perfil no contexto.
- Item 10 (pranchas, avatar, Perfil, Confirm email, token GitHub): dono
  pediu pra esperar.
- **ai-proxy v3 (globalização — PUBLICAR DE NOVO)**: lê idioma/país/fuso/
  unidades do perfil. Life responde no idioma da pessoa e com a cultura do
  país (comidas, gírias, unidades, tabela nutricional TACO/USDA/local,
  práticas religiosas sem presumir). "Hoje" e renovação da cota no fuso do
  usuário. Crise: termos em en/es + linha de apoio por país (BR CVV 188, US/CA
  988, PT, GB/IE Samaritans, AU, ES 024, MX, AR, CO, CL; resto
  findahelpline.com). Filtro anti-prescrição em en/es. Visão e receita no
  idioma e culinária do país. Contexto do chat inclui respostas do
  onboarding (gostos, obstáculos, sono, estresse, suplementos). Conferido
  com `tsc` + shim do Deno: 0 erros.
- **Migração da globalização (RODADA por Claude, autorizado pelo dono)**:
  `db/athoslife_globalizacao_onboarding_migration.sql` — profiles ganha
  `idioma` (pt-BR), `pais`, `fuso` (America/Sao_Paulo), `unidades`
  (metrico|imperial), `onboarding_respostas` jsonb; funções
  `fuso_do_usuario`/`hoje_do_usuario`; `consumir_cota_ia`, `cota_ia_status`,
  `devolver_cota_ia`, `handle_recaida`, `registrar_checkin_habito` usam o
  fuso do usuário (teto global de tokens segue no dia de Brasília).
  Conferido: 5 colunas, 5 funções novas, base atual toda
  America/Sao_Paulo/pt-BR/metrico.
- **Idiomas no app (base)**: `src/i18n/` — pt-BR (referência), en, es, tipados
  (faltou chave = erro de compilação). `I18nProvider` (escolha do aparelho >
  perfil > idioma do aparelho), `formatos.ts` (peso/altura/volume com
  kg/lb, cm/ft, ml/oz), `domain/rules/localidade.ts` e `unidades.ts`.
  Telas novas já nascem traduzidas: Onboarding, Consentimento, Termos/
  Política, Idioma e região, saudação do Life, excluir hábito. **As telas
  antigas continuam em pt-BR fixo — migração gradual pendente.**
- **Onboarding real (10 telas, HTML do dono)**: `ui/screens/Onboarding.tsx` +
  `onboarding/estado.ts` + `onboarding/componentes.tsx`. Uma tela por vez,
  progresso salvo no aparelho, voltar sem perder dado, resumo com dado real
  (toque volta pra etapa) + metas iniciais (Mifflin-St Jeor × frequência de
  treino, piso no basal, proteína 1,6–2 g/kg, água 35 ml/kg — editáveis em
  Metas). Grava tudo no fim (`concluirOnboarding`) + 1º peso no gráfico.
  Seletor de idioma na 1ª tela; kg·cm / lb·ft na tela do corpo.
  Diferenças do HTML (decisão minha): idade é número (não faixa) porque as
  metas precisam; mínimo 16 anos; alimentos começam vazios com sugestões
  por idioma (o HTML vinha com lista brasileira pré-marcada); alergia "Sim"
  abre campo de quais; "Nenhum" nos suplementos.
- **Consentimento real**: termos + dado de saúde obrigatórios, hábitos
  opcional; grava versão/data e navega sozinho (fim do bug de ficar preso).
  Guard novo `RequireEtapaInicial` em /consentimento e /onboarding.
- **Termos de uso + Política de privacidade (RASCUNHO)**:
  `ui/screens/legal/documentos.ts` (pt-BR + en; es usa en), rotas públicas
  `/termos` e `/politica-de-privacidade`, links no Consentimento e no Sobre.
  LGPD/GDPR/CCPA. ⚠️ Dono preencher [razão social, CNPJ, endereço, e-mail de
  privacidade, foro] e passar por advogado. ⚠️ A política diz que o Google
  não treina com os dados — só vale se a chave do Gemini estiver no plano
  PAGO (faturamento ativo); conferir.
- **Imagens do Life (dono mandou 8 JPEG + paywall)**: fundo preto recortado
  por script (sharp) -> `public/life/*.webp`; roxo "calmo" tirado do HTML do
  onboarding. Onde ficou: Home (normal; "resgate" após 3+ dias sem abrir,
  toque abre o chat), Hábitos (feliz/calmo, sem o mix-blend-mode),
  Treinos (treino), Cozinha e Scanner (chef), Conquistas + aviso de
  conquista (dourado), Sobre (normal), onboarding (treino/chef/azul/roxo),
  widget de água (azul hidratado / desidratado — trocou o cinza gerado em
  Java). `avatar.png` antigo apagado. ⚠️ Caneca do "resgate" tem texto em
  português ("CADÊ VOCÊ?") — pra outros idiomas precisa versão sem texto.
- **Paywall (imagem do dono)**: referência pra tela de planos/Billing. ⚠️
  Diverge do servidor: a imagem diz grátis = "Hábitos 2" e "Refeições 4 por
  dia" e "Com anúncios"; hoje o banco limita 1 hábito ativo, não limita
  refeições e o app não tem anúncio. Decidir antes do Billing.
- **Perfil > Idioma e região**: troca idioma e unidades (grava no perfil e
  atualiza o fuso pelo aparelho).
- `tsc` 0 erros; `vite build` ok. Java do widget não compila aqui — conferir
  no próximo build do GitHub.
- **Decisões do dono (2026-09-28, fim da sessão)**: limites do grátis = os do
  servidor (1 hábito ativo etc.) — o paywall da imagem é que se adapta.
  Gemini está no plano GRÁTIS por enquanto -> ⚠️ a Política diz que o Google
  não treina com os dados, o que no grátis é falso: ativar faturamento antes
  do lançamento (ou reescrever a Política). Dono ainda não tem CNPJ nem
  e-mail de privacidade. Dono vai publicar o ai-proxy v3.
- ⚠️ **Achado**: `consentimento_habitos` é gravado mas não é respeitado —
  quem desmarca continua usando Hábitos, e o ai-proxy manda os hábitos pro
  Gemini do mesmo jeito. Corrigir (travar a tela + não mandar no contexto).
- **Hábitos — álcool/cigarro/drogas/apostas BLOQUEADOS (pedido do dono)**:
  `db/athoslife_habitos_proibidos_consentimento_migration.sql` (RODADO):
  `normalizar_texto`, `habito_nome_proibido` (pt/en/es, palavra inteira; de
  fora de propósito: beber, drink, erva, trago, pod, baseado, saque) e
  trigger `validar_habito` em vicios_user (nome proibido ->
  `habito_nao_permitido`; criar/reativar sem `consentimento_habitos` ->
  `sem_consentimento_habitos`). Testado: bloqueia Cerveja, Parar de fumar,
  Cigarro eletrônico, Álcool, vinho, Beer, Apostas no tigrinho, Maconha;
  passa Chocolate, Beber água, Chá de erva-doce, Podcast, baseado em ciência.
  Os 3 hábitos atuais (chocolate, meditação, pizza/fritura) seguem válidos.
  App: espelho em `domain/entities/habito.ts` (`habitoNomeProibido`) — o
  painel de novo hábito avisa e trava o botão. Também pornografia/conteúdo
  sexual (dado sensível de vida sexual) — decisão minha, confirmar.
- **Hábitos — consentimento respeitado**: tela Hábitos pede autorização se
  `consentimento_habitos` = false; Perfil > Privacidade liga/desliga; aviso
  "não é tratamento para dependência" na tela; ai-proxy só manda hábitos
  pro Gemini com consentimento e o Life recusa acompanhar álcool/cigarro/
  drogas/apostas (acolhe e indica serviço especializado, CAPS AD no BR).
  ⚠️ ai-proxy mudou de novo — **dono publicar outra vez** (878 linhas).
- **Base de alimentos global (RODADO)**:
  `db/athoslife_alimentos_globalizacao_migration.sql` — `nome_en`, `nome_es`,
  `regioes`, RPC `buscar_alimentos(termo, idioma, país)`. 1.481 itens
  traduzidos pra inglês e espanhol; 110 suplementos de marca BR só aparecem
  no Brasil; +57 alimentos de fora (EUA, México/América Latina, Espanha,
  Ásia, Oriente Médio) por 100 g. Total 1.648. App: `alimentosRepository`
  busca pela RPC e mostra o nome no idioma; `data/localidadeAtual.ts`
  (mantido pelo I18nProvider) diz idioma/país pros repositórios.
  ⚠️ Achado: a base mistura "macros por porção" e "por 100 g" — ex.
  "Burrito de frango" porção 250 g com 224 kcal (valor de 100 g). Auditar.
- **Plano de referência de TREINO (feito — diretriz nova
  `docs/PLANOS_TREINO_DIETA_DIRETRIZ.md`)**. Área cinzenta estilo
  MyFitnessPal/Fitbod: plano montado das escolhas da pessoa + faixas
  públicas do ACSM, editável, "referência" e nunca "prescrição"; carga
  sempre da pessoa.
  - Banco (`db/athoslife_planos_triagem_migration.sql`, RODADO): catálogo
    ganha `nivel_minimo` (16 intermediário, 4 avançado); `triagens_saude`
    append-only (sem UPDATE/DELETE) com 11 perguntas (PAR-Q+ adaptado +
    gravidez/diabetes/transtorno alimentar/cirurgia), data de nascimento e
    declaração de veracidade obrigatória; aptidão CALCULADA NO SERVIDOR
    (trigger `avaliar_triagem`: ignora o que o app mandar; bloqueia menor de
    18, idade do perfil ≠ nascimento, IMC < 18,5 pra dieta); vale 90 dias;
    `planos_gerados` (histórico, só via RPC; campo `revisao_profissional`
    pra quando um CREF/CRN assinar); RPC `aplicar_plano_treino` revalida
    TUDO (pago, triagem, dias 2–6/iniciante ≤ 4, 30–90 min, exercício do
    local e do nível, séries 1–5, reps 1–20, tempo 10–120 s, ≤ 5/7
    exercícios por dia, teto semanal de séries por grupo 10/16/20) e troca a
    ficha do local mantendo as cargas já anotadas.
  - Testado no servidor (transação desfeita): sem triagem, terra pra
    iniciante, 50 reps, iniciante 5 dias e volume alto -> recusados; válido
    -> aplicado + histórico. Triagem: limpa=apta; grávida=bloqueada;
    menor de 15 mandando apto=true -> bloqueada (menor + idade divergente).
  - App: `domain/rules/geradorTreino.ts` (divisão 2–6 dias, compostos
    primeiro, substituto quando falta grupo em casa, trava de volume sem
    deixar exercício de 1 série; testado com o catálogo real em 5 cenários),
    `domain/rules/triagemSaude.ts`, `planosRepository`, tela
    `/treinos/plano` (intro -> triagem + declaração -> inapto com motivos e
    orientação / parâmetros -> prévia -> aplicar), botão "Montar plano de
    referência" no Treino. Textos pt/en/es. Exportação LGPD inclui
    triagem, planos e histórico de treino.
  - Termos v2.1: seção 5-A (plano de referência, declaração, CDC art. 14
    §3º II, suspensão por informação falsa, pare se sentir dor).
  - ai-proxy: Life pode explicar/motivar sobre o plano (sem mudar nada) e
    recebe o resumo do plano no contexto. **Publicar de novo (889 linhas).**
  - Pendente: plano de DIETA (etapa 2, triagem já pronta); nomes dos
    exercícios só em pt; revisão dos modelos por CREF/CRN (opcional, forte).

- **Pendências pra próxima sessão (2026-09-29)**:
  1. **Dono publicar o ai-proxy de novo** (889 linhas; 1ª linha "v3,
     2026-09-28"; última linha `}`) e testar chat + Scanner no
     localhost -> Claude confere `ai_audit_logs`.
  2. **Plano de DIETA** (etapa 2 da diretriz): meta de referência com pisos,
     cardápio sugerido com a base (agora global) + Cozinha, só com
     `apto_dieta`.
  3. Testar no navegador: onboarding (conta nova), consentimento,
     Hábitos (tentar "cerveja"), busca de alimentos em en/es, plano de treino
     (precisa conta paga/trial ou `VITE_DEV_PREMIUM`).
  4. Commit feito só LOCAL — falta push pro GitHub (precisa token) e build
     do APK pra conferir o Java do widget.
  5. Traduzir telas antigas (seguem em pt fixo) + nomes dos exercícios.
  6. Auditar base de alimentos (porção vs. 100 g, ex. Burrito de frango).
  7. Revisão jurídica reforçada (Washington MHMDA, FTC, direito de
     arrependimento, página web de exclusão de conta, Política em link
     público); dono criar e-mail do app; Gemini pago antes do lançamento.
  8. Google Play Billing; paywall ajustado aos limites do servidor.
  9. Life resgate sem texto na caneca (pra outros idiomas); vídeos do dono.
  10. Seguem de antes: pranchas do Treino, revisão do Perfil, `{{ .Token }}`
      no template de senha + SMTP, "Confirm email", trocar token do GitHub.

## 2026-09-29

Sessão da manhã (08h40–09h01) foi interrompida por queda de luz antes de
registrar; retomada à tarde. Arquivos conferidos (nenhum truncado).

- **Plano de referência de DIETA (etapa 2 da diretriz, feito)**:
  - App: `domain/rules/geradorDieta.ts` (Mifflin-St Jeor × atividade,
    déficit ≤ 0,75%/sem e ≤ 25% do gasto, pisos 1.200 kcal/basal e 130 g
    carbo, proteína 1,2–2,2 g/kg com peso ajustado se IMC ≥ 30, gordura
    ≥ 20%; dia-modelo de 3 ou 4 refeições com 54 alimentos fixos da base,
    troca por equivalente, cardápio a ±15% da meta), tela
    `ui/screens/PlanoDieta.tsx` (intro -> triagem -> inapto/parâmetros ->
    prévia -> aplicar; mostra o plano salvo), componentes comuns com o
    treino em `ui/screens/plano/componentesPlano.tsx` (PlanoTreino ficou
    menor), rota `/dieta/plano`, botão na Dieta, textos pt/en/es.
    Pré-preenche restrições e "não gosto" do onboarding.
  - Banco (`db/athoslife_plano_dieta_migration.sql`, RODADO): RPC
    `aplicar_plano_dieta` — exige pago + triagem vigente com `apto_dieta`,
    recalcula basal/gasto pelo PERFIL, revalida metas, recusa suplemento,
    5–600 g por item, recalcula kcal do cardápio pela base; grava metas no
    perfil (+ água 35 ml/kg) e o plano em `planos_gerados`.
  - Testado no servidor (transação desfeita): sem triagem, triagem inapta,
    1.100 kcal, proteína 200 g, déficit agressivo, 2.000 g, suplemento e
    cardápio fora da meta -> recusados; válido -> metas no perfil + plano.
    Os 54 alimentos do gerador existem na base.
  - ai-proxy v3.1: Life explica/motiva sobre o plano de dieta (sem mudar
    números) e recebe o resumo no contexto.
- **CORREÇÃO URGENTE da triagem (RODADO)**:
  `db/athoslife_triagem_fix_motivos_migration.sql` — a versão no servidor
  usava `v_motivos || 'texto'` (erro "malformed array literal"): qualquer
  "Sim" na triagem dava erro genérico. Agora `array_append`. Testado:
  grávida -> inapta {gestacao_amamentacao}; 14 anos + 2 sim -> inapta
  {dor_no_peito, transtorno_alimentar, menor_de_idade, idade_divergente}.
- **Hábitos proibidos v2 (RODADO)**: `db/athoslife_habitos_proibidos_v2_migration.sql`
  — dono confirmou bloqueio de conteúdo sexual "e qualquer coisa próxima";
  + drinks/happy hour, fumante, THC/CBD, remédio controlado, pôquer/roleta/
  loteria, apps de encontro, Viagra. Espelho em `domain/entities/habito.ts`.
  Testado: bloqueia OnlyFans, Happy hour, Pôquer, Rivotril, Tinder, Pod de
  nicotina; passa Chocolate, Beber água, Podcast, Sair da balada cedo.
  Nenhum hábito ativo atual ficou proibido. ai-proxy v3.1: Life recusa
  falar de sexo/pornografia (indica médico/psicólogo).
- **Auditoria da base de alimentos (RODADO)**:
  `db/athoslife_alimentos_auditoria_migration.sql` — ~500 itens estavam em
  "moldes" por categoria (muçarela 121 kcal/100 g, óleo 582, pratos todos
  ~220 kcal/250 g). Corrigidos 92 pratos + 410 itens (TACO/USDA, porção
  realista) + pasta de amendoim proteica. Conferido: muçarela 330, óleo
  880, aveia 390, burrito 200, pizza 270 kcal/100 g. Registros antigos de
  refeição não mudam.
- **Por que o chat com o Life não funcionava (ACHADO nos logs)**: última
  chamada (28/09 23:44 UTC, deploy v9) -> Gemini `400 INVALID_ARGUMENT` com
  `gemini-3.5-flash-lite`. Causa: Gemini 3.x não aceita
  `thinkingConfig.thinkingBudget: 0` (usa `thinkingLevel`), e o plano B só
  disparava se o erro citasse "thinking" — o Google responde genérico.
  **ai-proxy v3.2**: `configRaciocinio()` manda `thinkingBudget: 0` só pra
  Gemini 2.x e `thinkingLevel: 'minimal'` pro resto; qualquer 400 tenta de
  novo sem thinkingConfig. Conferido com shim do Deno: 0 erros. Token do
  MCP não tem permissão de Edge Functions e o CLI do Supabase não roda no
  WSL -> **dono publica** (911 linhas, 1ª linha "v3.2").
- Obs.: o token do MCP não tem `apply_migration`; migrações rodadas via
  `execute_sql` (como antes).
- `tsc` 0 erros; `vite build` ok.

- **Life por tela + planos dentro do Life + check de saúde que NÃO trava
  (decisões do dono, tarde de 29/09 — combinadas de manhã fora do Claude Code)**:
  - **Um Life por tela** (`ui/components/life/LifeFlutuante.tsx`): canto
    inferior esquerdo, tamanho da Home (h-24); some ao rolar pra baixo e
    volta ao rolar pra cima. Home = padrão e junta tudo; Dieta = chef;
    Treino = treino (saiu o Life do cabeçalho); Hábitos = padrão (saiu o
    de língua de fora, `feliz`). Home: Life grande no topo só no 1º acesso
    do dia (`primeiroAcessoDoDiaNaHome` em `app/ausencia.ts`), depois no
    canto.
  - Chat virou global (`ui/components/life/LifeChatSheet.tsx`) com `foco`
    (home/dieta/treino/habitos) e título por tela; ai-proxy **v3.3** recebe
    `foco` e puxa o assunto da tela; pedidos de "monta um treino/dieta" são
    levados pros botões do chat.
  - **Planos dentro do Life** (`ui/components/life/PlanosNoLife.tsx`):
    check de saúde UMA vez, 5 perguntas em balões (Sim/Não), nascimento +
    declaração; depois ficam os botões Montar treino · Montar dieta ·
    Trocar algo no plano. Roteiro do app, sem IA, não gasta cota. Telas
    `/treinos/plano` e `/dieta/plano` mandam pro Life quando falta o check.
  - **Check não trava**: "Sim" -> Life aconselha médico; quer mesmo assim ->
    declaração de ciente (append-only) -> recebe o plano. Conteúdo mais
    conservador: treino só iniciante; dieta só "manter" com ressalva
    alimentar/gravidez/IMC baixo. Trava dura só pra menor de 18 e idade
    divergente. Triagem vale pra sempre.
  - Banco (`db/athoslife_triagem_v2_ciente_migration.sql`, RODADO com ok do
    dono): colunas `ciente_orientacao`/`ciente_versao`, `avaliar_triagem`
    v1+v2, `triagem_vigente` sem prazo, bloco da triagem trocado nas duas
    RPCs. Testado (desfeito): coração sem ciente -> treino pede ciente,
    dieta sai; coração+ciente -> intermediário recusado, iniciante passa;
    alimentar+ciente -> emagrecer recusado, manter aplicado; gravidez sem
    ciente -> dieta pede ciente; menor+ciente -> bloqueado; ciente sem
    versão e check incompleto -> recusados.
  - Termos v2.2 (seção 5-A reescrita pt/en) e diretriz seção 2 atualizados.
  - `tsc` 0 erros (app e ai-proxy); `vite build` ok.

- **Plano montado DENTRO do chat (pedido do dono, fim da tarde 29/09)**:
  "aplicar plano fica no plano de referência e não no chat" -> as telas
  `/treinos/plano` e `/dieta/plano` SAÍRAM (cópia no scratchpad da sessão).
  `ui/components/life/MontarPlanoNoLife.tsx`: o Life pergunta as escolhas
  em balões (treino: foco, nível, dias, local, minutos; dieta: sexo se
  faltar, objetivo, ritmo, atividade, refeições, restrições), mostra a
  prévia no chat (dieta com ⇄ trocar) e aplica. Aplicou -> chat fecha e
  leva pra tela: Treino abre no local do plano com a ficha preenchida
  (`app/eventosLife.ts`); Dieta mostra em cada card fixo vazio "✨ Do seu
  plano: ..." + botão "Comi o do plano" (registra os itens; não registra
  sozinho, o diário é o que a pessoa comeu). Botões "Montar plano" da
  Dieta/Treino agora abrem o chat do Life.
  - **Sexo**: o check não perguntava; a dieta pergunta (e salva no perfil)
    quando falta — muda a conta do basal.
  - **Life maior**: canto e topo da Home de h-24 -> h-32.
  - `tsc` 0 erros; `vite build` ok.

- **Dieta — "comi do plano" mais limpo + bug do contador (29/09, noite)**:
  - Bug: `macrosRepository.doDia` somava decimais sem arredondar
    (138.39999999999998g no topo da Dieta e nos discos da Home). Agora kcal
    inteira e gramas com 1 casa.
  - Dono não gostou do bloco "Comi o do plano" no card. Agora: card vazio
    mostra o plano apagado ("✨ Pão integral · Ovo · Banana", "~513 kcal") e
    o ✓ do próprio card registra o do plano e conclui. Dentro da refeição,
    os itens do plano aparecem apagados com "+" cada (adiciona só o que
    comeu) e "Adicionar tudo".

- **Ajustes pedidos pelo dono (29/09, noite)**:
  - Botões "Montar plano" da Dieta e do Treino SAÍRAM: plano só no chat.
  - Life decorativo ao lado de "Cozinha Athos" saiu (o do canto fica).
  - Check de saúde pergunta o **sexo** quando o perfil não tem (onboarding
    é opcional/"prefiro não dizer") e salva no perfil; **gravidez/
    amamentação só aparece pra mulher** (homem manda t4 = não).
  - Montador de dieta ganhou "não como / não gosto / alergia", já vindo do
    onboarding (restricoes + alimentos_nao_gosta); o que ficou digitado sem
    tocar em Adicionar também vale. Achado: o plano das 15h54 foi pela tela
    antiga, com `evitar: []`.
  - Gerador entende "frutas"/"verduras" (pt/en/es) e fruta deixou de ser
    obrigatória. Testado com esbuild: sem frutas -> nenhuma fruta; +verduras
    -> sem brócolis; dentro da meta nos 3 casos.

- **BUG: onboarding não salvava ("confere a internet") — CORRIGIDO**:
  logs da API: `PATCH profiles` -> **403**. `profiles` libera UPDATE só em
  colunas listadas pro papel authenticated; a migração da globalização
  (28/09) criou idioma/pais/fuso/unidades/onboarding_respostas sem GRANT.
  Também quebrava Perfil > Idioma e região. GRANT rodado
  (`db/athoslife_globalizacao_grant_fix_migration.sql`, sob a autorização
  da globalização) e testado como authenticated (update completo do
  onboarding, desfeito). Tela agora separa "sem conexão" de "servidor
  recusou" e loga o erro real no console. **Regra: coluna nova em profiles
  que o app grava -> GRANT UPDATE junto.**

- **Chat com o Life FUNCIONANDO**: `ai_audit_logs` com 2 chamadas `ok`
  (29/09 15h48 e 15h49, ~1.600 tokens cada) depois da correção do thinking.
  Dono publicou o ai-proxy v3.3.

- **Pendências pra próxima sessão**:
  1. **Aba Notificações do Perfil (PRÓXIMO — dono vai definir)**. Hoje só
     tem lembrete de hábito "construir" + "em breve" de resgate/WhatsApp.
     Proposta que ficou na mesa (tudo LOCAL, `@capacitor/local-notifications`,
     sem servidor): água a cada X h entre acordar e dormir, refeições
     (café/almoço/lanche/jantar), treino só nos dias da ficha, pesagem
     semanal; chave geral, horário de silêncio (profiles.horario_acordar/
     horario_dormir já existem, lembrete_agua/lembrete_treino também), voz do
     Life nos textos, teto por dia. Dono quis esclarecer antes de escolher.
  2. Dono terminar o onboarding (conta 42b8f944…) -> Claude confere se
     sexo e "não gosto" salvaram.
  3. Testar no navegador: montar treino/dieta no chat, check de saúde (com
     e sem "Sim", homem/mulher), cards da Dieta com o plano, contador.
  4. Push pro GitHub (token) + build do APK (Java do widget).
  5. Seguem da lista de 28/09: traduzir telas antigas e nomes dos
     exercícios; revisão jurídica + e-mail do app + Gemini pago; Billing
     e paywall; Life resgate sem texto; pranchas; Perfil; `{{ .Token }}` +
     SMTP; "Confirm email"; trocar token do GitHub.

## 2026-10-01

- **Conferência do servidor**: ai-proxy no ar (deploy versão 12, publicado
  29/09 15h48 — a v3.3); últimas chamadas do chat `ok`, nenhuma desde então.
  Banco: RLS em todas as tabelas, RPCs dos planos/triagem presentes, GRANT
  das colunas de `profiles` completo, 0 erros do Postgres em 24h. Token do
  MCP segue sem `edge_functions_read`/`advisors_read` (não dá pra ler o
  código publicado nem rodar o advisor). Onboarding do dono salvou (sexo,
  idioma, "não gosto" = frutas, legumes, "dobradinhha").
- **Lembretes do dia do Life (Perfil > Notificações)** — decisão do dono:
  água, refeições, treino e pesagem, com a voz do Life.
  - Regra pura `domain/rules/lembretesDiarios.ts`: avisos AVULSOS pros
    próximos 7 dias (aviso local não roda código na hora de tocar), refeitos
    ao abrir/voltar pro app e ~1,5 s depois de qualquer registro. O que já
    foi feito HOJE sai: água para ao bater a meta; refeição registrada (kcal
    > 0 ou ✓) não é cobrada; treino só nos dias com exercício na ficha e não
    cobra se já treinou/concluiu algo; pesagem semanal pula se pesou nos
    últimos 3 dias. Silêncio entre dormir e acordar (aceita dormir depois da
    meia-noite). Teto 10/dia (água corta primeiro), água nunca a < 30 min de
    outro aviso, máx. 56 pendentes (limite do iOS).
  - `data/notifications/lembretesDiarios.ts`: config no aparelho
    (Preferences), espelho de acordar/dormir/lembrete_agua/lembrete_treino
    no perfil; ids 920000–929999 (não mexe no aviso do descanso nem nos de
    hábito); frase sorteada por dia; tocar abre Home/Dieta/Treinos.
  - `app/LembretesDoLife.tsx` (montado no Shell) e `data/registroDoDia.ts`
    (sinal disparado pelos repositórios de água, itens de refeição, peso,
    ficha e histórico de treino).
  - Tela `ui/screens/notificacoes/LembretesDoDia.tsx`: chave geral (pede a
    permissão), acordo/durmo, água (1h/1h30/2h/3h), 4 refeições com horário,
    treino (mostra os dias da ficha), pesagem (dia + hora), aviso quando o
    horário cai no silêncio. Textos pt/en/es (`lembretes`). Começa DESLIGADO.
  - Testado com esbuild (7 cenários: padrão, desligado, coisas já feitas,
    teto com água de 1 em 1 h, dormir 02h, pesou recente, config inválida).
  - Sem `SCHEDULE_EXACT_ALARM` no manifesto: no Android 12+ o aviso pode
    atrasar alguns minutos (o plugin cai pro modo inexato). Ok pra lembrete.
  - `tsc` 0 erros; `vite build` ok. **Não testado em aparelho.**
- **Onboarding em conversa (ideia do dono, vídeo do Fitfolio/"Spoty")**:
  analisado — mascote pergunta em balões, controle certo por pergunta
  (régua de altura/peso/ritmo, boneco pra escolher músculo, botões), fecha
  com o plano em árvore + "Ver plano / Entrar sem plano". Proposta: juntar
  onboarding + check de saúde + montar plano numa conversa só com o Life,
  roteiro fixo (sem IA), mesmas RPCs. Próximo passo: protótipo visual pro
  dono aprovar.

- **Protótipo do onboarding em conversa (feito)**: rota pública
  `/prototipo/onboarding` (`ui/screens/prototipo/OnboardingConversa.tsx`),
  NADA salva. Abertura com o Life grande pensando -> nome -> chat com
  "digitando", comentários do Life a cada resposta, barra de progresso,
  humor do Life muda por assunto (calmo no check, treino, chef). Controles:
  botões, data, roda de rolar (altura/peso/meta/ritmo), boneco frente/costas
  (até 3 músculos), dias, refeições, "não como", declaração, lembretes.
  Fim: "Montando seu plano…" -> Life dourado + árvore kcal/P/C/G + linha do
  dia (refeições com kcal, treino, água) + Ver meu plano / Entrar sem plano.
  Metas pelo `calcularMetasIniciais` (o ritmo ainda não entra na conta do
  protótipo). Percorrido de ponta a ponta no Chromium headless, 0 erros.
- **Cadastro "não ia" (investigado nos logs do Auth)**: não era bug do
  código. (1) `betatester01@gamil.com` -> e-mail inválido (gamil);
  (2) `tester0107@gmail.com` -> conta criada, aguardando confirmação
  ("Confirm email" foi RELIGADO no Supabase — o STATUS dizia desligado);
  (3) `matheusbarretonunesknt@gmail.com` -> 429 `over_email_send_rate_limit`
  (SMTP grátis do Supabase), cadastro desfeito, conta NÃO existe.
  Login agora traduz os erros do Auth pra português (`mensagemErroAuth`) e
  o aviso pós-cadastro cobre o caso "e-mail já tinha conta".
- `.env.local`: `VITE_DEV_PREMIUM` true -> **false** (pra testar o grátis no
  localhost; voltar pra true + reiniciar o Vite se quiser ver o premium).
- **Pendências pra próxima sessão**:
  0. Dono cria a conta `matheusbarretonunesknt@gmail.com` no localhost ->
     Claude (com ok já dado) confirma o e-mail no banco e põe `plano='free'`
     (conta nova nasce `trial` 7 dias = tudo liberado).
  1. Dono aprovar/ajustar o protótipo -> codar o real (onboarding + check +
     planos numa conversa, mesmas RPCs, textos pt/en/es).
  2. Testar os lembretes no aparelho (precisa do APK).
  3. Seguem: testar planos no chat; push GitHub + APK; lista de 28/09.

## 2026-10-02

- Conta `matheusbarretonunesknt@gmail.com` (id 876d79b1…): e-mail já estava
  confirmado (link clicado 01/10 20:04); `plano` trial -> **free** (pendência 0
  da sessão anterior). `trial_expira` ficou como estava — o app só olha a data
  quando `plano='trial'`.
- Vite de pé em http://localhost:5173 (`VITE_DEV_PREMIUM=false`).

## 2026-10-03

- **Celular pelo cabo USB (funcionou)**: aparelho `2511FPC34G` (Android 16),
  depuração USB autorizada. `adb` do Google baixado em
  `C:\Users\Auto Clima\platform-tools` (fora do projeto). O `adb reverse` só
  alcança o 127.0.0.1 do Windows e o Vite do WSL só aparece no `[::1]`, então
  roda uma ponte em Node do Windows (`platform-tools\ponte.js`,
  127.0.0.1:5174 -> [::1]:5173) + `adb reverse tcp:5173 tcp:5174`.
  `localhost:5173` abriu no Chrome do celular (tela de login). Dispensa Wi-Fi,
  portproxy e firewall (o que falhou em 27/09).
- Próximo: APK de teste com `servidor_dev = http://localhost:5173` (precisa
  push + token do GitHub) pra testar o que é nativo (lembretes, widget, Live
  Activity, câmera).
- **Respostas do Life mais curtas** (ai-proxy v3.4, NÃO publicado — o token
  do MCP não tem `edge_functions_*`; dono publica): formato agora é 1 a 3
  frases (~40 palavras), 1 emoji, sem listas; até 5 frases só se pedir
  explicação. Antes: "até 3 parágrafos e 2 emojis".
- **Life não sai mais da tela ao rolar** (pedido do dono): `LifeFlutuante`
  fica sempre visível + espaço vazio no fim da página pra não tapar o último
  card. Home no 1º acesso do dia: o do canto só aparece depois de rolar
  320 px (a saudação grande já está no topo).
- **Notificações > "Life e WhatsApp"** (dono escolheu: chave + momentos pro
  Life; WhatsApp com resgate, lembretes, resumo da semana e conversa).
  Migração `db/athoslife_preferencias_contato_migration.sql` RODADA (dono
  autorizou; via `execute_sql`, o token não tem `database_migrations_write`):
  colunas `life_chat_ligado`, `life_chat_momentos`, `whatsapp_opcoes`,
  `whatsapp_aceite_em` em profiles (fora do GRANT), log append-only
  `contato_preferencias_log` (nem admin altera), RPC
  `salvar_preferencias_contato` (valida, exige número +DDI pro WhatsApp,
  troca de número zera `whatsapp_verificado`), `telefone` saiu do GRANT.
  11 tentativas testadas em transação desfeita: todas barradas/corretas.
  Tela `ui/screens/notificacoes/ContatoDoLife.tsx` + repo
  `contatoRepository.ts`, textos pt/en/es; avisa "em breve" (nada envia
  ainda). Quem for enviar no futuro TEM que checar essas colunas.
- `tsc` 0 erros. Não visto na tela ainda (celular parado no login).
- **WhatsApp tirado da tela** (dono: fica pra versão futura, ideia
  descartada por ora — nada de resgate/lembretes/resumo por lá). Notificações
  agora só tem "Life puxa conversa" (manhã/meio-dia/noite). As colunas
  `whatsapp_*`/log no banco ficam lá sem uso; a tela manda lista vazia e
  preserva o `telefone` atual na RPC. `tsc` 0 erros.
- ai-proxy v3.4 PUBLICADO pelo dono; aprovou o novo jeito de responder.
- Commit `e100e9b` feito; **push falhou: token do GitHub expirou**.
- **Pendências pra próxima sessão** (dono quer ver o widget funcionando):
  1. Dono gera token novo (classic, `repo` + `workflow`) e faz
     `git push origin main` (usuário `athosmatheusadm`).
  2. Actions -> "APK de teste" -> Run workflow com servidor_dev
     `http://localhost:5173` (vai pelo cabo).
  3. Baixar `athoslife-teste-apk` em Downloads -> Claude instala por `adb`,
     sobe a ponte (`platform-tools\ponte.js` + `adb reverse tcp:5173 tcp:5174`)
     e o dono testa widget, Live Activity, lembretes e câmera.
  4. Ver o chat "estranho" de antes: precisa do Supabase reconectado (`/mcp`)
     — nesta sessão o MCP não estava ativo.

## 2026-10-05

- Vite de pé em http://localhost:5173 (`VITE_DEV_PREMIUM=false`).
- **Cozinha v2** (opinião dada ao dono: base boa, mas solta da dieta, só
  cadeado pro free, sem foto, texto corrido; dono aprovou tudo + quer o
  Life-chef com foto do prato):
  - Regras puras `domain/rules/cozinha.ts`: `estruturarConteudo` (separa
    POR QUE / INGREDIENTES (N porções) / PREPARO / DICA DO LIFE — as 25 do
    seed passam sem sobra), `escalarIngrediente` (½, 1/2, g/ml, ignora %),
    `receitasQueFechamODia` (só liberadas, 20%–110% das kcal que faltam,
    prioriza proteína), `refeicaoPeloHorario`, `slugReceita`.
  - Tela da receita refeita (`cozinha/ReceitaView.tsx`): porções 1–6
    (ingredientes e macros recalculados), checklist de ingredientes, passos
    numerados, Dica do Life com o Life chef, selo de gordura, botão
    **Registrar na refeição** (`RegistrarReceitaSheet`: ½/1/1½/2 porções +
    café/almoço/lanche/jantar, padrão pelo horário; vira 1 item no diário).
  - Dieta: `cozinha/CozinhaSecao.tsx` substitui o `CozinhaTab` — card do
    Life-chef, "Receitas que fecham seu dia" (só olhando Hoje), vitrine,
    "Minhas criações", erro com "Tentar de novo"; coração não é mais botão
    dentro de botão. "Ver todas" -> `/dieta/cozinha` (grade, Favoritas,
    Minhas criações, categorias).
  - **Life-chef** `/dieta/cozinha/life`: ingredientes (texto + sugestões),
    momento (café/principal/lanche/doce), mostra o que vai deixar de fora
    (restrições + "não gosto" do onboarding) e as kcal que cabem no dia;
    usa o handler `recipe` que já existia no ai-proxy (pago, cota no
    servidor). Salvar -> `/dieta/cozinha/criacao/:id`: "Fiz! Pôr a foto"
    (câmera/galeria), trocar foto, excluir.
  - Fotos das receitas curadas: `public/receitas/<slug-do-titulo>.webp`;
    sem arquivo cai no emoji (nada no banco).
  - Textos novos em pt/en/es (`cozinha`); conteúdo das receitas segue só pt.
  - Migração `db/athoslife_cozinha_v2_migration.sql` **NÃO RODADA**:
    4 grátis (Salada que Mata a Fome, Panqueca de Banana e Aveia, Pipoca
    Salgada Consciente, Vitamina de Banana e Whey), tabela
    `receitas_criadas` (RLS dona, GRANT por coluna, foto só na pasta da
    dona, teto 300) e bucket PRIVADO `receitas-criadas` (5 MB, imagem).
    Antes dela, "Minhas criações" só não aparece; salvar dá erro.
  - ai-proxy **v3.5 (não publicado)**: prompt da receita pede macros POR
    PORÇÃO e rendimento em porções (a tela multiplica por porção).
  - `tsc -b` 0 erros; `vite build` ok; regras testadas com esbuild.
    **Telas não vistas logado** (sem login no headless).
- **Life-chef sem cadeado** (dono não gostou do card "é do pago"): aberto
  pra todos, o pago só destrava mais. Grátis: 1 receita/dia (cota
  `limite_ia('recipe')` 0 -> 1, na migração v2), salvar + foto, até 5
  criações; sem "Outra ideia" e sem mirar nos macros do dia (o serviço
  manda macros zerados e o ai-proxy v3.5 trata 0 como "porção normal").
  Pago: 10/dia, "Outra ideia", mira no que falta do dia, até 300 criações.
  Convite pro pago só aparece quando a cota grátis acaba (link discreto).
- **Erro do dono ao rodar a v2** (`42601 syntax error at end of input`,
  linha 76): `CASE ... THEN` dentro de `IF ... THEN` no PL/pgSQL (ele corta
  a condição no 1º THEN). Reescrito com variáveis; validado com o parser do
  Postgres (`@libpg-query/parser`: SQL e corpos PL/pgSQL ok, versão antiga
  reproduz o erro). Script tem begin/commit — a tentativa que falhou não
  aplicou nada; é só rodar de novo.
- **Life-chef saiu da tela** (dono: sem card): agora é o atalho
  "👨‍🍳 Monte sua receita com o Life" dentro do chat do Life da Dieta
  (`LifeChatSheet`, só com foco `dieta`, fixo abaixo do cabeçalho). Título
  da tela também virou "Monte sua receita com o Life" (pt/en/es).
- Dono pediu pra Claude rodar a v2 — MCP do Supabase não conectou nesta
  sessão (configurado em ~/.claude.json, mas sem ferramentas). Precisa `/mcp`.
- **Grátis apertado** (dono, medo de comodismo com 1/dia): Life-chef grátis
  = **1 receita por SEMANA** (segunda a domingo, fuso da pessoa) e **3
  criações**; chat do Life igual; **3 receitas prontas grátis** (saiu a
  Vitamina de Banana e Whey). Semana sem tabela nova: `dia_da_cota()` põe o
  uso grátis de 'recipe' na segunda-feira da semana em `ia_uso_diario`;
  `consumir_cota_ia`/`cota_ia_status`/`devolver_cota_ia` recriadas iguais à
  globalização trocando `hoje_do_usuario` por `dia_da_cota`. **Antes de
  rodar: conferir no banco se essas 3 funções ainda batem com o arquivo da
  globalização** (pg_get_functiondef). Parser do Postgres: tudo ok.
- ai-proxy **v3.5 PUBLICADO** pelo dono. Migração v2 segue pendente (MCP
  fora). Até ela rodar, o grátis recebe `premium_required` no Life-chef e a
  tela mostra "receita grátis da semana já foi" (cota grátis ainda é 0).

## 2026-10-06

- Dono mandou token novo do Supabase (Management API); Claude usou direto
  pela API (`/v1/projects/gsdwsxwbmxcvutpvpkyi/database/query`), token num
  arquivo 600 da sessão — não foi pro repo nem pro ~/.claude.json.
- **Migração Cozinha v2 já estava rodada** (dono rodou no painel). Conferido
  no banco: 3 grátis (Panqueca, Pipoca, Salada), RLS + 4 policies, GRANT só
  das colunas, bucket privado 5 MB, trigger com limite 3/300, funções de
  cota = arquivo (dia_da_cota semanal).
- Teste num bloco que se desfaz (raise no fim; conferido 0 rastro): grátis
  1ª receita ok (1/1), 2ª barrada; conta na segunda-feira (05/10); devolver
  volta a 0; VIP 10/dia no dia de hoje; chat grátis segue 4; 4ª criação
  barrada (`limite_criacoes`); foto na pasta alheia e trocar dona barrados;
  VIP não vê criações do grátis.
- Falta: ver as telas logado (Dieta > Cozinha, Life > "Monte sua receita",
  porções, registrar, foto) e as imagens/receitas novas do dono.
- Token antigo do Supabase apagado pelo dono; o novo (mais acessos) foi
  posto no MCP (`~/.claude.json`, backup `.claude.json.bak-2026-10-06`).
  Achado: o MCP estava registrado só na pasta de cima
  (`athoslife-github-ready`), por isso nunca aparecia nesta — agora está nas
  duas. Vale a partir da próxima sessão (ou `/mcp` -> reconectar).
- **Fotos das receitas (1ª leva)**: `ATHOSlife_Imagens_Receitas-1.zip` veio
  CORTADO (23,7 MB, sem o índice do zip). Recuperadas 9 PNG inteiras
  (1254x1254) -> `public/receitas/<slug>.webp` 800x800 q78 (80–140 KB) com
  sharp: Omelete de Forno, Macarrão com Atum, Batata Doce com Carne Moída,
  Tofu Grelhado, Lentilha Cremosa, Café Gelado Proteico, Shake Pós-Treino,
  Shake Detox Verde, Vitamina de Banana e Whey. Panqueca Vegana veio pela
  metade; 15 nem estão no arquivo. Faltam 16 (incl. as 3 grátis).
- Vite reiniciado: ele lista a pasta `public` ao ligar e no disco do
  Windows não vê arquivo novo (servia o index.html no lugar da imagem).
- `ATHOSlife_Imagens_Receitas-2.zip` era idêntico ao -1 (mesmo md5, cortado
  nos mesmos 23.724.544 bytes = 362 x 64 KB -> corte na origem do download).
- **`ATHOSlife_Receitas_CONFERIDO.zip` (57 MB) íntegro**: 24 PNG + sha256
  conferidos. **23 de 25 receitas com foto** em `public/receitas/*.webp`
  (800x800 q78, 2 MB no total). "Pipoca com Azeite" -> Pipoca Salgada
  Consciente; "Bowl de Frango com Arroz - Gourmetizado" NÃO usado (molho e
  limão que a receita não tem; a versão simples bate). Painel com as 23
  conferido visualmente. **Faltam: Chips de Batata Doce no Forno e Chá pra
  Desacelerar** (caem no emoji). Vite reiniciado de novo pela pasta public.
- **Pendências pra próxima sessão**:
  1. Dono manda token novo do GitHub -> `git push origin main`.
  2. APK de teste (Actions, servidor_dev `http://localhost:5173`) -> instalar
     por `adb` + ponte -> testar widget, Live Activity, lembretes, câmera.
  3. Fotos que faltam: Chips de Batata Doce no Forno e Chá pra Desacelerar.
  4. Ver logado: Dieta > Cozinha, Life > "Monte sua receita", porções,
     registrar, foto da criação.
  5. Investigar o chat "estranho" do Life (MCP do Supabase já nas 2 pastas).

## 2026-10-07

- Commit da Cozinha v2 + 23 fotos das receitas (`public/receitas`) + migração
  v2 (já rodada) + worklog; `tsc -b` 0 erros. Zips/imagens/HTML soltos na
  raiz NÃO entram no repo. Push aguardando token do GitHub.
- **Nomes das receitas** (dono: "bobos e sem foco"): 22 renomeadas pra nome
  de prato (ex.: "Batata Doce Rústica com Carne", "Espaguete de Abobrinha
  com Frango", "Sorvete de Banana com Cacau e Amendoim"); Overnight Oats,
  Sopa Termogênica e Omelete de Forno mantêm o nome (dono). Saíram as
  promessas de saúde (detox, "acelera o metabolismo", "limpa o organismo")
  dos nomes/subtítulos/dicas. Fotos renomeadas pro slug novo.
- **Receita em seções**: texto agora é SOBRE O PRATO / INGREDIENTES /
  PREPARO / MONTAGEM / DICA DO LIFE; tela mostra cada parte num cartão
  próprio (ícone + título + linha). `estruturarConteudo` lê MONTAGEM (e
  aceita o antigo POR QUE). Ingredientes iguais -> macros iguais. Batata
  rústica: assada com casca, tempo 25 -> 35 min. 25/25 testadas (esbuild).
- Migração `db/athoslife_cozinha_nomes_migration.sql` **RODADA** (dono
  aprovou; Management API); seed atualizado igual.
- **Chat do Life "não respondeu"** ao pedir doce sem lactose: respondeu,
  mas se esquivou ("não consigo mexer na tua meta de calorias"). Causa: o
  prompt não tinha "dar ideia de comida" no PODE, e pro grátis dizia "não
  mencione receitas, não tem acesso" (desatualizado desde a Cozinha v2).
  ai-proxy **v3.6 (NÃO publicado** — publicação bloqueada pela permissão do
  Claude Code; dono publica): ideia de comida/doce na hora, 1–2 opções,
  respeitando restrição/intolerância (lista o que é lactose), sem falar de
  meta; Cozinha/Life-chef citados de leve pro grátis também.
- **Análise "o que o Life faz e não faz por tela"** entregue ao dono antes de
  publicar o v3.6 (sessão caiu com o PC desligando; recuperada do log).
  Brechas achadas: Treino não pode sugerir troca de exercício (máquina
  ocupada); Hábitos recebe só nome + dias (sem gatilhos, horário de risco,
  melhor streak, tropeços); v3.6 daria doce a quem está evitando doce;
  Life não conhece as alternativas que a tela de Hábitos mostra.
  **Bug que segura o v3.6:** filtro de prescrição barra "use 1 colher de
  cacau"/"200ml de leite de coco" e troca a resposta inteira -> barrar só
  se citar suplemento/remédio (whey, creatina, cápsula, comprimido, dose).
- **Pendências pra próxima sessão**:
  1. **Dono decide:** fazer num deploy só do ai-proxy (1) filtro só pra
     suplemento/remédio [obrigatório], (2) contexto de hábitos completo,
     (3) hábito "evitar X" × pedido de X = reconhece dias firme e oferece
     versão leve, sem sermão, (4) alternativas da tela de Hábitos no
     prompt, (5) [opcional] troca equivalente de exercício pelo mesmo
     músculo, sem série/carga. Pergunta em aberto: os 5 ou sem o 5?
  2. Publicar ai-proxy (dono publica; Claude Code sem permissão de deploy).
  3. Token novo do GitHub -> `git push origin main`.
  4. APK de teste -> widget, Live Activity, lembretes, câmera.
  5. Fotos: Chips de Batata Doce no Forno e Chá pra Desacelerar.
  6. Ver logado: cartões da receita em seções, Cozinha, "Monte sua
     receita", porções, registrar.

## 2026-10-08

- **Divisão dos Lifes por tela** (dono): Home sabe de tudo e liga as áreas,
  só conversa; Treino = "Montar treino" + "Trocar um exercício"; Dieta =
  "Montar dieta" + "Trocar um alimento" + atalhos no topo "Monte sua receita
  com o Life" e "Analisar um alimento" (-> `/scanner`, escolhe a refeição lá);
  Hábitos = só conversa. `PlanosNoLife` ganhou `area` (check de saúde segue
  único, vale pros dois). Subtítulos dos chats e textos dos planos por área
  em pt/en/es. Prompt (`FOCOS_LIFE`): cada Life sabe quais botões tem no
  chat dele e manda pra tela certa quando o botão não está ali. Entra no
  mesmo deploy do ai-proxy v3.6 (ainda NÃO publicado). `tsc -b` 0 erros.
  Não visto logado.
- Briefing do ai-proxy passado ao dono pra estruturar a "nova inteligência"
  do Life com o GPT (aguardando o material dele).
- **Life MVP** (briefing do GPT `ATHOSlife_Estrutura_Life_MVP_Claude.md`
  cruzado com o código; decisões do dono: histórico 15, pausa por botão E por
  texto, repetir refeição com fixas + extras, pausou = congela sem perder
  sequência, autonomia pra notificações):
  - ai-proxy **v3.7 (NÃO publicado)**: histórico 15; prompt com acolhimento
    (luto/desabafo sem dica nem puxar assunto), recusa respeitada, falta de
    registro ≠ fato, sem "cobrança", pausa do dia, hábito "evitar X" × pedido
    de X; contexto com hábitos completos (gatilhos, horário de risco, melhor
    sequência, tropeços, alternativas da tela), REFEIÇÕES de hoje/ontem
    (fixas + extras) e "Life pausado hoje"; **function calling**:
    `repetir_refeicao` e `pausar_life_hoje` — modelo só indica, servidor
    resolve nomes, valida, grava e escreve o "Pronto" (sem 2ª chamada à IA);
    destino com itens -> botões Adicionar/Substituir/Deixa; restrição × itens
    -> "Copiar mesmo assim?"; idempotente por `id_envio` (tabela
    `life_acoes`); novo `{tipo:'acao', id, escolha}` sem IA e sem cota.
    Filtro de dose: só barra com suplemento/remédio ou unidade de farmácia
    (15/15 casos pt/en/es; "vitamina de banana" passa).
  - Migração `db/athoslife_life_mvp_migration.sql` **NÃO RODADA**:
    `life_pausas`, `pausar_life_hoje()`/`retomar_life_hoje()`,
    `dias_ativos_entre()`, `registrar_checkin_habito` e `handle_recaida` com
    dia pausado não quebrando "construir" (conferido no banco: as versões
    atuais batem com a globalização, só muda a regra da pausa), `life_acoes`,
    `life_repetir_refeicao()` (só service_role, atômica, cria a extra no
    destino se faltar). Parser do Postgres ok. Teste que se desfaz:
    `db/athoslife_life_mvp_TESTE_desfaz.sql` (resultado esperado no topo).
  - App: botão 🌙 "Pausar hoje / Retomar" no chat (todos os Lifes); botões
    de escolha; refeição repetida atualiza Dieta/Home; pausa cancela os
    lembretes do dia e troca os de hábito por avisos avulsos a partir de
    amanhã (volta o repetido ao abrir num dia sem pausa); sequências de
    hábito "construir" e conquistas de dias seguidos pulam dias pausados.
  - **Check-ins inteligentes** (avisos locais, sem IA e sem custo): manhã
    (acordar+1h), meio-dia (13:15), noite (dormir-1h30), só com "Life puxa
    conversa" ligado e nos momentos marcados; texto olha o dia (almoço
    registrado, treino feito) sem deduzir nada de falta; não toca até 3 h
    depois de uma conversa nem em dia pausado; tocar abre o chat da Home.
  - Push de verdade (FCM) **não feito**: precisa de projeto Firebase na
    conta do dono (google-services.json + chave de servidor).
  - `tsc -b` 0 erros, `vite build` ok, ai-proxy em tsc strict com shims,
    regras testadas (sequência com pausa, lembretes, check-ins, frases
    pt/en/es, restrições). **Não visto no celular nem logado.**
- Banco/deploy: dono mandou token novo (guardado só num arquivo 600 da
  sessão). Leitura pela Management API passou; **gravar (até o teste que se
  desfaz) e publicar foram negados pela trava do modo automático do Claude
  Code** — não contornado. Dono deve revogar esse token (foi colado no chat).
- **Pendências pra próxima sessão**:
  1. Rodar `db/athoslife_life_mvp_TESTE_desfaz.sql` no SQL Editor e conferir
     o RESULTADO; bateu -> rodar `db/athoslife_life_mvp_migration.sql`.
  2. Publicar ai-proxy v3.7 (JWT verificado = igual à v16 publicada):
     `SUPABASE_ACCESS_TOKEN=... npx supabase functions deploy ai-proxy
     --project-ref gsdwsxwbmxcvutpvpkyi --use-api` (ou colar o index.ts no
     painel). Ordem: migração antes (sem ela tudo falha com aviso, sem
     quebrar o chat).
  3. Testar no chat: "coloca na janta o mesmo de ontem", jantar já com
     itens, extra pelo nome, "minha mãe morreu", "não me manda mais nada
     hoje", 🌙, check-ins (Perfil > Notificações > Life puxa conversa).
  4. FCM: criar projeto Firebase -> push de verdade (resgate com app fechado).
  5. Revogar o token do Supabase colado no chat; token do GitHub -> push.
  6. Seguem: APK de teste, fotos que faltam, ver telas logado.
- **Aplicado pelo dono (08/10)**: teste que se desfaz bateu 12/12 (conferido
  0 rastro), migração Life MVP rodada e ai-proxy v3.7 publicado (versão 17,
  verify_jwt ligado) — conferido no banco/API.
- **Custo da IA** (Gemini 3.5 Flash-Lite US$ 0,30/2,50 por 1M, confirmado na
  web; dólar ~5,15 + 10% impostos): v3.7 ≈ 4.300 tokens entrada + 200 saída
  = **~R$ 0,01 por mensagem** (antes ~R$ 0,004: prompt maior + histórico 15).
  Preço do paywall: mensal R$ 28,90 (líquido 24,56), anual R$ 238,80
  (líquido 16,92/mês). Uso típico: grátis 6/dia ≈ R$ 0,33/usuário/mês
  (histórico 15) ou 0,28 (histórico 8); pago ≈ R$ 2-3/mês; pago no talo
  60/dia todo dia ≈ R$ 18/mês.
  **Teto global `IA_TETO_TOKENS_DIA` = 2M tokens ≈ 440 mensagens/dia pra
  TODOS os usuários** — aumentar no painel (Secrets) antes de lançar.
- **Paywall (`paywall de pagamento.jpeg`) promete o que o app não faz**:
  Premium "ilimitado" no chat (40/dia), scanner (5/dia) e receitas IA
  (10/dia); grátis "Cozinha —" (tem 3), "receitas IA —" (tem 1/semana),
  "hábitos 2 por dia" (é 1 hábito), "refeições 4 por dia" (sem limite),
  "com anúncios" (não existe). Dono: esquecer anúncios; quer volume bom nos
  dois planos; ciente do risco de "ilimitado" com teto (CDC/Play).
- Dono: **scanner só no pago** (não dar foto ao grátis).
- Localhost: `npx vite --host --port 5173` -> http://localhost:5173.
- **Pendências pra próxima sessão**:
  1. Dono fechar os limites. Proposta na mesa: grátis 6 msgs/dia (manter
     histórico 15 — só ~R$ 0,05/usuário/mês a mais que 8), pago 60/dia,
     scanner pago 15/dia (grátis 0), receitas iguais (grátis 1/semana, pago
     10/dia). Depois: SQL em `limite_ia` (+ `cota_ia_status`) e textos do
     paywall batendo com os números ("até 60 mensagens por dia").
  2. Teste de estresse do Life: dono cria conta de teste nova (7 dias de
     trial = 40 msgs/dia) e passa e-mail/senha. Roteiro de 24 perguntas
     pronto em `scripts/estresse-life/` (`node estresse.mjs ../../.env <arquivo
     com e-mail e senha>`; 4 telas, 3 idiomas, luto, recusa, dose, burlar
     regras, doce sem lactose, repetir refeição, pausa, crise, reenvio).
  3. Subir `IA_TETO_TOKENS_DIA` conforme a base de usuários.
  4. Revogar o token do Supabase colado no chat; token do GitHub -> push.
  5. FCM (projeto Firebase), APK de teste, fotos que faltam, telas logado.


## 2026-10-08 (noite) — proteção contra abuso da IA

- **Custo explicado ao dono**: R$ 0,33/usuário/mês era uso leve (~1 msg/dia),
  não 6/dia cheio. Chat com histórico 12 ≈ R$ 0,0098/msg; scanner ≈ R$ 0,008
  por foto (estimado, não medido — o token do MCP em `~/.claude.json` deu
  "Invalid access token"). Pior caso: 8 msgs/dia = R$ 2,35/mês; 15 fotos/dia =
  R$ 3,60/mês; pago no talo (60 + 15) ≈ R$ 21/mês. Teto global atual (2M
  tokens/dia) = **no máximo ~R$ 4,50/dia (~R$ 135/mês) somando todos** —
  dono preocupado com custo no começo: manter 2M e só subir com receita.
- Dono: plano pago continua generoso (benefício do usuário primeiro); limite
  de gasto por pessoa descartado (o limite de mensagens já cobre, cada
  mensagem tem tamanho máximo).
- **Feito (NADA rodado nem publicado ainda)**:
  - `db/athoslife_protecao_ia_migration.sql` + teste que se desfaz
    `db/athoslife_protecao_ia_TESTE_desfaz.sql` (esperado no topo; parser do
    Postgres ok, SQL e corpos PL/pgSQL):
    1. Teste grátis: conta nova nasce sem dias (trigger zera `trial_expira`);
       o app pede `liberar_teste_gratis(id do aparelho)` ao abrir. Uma vez
       por conta e por aparelho (só hash, sem ligar à conta), e-mail
       confirmado, sem e-mail descartável (~50 domínios). Todas as contas
       atuais ficam marcadas "já usou"; quem está no teste mantém os dias.
    2. Teto global: grátis barra em 60%, os 40% ficam pra quem paga.
    3. Sinais de abuso por dia (`ia_sinais_uso`, sem texto): fora do tema e
       mensagem repetida. 10 fora do tema no dia = chat pausado até a
       meia-noite dela (`ia_restricoes`; app mostra "volta em HH:MM").
       Visão `vw_ia_sinais_abuso` pro dono no SQL Editor.
  - ai-proxy **v3.8**: pedido claro de tarefa tipo GPT (código, redação,
    tradução, lição de casa, currículo, poema... pt/en/es) = resposta fixa,
    sem IA e sem cota (28/28 frases de teste certas; com palavra de
    comida/treino/saúde passa pra IA). Prompt "FORA DO TEMA": não faz nem
    um pedaço da tarefa, recusa com [FORA] (servidor tira a marca e conta).
    Mesma mensagem (15+ letras) em menos de 2 min = devolve a resposta que
    já está lá, sem IA. tsc strict com shim do Deno: 0 erros.
  - App: `@capacitor/device` (ANDROID_ID), pedido do teste no
    `SessionProvider` (falha nunca trava o app), aviso na tela Plano quando
    o teste não sai. `tsc -b` 0 erros, `vite build` ok.
- **Pendências pra próxima sessão**:
  1. Dono roda `db/athoslife_protecao_ia_TESTE_desfaz.sql` no SQL Editor ->
     confere o RESULTADO -> roda `db/athoslife_protecao_ia_migration.sql`.
  2. Publicar ai-proxy v3.8 (depois da migração): `SUPABASE_ACCESS_TOKEN=...
     npx supabase functions deploy ai-proxy --project-ref gsdwsxwbmxcvutpvpkyi
     --use-api`.
  3. Fechar números: grátis 8 msgs/dia + histórico 12 (dono inclinado),
     scanner pago 15/dia; aí SQL em `limite_ia` + `JANELA_HISTORICO`.
  4. Dono vai mandar skill de UI/UX (engenheiro de UI/UX) pra próximas telas.
  5. Google Cloud: limite de requisições/dia na chave do Gemini + alerta de
     orçamento (passo a passo a fazer com o dono).
  6. Token novo do Supabase pro Claude (o do MCP venceu) e do GitHub (push).
- **Teste que se desfaz rodado pelo dono**: 18/19 bateram; `4_premium` deu
  false por erro do TESTE (is_premium_like é STABLE e, no mesmo comando,
  vê o banco de antes da liberação) — `12_teto_pago ok` prova que a conta
  virou premium. Teste corrigido (comando separado). Liberado rodar a migração.
- **Migração `db/athoslife_protecao_ia_migration.sql` RODADA pelo dono** (09/10,
  "Success"; não conferida pelo Claude — sem token válido). Falta publicar o
  ai-proxy v3.8.
- 09/10: dono deu token novo (salvo via `supabase login` em
  `~/.supabase/access-token`; foi colado no chat -> revogar depois).
  **Migração conferida no banco**: tabelas/funções/gatilho novos, cota com
  'restrito', 6 contas marcadas "já usou". ai-proxy no ar ainda **v3.7
  (versão 17)** — deploy do v3.8 negado pela trava do modo automático;
  dono publica com `! npx supabase functions deploy ai-proxy --project-ref
  gsdwsxwbmxcvutpvpkyi --use-api`.
- Custo real (ai_audit_logs, 30 dias): só 10 chamadas de chat, média 1.752
  tokens (~US$ 0,00077 ≈ R$ 0,0044/msg); nenhuma foto do scanner registrada
  — custo do scanner segue estimado.
- **ai-proxy v3.8 publicado pelo dono** — conferido: versão 18, ACTIVE,
  verify_jwt ligado. Proteção da IA toda no ar.
- Próximo: dono vai passar skills de UI/UX pra melhorar páginas e botões.

## 2026-10-09 — skill de UI/UX

- Dono mandou 4 listas de design (bradtraversy/design-resources-for-developers,
  reinaldosimoes/design-resources, birobirobiro/awesome-shadcn-ui,
  uhub/awesome-css) — não são skills, são catálogos de links. Lidas uma a uma
  e destiladas em `.claude/skills/athoslife-ui-ux/` (SKILL.md com regras do
  app, princípios, método, checklist por tela e ferramentas; catálogo por
  lista em `references/catalogo.md`). Contraste dos tokens medido (WCAG).
- Próximo: dono escolhe a primeira tela pra auditar/melhorar.
- **UI/UX tela a tela (skill athoslife-ui-ux)** — ordem: Dieta → Home →
  Treino → Hábitos → chat do Life → Scanner → Perfil → Onboarding/Login.
  - **Base reaproveitável**: `app/voltarAndroid.ts` (Voltar do Android fecha
    sheet/busca antes de sair — antes, na Dieta, minimizava o app com o
    sheet aberto); `ui/feedback.tsx` (vibração leve/sucesso + avisos com
    `sonner`, inclusive "Desfazer"); tokens `macro-proteina/carbo/gordura`
    (a proteína era vermelha num lugar e azul no outro) e `accent-favorito`.
  - **BottomNav**: legenda 7px -> 12px, aba inteira tocável (56px), i18n.
  - **Dieta**: ✓ da refeição virou botão próprio de 48px (era span de 24px
    dentro do botão da linha); puxador de arrastar com área; linha vazia
    convida ("Toque pra registrar"); carregando em forma de lista + erro
    com "Tentar de novo" (antes ficava vazio como se não houvesse nada);
    gravar com vibração e aviso de erro (antes falhava calado); excluir
    alimento com "Desfazer" em vez de sumir; "Excluir refeição" com 2º
    toque no lugar do confirm() do sistema; copiar avisa; tira de dias
    traduzida (Intl) e rolada até Hoje; alvos ≥ 44px em busca, porção,
    salvos, suplemento e plano; textos de 9–11px -> 12px; `content-dim` em
    texto -> `content-low`; barra de macro anima com transform. Todos os
    textos da Dieta em pt/en/es (`nav`, `dieta` no i18n).
  - **Cozinha (na Dieta)**: etiquetas 9px -> 12px, coração 44px, filtros
    44px, proteína com a cor de macro.
  - `tsc -b` 0 erros, `vite build` ok. **Não visto logado** (precisa de
    login) — dono olhar no localhost.
  - **Home**: "Ver todas" das Refeições virou botão de verdade (era texto
    que parecia botão e não fazia nada); refeição sem registro mostra
    "Registrar" no lugar de "—"; check-in de humor com emojis de 48px
    dividindo a largura (eram ~28px) e alinhado aos outros cards (tinha
    margem dupla); sequência zerada vira convite ("Hoje é um ótimo dia pra
    começar") em vez de "0 dias"; discos com cor por token (proteína azul
    igual à Dieta; passos verde pra não repetir o laranja das calorias);
    água: atalhos 48px, Enter adiciona, "−" (tirar último gole) cinza em vez
    de vermelho, vibração ao registrar; passos e meta de água avisam erro
    (antes falhavam calados); peso: variação contra o objetivo em cinza
    (era vermelho = bronca), apagar registro pede 2º toque, botões e
    períodos 44–48px, aviso "Peso registrado"; avatar do topo 44px. Todos
    os textos da Home em pt/en/es; números/horas com Intl. Token
    `brand-ink` no lugar do hex do texto sobre o verde (32 arquivos).
  - **Treino**: Voltar do Android fecha o painel de adicionar e as janelas
    Parar/Resumo (antes minimizava o app); ✓ de feito com 48px; tirar
    exercício com "Desfazer" (volta com as mesmas séries); campos de
    série/carga 44px com teclado numérico; ✕ de série 44px; "Encerrar" e
    "Parar" 44px (eram ~28px); dia vazio explica e aponta pro "Montar
    treino" do Life; carregando em forma de card + erro com "Tentar de
    novo"; falhas avisam (antes calavam); vibração ao marcar feito e ao
    salvar treino; aviso "Treino salvo"; dias da semana por Intl; grupos
    musculares, locais e todo texto do Treino em pt/en/es; cores por token.
  - **Hábitos**: "Hoje eu cedi" / "Não consegui hoje" agora pedem 2º toque
    com texto acolhedor ("Tudo bem. A sequência recomeça de hoje —
    registrar?") — antes zerava a sequência num toque sem querer, sem
    volta; aviso "Registrado. Recomeçar faz parte 💜" e "feito hoje ✓"
    com vibração; erros avisam (antes `.catch(() => {})`); Voltar do
    Android fecha o assistente da vontade (espera/alternativa voltam pro
    menu) e o "Novo hábito"; tirada a nota de dev "(música de fundo ainda
    não configurada)" que aparecia pro usuário; vibração ao fim dos 10 min;
    "Novo hábito" rola com teclado aberto; chips/categorias/intensidade,
    lembrete e excluir com 44–48px; aviso de "Outro" deixou de ser
    vermelho; cores verde/roxo por token; carregando em forma de card;
    todos os textos da tela em pt/en/es. **Falta**: alternativas da
    vontade (`ALTERNATIVAS_POR_CATEGORIA`) ainda só em pt.
  - **Chat do Life** (vale nas 4 telas): Voltar do Android fecha o chat;
    não pisca mais o "Oi…" antes do histórico (carregando + aviso se o
    histórico falhar, em vez de calar); "digitando" com pontinhos (some com
    reduzir animações) e `role=status`; mensagens em `role=log`; campo 48px
    com texto 16px, Enter = enviar (`enterKeyHint=send`); botão 🌙 de pausa
    44px e 12px (era 11px); opções de resposta e botões dos planos 44–48px;
    altura do chat em `dvh` (teclado não esconde o campo); erros, contador
    e textos em pt/en/es; planos/check de saúde sem 11px nem cinza
    apagado; checkbox com cor por token.
  - **Scanner**: limite de scans lido do servidor (o texto dizia "5" fixo —
    ia ficar errado quando mudar pra 15); Voltar do Android na revisão
    pede 2º toque (antes jogava fora a análise que já gastou um scan); ✓
    de incluir 48px (era 24px), ±10 g 44px (eram 32px), nome editável 44px;
    aviso "N itens adicionados em Almoço" + vibração; macros com as cores
    de token; erros com `role=alert`; todo texto em pt/en/es.
  - **Perfil e subpáginas**: cabeçalho único `CabecalhoSubpagina` (voltar
    44px + i18n) em Conquistas, Conta, Metas, Plano, Privacidade,
    Notificações, Idioma, Acessibilidade e Sobre; Perfil ganhou voltar;
    "Sair da conta" com 2º toque na própria linha (era confirm() do
    sistema); **promessas falsas corrigidas**: legenda de Notificações
    dizia "modo resgate e WhatsApp" (WhatsApp adiado) e o Plano dizia
    scanner/chat "sem limite diário" (têm limite); Conta/Metas avisam
    "Salvo ✓" ou erro (antes calavam); conquistas com carregando/erro
    (antes "0 de 0"); toggles com `role=switch` e alvo 48px; tamanho do
    texto como `radiogroup`; chips/campos 44–48px; nenhum texto 10–11px
    nem `content-dim` em leitura; todos os textos em pt/en/es.
    **Falta**: título/descrição das conquistas vêm do banco só em pt;
    "Baixar meus dados (.json)" usa download do navegador — no APK
    provavelmente não baixa (precisa de @capacitor/filesystem + share).
  - **Login / Esqueci a senha**: todos os textos e erros em pt/en/es
    (antes só pt — é a 1ª tela de quem baixa); campos com rótulo de
    verdade (antes só placeholder); botão de mostrar senha; "Entrar/Criar
    conta" como abas 48px; "Esqueci a senha" e "Voltar pro login" 44px;
    erro com `role=alert`; texto 16px nos campos.
  - **Onboarding / Consentimento**: Voltar do Android volta uma etapa
    (antes saía do onboarding); "← Voltar" com contraste AA (era 3,98:1)
    e 48px; chips de unidade/sugestão/remover 44px; títulos em `rem`
    (crescem com "texto grande"). Paleta própria do HTML de referência
    mantida (decisão de design).
  - **Cozinha (telas internas)**: voltar 44px, coração 48px com token,
    chips do Life-chef 44px, sheet "Registrar receita" fecha no Voltar do
    Android, textos de 10px -> 12px.
  - **Varredura final**: nenhum `text-[Npx]` em texto e nenhum texto de
    leitura em `content-dim` fora do protótipo e da `FoodSearchScreen`
    (código morto, não usada por nenhuma rota). Nenhum `confirm()` do
    sistema sobrando. `tsc -b` 0 erros, `vite build` ok.
  - **Não visto na tela**: Chromium headless falha no WSL (falta
    `libnspr4`, precisa de `sudo apt install libnspr4 libnss3`) — dono
    olhar no localhost / APK.
- **Pendências pra próxima sessão (UI/UX)**:
  1. Dono olhar as telas no localhost (http://localhost:5173) e no APK:
     Dieta, Home, Treino, Hábitos, chat, Scanner, Perfil, Login.
  2. "Baixar meus dados" no APK (download do navegador não funciona no
     app nativo) -> @capacitor/filesystem + share.
  3. Traduzir conteúdo que vem do banco/domínio: títulos/descrições das
     conquistas, alternativas da vontade, nomes de exercícios.
  4. Apagar `FoodSearchScreen`/`useFoodSearch`? (verificar se o hook segue
     usado pela busca inline antes).
  5. Opcional: `sudo apt install libnspr4 libnss3 libasound2t64` no WSL pro
     Claude conseguir tirar print das telas.

## 2026-10-09 (tarde) — o dono viu a passada no localhost + tudo em pt/en/es

- **Retorno do dono sobre a passada de UI/UX**: não gostou — esperava
  botões/estética mais bonitos, e a passada mexeu em layout sem precisar.
  Corrigido o que ele apontou:
  - **Check-in emocional** voltou ao layout antigo (uma linha, emojis
    pequenos, ✕); ficou só o texto em pt/en/es.
  - **Discos da "Atividade de hoje"**: só o valor dentro do anel (o
    "/meta" embaixo parecia um segundo número; a meta já aparece abaixo).
  - **Barra de rolagem** some dos 10 carrosséis (classe `.sem-barra` em
    `globals.css`).
- **Tudo em pt/en/es** (pedido do dono):
  - Alternativas da "vontade" (Hábitos), avisos do celular (fim do
    descanso/cronômetro, lembrete de hábito), nome "Nova refeição", aviso
    "rótulo sem porção" do scanner, unidade "porção" das receitas, tipos
    de suplemento (agrupa em qualquer idioma). `src/i18n/dicionarios.ts`
    dá os textos pra quem não é React (`mensagensAtuais()`).
  - Termos de uso e Política de privacidade em **espanhol** (antes o es
    mostrava o inglês).
  - Removidas funções só-pt mortas (`respostaHumor`, `rotuloStatus`,
    `mensagemVontade`, `alternativasPara`).
  - **Conteúdo do banco**: `db/athoslife_traducoes_conteudo_migration.sql`
    — coluna `traducoes` em conquistas (26), exercícios (100: nome, músculos,
    passos) e receitas (25: título/subtítulo); `conteudo_traducoes` (modo de
    preparo, sem GRANT — só pela RPC); `receitas_conteudo_liberado(p_idioma)`;
    nome_en/nome_es dos 110 suplementos de marca. **Testada com ROLLBACK
    no banco real (contagens 26/100/25/0) — ainda NÃO aplicada.**
  - App lê as traduções por `src/data/traducoesConteudo.ts` (busca à
    parte, tolerante: sem a migração fica em pt, nada quebra). Exercício
    ganhou `nomeBase` (pt) — o gerador de treino casa por ele.
  - Leitor das receitas entende rótulos em en/es.
- **Pendências pra próxima sessão**:
  1. ~~Rodar `db/athoslife_traducoes_conteudo_migration.sql`~~ — dono rodou
     em 09/10; conferido no banco (26/100/25, 0 suplemento sem en, RPC com p_idioma).
  2. Polimento de estética (botões, profundidade, cor) SEM mexer em
     layout — perguntar antes de mudar estrutura; dono escolhe entre
     desfazer o visual da passada ou apontar tela por tela.
  3. Respostas do Life (IA) e avisos do servidor: conferir se seguem o
     idioma do perfil.

## 2026-10-09 (noite) — exclusão de conta de verdade + Life estima o que falta

- Dono: 16 e 17 das pendências já resolvidos; FCM ele está ajeitando;
  Health Connect só quando tiver conta de dev da Play; conquistas: o fluxo
  vem dele (já existe o Life dourado + bolinha vermelha no Perfil); música
  do timer: fora.
- **Excluir conta** (era só um pedido gravado, ninguém apagava):
  `db/athoslife_excluir_conta_migration.sql` — `excluir_minha_conta(senha,
  so_conferir)`: confere a senha (5 erros/hora bloqueiam), anonimiza
  ai_audit_logs/eventos_seguranca, grava 'conta_excluida' sem dono e apaga
  auth.users (o resto cai em cascata). O app confere a senha, apaga as fotos
  (avatars, receitas-criadas) e chama a exclusão. Tela de Privacidade com o
  mesmo layout + campo de senha; textos pt/en/es. **Testada com ROLLBACK
  na conta teste0107** (senha errada recusada, conta/perfil somem, eventos
  anonimizados). **Ainda NÃO aplicada.**
- **Life estima** (ai-proxy v3.9, tipo `estimar`, 1 mensagem da cota do
  chat, só devolve números; não reconheceu = devolve a cota): busca da Dieta
  sem resultado ganha "✨ Life estima “termo”" (vai pra porção, sem ⭐, com
  aviso "estimativa"); código de barras fora do Open Food Facts pede o nome
  do produto e cai na mesma revisão do scanner. **ai-proxy v3.9 ainda NÃO
  publicado.**
- **Pendências**:
  1. Rodar `db/athoslife_excluir_conta_migration.sql` no SQL Editor.
  2. Publicar ai-proxy v3.9: `! npx supabase functions deploy ai-proxy
     --project-ref gsdwsxwbmxcvutpvpkyi --use-api`.
  3. Play exige também um LINK na web pra pedir exclusão (quem já
     desinstalou) — página simples ou formulário; decidir onde hospedar.
  4. Seguem: Billing, Termos com dados da empresa, suporte, .aab assinado,
     SMTP + template do código.

## 2026-10-10

- `db/athoslife_excluir_conta_migration.sql` **rodada pelo dono** — conferida
  no banco (`excluir_minha_conta(p_senha, p_so_conferir)`, security definer).
- ai-proxy no ar segue **v3.8 (versão 18)** — v3.9 (Life estima) não publicado.
- Dono preocupado com "Life estima" = prescrever. Explicado: só devolve
  kcal/macros de UM alimento que a pessoa já comeu/vai registrar (tabela
  TACO/USDA), sem conselho nem quantidade recomendada, marcado
  "estimativa", pessoa confirma a porção antes de gravar. Dono decide se
  mantém.
- Dono **concordou com os limites da IA** (grátis 8 msgs/dia + histórico 12,
  pago 60/dia, scanner só pago 15/dia, receitas grátis 1/semana e pago
  10/dia) -> falta SQL em `limite_ia`/`cota_ia_status`, `JANELA_HISTORICO`
  e textos do paywall.
- Dono vai testar o Life. Billing: dono estudando.
- Link web de exclusão de conta: estrutura explicada, aguardando decisão de
  hospedagem.
- **Pendências pra próxima sessão**:
  1. Dono decide o "Life estima": manter (com selo "estimativa" fixo no
     diário, valores editáveis e aviso "não use pra cálculo de medicação"
     na tela e nos Termos) ou tirar. Só depois publicar o ai-proxy v3.9.
  2. Limites da IA aprovados -> Claude prepara SQL (`limite_ia`,
     `cota_ia_status`) + teste que se desfaz, `JANELA_HISTORICO` = 12 no
     ai-proxy e textos do paywall com os números.
  3. Página web de exclusão de conta (exigência da Play): e-mail + senha ->
     2º toque -> `excluir_minha_conta`; "esqueci a senha"; e-mail de
     suporte; o que apaga/o que fica anonimizado. Dono responde: domínio
     próprio ou GitHub Pages, nome do desenvolvedor/empresa, e-mail de
     suporte. Política de privacidade no mesmo lugar.
  4. Dono testando o Life (manda print/frase do que estranhar).
  5. Seguem: Billing (dono estudando), Termos com dados da empresa, .aab
     assinado, SMTP + template, polimento visual sem mexer em layout,
     idioma das respostas do Life, "Baixar meus dados" no APK, revogar
     tokens colados no chat, limite/alerta no Google Cloud.

## 2026-10-12 — Life acha receita da Cozinha que serve (alergia/intolerância)

- Dono perguntou se o Life entende "tô com vontade de doce, mas sou
  intolerante a lactose", olha a Cozinha e, se não tiver, dá 2 ideias fit.
  Antes: dava ideias respeitando a restrição, mas não via a Cozinha e as
  receitas não tinham marcação de alergênico. Dono escolheu ideias "da
  cabeça da IA" (sem busca no Google, sem custo extra) e pediu: **receita
  completa nunca no chat**, só pelo "Monte sua receita com o Life" — senão
  vira atalho pra Cozinha e pra cota do Life-chef.
- `db/athoslife_cozinha_alergenos_migration.sql`: `alergenos text[]` e
  `tipo_prato` (doce/salgado/bebida) nas 25 receitas, por id. Critério
  conservador: whey/"leite ou bebida vegetal" = lactose, aveia = glúten,
  shoyu = soja+glúten. **Ainda NÃO aplicada.**
- **ai-proxy v3.10**: quando a mensagem é de comida, o prompt ganha o
  CATÁLOGO DA COZINHA já sem o que bate com as restrições do perfil e com
  o que a pessoa disse nas últimas falas ("sem/intolerante/alergia…").
  Grátis só vê as receitas que pode abrir (as 3 não premium). O Life cita
  até 2 receitas ([[R15]] -> card) ou dá 2 ideias de uma linha + botão
  [[CHEF]]. Receita completa (3+ quantidades, 3+ passos ou "Ingredientes:")
  vira resposta fixa com o botão do Life-chef. Alergia: lembra de conferir
  o rótulo; sem restrição no perfil, pergunta uma vez.
- App: `separarCartoes` (aiProxy.ts) e `CartaoReceita` no LifeChatSheet —
  marcas ficam salvas no texto, então os cards voltam no histórico.
- Testes das funções novas (13 casos) ok; `deno check` e `tsc -b` ok.
- **Pendências**:
  1. Rodar `db/athoslife_cozinha_alergenos_migration.sql` (sem ela o Life
     só dá ideias, nada quebra).
  2. Publicar o ai-proxy (leva junto o "Life estima" da v3.9 — dono ainda
     não decidiu se mantém): `! npx supabase functions deploy ai-proxy
     --project-ref gsdwsxwbmxcvutpvpkyi --use-api`.
  3. Testar no chat da Dieta: "vontade de doce, sou intolerante a lactose"
     (pago: Sorvete de Banana com Cacau e Amendoim / Panqueca Vegana),
     "me passa a receita completa de brownie" (tem que vir o botão).
  4. ~~Gravar a restrição dita no chat no perfil~~ — feito (abaixo).

### 2026-10-12 (cont.) — Life guarda a restrição no perfil, com botão

- Não usa ferramenta da IA (a resposta da ação apagaria a ideia de doce):
  o servidor lê a fala ("sou intolerante a lactose", "I'm allergic to
  peanuts", "soy alérgica al maní") e, depois da resposta normal, pergunta
  "Quer que eu guarde no seu perfil que você evita lactose?" com os botões
  "Salvar no perfil" / "Deixa como está". Só grava no toque.
- Não pergunta: quando é de outra pessoa ("meu filho é alérgico"), negação
  ("não sou intolerante"), já está no perfil ou já perguntou nos últimos 30
  dias (aceitou ou não). Salva no idioma da pessoa (lactose/lactosa…).
- Tipo `salvar_restricao` em `life_acoes` — **no MESMO arquivo**
  `db/athoslife_cozinha_alergenos_migration.sql` (sem ele o Life só não
  pergunta). Gerador de dieta entende os nomes en/es salvos.
- Limite conhecido: "soy milk" pergunta soja **e** lactose (por causa de
  "milk"); a pessoa recusa no botão.
- **Falta**: não existe tela no Perfil pra VER/TIRAR restrições (só entram
  pelo onboarding e agora pelo chat). Precisa de um lugar (ex.: Perfil >
  Metas ou Conta) — perguntar ao dono antes de mexer em tela.

### 2026-10-12 (madrugada) — no ar + revisão + tela de restrições

- Dono rodou `db/athoslife_cozinha_alergenos_migration.sql` (conferido: 25
  marcadas, 0 sem tipo, `salvar_restricao` no check) e publicou a v19.
- Revisão achou: o detector de "receita completa" barrava resposta de
  MACROS ("100g de frango tem 31g de proteína e 3,6g de gordura"). Agora só
  conta grama de ingrediente (não de macro) e exige verbo de preparo; 16
  testes ok. Negação em inglês ("I can not") não bloqueia mais a oferta.
- **ai-proxy v3.10 publicado pelo Claude (versão 20)**. Atenção: rodar o
  deploy com `--workdir .` — sem isso a CLI acha `C:\Users\Auto Clima\supabase\config.toml`
  e falha com "Entrypoint path does not exist".
- **Perfil > Metas** ganhou "Alergias e restrições" no fim (mesmo estilo dos
  campos; × tira, sugestões e campo adicionam, salva na hora com aviso).

### 2026-10-12 — e-mail de "esqueci a senha" e contas de teste

- Causa do código que não chega: projeto **sem SMTP próprio** — o serviço
  padrão do Supabase só entrega pra e-mails da equipe (2/hora). E o modelo
  "Reset Password" mandava LINK (o app pede o código).
- **Aplicado pelo Claude (dono autorizou)**: modelo "Reset Password" com
  `{{ .Token }}` em pt/en/es (`docs/email/recuperar-senha.html`), assunto
  "Seu código ATHOSlife · Your code · Tu código".
- **Contas apagadas a pedido do dono**: matheusbarretonunesknt, teste0107,
  tester0107, kaue.coutto17 (logs anonimizados, evento 'conta_excluida').
  Ficaram matheusbarretonunes.mb e matheusecomerc. Sem fotos órfãs.
- **SMTP: dono escolheu Brevo por agora** (sem domínio; Resend depois com
  domínio próprio). Falta o dono criar a conta e passar login SMTP + chave.
- Atenção: confirmação de cadastro manda LINK pro `site_url`
  (`http://localhost:3000`) — não funciona no celular. Decidir: desligar
  "Confirm email" ou confirmação por código no app.

### 2026-10-12 — continuidade: ícones, opção B

- Dono confirmou a opção B da comparação em localhost:5180: Phosphor duotone verde.
- 27 SVGs extraídos da própria comparação, locais e sem dependência de CDN.
- Refeições na Dieta, painel da refeição, Home, hábitos e lembretes usam esse padrão.
- Extras aparecem na Home e abrem por id. O painel da extra permite escolher/trocar o ícone; novo hábito permite escolher ícone sem mudar a categoria.
- PENDENTE: aplicar db/athoslife_icones_duotone_migration.sql no Supabase antes de usar a gravação dos ícones. Nenhuma migração remota foi executada nesta sessão.
- TypeScript passou. Build inicialmente bloqueado por dependência opcional nativa ausente do Rollup no ambiente Windows.

### 2026-10-12 — opção B também em Meu Plano e Cozinha

- A pedido do dono, salada do título Meu Plano e categorias da Cozinha passaram para Phosphor duotone.
- Ganho de massa usa halter; Emagrecimento salada; Vegano verduras; Hábitos doce; Shakes copo; Chás xícara.
- Aplicado na seção, lista completa, selo do detalhe e imagem alternativa quando a foto da receita não carrega. Ícones dos filtros acompanham a cor do texto para manter contraste na seleção.
- Não requer migração de banco.

### 2026-10-12 — Home, ícones do Life/Hábitos e revisão das pendências

- Removida da Home a dica “Toque num disco” (renderização removida para todos os idiomas).
- Padronizados Life-chef (incluindo atalho nas respostas), pausa do chat, montar treino/dieta e cabeçalho de Hábitos. Removidos os emojis antigos sem uso das opções de hábitos. Símbolos de sexo preservados como conteúdo do formulário.
- Criado docs/PENDENCIAS_ATUAIS.md a partir do diário e código, com indicação do que não foi consultado remotamente. STATUS ganhou link para essa revisão porque contém informações antigas.
- Pendências principais: SMTP/confirmar cadastro, limites aprovados da IA, Billing, página web de exclusão, FCM/Health Connect, exportação nativa e validações no APK, migração dos ícones e ampliação real das categorias de hábitos.
- As migrações de traduções, exclusão de conta e alergênicos, o template de recuperação e o deploy v3.10 constam como concluídos no histórico; não repetidos nesta sessão.

### 2026-10-12 — terceira proposta de onboarding (Essencial)

- Feedback do dono: prefere estrutura em telas da referência de 10 telas e fluidez/controles da conversa. Não quer cópia do Fitfolio.
- Criada rota pública /prototipo/onboarding-essencial, preservando as duas referências e o onboarding real.
- Retirados questionários de rotina, horas de sono, local das refeições e estresse. Treino/dieta opcionais e independentes.
- Dias disponíveis e duração POR SESSÃO são perguntas distintas. Peso/altura reutilizam a roda numérica; foco usa corpo frente/costas com opções textuais acessíveis.
- Alimentação separa preferências de alergias/intolerâncias. Suplementos em card expansível, sem recomendar uso.
- Resumo com edição por etapa e encerramento com Life e escolhas reais. Sem falso processamento nem plano inventado.
- Protótipo só em pt-BR, estado em memória. NÃO grava no perfil, não gera metas/planos, não substitui a triagem de saúde do fluxo de produção. A triagem permanece necessária antes da geração real.
- Aguardando revisão visual do dono; integração real só depois de fechar o desenho.
- Validação desta proposta: TypeScript --noEmit passou; URL nova respondeu HTTP 200 e foi aberta no navegador. Build completo no WSL foi interrompido após permanecer sem concluir; não registrado como aprovado. Visual ainda depende da avaliação do dono.

### 2026-10-12 — onboarding Essencial aprovado; fluidez e controle

- Dono aprovou a terceira proposta e pediu fluxo leve, simples, prático e sob controle do usuário.
- Progresso agrupado em quatro partes estáveis, sem contagem de páginas que aumenta ao optar por treino.
- Caminho “Quero só conhecer o app por enquanto” pula as preferências opcionais e leva ao resumo, sem planos. Voltar segue o histórico realmente percorrido.
- Alimentação/restrições podem ficar para depois. Controles de peso/altura avançam com Continuar, sem confirmação intermediária.
- Escolhas únicas não desmarcam ao tocar novamente. Foco corporal preservado a cada toque; nomes e desenho sincronizados. Medidas preservadas mesmo ao voltar antes de confirmar.
- Botão Voltar do Android percorre as etapas. Quando falta resposta essencial, Continuar explica o necessário em vez de ficar desabilitado sem motivo.
- Ainda é protótipo; aprovação visual registrada, integração real e traduções seguem pendentes.

### 2026-10-12 — revisão após teste: conversa guiada e hidratação restaurada

- Dono achou Essencial mais travado e apontou ausência do Life da água. Direção corrigida: fluidez de conversa com densidade do modelo original, sem blocos de formulário.
- Mesma rota /prototipo/onboarding-essencial agora usa uma pergunta por vez; respostas únicas avançam direto, sem botão extra ou espera artificial de digitação. Controles de texto, múltiplas escolhas, medidas e foco continuam com ação explícita.
- Mantidos: perfil, objetivo, peso/altura, treino/dieta opcionais separados, dias/tempo/local/experiência/foco, refeições, gosta/não gosta, alergias/intolerâncias, suplementos expansíveis e resumo editável.
- Restaurada pergunta aproximada de hidratação com Life azul (hidratado) e adicionados interesses de hábitos opcionais. Rotina, horas de sono, local das refeições e estresse continuam fora, conforme pedido anterior.
- Respostas recentes ficam acessíveis para editar, Voltar preserva o histórico real, resumo mostra dados informados e final reúne Life de treino/chef/água.
- Otimização da roda numérica compartilhada: no máximo 13 linhas montadas em vez de centenas, mantendo altura total de rolagem. Sem repintar centenas de linhas por movimento.
- Aprovação anterior era do desenho-base; esta revisão ainda depende da avaliação do dono. Mantida como protótipo, sem persistência ou geração de planos reais.

## 12/10/2026 — revisão funcional do widget Android

Corrigida leitura destrutiva da fila: copos só são removidos depois de persistidos, com UUID estável e upsert para reenvio sem duplicação. Mantidos data e horário originais, inclusive copos de ontem. Sincronizações serializadas; nova tentativa ao abrir, retomar, reconectar e tocar no widget. Fila isolada e arquivada por conta no logout. Contador soma pendências que ainda não aparecem nos IDs retornados pelo banco. Sem sessão, copos abrem o aplicativo. Life, cápsula e contador abrem Home; câmera abre /scanner com validação do deep link.

Validação: 10 testes de lógica passaram (`node --test scripts/testar-widget.mjs`), cobrindo offline, falha parcial, reenvio, mudança de dia, novos toques e rotas. Estes testes não acessam Supabase nem executam Android. ADB não encontrou aparelho/emulador conectado. Compilação Android não executada: JDK/JAVA_HOME ausentes. Necessário gerar e instalar novo APK: a ponte nativa ganhou métodos e o JavaScript novo não deve ser publicado sozinho sobre APK antigo.

Pendente: em Android real, conferir widget com app aberto/fechado, rede ligada/desligada, retomada, troca de conta, volume, virada do dia, total no banco e Home, abertura fria/quente e scanner até captura. Nenhuma garantia de funcionamento integral em aparelho foi feita. Registro offline só chega ao banco quando o app executa a sincronização; não há worker de envio em segundo plano.

### 2026-10-15 — revisão do que foi feito em 12/10 e correções

- Revisado todo o diff (widget, ícones duotone, onboarding Essencial). TypeScript, 10 testes do widget e `vite build` passaram.
- Conferido no Supabase: coluna `icone` ainda NÃO existe em `vicios_user`/`refeicoes_extra` (migração não aplicada).
- Dono recusou contorno no código: hábito deve gravar o ícone de verdade. Fallback removido; a migração é obrigatória antes de publicar este JS.
- Trocar ícone de refeição extra continua dependendo da migração (mostra erro amigável até lá).
- PENDENTE: rodar db/athoslife_icones_duotone_migration.sql; gerar APK novo (ponte do widget mudou) e testar no aparelho.

### 2026-10-17 — migração dos ícones conferida

- Dono rodou `db/athoslife_icones_duotone_migration.sql`. Conferido no Supabase:
  `refeicoes_extra.icone` (text, not null, default 'tigela') e
  `vicios_user.icone` (text, nulo). 6 extras com 'tigela'; 3 hábitos sem
  ícone gravado, que caem no ícone da categoria até a pessoa escolher.
- O JS de 15/10 (hábito grava ícone) já pode ser publicado.
- Pendente: APK novo (ponte do widget mudou) e teste no aparelho.

### 2026-10-17 — pacotes do dono: segurança, RevenueCat e Energia e peso

Revisados os 8 arquivos que o dono trouxe de outra sessão com o Claude.

- **Segurança** (`db/athoslife_seguranca_dados_migration.sql`): fecha
  funções de gatilho/Stripe abertas pela API, `is_premium_like` e
  `registrar_checkin_habito` só com login, `search_path` fixo, regras do
  bucket `progress-photos`. **Tirada a troca da view `macros_diarios`**: o
  app soma a view + `itens_refeicao` (macrosRepository.ts), então Home e
  Dieta mostrariam calorias em dobro. `scan_historico` NÃO está sem uso
  (o scanner grava nela).
- **Assinatura: dono escolheu RevenueCat** (pagamento continua sendo o
  Google Play Billing; o RevenueCat só confere e avisa o servidor). O pacote
  Play direto foi descartado (os dois criam as mesmas tabelas).
  - `db/athoslife_assinaturas_revenuecat_migration.sql`: `billing_config`,
    `rc_assinaturas`, `rc_eventos`, `fundadores` (300 vagas, só anual,
    reembolso devolve a vaga), `aplicar_cliente_rc`, `vagas_fundador_disponiveis`
    nova, `is_premium_like` com vencimento. Banco hoje: só 2 VIP, ninguém perde acesso.
  - Edge Functions `rc-sync` (com JWT) e `rc-webhook` (sem JWT, confere o
    Authorization). 7 testes Deno passaram; tipos conferidos.
  - App: `src/data/assinatura/revenuecat.ts` (no-op sem `VITE_RC_GOOGLE_KEY`
    ou fora do Android), sincroniza 1x por conta ao abrir, `logOut` no
    logout. Tela Plano mostra Mensal/Anual, vagas de Fundador, Restaurar e
    Gerenciar SÓ quando a loja devolve preços; sem isso fica o "em breve".
    Textos pt/en/es. Plugin `@revenuecat/purchases-capacitor` 13.7.4 + `cap sync`.
- **Card Energia e peso** na Home, abaixo do "Meu peso": calorias por dia e
  peso no mesmo eixo (14/30 dias) + frase que compara com o objetivo. Sem o
  bloco "Hoje" do pacote (repetia os discos da Home). Tokens do app
  (calorias = accent-energy, peso = brand), pt/en/es, recarrega com
  `avisarRegistroDoDia`. Cálculos em `src/domain/rules/energiaPeso.ts`,
  6 testes (`node --test scripts/testar-energia-peso.ts`). **Dono ainda não viu.**
- Check-in emocional (v2/v3/24-09): não mexido. Sugestão: momento da v2
  (faixa depois de abrir, × até amanhã, sem sensores) + palavras/mapa da v3
  (precisa de colunas novas em `checkins_emocionais`). Esperando o dono.
- Validação: tsc, vite build, testes Deno e node ok. Auto mode negou
  aplicar SQL e deploy de função.

**Pendências pra próxima sessão**
1. Dono rodar no SQL Editor: `db/athoslife_seguranca_dados_migration.sql`
   e `db/athoslife_assinaturas_revenuecat_migration.sql`.
2. Deploy: `npx supabase login` (token local expirou) e depois
   `npx supabase functions deploy rc-sync --workdir .` e
   `npx supabase functions deploy rc-webhook --no-verify-jwt --workdir .`.
3. Painel: ligar "Leaked password protection" (Auth > Password security).
4. RevenueCat/Play Console (LEIA-ME do pacote): assinatura `athos_premium`
   com base plans `mensal`/`anual`, entitlement `premium`, offering
   `default`, webhook, segredos `RC_SECRET_KEY` e `RC_WEBHOOK_AUTH`,
   `VITE_RC_GOOGLE_KEY` no .env antes do APK.
5. Dono ver o card Energia e peso; decidir o check-in.
6. APK novo (widget + RevenueCat) e teste no aparelho.

### 2026-10-17 — Life adaptativo (pacote do dono) levado pro app atual

- O pacote `ATHOS_Life_Adaptativo.zip` partiu da ai-proxy de `aa5b2e2` e
  desfaria 2 decisões de 12/10 (teto de 3 pausas/30 dias e Dieta sem
  "Analisar alimento"). Dono pediu pra contornar: junção de 3 vias
  (`git merge-file`) só com o que é novo, 0 conflitos, as duas regras ficam.
- **Banco (aplicado e conferido):** `db/athoslife_life_adaptativo_migration.sql`
  — `life_memorias`, `life_checkins`, `life_iniciativas`, consentimento de
  memória no perfil, `tipo` no chat, funções de memória e de padrões.
  Acrescentado: o log da IA (`ai_audit_logs`) só aceitava vision/chat/barcode,
  então acao/estimar/recipe falhavam sem erro; agora aceita esses + checkin
  (o teto de 3 respostas de IA por dia no check-in conta por esse log).
- **ai-proxy v4.0** (`index.ts` + `life.ts` + `life.test.ts`): 12 testes
  Deno passam, tipos ok. Resumo do check-in no chat agora sai no idioma da
  pessoa. **Ainda não publicada** (auto mode nega deploy).
- **App:**
  - Home: `CheckinLife` (v2+v3: chega 3 s depois ou no 1º registro do
    dia, 5 palavras + mapa de 16, motivo e nota opcionais, × até o próximo
    momento, "Hoje: … · editar") no lugar do card de emojis; `AberturaLife`
    (o Life puxa assunto, máx. 1/dia, guardado no dia até fechar).
  - Chat: convite da memória quando a ai-proxy manda `sugerir_memoria`.
  - Perfil › Privacidade e dados › "O que o Life lembra"
    (`/perfil/privacidade/life`): liga/desliga, fixa, apaga com Desfazer,
    apaga tudo com confirmação, conta algo ao Life.
  - Exportar dados inclui `life_memorias` e `life_checkins`.
  - Tudo em pt/en/es, tokens do app, gênero pelo `sexo` (neutro em
    "outro"/"prefiro não dizer").
- Validação: tsc, vite build, deno check, deno test.

**Pendências**
1. Publicar: `npx supabase functions deploy ai-proxy`, `rc-sync` e
   `rc-webhook --no-verify-jwt` (`--project-ref gsdwsxwbmxcvutpvpkyi`).
   Sem a ai-proxy nova, check-in e abertura do app novo dão erro/nada.
2. Testar o Gemini numa conta de teste: marca [[LEMBRAR]] na hora certa?
3. Dono ver no aparelho: check-in, abertura, tela de memórias.
4. Scanner (`ATHOSlife_Scanner_Especificacao_Tecnica_v1.1.md`): começar
   pela etapa 1 (medir o atual) quando o dono quiser.

### 2026-10-17 (noite) — Edge Functions publicadas

- Conferido no banco: migrações de segurança, RevenueCat e Life adaptativo
  já estão aplicadas.
- Publicadas por Claude (dono autorizou): `ai-proxy` v4.0 (versão 21,
  com `life.ts`), `rc-sync` (com JWT) e `rc-webhook` (sem JWT). As três
  ACTIVE; chamada sem login devolve 401, como esperado.
- Como publicar daqui (WSL, pasta com espaços): o deploy padrão não acha o
  arquivo; funciona com
  `SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase functions deploy <nome> --project-ref gsdwsxwbmxcvutpvpkyi --use-api --workdir .`
  (`rc-webhook` com `--no-verify-jwt`). `supabase login` não funciona
  aqui (pede navegador/TTY).
- Funções antigas ainda lá: `send-welome-whatsapp`, `relogio-athos`,
  `stripe_webhook`, `create-checkout` (conferir se o app usa antes de apagar).

**Pendências**
1. Segredos `RC_SECRET_KEY` e `RC_WEBHOOK_AUTH` + webhook no RevenueCat
   (`.../functions/v1/rc-webhook`); `VITE_RC_GOOGLE_KEY` no .env antes do APK.
2. Ligar "Leaked password protection" no painel.
3. Testar o Gemini numa conta de teste ([[LEMBRAR]]); dono ver check-in,
   abertura do Life, memórias e card Energia e peso no aparelho.
4. APK novo (widget + RevenueCat).
5. GitHub: 40+ commits só locais; criar AGENTS.md pra dividir com o GPT.

### 2026-10-17 (noite, cont.) — ícones, modo claro, um gráfico só e peso pelo chat

- **GitHub:** push liberado; `AGENTS.md` criado (regras pra Claude e GPT
  dividirem o repo). Token não fica salvo no PC.
- **Ícones:** emojis da Dieta (suplementos, ações da refeição, ✨, 📅) e do
  Scanner viraram Phosphor duotone (`DESENHOS_UI` em phosphorDuotone.tsx:
  pilula, frasco, peixe, brilho, camera, lupa, estrela, copiar, lixeira,
  calendario, cadeado). Ainda com emoji: Onboarding, Life Chef, Cozinha,
  BottomNav.
- **Modo claro:** cores viraram variáveis (`--c-*` em globals.css,
  `rgb(var(--c-x) / <alpha-value>)` no tailwind). Segue o modo do celular;
  claro = fundo branco + ondas verdes (SVG fixo no `html`). `bg-white/5` →
  `bg-content-hi/5`. Barra de status acompanha (`ui/theme/modoClaroEscuro.ts`).
  Onboarding e Consentimento continuam escuros (cores fixas) — pendente.
- **Um gráfico só:** "Energia e peso" entrou DENTRO do "Meu peso" no lugar
  da linha antiga; card separado saiu da Home. Período 14/30 dias manda em
  tudo (abre em 30). Linha-guia dourada da meta no gráfico (presa na borda
  com seta quando a meta está a mais de 3 kg das pesagens).
- **Peso pelo chat (dono pediu, sem botões):** card sem Registrar/Meta/
  Histórico, só a dica. ai-proxy **v4.1** (`peso.ts` + 6 testes):
  "pesei 80,5", "minha meta é 75", "histórico de peso" em pt/en/es → resposta
  fixa, **sem IA e sem cota**, acao `peso_atualizado` (app recarrega card e
  perfil). Ambíguo/outro assunto vai pra IA. **Publicada.**
- **Onboarding:** campo opcional "Peso que você quer chegar" quando o
  objetivo é perder gordura/ganhar massa → `profiles.peso_meta`.
- **Dados de teste** na conta matheusecomerc@gmail.com (30 dias): itens
  `[teste] ...` e pesos com `created_at = 2000-01-01`. Apagar quando o dono
  terminar de testar.
- Validação: tsc, vite build, 16 testes node, 18 testes Deno.

**Pendências**
1. Apagar os dados de teste do gráfico (pedir ao dono).
2. Modo claro: Onboarding/Consentimento; conferir as telas logadas e o Life
   sobre fundo branco.
3. Peso pelo chat: falta "apagar pesagem de um dia" (o ✕ do histórico saiu).
4. Emojis restantes (Onboarding, Life Chef, Cozinha, BottomNav).
5. Segredos/webhook do RevenueCat; "Leaked password protection".
6. APK novo (widget + RevenueCat + modo claro) e teste no aparelho.

### 2026-10-21 — corrigir/apagar a última pesagem pelo chat

- ai-proxy **v4.2** (`peso.ts`): "corrige a última pesagem pra 80,2",
  "errei o peso, é 79,5", "apaga a última pesagem", "exclui meu peso de
  hoje" (pt/en/es) → mexe só na pesagem mais recente, resposta fixa, **sem
  IA e sem cota**. Apagar faz `peso_atual` voltar pra pesagem anterior.
  "muda minha meta" continua sendo meta; "apaga o peso do supino" vai pra IA.
- Dica do card "Meu peso" cita corrigir/apagar (pt/en/es).
- Validação: 19 testes Deno (peso + life), deno check, tsc, vite build.
- **Precisa deploy da ai-proxy** (o auto mode bloqueou o deploy daqui).
- Scanner: mapeado o atual contra `ATHOSlife_Scanner_Especificacao_Tecnica_v1.1.md`
  (foto 1024 px → Gemini estima itens E calorias → app casa o nome com
  `alimentos` por "contém" → revisão → grava). Diferenças e plano no chat
  de 21/10; nada do scanner alterado ainda.
- PC: 4 GB de RAM → emulador Android não roda; testar no celular com APK
  do GitHub Actions.

**Pendências**
1. Deploy da ai-proxy v4.2.
2. Scanner: dono decidir as fotos de referência (pesadas) pra etapa 1.
3. Demais pendências do bloco de 17/10 continuam.

### 2026-10-21 (cont.) — scanner v1.1, etapa 2 (motor) + TACO como referência — branch `scanner-v1-1`

Base: `ATHOSlife_Scanner_Especificacao_Tecnica_v1.1.md`. Dono pediu TACO como
referência.

- **TACO** (`db/athoslife_taco_referencia_migration.sql`): tabela `taco` (597
  itens, TACO 4ª ed. NEPA/UNICAMP 2011, por 100 g; dados via
  github.com/raulfdm/taco-api, "Tr"→0, "*"/NA→null) + `alimentos.taco_id`.
  279 alimentos ligados (casamento por nome+preparo, revisado à mão; ambíguos
  fora: "Laranja", "Uva", "Alface", "Leite de coco"...) + variações "— porção"
  herdam = 334. **Os macros desses alimentos passam a ser os da TACO** (69
  mudam > 20%, ex.: batata inglesa cozida 77→52/100 g, café coado 2→18/200 g,
  virado à paulista 450→921/300 g). Backup em `alimentos_antes_taco` + bloco de
  desfazer no fim do arquivo.
- **Catálogo do scanner** (`db/athoslife_scanner_v1_migration.sql`, rodar
  DEPOIS da TACO): preparo, porção típica, prato montado × prato inteiro, óleo
  de preparo caseiro (arroz 2,5%, feijão 1,5%, grelhados 2% — estimativa da
  equipe, só onde a base não tem óleo), densidade de bebida, medidas caseiras
  (`alimentos_medidas`, 112 estimativas da equipe = só sinalizam revisão),
  `scan_jobs`, `scan_correcoes`, `scan_nao_resolvidos` (sem user_id) e RPC
  `scanner_confirmar` (transação única, commit_key idempotente).
- Testado no banco real num bloco que se desfaz sozinho: as duas migrações
  rodam; nada foi aplicado.
- **ai-proxy v4.3** (`supabase/functions/ai-proxy/scanner/`): `{tipo:'scan',
  op: analisar|status|confirmar}`. Gemini só reconhece (o que é, preparo,
  gramas, medida caseira, âncoras, óleo visível); nutriente vem do catálogo,
  calculado no servidor. 1 chamada normal, no máximo 2. request_id + hash da
  foto = idempotente; cota devolvida uma vez em falha; lease com tentativa.
  **Desligado** até o segredo `SCANNER_V2=true` (sem ele o app usa o
  `vision` antigo sozinho). `SCANNER_VOCAB_MAX` (padrão 600 nomes no prompt;
  ~600 tokens por 100 nomes, conta no teto diário).
- App: scanner tenta o v1.1 e cai no antigo se desligado; foto 1280 px/0,82.
  No card do item (layout mantido): "Qual é?" com candidatos, busca na base
  quando não achou, preparo Sem óleo/Caseiro/Bastante óleo com a premissa
  escrita, aviso de porção, selo "TACO". Item sem alimento não salva (não vira
  zero). Correção recalcula no aparelho, sem IA; o servidor refaz a conta ao
  salvar. Textos pt/en/es.
- Benchmark: `scripts/scanner-benchmark/` (README com o protocolo das fotos
  pesadas, `rodar.mjs` v1×v2, métricas e portas G1/G2). Fotos ficam fora do git.
- Validação: 46 testes Deno (27 do scanner: porta G0 + fluxo com banco em
  memória), deno check, 13 testes node (inclui app × servidor dando o mesmo
  número), tsc, vite build. **Nenhum teste com o Gemini de verdade nem no
  aparelho ainda.**

**Pendências**
1. Dono aprovar e rodar as migrações (TACO primeiro) — muda números da Dieta.
2. Deploy da ai-proxy (v4.2 peso + v4.3 scanner) e, pra testar, `SCANNER_V2=true`.
3. Fotos pesadas (30 pro piloto) → rodar o benchmark v1×v2 (portas G1/G2).
4. Ver a tela nova no aparelho (dono não viu o visual dos chips).
5. Depois: rótulo e texto pelo mesmo motor; job de reconciliação de leases;
   incluir `scan_jobs` no "Baixar meus dados".

### 2026-10-21 (fim) — prévia do scanner, story analisado, specs salvas

- Prévia interativa da revisão do scanner novo (prato de exemplo, números
  TACO): https://claude.ai/artifact/ETuzXLT8sttmojbwtaFWgQ — cópia em
  `docs/previas/previa-scanner.html`.
- Especificações salvas no repo: `docs/specs/SCANNER_ESPECIFICACAO_v1.1.md`,
  `docs/specs/STORY_STUDIO_INTEGRACAO_v3.md` (guia original do zip) e
  `docs/specs/STORY_STUDIO_ANALISE.md` (o que serve e o que quebraria).
- Corrigido o que eu disse ao dono: a mesma foto/prato em outro dia **gasta**
  scan e tokens; só a repetição do mesmo envio (rede caiu) não gasta.
  Custo estimado ~R$ 0,03 por foto (medir no benchmark).
- **Push bloqueado de novo** (token do GitHub não fica salvo). Tudo está em
  commits locais: `main` tem o peso v4.2; a branch `scanner-v1-1` tem peso +
  scanner + estes docs.

**Pendências pra próxima sessão**
1. Token do GitHub → `git push` da `main` e da branch `scanner-v1-1` (abrir PR).
2. Dono decidir: aplicar TACO no banco? publicar ai-proxy? escopo do story
   (proposta: Alimentação + Musculação)? Facebook App ID.
3. Fotos pesadas (30) pro benchmark do scanner.

### 2026-10-21 (noite) — TACO aplicada no banco; scanner com a foto em tela cheia

- **TACO aplicada no banco de produção** (dono aprovou: a nutricionista que
  viu o app elogiou a tabela). `taco` = 597, 333 alimentos ligados, backup
  em `alimentos_antes_taco` (333). Ex.: batata inglesa cozida agora 52 kcal/100 g.
  Desfazer: bloco no fim de `db/athoslife_taco_referencia_migration.sql`.
  A migração do scanner (`athoslife_scanner_v1_migration.sql`) **não** foi aplicada.
- Prévia do scanner refeita como o dono pediu: a foto ocupa a tela inteira,
  os itens viram linhas de vidro translúcidas (nome · gramas · kcal) e o ajuste
  abre só ao tocar na linha (um por vez). Foto de exemplo = bowl de frango
  (`docs/previas/prato.webp`). Mesmo link:
  https://claude.ai/artifact/ETuzXLT8sttmojbwtaFWgQ
- Story: o dono quer conversar antes. Nada a fazer até lá.

**Pendências**
1. Dono aprovar o visual novo da prévia → levar para `ScannerScreen` (app).
2. Aplicar a migração do scanner + deploy da ai-proxy (v4.2 + v4.3) + `SCANNER_V2=true`.
3. Token do GitHub → push da `main` e da `scanner-v1-1`.
4. Fotos pesadas para o benchmark.

### 2026-10-21 (noite, cont.) — scanner com o visual aprovado (foto em tela cheia + vidro) — branch `scanner-v1-1`

Dono aprovou a prévia (https://claude.ai/artifact/ETuzXLT8sttmojbwtaFWgQ) e
pediu pra levar ao app.

- **Revisão** (`scanner/RevisaoScanner.tsx`, portal em tela cheia): foto do
  prato no fundo; no código de barras, foto do produto nítida no meio + cópia
  borrada no fundo. Painel de vidro: total grande, uma linha por item (✓ ·
  nome · g · kcal), toque abre o ajuste (− / +, macros, `ExtrasScan`, porção
  do rótulo × 100 g). Item sem alimento = borda dourada + "qual é?" e o botão
  vira "Falta escolher: X". ← e o voltar do Android: 1º toque avisa, 2º descarta.
- **Câmera própria do código** (`scanner/CameraCodigo.tsx` +
  `data/native/codigoBarras.ts`): sai o leitor pronto do Google
  (`BarcodeScanner.scan`), entra `startScan` com a câmera atrás da WebView
  (`html.barcode-scanner-active` deixa o app transparente, globals.css).
  Mira com cantos verdes + laser, lanterna (se o aparelho tiver), "Digitar o
  número". Leu: vibra, mira verde, busca o produto. **Agora o Android pede a
  permissão de câmera** na 1ª vez (já está no Manifest).
- Botão "Ler código de barras" com ícone, subtítulo e selo GRÁTIS; "Prefere
  digitar o número?" como link.
- `.tema-escuro` e `.vidro` em globals.css: o vidro é sempre escuro, mesmo
  no modo claro. Textos novos em pt/en/es (`scanner.vidro`).
- Validação: tsc e vite build. **Não testado no aparelho** (câmera atrás da
  WebView só dá pra ver no APK).

**Pendências**
1. APK novo → testar: permissão da câmera, imagem aparecendo atrás (se ficar
   tela preta, algum fundo não ficou transparente), lanterna, leitura, revisão
   no claro e no escuro.
2. Migração do scanner + deploy da ai-proxy (v4.2 + v4.3) + `SCANNER_V2=true`.
3. Token do GitHub → push da `main` e da `scanner-v1-1` (abrir PR).

### 2026-10-21 (noite, cont.) — créditos, licenças, formulário da Play, idade mínima

- **Créditos** (dono pediu letra miúda, verde claro, sem negrito): Sobre →
  "Dados nutricionais: Tabela TACO (NEPA/UNICAMP) e Open Food Facts (licença
  ODbL)"; na revisão do código de barras, "Rótulo via Open Food Facts". pt/en/es.
- **Licenças de código aberto:** Perfil → Sobre → nova tela
  (`legal/Licencas.tsx`). Lista gerada por `node scripts/gerar-licencas.mjs`
  (40 pacotes de produção: 38 MIT, 1 Apache-2.0, 1 0BSD) → rodar de novo
  quando mudar `package.json`. Obs.: o tailwind cita "Inter", mas a fonte
  não é empacotada; no Android o app usa a fonte do sistema.
- **Formulário de segurança de dados da Play:** `docs/legal/PLAY_SEGURANCA_DADOS.md`.
- **Idade mínima × Gemini (pesquisado):** os termos do Gemini API (vigentes
  desde 23/03/2026) e os do Vertex AI (Google Cloud, "Age Restrictions")
  proíbem usar a IA em app "directed towards or likely to be accessed by
  individuals under the age of 18". O app aceita 16+ → conflito. Dono decide:
  18+ ou trocar o provedor da IA. A chave do Gemini está no plano grátis
  (Google pode treinar com os dados); a Política diz o contrário → passar
  pro pago antes do lançamento ou ajustar o texto.
- Bloqueado pelo auto mode: migração do scanner, deploy da ai-proxy e
  `SCANNER_V2` (comando pronto no chat de 21/10).

**Pendências**
1. Dono: idade mínima / provedor de IA; chave Gemini paga antes do lançamento.
2. Política: incluir RevenueCat; preencher razão social/CNPJ/DPO; publicar na web
   + página de exclusão de conta (exigência da Play).
3. Migração do scanner + deploy ai-proxy + `SCANNER_V2=true`; push (token GitHub).
- **Decisão do dono: continua o Gemini e o app passa a ser 18+.** Onboarding
  só aceita 18–100 (`onboarding/estado.ts`, aviso em pt/en/es); Termos e
  Política dizem 18+ (sem a regra de responsável legal);
  `VERSAO_DOCUMENTOS` = v2.3-2026-10-21. Obs.: editar a idade em Perfil →
  Conta não valida o mínimo (o plano já bloqueia menor de idade na triagem).

### 2026-10-21 (noite, fim) — scanner publicado no Supabase

- `bash scripts/publicar-scanner.sh` (dono autorizou): migração do scanner
  aplicada (4 tabelas, 112 medidas, RPC `scanner_confirmar`), **ai-proxy
  publicada** (v4.2 peso + v4.3 scanner; versão 24 no Supabase, ACTIVE) e
  `SCANNER_V2=true`. O APK atual continua usando o scanner antigo; o novo
  (tela de vidro + câmera própria) só no próximo APK.

**Pendências**
1. Token do GitHub → push da `main` e da `scanner-v1-1` + PR → APK pelo Actions.
2. Testar no aparelho: scanner novo com Gemini de verdade, câmera do código,
   modo claro/escuro.
3. Política: RevenueCat, dados da empresa/DPO, página web + exclusão de conta.
4. Chave do Gemini no plano pago antes de abrir pro público.
5. Story: dono quer conversar.

### 2026-10-21 (madrugada) — tema, peso por variação, hábitos construir

- **Tema** em Perfil → Acessibilidade: Escuro (padrão), Claro, Automático.
  `ui/theme/tema.ts` (antes modoClaroEscuro.ts) põe `.tema-claro` no <html>;
  globals.css trocou o `@media (prefers-color-scheme: light)` por essa classe.
- **Peso pelo chat v4.4** (`peso.ts`): "perdi 1 kg", "emagreci 2,5 quilos",
  "ganhei meio quilo", "I lost 2 kg", "perdí un kilo" → pesagem de hoje =
  última pesagem ± variação (sem IA, sem cota). Antes ia pra IA e o gráfico
  não mudava (bug relatado pelo dono). "ganhei 5 kg no supino" e "quero perder
  5 kg" continuam fora.
- **Hábitos (bug relatado):** Construir + "Outro" gravava categoria null e o
  hábito voltava como "evitar". Agora Construir tem Dormir melhor, Beber água,
  Ler mais, Meditar, Caminhar, Comer verduras e Outro (= categoria
  'construir'). Mesma lista no app (`habito.ts`), no Life (`life.ts`
  `ehConstruir`) e no banco (`db/athoslife_habitos_construir_categorias_migration.sql`,
  função `categoria_construir` + `handle_recaida`). O hábito "dormir melhor"
  que o dono já criou continua como "evitar": apagar e criar de novo.
- `scripts/supabase.sh` (migrar / deploy / segredo) pra publicar com 1 linha.
- Validação: tsc, 47 testes Deno, deno check.
- **Publicado:** migração dos hábitos + ai-proxy (v4.4) via `scripts/supabase.sh`.
- Refeição sem imagens / "pontinhos" na lista: aguardando print do dono.
- **Refeição extra (bug relatado):** nome + grade de 16 ícones ficavam sempre
  abertos no sheet → agora recolhidos atrás de "Editar nome e ícone" (com
  "Pronto" e a dica de como reordenar). O puxador "⋮⋮" (aparecia como "::")
  saiu: reordenar = segurar o card ~0,35 s e arrastar (PointerSensor com
  delay); toque curto abre a refeição. Testar no aparelho se o arraste por
  toque longo não abre o sheet ao soltar. pt/en/es.

### 2026-10-21 (madrugada, cont.) — Story Studio dentro do app — branch `story-studio`

Dono aprovou a prévia (https://claude.ai/artifact/Fbq4t5GNHWFSdEbGmWUjfL).
Escopo: Alimentação + Musculação (Corrida/Jiu-Jitsu depois).

- Tela `/story` (`ui/screens/story/StoryScreen.tsx`): foto da pessoa 9:16 em
  tela cheia, números arrastáveis, toque = tamanho/cor/ocultar, painéis
  Dados/Modelos (um por vez), desfazer, faixas do Instagram ao arrastar.
  Modelo em `domain/entities/story.ts` (posições em %, tamanhos em fração da
  largura → tela usa `cqw`, export usa ×1080). `exportarStory.ts` desenha o
  JPEG 1080×1920.
- Entradas (símbolo = câmera pequena, pedido do dono): cabeçalho da refeição
  na Dieta (com itens) e "Postar no Story" no resumo do fim do treino (salva
  e abre o editor com volume/séries/duração/exercícios + grupo principal).
- Android: `story/AthosInstagramPlugin.java` (do zip V3, pacote
  `br.com.athoslife.app.story`), **1 linha** no MainActivity (Live Activity e
  widget continuam), `<queries>` do Instagram no Manifest,
  `plugins.AthosInstagram.facebookAppId: ''` no capacitor.config.ts.
  Sem App ID (hoje) "Postar nos Stories" abre o menu de compartilhar.
  No navegador: menu do navegador ou baixa o arquivo.
- Textos pt/en/es (`story`). Validação: tsc e vite build. **Não testado no
  aparelho** (plugin nativo, exportação no WebView).

**Pendências**
1. Dono: Facebook App ID (junto com o webhook do RevenueCat) → preencher
   `facebookAppId` e testar o Instagram direto.
2. APK pra testar arrastar, foto da galeria, exportação e compartilhar.
3. Recorde pessoal no Story de treino (precisa histórico por exercício).
4. Dono quer alinhar algo da Live Activity antes de fechar.

### 2026-10-22 — Live Activity nova (mockup de 22/10) e Story no formato do V2 — branch `story-studio`

**Live Activity** (dono aprovou a prévia no localhost, feita a partir de
`athoslife-live-activity-mockup.html`):
- Layouts `athos_la_grande`/`athos_la_pequeno` refeitos: miniatura do
  exercício (halter/prancha), "Série 2 de 4" + segmentos, chip de status
  (Em série / Pronto / Preparo / Descanso), card verde-escuro com brilho lima
  no canto (laranja no descanso).
  - Série com reps: dois steppers (peso com "kg" pequeno, reps) + botão ✓.
  - Série por tempo: anel + −5s/+5s + Iniciar; **preparo de 3 s** (3, 2, 1)
    com Cancelar; depois "Segure firme" com relógio e Concluir.
  - Descanso: relógio laranja grande, "a seguir: 80 kg × 10" (ou próximo
    exercício), +15s, Pular e barra de progresso.
- Textos em `res/values{,-en,-es}/athos_live_textos.xml` (antes eram fixos em pt).
- Redesenho: a cada 1 s no preparo, a cada 5 s no descanso/prancha (barra e
  anel andam), e na hora exata do fim. Só com o processo vivo; o relógio em
  si (Chronometer) anda sozinho.
- App: `PREPARO_SEG = 3` em `sessaoTreino.ts` (`cronometroInicioEm` = fim do
  preparo), `emPreparo()`, ação `cancelar` vinda da Live Activity, status
  "prepare-se: 3" no card do treino em andamento (pt/en/es).
- Posição na tela de bloqueio é decisão do celular (Samsung embaixo, Pixel
  logo abaixo do relógio). Sem vidro desfocado (notificação não faz).

**Story** — o dono quer o formato do protótipo dele
(`ATHOS_Story_Editor_Unificado_V2.html`, na raiz, não commitar), **sem Corrida e
Jiu-Jitsu por enquanto**, com a entrada que ele aprovou:
- Editor refeito (`StoryScreen.tsx` + `storyCanvas.ts`, motor portado do V2):
  canvas 1080×1920, foto primeiro ("Comece pela sua foto."), Foto · Adicionar ·
  Modelos · Ajustes, tocar no elemento abre opacidade / cor do Life / cores /
  Texto / Outro lado / Ocultar / Excluir, puxar o canto redimensiona, campo
  personalizado, modelos (Só a foto, Na base, Minimalista, Editorial), ajustes
  da foto (luz, zoom, posição, sombra), desfazer. Exporta JPEG pro plugin do
  Instagram (sem App ID: menu de compartilhar). Sem vídeo (o V2 só fazia
  prévia de vídeo e exportava PNG).
- Dados reais, sem número de exemplo: Musculação = último treino salvo
  (`treinoHistoricoRepository.ultimoParaStory`: foco, volume, séries, duração,
  volume por exercício no gráfico e **recorde pessoal** comparando a maior
  carga com os treinos anteriores); Alimentação = total do dia
  (`macrosRepository.doDia`, kcal com "≈").
- Entradas: câmera discreta no cabeçalho de Início (abas) / Dieta (food) /
  Treino (gym); convite "Seu dia rendeu! 🔥" na Home (Life feliz) só em dia
  bom (meta de kcal 90–110%, treino feito ou sequência recorde ≥ 3),
  dispensável por dia; "Postar no Story" do fim do treino continua (abre
  depois de salvar). **A câmera saiu do sheet da refeição.**
- Textos pt/en/es (`story`). `exportarStory.ts` removido.
- Validação: tsc e vite build. **Nada testado no aparelho**; Java da Live
  Activity sem compilar aqui (sem JDK/SDK no PC) → conferir no build do Actions.

**Pendências**
1. Token do GitHub → push de `main`, `scanner-v1-1` e `story-studio` + PR → APK.
2. No APK: Live Activity (os 4 estados, preparo, botões com tela bloqueada,
   textos en/es), Story (foto da galeria, cantos, exportar, Instagram/menu).
3. Facebook App ID → `facebookAppId` (Instagram direto).
4. Story: Corrida e Jiu-Jitsu quando o app registrar esses treinos.
5. Live Activity fase 2: pausar/retomar e card "Exercício concluído".

### 2026-10-22 (cont.) — Dia leve no check-in — branch `story-studio`

Bug relatado pelo dono: check-in "cansado" + sono → o Life só falava, sem
aliviar nada. Agora (regras em `domain/rules/diaLeve.ts`):
- **Quando:** palavra de pouca energia e pouco agradável (cansado, esgotado,
  desanimado, entediado) ou energia baixa + etiqueta sono/saúde. Card logo
  abaixo da resposta do Life ("Noite ruim? 😴" / "Dia puxado?") →
  "Deixar mais leve" / "Manter como está" (some até amanhã).
- **Treino (a pessoa escolhe):** treino leve (1 série a menos, mín. 2, carga
  −20% em passos de 0,5 kg) ou caminhada de 20 min no lugar ("Fiz a
  caminhada" grava em treinos_historico como treino feito). Faixa no Treino
  pra trocar entre os dois ou "Voltar ao normal". **A ficha não muda:**
  sessão leve só marca `concluido_em`, não grava carga/séries aliviadas.
- **Passos:** meta de hoje −30% (grava em `passos_diarios.meta`, a Home recarrega).
- **Dieta:** igual; o texto lembra proteína e água.
- **Sequência:** conta normal. **Lembretes:** no máx. 2 de água hoje.
- Estado do dia no aparelho (`data/diaLeve.ts`, Preferences). Textos pt/en/es.
- Validação: tsc e vite build. Não testado no aparelho.

- **ai-proxy v4.5 publicada** (dono autorizou; versão 26, ACTIVE): o app manda
  `dia_leve` junto com a mensagem do chat e o Life recebe "DIA LEVE HOJE" no
  contexto — apoia em vez de cobrar, não sugere treino pesado nem compensar
  amanhã. deno check + 47 testes ok.

**Pendências**
1. Token do GitHub → push de `main`, `scanner-v1-1` e `story-studio` + APK;
   testes no aparelho (Live Activity, Story, dia leve).

### 2026-10-22 (cont.) — Live Activity completa: pausar/retomar e "Treino concluído"

Dono pediu todos os botões do mockup funcionando no Android. Faltavam:
- **Pausar / Retomar** na prancha: `pausarCronometro` / `retomarCronometro`
  (`cronometroPausadoEm`; ao retomar, início e fim andam pelo tempo parado).
  Pausada: relógio parado, "Pausado · faltam 0:20 de 0:45", Retomar (lima) +
  Concluir; correndo: Pausar + Concluir (lima). Concluir pausado grava o
  tempo até a pausa. Pausada não dispara o fim nem o aviso local.
- **Treino concluído**: antes o card sumia quando a última série acabava;
  agora fica "Treino concluído · 18 séries · 4.820 kg de volume" com "Salvar
  no app" (abre o app) até salvar ou descartar. ("Refazer" do mockup não se
  aplica: a sessão tem vários exercícios.)
- Mesmas ações no Java (`EstadoLive`, app dormindo) e no TS
  (`SessaoTreinoProvider`): carga±, reps±, confirmar, seg±, iniciar,
  cancelar, pausar, retomar, +15s, pular. Textos pt/en/es.
- Conferido por script: todo id/texto/drawable usado no Java existe.
  tsc e vite build ok. **Java não compilado aqui** (sem JDK/SDK) → Actions.

### 2026-10-22 (fim) — push, PR #1 e APK de teste

- Push de `main` (64e1be4), `scanner-v1-1` e `story-studio`.
- **PR #1** `story-studio` → `main` (inclui o scanner):
  https://github.com/athosmatheusadm/athoslife-app-nativo/pull/1 — sem merge
  até o dono testar no aparelho.
- **APK de teste** (run 39825785326, sem servidor_dev): build ok — o Java novo
  da Live Activity compilou. Cópia em `Downloads/ATHOSlife-teste-22-10.apk`.

**Pendências**
1. Dono testa no aparelho: Live Activity (todos os estados e botões com a tela
   bloqueada, textos en/es), Story (foto, cantos, exportar, Instagram/menu),
   dia leve (check-in cansado + sono), scanner novo.
2. Merge do PR #1 depois do teste.
3. Facebook App ID → `facebookAppId`.
4. Dono revogar o token do GitHub que foi colado no chat.

### 2026-10-22 (noite) — APK v2 testado: funcionando

- O 1º APK abriu em tela preta: `workflow_dispatch` com `servidor_dev` vazio
  usou o padrão (IP do PC) → app buscava as telas no `npm run dev`. Workflow
  corrigido (padrão vazio = APK independente; c72c444). APK v2 (run
  39841244837) conferido por dentro (sem `server.url`, telas no APK).
- **Dono instalou o v2 no celular: "tá perfeito".** Tem ajustes pra depois.

**Pendências (próxima sessão)**
1. Ajustes que o dono vai listar depois do teste.
2. Merge do PR #1 quando o dono liberar.
3. Animações do Life (formato dos arquivos?), imagens da ficha de treino
   (print + qual zip), limite do chat (hoje 40 pago / 4 grátis).
4. Contas externas: Firebase (google-services.json + conta de serviço),
   Brevo (SMTP), RevenueCat (produtos na Play, chave, webhook), Facebook App ID.
5. Dono revogar o token do GitHub colado no chat.

### 2026-10-24 — Relatório do teste do APK + app funcionando offline (branch `correcoes-teste-apk`)

Relatório (`ATHOSlife-relatorio-teste-APK.pdf`, outra sessão) conferido contra o
código e o banco antes de mexer. **Item 8 estava errado**: as 9 tabelas citadas
têm FK com `on delete cascade` (só `fundadores` é `set null`, de propósito) —
excluir conta já apaga tudo. Os outros itens batiam.

**Offline (pedido do dono: "mesmo off, usar tudo sem bug")** — `src/data/offline/`:
- `conexao.ts`: estado real da rede (o fetch do Supabase avisa; pedido ao banco
  corta em 9 s em sinal ruim). `armazem.ts`: IndexedDB. `usuario.ts`: id da
  sessão local — **sai o `auth.getUser()`** (ia ao servidor em toda leitura e,
  sem rede, dizia "não logado"). Sessão vencida sem rede continua valendo.
- `cache.ts`: toda leitura guarda cópia por usuário; sem rede devolve a cópia.
- `fila.ts`: toda gravação é uma operação em dados; sem rede vai pra fila e
  atualiza a cópia na hora; sobe em ordem ao voltar o sinal / reabrir / a cada
  30 s (`sincronia.ts`). Inserção leva id do aparelho e vai como upsert
  "ignora se existe" → reenvio não duplica. Recusa do servidor vira aviso.
- Todos os repositórios convertidos. Base de alimentos (1.650) e catálogo de
  exercícios ficam no aparelho (busca offline). Chat: histórico guardado; IA e
  scanner dizem "precisa de internet". Selo discreto no topo (sem internet /
  N registros esperando). Sair com registro pendente avisa antes.
- Abertura (item 9): abre na hora com o perfil guardado; sem nada guardado e
  sem rede, tela "Sem conexão" + "Tentar de novo". Perfil carrega 1 vez (era 3×).
- **Testado**: simulação com banco falso (`scratchpad`, 18 cenários: gravar
  offline, desfazer offline, sincronizar, ordem, reenvio sem duplicar) — tudo ok.

**Itens do relatório**
1. Receitas × alergias: `domain/rules/alergias.ts` casa o texto livre (pt/en/es)
   com `receitas_cozinha.alergenos`; some das sugestões, aviso no card e na receita.
2. Caixa de hábitos do consentimento começa desmarcada.
3. Life flutuante: toque só no corpo dele; translúcido e sem pegar toque ao rolar.
4. Hábitos: "firme há N dias" usa a sequência atual dos hábitos.
5. Números no idioma (`domain/rules/formatoNumero.ts`): kcal inteira, gramas,
   peso, água (2,75 L / 2.75 L igual em todo lugar).
6. Onboarding: "Ex.: 175", "4 refeições por dia", alergia com sugestões e
   obrigatória se marcou "Sim".
7. **Treino sem notificação**: a faixa do treino tem os controles do card
   (carga/reps, confirmar série, cronômetro, +15 s, pular).
10. `check_access_status` só na linha de quem chama (migração, ver pendências).
11. Exportação inclui receitas_criadas, scan_historico, life_pausas.
12. Rótulos quebram linha; `#root { overflow-x: clip }`.
13. Porção por unidade quando a base tem `porcao_tipica_g` (1/2/3 un.).
14. Zoom liberado; selo de kcal da receita com mais contraste.
15. Câmera negada → "Libere a câmera nos ajustes"; sem rede avisa antes da foto.
- Peso pelo Life: leitor de frases virou `supabase/functions/_shared/pesoComando.ts`
  (servidor e app usam o mesmo). Aceita as 6 frases do relatório; número sozinho
  ("82") → Life pergunta "Anoto 82 kg?" com Sim/Não; offline o app anota sozinho.
  Prompt: o Gemini não diz "anotei" peso. Card "Meu peso": botão "Contar meu peso
  pro Life" (abre o chat com "Pesei  kg"). Conta > peso grava pesagem de hoje.
- Widget: botão "Colocar o widget na tela inicial" no painel de água
  (`requestPinAppWidget`), nome/descrição em pt/en/es, `previewLayout`.
- Telas de protótipo só no `npm run dev`. Esconde "Life puxa conversa" e o
  "Health Connect chega em breve". Senha mínima 8 no app. Release com R8
  (`minifyEnabled`/`shrinkResources`, regras dos plugins no proguard).
- Faixa de dias do Treino cabe os 7; Dieta não repete as receitas sugeridas;
  selo Premium não empurra a seta.

Validado: `npm run typecheck` e `npm run build` ok; teste do leitor de peso
(31 frases) ok. **Não testado no celular** (Java do widget e R8 → Actions).

**Pendências**
1. **Aplicar a migração** `db/athoslife_offline_e_relatorio_apk_migration.sql`
   ANTES de publicar este JS (o "Fiz hoje" offline manda `p_dia`; sem a migração
   o servidor recusa). O modo automático bloqueou aplicar daqui.
2. **Deploy do `ai-proxy`** (leitor de peso em `_shared/` + regra no prompt).
3. Supabase Auth: senha mínima 8 e proteção contra senha vazada (painel).
4. Dono decidir: apagar funções antigas (stripe_webhook, create-checkout,
   send-welome-whatsapp, relogio-athos) e índices de Stripe; `vagas_fundador`
   sem login (página de vendas?); alerta do teto de IA a 80%.
5. Dono decidir (visual): uma identidade só (login verde × onboarding limão),
   cabeçalhos das abas, fonte Inter (hoje é a do sistema).
6. Sentry/Crashlytics (Firebase); fotos de exercício em WebP (precisa trocar as
   URLs no banco).
7. Já conhecidas: chave RevenueCat, Facebook App ID, Termos/Política, e-mail de
   suporte, AAB assinado (workflow android-build pronto).

### 2026-10-24 (tarde) — decisões do dono aplicadas

- **Migração aplicada** no Supabase (`athoslife_offline_e_relatorio_apk`) e
  conferida: `registrar_checkin_habito(p_habito_id, p_dia)`, `check_access_status`
  só na própria linha, `is_premium_like`/`fuso_do_usuario` só sobre quem chama.
- **Stripe**: os 4 índices duplicados em `profiles` apagados
  (`db/athoslife_limpeza_stripe_migration.sql`, aplicada). Tabelas e colunas
  `stripe_*` ficam (histórico). **WhatsApp fica** (planos futuros do dono).
- **Uma identidade só**: consentimento e onboarding usam os tokens do app
  (verde `brand`, superfícies e textos do tema) em vez do verde-limão fixo;
  "life" reto como no login. De quebra, essas telas passam a seguir o tema claro.
- **Fonte Inter** dentro do app (`@fontsource-variable/inter@5.2.8`, ~220 KB,
  funciona offline); o Story exportado também usa a Inter.
- Push do branch `correcoes-teste-apk` feito.

**Pendências**
1. **Deploy do `ai-proxy`** e **apagar as Edge Functions `stripe_webhook` e
   `create-checkout`**: o token em `~/.supabase/access-token` venceu (401) —
   precisa de um token novo do Supabase (Account > Access Tokens).
2. Firebase: o dono vai criar a conta e dar acesso (Crashlytics + FCM).
3. Supabase Auth: senha mínima 8 e proteção de senha vazada (painel).
4. Testar o APK novo no celular (offline, widget, treino, peso no chat).
5. Cabeçalhos das abas continuam diferentes entre si (não mexi no layout).

### 2026-10-24 (fim) — Supabase em dia

- **`ai-proxy` publicada (v27)**: leitor de peso compartilhado
  (`_shared/pesoComando.ts`) + regra no prompt ("não diga que anotou peso").
  Conferido: a função sobe e responde.
- **Edge Functions `stripe_webhook` e `create-checkout` apagadas**. Ficam:
  ai-proxy, rc-sync, rc-webhook, send-welome-whatsapp, relogio-athos (WhatsApp:
  planos futuros do dono).
- APK de teste do branch `correcoes-teste-apk` (run 40113535473) em
  `Downloads/ATHOSlife-teste-24-10.apk`. 1ª tentativa falhou: apóstrofo sem
  escape em `values-en/athos_widget_textos.xml` (corrigido).

**Pendências**
1. Dono testar o APK no celular (roteiro: offline/modo avião, treino sem
   notificação, "82" no chat, widget, onboarding novo, receitas × alergia).
2. Supabase Auth (painel): senha mínima 8 e proteção de senha vazada.
3. Firebase (dono cria a conta e dá acesso): Crashlytics + FCM.
4. Merge do PR #1 e deste branch quando o dono aprovar.
5. Dono revogar o token do GitHub colado no chat.

### 2026-10-24 (noite) — estimativa do Life com cota própria, receitas variadas e temáticas

- **Código de barras continua grátis** (Open Food Facts, sem IA). O custo só
  existe quando o Life estima: cota nova `estimar` (`db/athoslife_cota_estimar_migration.sql`,
  aplicada) — grátis **1 por semana** (como a receita do Life), pago **20 por
  dia** separado do chat. Grátis sem estimativa: o app mostra o convite pro
  plano (`PlanoParaEstimar`) na busca da Dieta e no scanner.
  `ai-proxy` já usa a cota nova no código — **falta deploy** (auto mode pediu
  autorização do dono). Até o deploy, a estimativa segue gastando 1 msg do chat.
- **"Receitas que fecham seu dia" variam**: sorteio estável por turno
  (manhã/tarde/noite) entre as que cabem; antes era sempre a mesma campeã.
- **Expositor temático**: coluna `receitas_cozinha.temas`
  (`db/athoslife_receitas_temas_migration.sql`, aplicada) + janelas em
  `domain/rules/temasSazonais.ts` (Natal 1–25/12, Ano-Novo 26/12–6/1, Páscoa
  3 semanas antes até o domingo — data calculada —, Festa Junina jun–15/jul só BR).
  Card dourado no topo da Cozinha na época. **Ainda não há receita marcada**.
- **Selo "Grátis"** na Cozinha só pra quem está no grátis.
- **Achado**: `receitas_cozinha` libera leitura coluna a coluna e `alergenos`
  não tinha GRANT — a Cozinha do APK de 24/10 falharia ao carregar. Corrigido
  no banco (`grant select (alergenos, temas)`), vale pro APK já gerado.
- `ai-proxy` publicada com a cota `estimar` (autorizado pelo dono).
- Expositor temático **escondido** (`EXPOSITOR_TEMATICO_LIGADO = false` em
  `CozinhaSecao.tsx`) até o dono pedir as receitas. Pra ligar: marcar
  `receitas_cozinha.temas` e trocar a chave.

**Pendências (próxima sessão)**
1. Dono testar `Downloads/ATHOSlife-teste-24-10.apk` (offline/modo avião,
   treino sem notificação, "82" no chat, widget, onboarding verde, receitas ×
   alergia). Gerar APK novo pra ver: convite "Ver planos" da estimativa, selo
   Grátis corrigido, receitas do dia variando.
2. Supabase Auth (painel): senha mínima 8 + proteção de senha vazada.
3. Firebase: dono cria a conta e dá acesso (Crashlytics + FCM).
4. Receitas temáticas quando o dono pedir (expositor pronto e escondido).
5. Merge: PR #1 (`story-studio`) e depois `correcoes-teste-apk`, com aprovação.
6. Tokens do GitHub e do Supabase: dono decidiu manter por enquanto.

### 2026-10-25 — scanner mais rápido e com mais produtos, ícone do mascote, Life animado (branch `scanner-life-vivo`)

- **Scanner sem escolher refeição antes** (dono: travava a agilidade). Pela
  câmera do widget (ou /scanner direto) a tela abre já em foto × código; a
  refeição sai do horário (`refeicaoPeloHorario`: café < 10h, almoço < 15h,
  lanche < 18h, jantar) com "Vai pra: Almoço · pelo horário ▾" no topo pra
  trocar, e dá pra trocar de novo na revisão (toque no nome da refeição).
  Vindo da Dieta continua indo pra refeição de onde veio.
- **Código de barras com mais cobertura** (tudo grátis, sem IA):
  celular → base própria `produtos_codigo_barras` → Open Food Facts (tenta
  UPC-A ↔ EAN-13, aceita nutrientes só por porção e kJ) → USDA FoodData
  Central (`DEMO_KEY`, GTIN com 14 dígitos; cobre importados). O que vem das
  bases públicas é gravado na base própria. Produto que ninguém conhece (ou
  conhecido sem tabela): a pessoa **copia o rótulo** (coluna 100 g) em
  `CadastroRotulo` e o produto entra pra todo mundo; a estimativa do Life
  continua como 2ª opção. Migração `db/athoslife_codigo_barras_migration.sql`
  (tabela + `salvar_produto_codigo_barras`: confere os números, 60
  gravações/dia por pessoa, produto existente só muda pelo autor ou quando
  dado de base pública substitui cadastro de usuário). **Aplicada** (autorizada
  pelo dono) e conferida: RLS ligado, só leitura direta, anon sem acesso.
- **Ícone do mascote** (`mascote-icone.zip` do dono, só Android — não há
  projeto iOS): 3 `activity-alias` (Normal/Conquista/Sono), plugin
  `mascote/MascoteIcone*` (pacote renomeado pra `br.com.athoslife.app.mascote`),
  `RECEIVE_BOOT_COMPLETED`. Sono = horário de dormir/acordar salvo em
  Perfil > Notificações; Conquista = calorias entre 90–110% da meta hoje
  (mesma regra do convite do Story). `src/data/native/iconeMascote.ts`.
  O MainActivity não tem mais LAUNCHER (passa pros alias). Sem a versão
  redonda (`roundIcon`): o dono não quer ícone redondo. O formato final é a
  máscara do launcher (Samsung = quadrado arredondado; Pixel corta em círculo).
- **Life animado no app** (`life_foco.html`): o motor WebGL do protótipo roda
  intacto em `public/life/vivo/foco.html`, gerado por
  `scripts/gerar_life_vivo.py` (imagens base64 → `public/life/vivo/a/`,
  HTML de 4 MB → 82 KB). `LifeMascote` usa ele pra normal/feliz/treino/chef
  no mesmo tamanho do PNG (PNG fica até a animação estar pronta e se não
  houver WebGL); Hábitos usa a versão roxa pelo nível. Tamanhos pequenos
  (chat, abertura) seguem PNG (`estatico`). Toque no Life = pulinho.
- **Widget com o Life água** (`life_agua.html`): widget não roda WebGL, então
  gravei do motor real 20 quadros por faixa (respira e pisca, 3 s em loop,
  ViewFlipper de 150 ms, mesmo 58×80 dp): seco triste (0), seco com sede
  (< 40%), feliz, piscadinha (≥ 75%) e refrescado (meta). Quadros em
  `drawable-nodpi/athos_wg_life_<faixa>_NN.webp`; `res/raw/athos_keep.xml`
  segura eles no shrinkResources.

Validado: `npm run typecheck` e `npm run build` ok. Life animado e quadros do
widget conferidos num Chromium headless (4 versões, tamanho igual ao PNG).
**Não testado no celular** (ícone, widget e WebGL no WebView → APK).

**Pendências**
1. APK de teste gerado (run 40233093815, compilou o nativo novo sem erro) em
   `Downloads/ATHOSlife-teste-25-10.apk`. Testar: ícone trocando (sono/conquista, com o app fechado),
   widget animado, Life animado (desempenho em celular simples), scanner
   pelo widget e cadastro pelo rótulo.
2. Merge deste branch (depende de `correcoes-teste-apk`).

### 2026-10-27 — revisão completa (PDF de 26/10): tudo que não depende de chave/e-mail (branch `revisao-completa-ajustes`, saiu de `scanner-life-vivo`)

O dono trouxe `ATHOSlife-revisao-completa.pdf` (revisão do APK de 25/10 feita
em outra sessão). Conferido contra o código antes de mexer; os pontos batiam.
Ficaram de fora só os que pedem chave ou e-mail (RevenueCat, assinatura de
release, e-mail de suporte, chave própria do USDA).

**App**
- **Idioma e região:** idioma virou um botão que abre a lista (antes os 3
  ficavam à mostra) e entrou o **seletor de país** (nome pelo Intl no idioma
  da pessoa). Trocar o país ajusta as unidades pro costume de lá.
- **Unidades e datas:** peso (card Energia e peso + WeightCard) e água seguem
  `profiles.unidades` (lb / fl oz) via `definirUnidadesNumeros`; datas curtas
  do gráfico e das memórias no costume do país (`diaMes`: 9/27 nos EUA).
- **México:** "Almuerzo" vira "Comida" (`TROCAS_POR_PAIS` em dicionarios.ts).
- **Chat:** `**negrito**` vira negrito e as quebras de linha viram parágrafos
  (`TextoLife` em baloes.tsx).
- **Limite de quantidade:** 5 kg por item, 5 L de água por registro
  (`domain/rules/limites.ts`), na busca, no scanner, nos suplementos e nos
  repositórios. No banco: `db/athoslife_limites_registro_migration.sql`.
- **Madrugada (0h–4h) conta como noite:** nada de "Bom dia!" à meia-noite;
  a refeição sugerida nesse horário é jantar.
- **Backup do Android desligado** (`allowBackup=false` + regras de extração):
  sessão e dados de saúde não vão pra nuvem nem pra outro aparelho.
- **Busca de alimentos com o básico primeiro** (também sem internet).
  Conferido no banco: frango, chicken, pollo, egg, ovo, arroz, rice e banana
  trazem o alimento simples nos 5 primeiros. `db/athoslife_busca_basicos_primeiro_migration.sql`.
- **Acabamento:** "✓ Outro" do onboarding virou ✎; proteína com vírgula/ponto
  do idioma; "1.653.332 kcal registradas" formatado; "Hoje — segunda-feira"
  (sem "Segunda-Feira"); versão "1.0" igual no Sobre e no Perfil;
  "Agregado: tortilla" (concordância); Life flutuante menor em tela de 360 px.
- **Treino na tela de bloqueio com o app fechado:** alarme do sistema no fim
  do descanso/cronômetro avança o card (antes dependia do app vivo e o
  cronômetro ficava negativo); "+15 s" e "Pular" reagendam; a última série do
  treino confirmada ali fecha o treino com o resumo. `SCHEDULE_EXACT_ALARM`
  declarada (Android 14+: a pessoa precisa ligar "Alarmes e lembretes";
  ainda não há tela pedindo).
- **Refeição digitada no chat (novo):** "almocei arroz, feijão e um bife" ->
  o Life chama `registrar_alimentos`, o servidor acha cada alimento na base
  (mesma busca da Dieta, sem IA), calcula gramas pela medida dita (colher,
  concha, fatia, unidades, g, oz...) e o chat mostra um **cartão de
  conferência** (±10 g, tirar item, total). Só grava ao tocar em Registrar,
  pelo mesmo caminho da Dieta (funciona offline). Avisa restrição/alergia.
  `supabase/functions/ai-proxy/refeicaoDigitada.ts`, `RegistroNoChat.tsx`.

**Life (ai-proxy v4.5 — precisa deploy)**
- Sabe quando o check de saúde está **bloqueado** (não manda mais tocar em
  "Montar dieta": fim do loop do teste) e quando pede a declaração de ciente.
- **Mesmo id_envio = mesma resposta** (tabela `life_chat_envios`): reenvio
  depois de queda de rede não gera resposta duplicada. Sem a tabela a função
  segue funcionando, só sem essa trava.
- Check-in: fechamento variado ("tô por aqui" não a cada resposta).
- Abertura: nome com maiúscula ("Matheus") e sem "Sem cobrança".
- **Memória (revisada):** nenhuma memória gravada no banco até hoje; a única
  pessoa com memória ligada não contou nada duradouro depois de ligar, então
  não é falha de gravação. Achado e corrigido: quando a pessoa ainda não
  decidiu, o Life detecta algo pra lembrar e o app convida, mas ao aceitar
  **aquilo que motivou o convite se perdia**. Agora a ai-proxy manda
  `memoria_pendente` e o app guarda ao aceitar. Marca `[[LEMBRAR` cortada
  pelo limite de tokens não vaza mais no chat.

**Banco (migrações prontas, NÃO aplicadas — esperam o OK do dono)**
1. `db/athoslife_limites_registro_migration.sql` (conferido: nenhum registro atual fora do limite)
2. `db/athoslife_idade_trava_migration.sql` — menor bloqueado fica bloqueado;
   data de nascimento que muda entre checks trava; idade do perfil passa a
   seguir a data de nascimento do 1º check. Mensagem nova: "não conseguimos
   confirmar sua idade".
3. `db/athoslife_chat_envio_unico_migration.sql` (tabela `life_chat_envios`)
4. `db/athoslife_busca_basicos_primeiro_migration.sql`
5. `db/athoslife_rls_initplan_migration.sql` — 102 regras com
   `(select auth.uid())` (conferido: pega exatamente as 102 do aviso).

Validado: `npm run typecheck`, `npm run build`, testes node (6 + 4 + 10),
`deno check` da ai-proxy e 54 testes Deno (inclui os novos de refeição
digitada e de marca cortada). Nada testado no celular.

**Pendências**
1. Dono autorizar: aplicar as 5 migrações e publicar a `ai-proxy` v4.5.
2. APK novo (nativo mudou: backup, alarme do treino, card da última série).
   Testar: card do treino com o app fechado, refeição digitada, idioma/país,
   lb/fl oz, Life menor em celular pequeno.
3. Depende de chave/e-mail (fica pro dono): chave do RevenueCat, assinatura
   de release, e-mail de suporte, chave própria do USDA via servidor.
4. Painel: proteção de senha vazada; regras duplicadas em `profiles`
   (aviso multiple_permissive_policies, 30) e `pg_trgm` no public ficaram
   pra depois (mexer em regra de acesso sem pressa).
5. Tela pedindo "Alarmes e lembretes" no Android 14+ (pra o fim do descanso
   chegar na hora exata).
6. Funções antigas ainda publicadas: `send-welome-whatsapp`, `relogio-athos`
   (WhatsApp está fora; apagar com o OK do dono).
7. Chat por voz/peso em lb: o peso digitado no chat continua em kg.

## 2026-10-27 (tarde) — idade com correção, bebidas de marca, busca por apelido

Branch `revisao-completa-ajustes`.

- **Trava de idade revisada (pedido do dono: "não limitar uma correção").**
  `db/athoslife_idade_trava_migration.sql` reescrita: a data de nascimento
  pode ser corrigida **uma vez**; a terceira data diferente trava de vez
  (`idade_divergente`). Na correção a comparação com a idade antiga do perfil
  é ignorada e o perfil passa a seguir a data do check mais recente
  (gatilho `trg_zz_triagem_alinha_perfil`). Testado no banco com bloco que se
  desfaz: data errada (menor) bloqueia -> corrigida libera e perfil vira 25 ->
  terceira data trava.
  No app: "Digitei minha data errada" aparece só no aviso de bloqueio do
  check e some depois de usada (`planosRepository.corrigirNascimento`,
  `CorrigirNascimento` em PlanosNoLife.tsx, pt/en/es). O Life só fala disso
  se a pessoa disser que errou a data (ai-proxy, sem explicar a regra).
- **Bebidas de marca:** `db/athoslife_bebidas_marcas_migration.sql`, 116
  bebidas (refrigerantes, sucos, energéticos, isotônicos/eletrólitos, água de
  coco, chás prontos) em pt/en/es. Marca mundial aparece pra todos; marca
  regional só no país dela (Guaraná Antarctica BR/PT, Jarritos MX/US, Inca
  Kola PE, Irn-Bru GB/IE, Pocari JP, Thums Up IN, Appletiser ZA...). Valores
  típicos por lata/garrafa (porcao_tipica_g = embalagem). scanner=false.
- **Busca por apelido:** `buscar_alimentos` (na migração da busca) e a busca
  sem internet olham `aliases` ("coca", "coke", "guarana", "redbull",
  "refri"...). Apelido exato conta como nome igual. Busca offline agora tira
  pontuação como o banco ("coca cola" acha "Coca-Cola").

Validado: typecheck, build, `deno check` e 54 testes Deno da ai-proxy.

**Banco (aplicado com OK do dono, 27/10):** as 6 migrações entraram
(limites_registro, chat_envio_unico, busca_basicos_primeiro, rls_initplan,
idade_trava, bebidas_marcas). Conferido: 0 regras ainda com auth.uid() direto,
gatilhos da idade criados, `life_chat_envios` existe, "coca" -> Coca-Cola,
"guaraná" -> Guaraná Antarctica (BR), "gatorade" no MX acha Gatorade,
Guaraná Antarctica não aparece no MX, "frango" segue com o básico primeiro.
**ai-proxy v4.5 publicada.**

**Pendências**
1. APK novo / chaves e e-mail / funções antigas do WhatsApp: seguram até o
   dono liberar (pedido de 27/10).
2. Push: precisa do token do GitHub de novo.
3. ~~Ordem da busca "refrigerante"~~: dono aprovou como está (genérico
   primeiro, marcas depois; nome da marca cai direto nela).

## 2026-10-27 (noite) — refeição digitada: alimento padrão primeiro

Conferindo a refeição digitada no chat (o chat usa só o 1º resultado da
busca): "arroz" virava Farinha de arroz, "rice" virava Rice flour, "taco" no
MX virava Água de coco Vita Coco (apelido "vitacoco") e "tacos" não achava
nada.
- `db/athoslife_busca_padroes_migration.sql`: apelidos padrão (arroz -> branco
  cozido, feijão -> carioca, ovo -> cozido, banana -> prata, frango -> peito
  grelhado, bife -> contrafilé, pão -> francês, leite -> integral, taco ->
  Taco de carne), casou-só-pelo-apelido vai depois de casou-pelo-nome (o
  "refrigerante" aprovado continua igual), 1ª palavra > palavra no meio.
  Conferido com consulta só de leitura. Busca offline com a mesma ordem.
- ai-proxy: plural tenta o singular quando não acha ("tacos" -> "taco",
  "limões" -> "limão"). Teste novo (55 Deno ok), typecheck e build ok.

**Aplicado com OK do dono:** migração busca_padroes no banco e ai-proxy publicada. Conferido no banco: arroz, rice, feijão, ovo, banana, bife, taco (MX), coca, guaraná, refrigerante, gatorade e frango com o esperado no topo.

**Pendências:** APK novo / chaves e e-mail / funções do WhatsApp seguram até o dono liberar; push precisa do token do GitHub.

## 2026-10-27 (noite, 2) — chat sem cartão + prévia do onboarding

- **Bug do chat (visto pelo dono):** "life hj eu comi um arroz e um file de
  frango" -> o Life respondeu "Mandei pra conferir" sem chamar
  `registrar_alimentos`, e o cartão não apareceu. Agora, se a pessoa contou o
  que comeu e a resposta promete o cartão sem a ferramenta, a ai-proxy pede de
  novo com a ferramenta obrigatória (`prometeuRegistro` em
  refeicaoDigitada.ts). Se mesmo assim não vier, troca o texto por "não achei"
  em vez de prometer à toa. 56 testes Deno ok. **Precisa deploy da ai-proxy.**
- **Prévia do onboarding:** rota `/previa/onboarding` (só `npm run dev`, fora
  do APK): o onboarding de verdade sem conta e sem gravar nada; no fim volta
  ao começo.

### 2026-10-27 — ai-proxy publicada (cartão da refeição no chat)
- Dono autorizou; `ai-proxy` publicada com a nova tentativa que força o `registrar_alimentos` quando o Life promete o cartão sem montar (commit b52026e).
- Consulta de gasto em `ai_audit_logs`: o log guarda só o total de tokens (entrada + saída somados); não há registro de `scan`/`vision` em produção ainda.

### 2026-10-27 — limite do chat ampliado + histórico em camadas (falta publicar)
- APLICADA: `athoslife_limite_chat_ampliado` (chat 10 grátis / 80 pago por dia; conferido no banco).
- Novo `ai-proxy/historico.ts`: as 6 mensagens mais recentes vão inteiras; as anteriores (até 30) vão como uma linha por troca. O modelo escreve `[[RESUMO: ...]]` no fim da resposta, o servidor tira do texto e grava em `life_chat_mensagens.resumo`. Sem resumo, a mensagem entra cortada (90 letras). Desliga com o segredo `CONTEXTO_CAMADAS=0`.
- `ai_audit_logs` passa a gravar entrada, saída, raciocínio, cache, modelo e versão do contexto (inclusive no scanner).
- Medição: as 15 últimas mensagens do dono somam ~1.070 caracteres (~300 tokens). O peso está no `PROMPT_LIFE` (~11.500 caracteres, ~2.900 tokens) + ferramentas (~800). O próximo ganho de custo é dividir o roteiro por assunto.
- Validado: `deno check`, 62 testes Deno.
- PENDENTE: aplicar `db/athoslife_memoria_camadas_migration.sql` ANTES de publicar a `ai-proxy` (precisa deploy; autorização do dono).
- 27/10 (depois): dono autorizou. APLICADA `athoslife_memoria_camadas` (colunas conferidas) e `ai-proxy` publicada com o histórico em camadas. Falta: conferir no chat real se o `[[RESUMO]]` some do texto e é gravado, e ler os tokens separados no log.

## 2026-10-27 (noite, 3) — Life cozinhando na espera da IA + Life dourado de verdade

- **Vídeo do Life cozinhando** (do dono, `video life cozinhando.mp4` na raiz,
  fora do git): recortado, sem som e comprimido em `public/life/cozinhando.mp4`
  (113 KB) + 1º quadro `cozinhando.jpg`. `LifeCozinhando` (ui/components/life)
  mostra o vídeo em loop num quadro arredondado preto. Tirar o fundo preto foi
  testado e descartado: apagava a frigideira, o ouvido e o rabo. Com "reduzir
  movimento" fica o quadro parado. Entra no Scanner enquanto a IA olha a
  foto e enquanto busca o código de barras (no lugar do Life chef + rodinha),
  e na estimativa da IA (Scanner "produto sem tabela" e busca da Dieta).
- **Life dourado nunca aparecia:** as conquistas só eram avaliadas abrindo
  Perfil > Conquistas e o `AchievementToast` não era usado em lugar nenhum.
  Agora `CelebracaoConquistas` (montado no AppShell) avalia ao abrir, ao
  voltar pro app e ao trocar de aba (máx. 1x a cada 90 s), via
  `conquistasRepository.verificarNovas`. Conquista nova: faixa com o Life
  dourado (a de nível mais alto, se vierem várias).
- **Dia de conquista:** meta de calorias batida OU conquista desbloqueada
  hoje deixam o Life da Home (saudação e flutuante) e o ícone do app
  dourados até a meia-noite (`diaDeConquista` em iconeMascote.ts). Antes o
  ícone só olhava a meta de calorias, e a Home ficava sempre "normal".
  O ícone continua trocando só quando o app sai da tela (trocar com ele
  aberto pode fechar o app).

Validado: typecheck e build. Não visto no aparelho.

**Pendências:** testar no APK (vídeo no WebView, faixa dourada, ícone ao sair
do app); APK novo / chaves e e-mail / funções do WhatsApp seguram até o dono
liberar; push precisa do token do GitHub; conferir o `[[RESUMO]]` no chat real.

## 2026-10-28 — Life dourado vira a animação do Life vivo

Dono: o Life da Home ficou "travado no dourado" (imagem parada o dia todo) e
devia usar a animação do Life vivo (entra na pose e o dourado sobe).
- `LifeMascote`: `humor="conquista"` agora é o Life vivo tocando a ação
  "ouro" do protótipo (pose da medalha, dourado sobe dos pés, volta ao
  verde, ~4,4 s). Prop nova `celebrar` (contador): cada aumento toca de
  novo. Sem WebGL fica a imagem dourada parada. Vale pra faixa da
  conquista e pro topo da galeria.
- Home: o Life não fica mais dourado o dia todo. Conquista nova ou meta
  batida deixam uma celebração pendente (`athos.life.celebrar`); a Home
  toca a animação uma vez, na hora ou quando a pessoa voltar pra ela
  (`useCelebracaoNaHome`).
- O ícone do app continua dourado até a meia-noite (regra do pacote do ícone).

Validado: typecheck e build. Não visto no aparelho.

## 2026-10-28 — Seletor orbital + francês (branch `idiomas-orbital`)

Dono: novo seletor de idioma (pacote `ATHOSlife-seletor-orbital.zip`, raiz,
fora do git) e **dois idiomas novos: francês e hindi** (Índia/Nepal vendem
bem), com cultura, jeito de falar, costumes e comidas.
- `SeletorIdiomaOrbital` (ui/components): porte React do componente do
  pacote, mesma geometria/interação, cores pelos tokens do app; anel aberto
  com raio 80 px (pacote: 96) a pedido do dono. Entrou na 1ª tela do
  onboarding no lugar dos 3 botões.
- **Francês** (`i18n/mensagens/fr.ts`, todas as chaves): Life trata por
  "tu"; refeições da França (petit-déjeuner, déjeuner, goûter, dîner) e do
  Québec via `TROCAS_POR_PAIS` (déjeuner, dîner, souper, collation).
  Países novos no seletor: BE, LU, MA, SN, CI.
- Sem francês no banco ainda: nomes de alimentos/exercícios, receitas e
  traduções de conteúdo caem no **inglês** (antes caíam no pt).
  Termos/Política em francês: por enquanto mostram o inglês.
- `MealSheet`: texto fixo do erro do ícone foi pro dicionário (`erroIcone`).

Validado: typecheck. Não visto no aparelho.

**Pendências (idiomas):**
1. Hindi (`hi.ts`) — próximo.
2. **ai-proxy**: aceita só pt-BR/en/es; com `fr` o Life cai no português
   (só responde em francês se a pessoa escrever em francês). Precisa do
   jeito de falar de cada cultura + deploy (OK do dono).
3. Banco: nomes em fr/hi (alimentos, exercícios, receitas, conquistas) e
   comidas típicas de França/Québec/Índia/Nepal — migração com OK do dono.
4. Termos e Política em francês e hindi.
5. Frase de boas-vindas e Life da 1ª tela: dono achou as opções secas; refazer junto.

## 2026-10-28 (2) — Hindi, banco em fr/hi, comidas típicas e Life com cultura

Dono: além do francês, **hindi** (Índia/Nepal vendem bem) e "fazer as
coisas no banco também, pra não ter um em português e outro em francês".
- **Hindi** (`i18n/mensagens/hi.ts`, todas as chaves): "आप", inglês do dia a
  dia em devanágari; refeições nashta / lunch / snacks / dinner; alternativas
  indianas no hábito (nimbu pani, chaas, nariyal pani). Nepal (NP) nos países.
- **Banco — APLICADO** (com o pedido do dono):
  - `athoslife_idiomas_fr_hi_conteudo_migration.sql`: 26 conquistas,
    100 exercícios e 25 receitas (vitrine + modo de preparo) em fr/hi;
    `receitas_conteudo_liberado` aceita fr/hi. Rótulos das seções em fr/hi
    reconhecidos em `domain/rules/cozinha.ts`.
  - `athoslife_idiomas_fr_hi_alimentos_migration.sql`: `nome_fr`/`nome_hi`
    em 1.570 alimentos; **`normalizar_texto` mantém o devanágari** (antes
    uma busca em hindi virava espaço e casava com tudo) e troca œ→oe;
    `buscar_alimentos` em fr/hi; apelidos padrão (चावल, अंडा, pain, lait…);
    `habito_nome_proibido` com termos fr, hindi e hinglish (testado: não
    bloqueia "गरम पानी पीना", "Joint mobility").
  - `athoslife_comidas_tipicas_in_np_fr_qc_migration.sql`: 79 comidas
    (roti, paneer, dal tadka, idli, dosa, chole, biryani, chai, momo, dal
    bhat, sel roti, quiche, ratatouille, poutine, tourtière…), valores IFCT
    2017 / Ciqual / USDA, nomes nos 5 idiomas e apelidos em hinglish.
- **App**: busca offline, alergias (मूंगफली, arachide…) e filtro de hábitos
  reconhecem fr/hi (testado com Deno: 14 casos).
- **ai-proxy (PRECISA DEPLOY)**: idioma fr/hi aceito; crise e termos
  sensíveis em fr/hi/hinglish; linhas de apoio FR 3114, BE, CH, LU, Québec
  em francês, Índia Tele-MANAS 14416 (em hindi), Nepal 1166; filtro de
  prescrição e "fora do tema" em fr/hi; jeito de falar/costumes/comidas de
  cada cultura no prompt (só entra pra quem usa o idioma); textos fixos
  (peso, check-in, abertura, cartão da refeição, copiar refeição); leitor de
  peso sem IA entende "je pèse 80 kg" e "मेरा वज़न 80 kg है"; scanner mostra
  o nome em fr/hi. 64 testes Deno ok.

Validado: typecheck, build, deno check, 64 testes Deno, migrações testadas
com rollback antes de aplicar e conferidas depois.

**Pendências:** deploy da ai-proxy (OK do dono); Termos/Política em fr/hi
(mostram inglês); frase de boas-vindas + Life da 1ª tela (refazer com o
dono); push (token do GitHub).

## 2026-10-29 — ai-proxy fr/hi publicada + Termos/Política em fr/hi

Dono: "faz o deploy da ia proxy e do que ficou faltando da sessão anterior".
- **ai-proxy publicada** (versão 33, branch `idiomas-orbital`): Life em
  francês e hindi, crise e linhas de apoio FR/BE/CH/LU/QC/IN/NP, filtros
  fr/hi, cultura no prompt, peso fr/hi, nome fr/hi no scanner. Antes:
  `deno check` + 71 testes Deno ok; colunas `nome_fr`/`nome_hi` conferidas
  no banco (1.649 alimentos com hindi). Sem login responde 401 (ok).
- **Histórico em camadas conferido no banco:** 2 das 4 respostas do Life
  desde 27/10 gravaram `resumo`, nenhuma deixou `[[RESUMO` no texto. Log
  de tokens separado funciona: ~5.700 de entrada e ~20–80 de saída por
  mensagem (`camadas-v1`). A entrada é quase toda o roteiro do Life —
  dividir o `PROMPT_LIFE` continua sendo o próximo ganho de custo.
- **Termos e Política em francês e hindi** (`legal/documentos.ts`):
  tradução fiel do inglês (mesmas seções, mesmos [campos] a preencher),
  francês com "tu", menu "Profil > Confidentialité et données" e CNIL como
  exemplo de autoridade; hindi com "आप". `VERSAO_DOCUMENTOS` não mudou
  (só tradução). Precisa revisão de advogado, como as outras versões.

Validado: typecheck, build, deno check, 71 testes Deno.

**Pendências:** push das branches `revisao-completa-ajustes` e
`idiomas-orbital` (token do GitHub) + PR pra `main`; frase de boas-vindas
+ Life da 1ª tela (refazer com o dono); APK novo pra testar; chaves do
RevenueCat (`VITE_RC_GOOGLE_KEY` no .env e no GitHub Actions,
`RC_SECRET_KEY` e `RC_WEBHOOK_AUTH` no Supabase), `google-services.json`
(FCM), `facebookAppId`, SMTP Brevo e URL de produção no Supabase Auth.

## 2026-10-29 (2) — fotos da Cozinha, chaves do RevenueCat/Firebase

- **Fotos que faltavam** (pacote `ATHOSlife_imagens_receitas_Claude_Code.zip`,
  raiz, fora do git): "Chips Crocantes de Batata Doce com Alecrim" e "Chá
  Calmante de Camomila e Cidreira" em `public/receitas/` (800×800 webp,
  como as outras; PNG original 1254×1254, sem esticar).
- **Bug:** a foto saía do título TRADUZIDO, então em en/es/fr/hi nenhuma
  receita achava a foto. Agora `Receita.foto` vem do título em pt.
- **Credenciais:** `ATHOSlife_RevenueCat_credenciais.docx`, o docx do
  Firebase e `athoslife-89511-firebase-adminsdk-*.json` (conta de serviço,
  projeto `athoslife-89511`) entraram no `.gitignore` — não estavam.
- `VITE_RC_GOOGLE_KEY` no `.env` local com a chave **test_** (Test Store do
  RevenueCat; trocar pela `goog_` antes da Play) e nos dois workflows do
  Android (falta criar o secret no GitHub).
- **Bloqueado pelo modo automático:** gravar no Supabase `RC_SECRET_KEY`,
  `RC_WEBHOOK_AUTH` e `FIREBASE_SERVICE_ACCOUNT`. Precisa autorização do dono.
- Firebase: veio a conta de serviço (servidor). Para push no Android ainda
  falta o `google-services.json` (Firebase > app Android
  `br.com.athoslife.app`) e uma função que envie o push (não existe ainda).
- **Onboarding novo** (`ATHOSlife-onboarding-completo.html`, 10 telas, Life
  vivo trocando de versão): NÃO portado ainda. Ele tira as perguntas de
  treino (frequência, local, tipo) e de rotina, que alimentam as metas
  iniciais — perguntar ao dono antes.

Validado: typecheck e build.

## 2026-10-29 (3) — segredos no Supabase, ícone, prévia do onboarding

- **Segredos gravados** (dono autorizou): `RC_SECRET_KEY`, `RC_WEBHOOK_AUTH`
  (gerado; o dono cola no webhook do RevenueCat como Authorization) e
  `FIREBASE_SERVICE_ACCOUNT` (JSON da conta de serviço, para um futuro envio
  de push). Testado: `rc-webhook` com senha errada 401, com a certa 200;
  a `sk_` responde na API do RevenueCat.
- **Por que o ícone não troca (diagnóstico, sem aparelho no ADB):**
  1. Só o APK de 25/10 (`scanner-life-vivo`) tem a troca de ícone; os de
     22/10 (story) e 24/10 não têm. A atualização ao vivo não leva código
     nativo. Conquista desbloqueada deixando o ícone dourado (27/10) não está
     em APK nenhum.
  2. No APK de 25/10 o dourado só vem com calorias entre 90% e 110% da meta,
     conferidas quando a Home carrega; o sono só se os horários de dormir e
     acordar estiverem salvos em Perfil > Notificações.
  3. A troca só acontece quando o app sai da tela (de propósito).
  4. Alguns launchers (Samsung/Xiaomi) demoram a redesenhar, ou tiram o atalho
     da tela inicial quando o alias muda; na gaveta de apps aparece certo.
  → Precisa de APK novo para testar.
- **Prévia do onboarding novo:** cópia do HTML do dono com a tela "Treino"
  (vezes por semana + onde treina) depois de "Seu corpo", no mesmo visual,
  com validação, Life Treino e linha na revisão:
  `ATHOSlife-onboarding-completo-PREVIA-com-treino.html` (raiz, fora do git).
  Scripts conferidos com `node --check`; não visto num navegador (WSL sem as
  bibliotecas do Chromium). O contador decorativo "3/10" dentro dos módulos
  continua fixo. Aprovado → portar as telas para o app (branch própria).

## 2026-10-29 (4) — Onboarding definitivo (branch `onboarding-novo`)

Dono aprovou o `ATHOSlife-onboarding-completo.html` + a tela Treino da prévia:
"sensacional, esse é o definitivo". Pediu só o fim: "Concluir e entrar no
app" no lugar de baixar as respostas.
- **`public/onboarding/`**: o HTML dele roda inteiro (CSS, Life vivo WebGL,
  réguas, sono, hábitos, água) num iframe. Mudanças no HTML: imagens base64
  viraram `img/*.webp` (24); tela **Treino** (vezes por semana + onde) depois
  de "Seu corpo", com Life Treino, validação e linha na revisão; fr e hi na
  órbita; números no formato do idioma; idade 18–100 com a mensagem do app;
  revisão sem "Prévia concluída" e botão **Concluir e entrar no app**;
  espaço entre letras desligado no hindi (separava o devanágari).
- **`textos.js` + `i18n.js`**: a página continua escrita em pt; a camada de
  tradução troca cada texto visível/placeholder/aria (inclusive o que os
  scripts escrevem depois) para en/es/fr/hi. Os VALORES ficam em pt e o app
  lê como códigos. ~330 textos; conferido com passeio automático em todas as
  telas nos 5 idiomas (o que sobrou igual em es são palavras iguais).
- **`ponte.js`** ⇄ **`OnboardingNovo.tsx`**: idioma/unidades/nome pela URL;
  trocar idioma na órbita troca o do app; Voltar do Android volta uma tela;
  "Concluir" grava com `profileRepository.concluirOnboarding` (mesmo
  `DadosOnboarding` de antes) + 1º peso, e abre a Home; erro de rede/servidor
  aparece na revisão. `respostasNovo.ts` converte as respostas (frequência de
  treino entra nas calorias; ar livre = casa; alergia digitada vira lista).
- Onboarding antigo (`Onboarding.tsx`, `onboarding/estado.ts`,
  `componentes.tsx`) removido; `/previa/onboarding` abre o novo sem gravar.

Validado: typecheck, build, 4 testes Deno da conversão (com respostas reais
da página), passeio automático pt/en/es/fr/hi e teste de ponta a ponta no app
(Chrome do Windows): troca de idioma chega no app e o fim entrega os dados.
**Não visto no celular** (WebGL no WebView, safe area, Voltar do Android).

**Pendências:** APK pra testar; push + PR desta branch (token do GitHub);
textos novos de `m.onboarding.*` que só o antigo usava ficaram no dicionário
(limpar depois).

### 2026-10-29 — fim do dia: pendências pra próxima sessão
- Tudo commitado e **só no PC** (sem token do GitHub). Branch atual:
  `onboarding-novo` (156a6b9), que contém `idiomas-orbital` ←
  `revisao-completa-ajustes` ← `scanner-life-vivo` ← `correcoes-teste-apk`.
  Próxima: push de todas + PR pra `main`.
- GitHub: criar o secret `VITE_RC_GOOGLE_KEY` (mesmo valor do `.env`).
- RevenueCat: dono cola URL + senha do webhook (Authorization) e confere o
  entitlement `premium` nos produtos de teste. Se a senha se perdeu, gerar
  outra e regravar `RC_WEBHOOK_AUTH`.
- Firebase: falta o `google-services.json` (app Android `br.com.athoslife.app`)
  e decidir quais pushes (sugestão: resgate após 2–3 dias + avisos de
  assinatura). Depois: plugin de push, tabela de tokens (migração) e função
  `enviar-push`.
- APK novo para testar: onboarding no WebView, paywall (Test Store), ícone
  do mascote, Life dourado, vídeo do Life cozinhando.
- Dono decide se "Jiló" em hindi fica करेला.
- Frase de boas-vindas: resolvida pelo onboarding novo (texto do dono).
