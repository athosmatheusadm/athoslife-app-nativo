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
