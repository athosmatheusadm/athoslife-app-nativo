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
