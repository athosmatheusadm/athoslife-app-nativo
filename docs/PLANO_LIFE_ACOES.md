# Life que faz o que pedem — plano de construção (02/11/2026)

Fonte: guia do dono "Life: guia de conversa e memória" (01/11) + o teste
"vamos pôr as refeições de amanhã no lugar, só faltando um ok quando comer"
(02/11). Decisões do dono: o Life não empurra pro "Montar dieta"; o pago
nunca recebe contexto enxuto; check-in do dia sempre no prompt.

Regra de cada fase: banco primeiro (migração aplicada antes do JS), testes
Deno + typecheck + build, WORKLOG, commit. Mudou ai-proxy → deploy. Mudou
app → entra no próximo APK.

## Já no ar (01–02/11)
- Itens 1–3 do guia (ordem do chat, linha "Agora:", regras de conversa).
- Flash no chat; 40 msgs/dia e teto do mês trocam só o modelo no pago.
- Memória em camadas + importância dos eventos (itens 9 parcial).
- Prompt por assunto (ai-proxy v40).

## Fase 1 — Refeições planejadas + "Comi ✓"  ← no ar (v41); aparece no APK novo
- Tabela própria `refeicoes_planejadas` (o que o Life deixou no lugar e a
  pessoa ainda não comeu). Não entra em nenhuma soma até o "Comi ✓", que move
  o item pra `itens_refeicao` pelo caminho de sempre (offline incluído).
  Separada de `itens_refeicao` pra não mexer em Home, Dieta, gráficos,
  conquistas e contexto, e pra o APK antigo não contar comida planejada.
- Ferramenta `programar_refeicao` (hoje até +14 dias): alimentos pedidos,
  o dia-modelo do plano de dieta (`planos_gerados.plano`) ou a cópia de um
  dia que ela já comeu. Card pra conferir → Confirmar → Desfazer.
- Dieta: itens planejados apagadinhos na refeição, com "Comi ✓" e ×; faixa de
  dias até 7 à frente.
- Prompt: `programar_refeicao` nas ações; "colocar nas refeições não é montar
  dieta".

## Fase 2 — Tropeço pelo chat  ← no ar (v41), funciona no APK atual
- Gatilho do horário local em `recaidas` (guia item 4).
- `registrar_tropeco` com confirmação em um toque (sem gastar mensagem).

## Fase 3 — Ações no treino (guia item 6)  ← no ar (v42), funciona no APK atual
- `adicionar_exercicio`, `copiar_treino` ("só hoje" por enquanto é texto: abre a ficha do outro dia; botão `abrir_treino` fica pra depois),
  linha da ficha no contexto, `exercicios_pedidos`.

## Fase 4 — Água e hábito pelo chat + desfazer (guia item 7)  ← no ar (v42), funciona no APK atual
- "Bebi 2 copos" sem IA e sem cota; `marcar_habito`; desfazer em toda ação.

## Fase 5 — Aviso de recaída com licença (guia item 8)  ← no ar (v42) DESLIGADO (life_config); falta APK + validação do psicólogo
- `life_avisos`, licença, papo leve na abertura, notificação local.
- Antes de ligar: régua validada com o psicólogo (guia item 12).
- Fica pra depois: janela de risco fixa semanal, licença também pela tela de Hábitos (hoje só pelo chat), cancelar o alô em dia pausado.

## Fase 6 — Jeito de falar desde a 1ª mensagem (guia item 10)  ← código pronto (falta migração `estilo_confianca` + deploy)
- `estiloDaPessoa`: bloco COMO_FALAR_COM_ELA desde a 1ª mensagem — até 2 msgs "primeiro palpite", 3–9 "tende a", 10+ regra. Registro (informal/formal), tamanho, emoji, risada, energia.
- Pedido explícito vale na hora (pt/en/es): direto × explicar, sem emoji, sugestão pronta × opções, gramas × medida caseira. O último de cada grupo vence. "Só quero conversar" vale só no momento.
- Memória de estilo com confiança: < 0,7 entra como "Parece preferir: … (palpite)"; confirmado sobe +0,15; contrariado é trocado; pedido dela (1) não é trocado por dedução.

## Fase 7 — Velocidade (guia item 11)  ← código pronto (falta migração `duracao_chat` + deploy + APK novo pro streaming)
- Streaming: o app novo manda `stream: true`; o servidor responde NDJSON (rascunho → fim). O rascunho passa pelos filtros de saída (prescrição, receita completa) e esconde as marcas `[[...]]` e o `[fora]`; se um filtro pegar, o rascunho para e a resposta final troca. APK atual: JSON de sempre.
- Leituras do chat numa rodada só, saindo junto com a cota; planos de referência no mesmo `allSettled`; auditoria e faxina em segundo plano.
- `duracao_ms` e `primeira_palavra_ms` no `ai_audit_logs` (sem a coluna, grava sem).

## Fase 8 — Cota humana, humor do Life no chat (guia item 13)  ← código pronto (deploy + APK novo pro rosto e texto da cota)
- "sim" que só aceita a oferta do Life não conta (até 3/dia). Desabafo não é cortado: cota no fim + conversa emocional (palavra sensível agora ou nas últimas 2 h) = até 5 extras, contador escondido.
- Com 2 restantes o Life avisa numa frase; a última resposta resolve algo e diz que lembra de onde parou. Nunca no desabafo.
- `[[HUMOR: ...]]` → `humor` na resposta; cabeçalho troca a expressão (escutando→calmo, cozinhando→chef, treino, feliz). Desabafo sempre escutando; chef só com comida.
- Texto de cota esgotada: "O Life volta à meia-noite e lembra de onde vocês pararam." (5 idiomas).

## Fase 9 — Resumos diários/semanais e busca por sentido (guia item 14)  ← resumos prontos (falta migração `resumos` + deploy); busca por sentido adiada
- Sem cron: na 1ª mensagem do dia, em segundo plano, a ai-proxy resume (Lite) até 3 dias que faltam dos últimos 7 e a semana passada. Só com memória ligada; dia com palavra de risco não é resumido; desligar a memória ou apagar todas as memórias apaga os resumos.
- No prompt: os resumos dos últimos 7 dias + o da semana passada.
- Busca por sentido (embeddings/`vector`): adiada até a memória crescer — hoje a busca por palavras + núcleo sempre no prompt dá conta.
