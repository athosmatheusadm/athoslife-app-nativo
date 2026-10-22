# Google Play — formulário "Segurança dos dados" (Data safety)

Rascunho preenchido a partir do código em 2026-10-21 (branch `scanner-v1-1`).
Conferir com o advogado antes de enviar. Se o app passar a coletar algo novo
(analytics, crash, localização), este arquivo e o formulário mudam juntos.

Play Console → Política e programas → Conteúdo do app → Segurança dos dados.

## 1. Visão geral

| Pergunta | Resposta | Por quê |
|---|---|---|
| O app coleta ou compartilha algum dos tipos de dados obrigatórios? | **Sim** | conta, saúde, fotos etc. |
| Todos os dados coletados são criptografados em trânsito? | **Sim** | Supabase, Gemini (via ai-proxy), RevenueCat e Open Food Facts são HTTPS |
| Você oferece uma forma de os usuários pedirem a exclusão dos dados? | **Sim** | Perfil → Privacidade → Excluir conta. **Falta:** a Play exige também um **link na web** pra pedir a exclusão sem instalar o app (ver item 5) |

## 2. Compartilhamento

**Nenhum dado é "compartilhado"** no sentido da Play. Os fornecedores abaixo
tratam os dados *em nosso nome* (prestadores de serviço), o que a Play não
conta como compartilhamento:

- Supabase: banco, login e arquivos
- Google Gemini: conversa com o Life, análise de foto, receitas
- RevenueCat / Google Play: assinatura
- Open Food Facts: recebe **só o número do código de barras**, sem nenhum dado do usuário

## 3. Tipos de dados coletados

Legenda das finalidades: **F** = funcionalidade do app, **C** = gerenciamento
da conta, **P** = personalização, **A** = prevenção de fraude/segurança.
Nenhum dado é usado para publicidade nem para análise de terceiros.

| Categoria → tipo | Coleta? | Obrigatório ou opcional | Efêmero? | Finalidades | Onde no app |
|---|---|---|---|---|---|
| Informações pessoais → **Nome** | Sim | Obrigatório | Não | F, C, P | cadastro, perfil |
| Informações pessoais → **Endereço de e-mail** | Sim | Obrigatório | Não | C | login |
| Informações pessoais → **IDs de usuário** | Sim | Obrigatório | Não | F, C | id da conta (Supabase, RevenueCat) |
| Informações pessoais → **Outras informações** | Sim | Obrigatório | Não | F, P | idade, sexo, país, idioma, fuso |
| Informações financeiras → **Histórico de compras** | Sim | Opcional (só quem assina) | Não | F, C | status da assinatura (RevenueCat). O cartão fica com a Google, não com a gente |
| Saúde e fitness → **Informações de saúde** | Sim | Obrigatório | Não | F, P | peso, altura, refeições, água, alergias, check-in emocional, hábitos, check de saúde do plano |
| Saúde e fitness → **Informações de condicionamento físico** | Sim | Obrigatório | Não | F, P | treinos, passos |
| Fotos e vídeos → **Fotos** | Sim | Opcional | **Não** (*) | F | foto de perfil, foto de receita criada (guardadas); foto do prato no scanner (analisada e descartada) |
| Atividade no app → **Outros conteúdos gerados pelo usuário** | Sim | Opcional | Não | F, P | conversas com o Life, receitas criadas, memória do Life |
| Atividade no app → **Interações com o app** | Sim | Obrigatório | Não | F, A | registro de uso da IA (cota diária), último acesso |
| Dispositivo ou outros IDs → **IDs do dispositivo** | Sim | Obrigatório | Não | A | ANDROID_ID, guardado só como hash, para "um teste grátis por aparelho" |

(*) A foto do prato sozinha seria "efêmera", mas a Play pergunta por tipo de
dado: como a foto de perfil e a de receita ficam guardadas, o tipo "Fotos"
fica como **não efêmero**.

**Não coletamos:** localização (aproximada ou precisa), telefone, endereço,
contatos, agenda, mensagens entre usuários, áudio, arquivos, histórico de
navegação, registros de falha/diagnóstico (não há Sentry/Firebase),
identificadores de publicidade.

## 4. Outros formulários do "Conteúdo do app" ligados a isto

- **Política de privacidade:** URL pública obrigatória. Publicar o texto de
  `src/ui/screens/legal/documentos.ts` numa página web (hoje só existe dentro
  do app). Antes, preencher razão social, CNPJ, endereço e e-mail do DPO e
  incluir o RevenueCat na lista de fornecedores.
- **Exclusão de conta:** URL na web onde a pessoa pede a exclusão (pode ser um
  formulário simples ou um e-mail descrito na página) + dizer quais dados são
  apagados e em quanto tempo (a Política diz 30 dias).
- **Declaração de apps de saúde:** a Play pede para apps de saúde/fitness.
  Marcar nutrição, condicionamento físico e bem-estar; **não** marcar recursos
  médicos/clínicos.
- **Público-alvo:** só **18 anos ou mais** (decidido em 2026-10-21 por causa dos
  termos do Gemini). Não marcar nenhuma faixa abaixo de 18.
- **Permissões:** CÂMERA (scanner de prato e de código de barras). Não exige
  declaração especial.
