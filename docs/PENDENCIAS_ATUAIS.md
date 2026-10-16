# Pendências consolidadas — 12/10/2026

Revisão local de `WORKLOG.md`, `STATUS.md` e código. Não houve consulta ao banco remoto, Play Console, Firebase, SMTP ou GitHub nesta revisão. “Registrado como concluído” significa que o diário relata a conclusão; não é uma nova verificação remota.

## Interface em andamento

- [ ] Integrar o novo onboarding ao cadastro real. Proposta-base em `/prototipo/onboarding-essencial` aprovada em 12/10; após teste, dono pediu mais fluidez e retorno do Life da água. Revisão atual: conversa guiada com uma pergunta por vez, resposta única avança ao toque, conteúdo detalhado preservado, hidratação com Life azul, suplementos expansíveis e roda numérica com renderização reduzida. Ainda precisa de avaliação visual dessa revisão, persistência entre sessões, traduções e ligação com triagem/metas/planos reais.

- [x] Padrão visual B: Phosphor duotone nas refeições, hábitos, Meu Plano e categorias da Cozinha.
- [x] Remover “Toque num disco” da Home, em todos os idiomas (removida a renderização).
- [x] Padronizar os emojis decorativos restantes do Life-chef, pausa do chat, montar dieta/treino e título de Hábitos. Símbolos de sexo nos formulários continuam com seu significado original.
- [ ] Aplicar `db/athoslife_icones_duotone_migration.sql` para salvar as escolhas de ícone. Migração preparada, sem execução remota nesta sessão.
- [ ] Ampliar categorias de hábitos, pedido do dono nesta conversa. Há ícones para várias atividades, mas categorias reais ainda são doce, fast food, refrigerante e leitura. Definir novas opções e alinhar categoria/tipo no app, servidor e traduções; trocar só o desenho não basta.
- [ ] Identificar o desenho chamado de “valinha” pelo dono; referência ainda não esclarecida.
- [ ] Revisar o resultado visual logado no navegador e APK. Não há validação visual automatizada nesta sessão.

## Conta e e-mail

- [ ] Configurar SMTP Brevo. Diário de 12/10 registra a escolha e a falta da configuração. Usar os canais de configuração apropriados para credenciais.
- [ ] Resolver confirmação de cadastro no celular: o diário registra link apontando para `localhost:3000`; decidir fluxo e URL de produção.
- [ ] Página web de exclusão de conta e política de privacidade: decidir hospedagem, identificação da empresa/desenvolvedor e e-mail de suporte.
- [ ] Completar Termos/Política com os dados reais e revisão prevista no diário.

## IA e Life

- [ ] Implementar os limites aprovados em 10/10: chat grátis 8/dia, pago 60/dia, histórico 12; scanner pago 15/dia e grátis 0; receitas grátis 1/semana e pago 10/dia. Atualizar SQL, histórico e apresentação dos planos juntos. Evidência local: `JANELA_HISTORICO = 15`; última definição SQL encontrada em `athoslife_cozinha_v2_migration.sql` tem chat 4/40 e vision 0/5. Não confirma os valores atualmente no banco remoto.
- [ ] Confirmar a decisão final sobre “Life estima” e o acabamento das estimativas no diário. A funcionalidade existe no código; a v3.10 foi registrada como publicada em 12/10, portanto a antiga tarefa “publicar v3.9” não deve ser repetida isoladamente.
- [ ] Testar respostas do Life nos três idiomas e os fluxos de alergias, recusa de receita completa, pausas e limites. Há roteiro em `scripts/estresse-life/`.
- [ ] Conferir teto/alertas de uso da IA e revogação de tokens mencionados no diário. Não verificados remotamente nesta revisão.

## Android e lançamento

- [ ] Google Play Billing: integração e configuração; diário registra que o dono está estudando.
- [ ] FCM: dono estava configurando; implementação e situação atual precisam de confirmação.
- [ ] Health Connect: adiado pelo dono até ter conta de desenvolvedor Play. Não confundir com os passos manuais já existentes.
- [ ] Exportação “Baixar meus dados” no APK: `Privacidade.tsx` ainda usa link com `download`; falta o fluxo nativo de salvar/compartilhar.
- [ ] Validar APK/AAB e assinatura, widget de água, Live Activity, câmera e lembretes no aparelho. Confirmar a situação do build/push no GitHub antes de tratar como ausente.
- [ ] Corrigir instalação local para o build Windows: `@rollup/rollup-win32-x64-msvc` ausente. TypeScript foi validado nas alterações visuais anteriores; isso não substitui build e teste no dispositivo.

## Conteúdo

- [ ] Fotos de “Chips de Batata Doce no Forno” e “Chá pra Desacelerar”: citadas como faltantes no diário e não localizadas pelos nomes esperados em `public/receitas` nesta revisão.
- [ ] Auditoria das ilustrações/exercícios de treino: pendência histórica de qualidade registrada no STATUS; confirmar o que o dono já entregou depois.

## Registrado como concluído — não repetir por causa de notas antigas

- Traduções do conteúdo: diário registra migração aplicada em 09/10 e conferida.
- Exclusão de conta no app: diário registra migração aplicada em 10/10; a página web é uma pendência separada.
- Alergênicos/restrições da Cozinha: migração registrada como aplicada em 12/10.
- Perfil > Metas: edição de alergias/restrições já implementada.
- ai-proxy v3.10: diário registra publicação pelo Claude, versão 20, em 12/10.
- Modelo de recuperação de senha com código: registrado como aplicado em 12/10; SMTP continua pendente.
- Música do timer: retirada do escopo pelo dono; não é tarefa pendente.

Esta lista complementa o histórico: manter o `WORKLOG.md` e atualizar aqui quando cada pendência for concluída ou descartada.

## Widget Android — validação antes do lançamento

- [ ] Compilar e instalar APK atualizado com a nova ponte nativa do widget (JDK ausente neste ambiente).
- [ ] Testar em aparelho: água no widget -> registro no banco -> total na Home, offline e reenvio, app fechado, troca de conta, abertura pelo Life e câmera/scanner. Nenhum dispositivo foi encontrado pelo ADB nesta revisão.
- Lógica de fila/rotas: 10 testes locais passaram; não equivalem a teste integrado Android/Supabase. Envio da fila depende de execução do app.
