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

## Fase 3 — Ações no treino (guia item 6)  ← código pronto (falta migração + deploy; funciona no APK atual)
- `adicionar_exercicio`, `copiar_treino` ("só hoje" por enquanto é texto: abre a ficha do outro dia; botão `abrir_treino` fica pra depois),
  linha da ficha no contexto, `exercicios_pedidos`.

## Fase 4 — Água e hábito pelo chat + desfazer (guia item 7)  ← código pronto (falta migração + deploy; funciona no APK atual)
- "Bebi 2 copos" sem IA e sem cota; `marcar_habito`; desfazer em toda ação.

## Fase 5 — Aviso de recaída com licença (guia item 8)
- `life_avisos`, licença, papo leve na abertura, notificação local.
- Antes de publicar: régua validada com o psicólogo (guia item 12).

## Fase 6 — Jeito de falar desde a 1ª mensagem (guia item 10)
- Confiança do estilo no prompt ("parece preferir" × regra).

## Fase 7 — Velocidade (guia item 11)
- Streaming, menos idas ao banco, `duracao_ms` no log.

## Fase 8 — Cota humana, humor do Life no chat (guia item 13)

## Fase 9 — Resumos diários/semanais (cron) e busca por sentido (guia item 14)
