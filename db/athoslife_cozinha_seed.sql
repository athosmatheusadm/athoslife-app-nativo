-- ============================================================================
-- SEED — Cozinha ATHOSlife · Catálogo de lançamento (25 receitas)
-- ============================================================================
-- PRÉ-REQUISITO: rodar antes a athoslife_cozinha_migration.sql
--   (senão a trava do banco recusa 'vegano' e 'habitos').
--
-- Este seed REDEFINE o catálogo da Cozinha para as 25 de lançamento, agora
-- COM conteúdo (as 10 antigas eram cascas sem o campo `conteudo`).
--
-- Todas premium = TRUE: a Cozinha é benefício de assinante. Quem está no
-- trial vê tudo; free (pós-trial) vê a vitrine trancada/cinza.
--
-- Reversível: é só re-rodar. Em pré-lançamento não há favoritos de usuário.
-- ============================================================================

BEGIN;

DELETE FROM public.receitas_cozinha;

INSERT INTO public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, mascote_modo, cor_tema, premium, destaque, ordem, conteudo)
VALUES

-- ===================== EMAGRECIMENTO (#22c55e) =====================
('Salada que Mata a Fome', 'Volume máximo, calorias mínimas', 'emagrecimento',
 '{"proteina":22,"carboidrato":18,"gordura":8}', 230, 'chef', '#22c55e', TRUE, TRUE, 1,
'POR QUE: Volume máximo, calorias mínimas — o prato que engana o estômago.

INGREDIENTES (1 porção):
- Folhas à vontade (alface, rúcula, espinafre)
- 100g de frango desfiado
- 50g de grão-de-bico cozido
- 1 tomate e 1/2 cenoura ralada
- 1 fio de azeite (5g) e limão

PREPARO:
1. Forre o prato com as folhas — quanto mais, melhor.
2. Distribua o frango e o grão-de-bico por cima.
3. Acrescente tomate e cenoura ralada.
4. Tempere com azeite, limão e sal na hora de comer.

DICA DO LIFE: Come as folhas primeiro, antes da proteína. A saciedade chega mais cedo.'),

('Overnight Oats Proteico', 'Café da manhã pronto na véspera', 'emagrecimento',
 '{"proteina":28,"carboidrato":45,"gordura":8}', 364, 'chef', '#22c55e', TRUE, TRUE, 2,
'POR QUE: Você prepara à noite e acorda com o café pronto. Zero desculpa de manhã.

INGREDIENTES (1 porção):
- 40g de aveia em flocos
- 1 scoop de whey (30g)
- 150ml de leite ou bebida vegetal
- 1/2 banana em rodelas
- Canela a gosto

PREPARO:
1. Misture a aveia, o whey e o leite num pote com tampa.
2. Acrescente a banana e a canela.
3. Tampe e leve à geladeira de um dia para o outro.
4. De manhã, come gelado. Pronto.

DICA DO LIFE: Faz dois potes de uma vez. Amanhã de manhã você me agradece.'),

('Sopa Termogênica', 'Acelera o metabolismo naturalmente', 'emagrecimento',
 '{"proteina":20,"carboidrato":22,"gordura":7}', 231, 'chef', '#22c55e', TRUE, FALSE, 3,
'POR QUE: Quente, encorpada e leve. Perfeita pra noite sem pesar.

INGREDIENTES (1 porção):
- 100g de frango desfiado
- 1 tomate e 1/2 cebola
- 1 dente de alho
- Gengibre ralado e pimenta a gosto
- Legumes a gosto (abobrinha, cenoura)

PREPARO:
1. Refogue alho, cebola e gengibre.
2. Junte o tomate e os legumes picados.
3. Cubra com água, tempere e cozinhe 15 minutos.
4. Acrescente o frango, ferva mais 5 minutos e sirva.

DICA DO LIFE: O gengibre e a pimenta dão aquele calorzinho que ajuda o metabolismo.'),

('Omelete de Forno com Legumes', 'Proteica e prática pra semana toda', 'emagrecimento',
 '{"proteina":25,"carboidrato":8,"gordura":14}', 258, 'chef', '#22c55e', TRUE, FALSE, 4,
'POR QUE: Faz uma vez, come a semana. Proteína de verdade no café ou no lanche.

INGREDIENTES (2 porções):
- 4 ovos
- 2 claras
- 1 xícara de legumes picados (tomate, espinafre, cebola)
- Sal, orégano e pimenta

PREPARO:
1. Bata os ovos e as claras com os temperos.
2. Misture os legumes picados.
3. Despeje numa forma pequena untada.
4. Asse a 180C por 20 minutos, até firmar.

DICA DO LIFE: Guarda na geladeira e leva pro trabalho. Come frio que fica ótimo.'),

('Frango com Abobrinha em Tiras', 'A troca esperta do macarrão', 'emagrecimento',
 '{"proteina":38,"carboidrato":12,"gordura":9}', 285, 'chef', '#22c55e', TRUE, FALSE, 5,
'POR QUE: A abobrinha em tiras engana como se fosse macarrão, com uma fração das calorias.

INGREDIENTES (1 porção):
- 150g de frango em cubos
- 1 abobrinha grande em tiras finas
- 1 tomate picado e alho
- 1 fio de azeite (5g)
- Manjericão e sal

PREPARO:
1. Faça tiras da abobrinha com um descascador.
2. Doure o frango com alho no azeite.
3. Junte o tomate e refogue.
4. Acrescente a abobrinha, mexa 2 minutos e sirva.

DICA DO LIFE: Não cozinha demais a abobrinha — 2 minutos bastam, senão murcha.'),

-- ===================== MASSA (#3b82f6) =====================
('Bowl de Frango com Arroz', 'O clássico do ganho de massa', 'massa',
 '{"proteina":45,"carboidrato":60,"gordura":9}', 497, 'chef', '#3b82f6', TRUE, TRUE, 6,
'POR QUE: O básico bem feito. Proteína e carbo na medida pra construir músculo.

INGREDIENTES (1 porção):
- 150g de frango peito grelhado
- 150g de arroz branco cozido
- 100g de brócolis no vapor
- 1 fio de azeite (5g)
- Sal, alho e pimenta

PREPARO:
1. Tempere e grelhe o frango até dourar dos dois lados.
2. Cozinhe o brócolis no vapor por 5 minutos.
3. Monte: arroz na base, frango fatiado e brócolis por cima.
4. Finalize com o fio de azeite.

DICA DO LIFE: Troca o arroz branco pelo integral e você segura a fome por mais tempo.'),

('Wrap Proteico Rápido', 'Pronto em 10 minutos, cheio de proteína', 'massa',
 '{"proteina":38,"carboidrato":35,"gordura":12}', 400, 'chef', '#3b82f6', TRUE, FALSE, 7,
'POR QUE: Quando a fome aperta e o tempo é curto. 10 minutos e tá na mão.

INGREDIENTES (1 porção):
- 1 tortilha integral
- 120g de frango desfiado
- 2 colheres de requeijão light
- Folhas e tomate
- Sal e pimenta

PREPARO:
1. Espalhe o requeijão na tortilha.
2. Distribua o frango, as folhas e o tomate.
3. Tempere e enrole apertado.
4. Aqueça na frigideira 1 minuto de cada lado (opcional).

DICA DO LIFE: Prensa na frigideira sem óleo pra selar. Fica crocante e não abre.'),

('Panqueca de Banana e Aveia', 'Café da manhã que parece sobremesa', 'massa',
 '{"proteina":24,"carboidrato":50,"gordura":9}', 375, 'chef', '#3b82f6', TRUE, TRUE, 8,
'POR QUE: Doce, macia e cheia de energia pra treinar. Sem farinha branca.

INGREDIENTES (1 porção):
- 1 banana amassada
- 2 ovos
- 40g de aveia
- 1 scoop de whey (opcional)
- Canela

PREPARO:
1. Amasse a banana e misture com os ovos.
2. Junte a aveia (e o whey) até virar massa.
3. Doure em frigideira antiaderente, os dois lados.
4. Sirva com canela por cima.

DICA DO LIFE: Fogo baixo e paciência. Panqueca boa não tem pressa.'),

('Macarrão com Atum e Azeite', 'Barato, rápido e proteico', 'massa',
 '{"proteina":32,"carboidrato":58,"gordura":14}', 480, 'chef', '#3b82f6', TRUE, FALSE, 9,
'POR QUE: Prato de fim de mês que ainda entrega proteína de verdade.

INGREDIENTES (1 porção):
- 80g de macarrão (peso seco)
- 1 lata de atum escorrido
- 1 tomate picado e alho
- 1 fio de azeite (10g)
- Salsinha e sal

PREPARO:
1. Cozinhe o macarrão al dente.
2. Refogue o alho e o tomate no azeite.
3. Junte o atum e aqueça.
4. Misture o macarrão, finalize com salsinha.

DICA DO LIFE: Guarda meia concha da água do macarrão e joga no molho. Deixa cremoso.'),

('Batata Doce com Carne Moída', 'Dupla de força pra quem treina pesado', 'massa',
 '{"proteina":40,"carboidrato":55,"gordura":13}', 505, 'chef', '#3b82f6', TRUE, FALSE, 10,
'POR QUE: Carbo de qualidade e proteína densa. Combustível pra treino pesado.

INGREDIENTES (1 porção):
- 200g de batata doce cozida
- 150g de carne moída magra
- 1/2 cebola e alho
- Tomate e temperos
- Sal e pimenta

PREPARO:
1. Cozinhe a batata doce até ficar macia.
2. Refogue a cebola e o alho, junte a carne.
3. Acrescente o tomate e tempere bem.
4. Sirva a carne sobre a batata amassada.

DICA DO LIFE: Escorre a gordura da carne depois de dourar. Corta o excesso sem perder proteína.'),

-- ===================== VEGANO (#84cc16) =====================
('Bowl de Grão-de-Bico Temperado', 'Proteína vegetal que sustenta', 'vegano',
 '{"proteina":18,"carboidrato":48,"gordura":12}', 360, 'chef', '#84cc16', TRUE, TRUE, 11,
'POR QUE: Cheio, colorido e 100% vegetal. Prova que comida sem carne sustenta.

INGREDIENTES (1 porção):
- 150g de grão-de-bico cozido
- 100g de arroz integral
- Tomate, pepino e cebola roxa
- 1 fio de azeite (10g) e limão
- Cominho e sal

PREPARO:
1. Tempere o grão-de-bico com cominho, azeite e sal.
2. Pique os vegetais em cubos pequenos.
3. Monte o bowl: arroz, grão-de-bico e vegetais.
4. Finalize com limão.

DICA DO LIFE: Doura o grão-de-bico numa frigideira antes. Fica crocante e muda tudo.'),

('Tofu Grelhado com Legumes', 'Leve, dourado e cheio de sabor', 'vegano',
 '{"proteina":20,"carboidrato":18,"gordura":14}', 290, 'chef', '#84cc16', TRUE, FALSE, 12,
'POR QUE: Tofu bem temperado ninguém rejeita. Proteína vegetal de primeira.

INGREDIENTES (1 porção):
- 150g de tofu firme em cubos
- Legumes a gosto (pimentão, abobrinha)
- Shoyu e alho
- 1 fio de azeite (5g)
- Gergelim

PREPARO:
1. Seque bem o tofu e tempere com shoyu e alho.
2. Doure os cubos na frigideira até criar casquinha.
3. Refogue os legumes rapidamente.
4. Junte tudo e finalize com gergelim.

DICA DO LIFE: Segredo do tofu é secar bem antes. Tofu úmido cozinha em vez de dourar.'),

('Lentilha Cremosa com Arroz', 'O feijão-com-arroz vegano turbinado', 'vegano',
 '{"proteina":19,"carboidrato":62,"gordura":6}', 385, 'chef', '#84cc16', TRUE, FALSE, 13,
'POR QUE: Combinação perfeita de aminoácidos. Comfort food que nutre.

INGREDIENTES (1 porção):
- 100g de lentilha cozida
- 100g de arroz cozido
- 1/2 cebola e alho
- Tomate e cominho
- Sal e coentro

PREPARO:
1. Refogue cebola e alho.
2. Junte o tomate e o cominho.
3. Acrescente a lentilha e um pouco de água, cozinhe cremoso.
4. Sirva sobre o arroz, com coentro.

DICA DO LIFE: Lentilha com arroz formam proteína completa. Dupla imbatível.'),

('Panqueca Vegana de Aveia', 'Sem ovo, sem leite, sem culpa', 'vegano',
 '{"proteina":12,"carboidrato":54,"gordura":8}', 340, 'chef', '#84cc16', TRUE, FALSE, 14,
'POR QUE: Café da manhã vegano que dá liga sem ovo. Simples e gostoso.

INGREDIENTES (1 porção):
- 1 banana madura
- 40g de aveia
- 100ml de bebida vegetal
- Canela e fermento (1 pitada)

PREPARO:
1. Amasse a banana e misture com a bebida vegetal.
2. Junte a aveia, a canela e o fermento.
3. Deixe descansar 5 minutos pra encorpar.
4. Doure em frigideira antiaderente os dois lados.

DICA DO LIFE: A banana madura é o ovo dessa receita — ela é quem dá liga.'),

-- ===================== HÁBITOS (#f97316) =====================
('Quebrando o Ciclo do Açúcar', 'O doce que entrega prazer sem o tombo', 'habitos',
 '{"proteina":8,"carboidrato":25,"gordura":6}', 186, 'chef', '#f97316', TRUE, TRUE, 15,
'POR QUE: Vontade de doce não é fraqueza — é energia rápida que o corpo pede. Esse mata a vontade sem sabotar.

INGREDIENTES (1 porção):
- 1 banana madura congelada
- 1 colher de cacau 100% (10g)
- 1 colher de pasta de amendoim (15g)
- Canela a gosto

PREPARO:
1. Bata a banana congelada no processador até virar creme.
2. Junte o cacau e a pasta de amendoim.
3. Bata mais um pouco até ficar liso.
4. Polvilhe canela e come na hora, tipo sorvete.

UM PAPO DO LIFE: Esse aqui mata a vontade de verdade, e amanhã você não acorda se cobrando. Um passo de cada vez.'),

('Pipoca Salgada Consciente', 'A troca da besteira da noite', 'habitos',
 '{"proteina":6,"carboidrato":28,"gordura":9}', 210, 'chef', '#f97316', TRUE, FALSE, 16,
'POR QUE: Pra aquela fome de assistir série sem atacar o armário. Estala, crocante, controlada.

INGREDIENTES (1 porção):
- 30g de milho de pipoca
- 1 colher de azeite (5g)
- Sal e páprica a gosto

PREPARO:
1. Aqueça o azeite numa panela com tampa.
2. Coloque o milho e tampe.
3. Chacoalhe até parar de estourar.
4. Tempere com sal e páprica.

UM PAPO DO LIFE: Pipoca de panela é fibra e volume. Bem diferente de atacar o salgadinho.'),

('Chips de Batata Doce no Forno', 'No lugar do salgadinho de pacote', 'habitos',
 '{"proteina":4,"carboidrato":34,"gordura":7}', 220, 'chef', '#f97316', TRUE, FALSE, 17,
'POR QUE: A crocância do salgadinho, sem a lista de ingredientes impronunciáveis.

INGREDIENTES (1 porção):
- 1 batata doce média em fatias finas
- 1 colher de azeite (5g)
- Sal e alecrim

PREPARO:
1. Fatie a batata bem fininha.
2. Misture com o azeite e o sal.
3. Espalhe numa assadeira sem sobrepor.
4. Asse a 200C por 20-25 minutos, virando na metade.

UM PAPO DO LIFE: Trocar o pacote por isso, uma vez que seja, já é uma vitória. Vai empilhando.'),

('Café Gelado Proteico', 'No lugar do energético ou do refri', 'habitos',
 '{"proteina":20,"carboidrato":12,"gordura":4}', 165, 'chef', '#f97316', TRUE, FALSE, 18,
'POR QUE: A energia que você buscava no energético, com proteína e sem a bomba de açúcar.

INGREDIENTES (1 porção):
- 1 xícara de café gelado
- 1 scoop de whey (30g)
- 100ml de leite ou bebida vegetal
- Gelo e canela

PREPARO:
1. Bata o café, o whey e o leite no liquidificador.
2. Acrescente gelo e bata de novo.
3. Sirva com canela por cima.

UM PAPO DO LIFE: Aquele estalo das 15h não precisa vir de lata. Esse te levanta sem o tombo depois.'),

-- ===================== SHAKES (#06b6d4) =====================
('Shake Pós-Treino Perfeito', 'Recuperação muscular máxima', 'shakes',
 '{"proteina":35,"carboidrato":38,"gordura":4}', 328, 'chef', '#06b6d4', TRUE, TRUE, 19,
'POR QUE: A janela pós-treino pede proteína e carbo rápido. Esse entrega os dois.

INGREDIENTES (1 porção):
- 1 scoop de whey (30g)
- 1 banana
- 200ml de leite ou bebida vegetal
- 30g de aveia
- Gelo

PREPARO:
1. Junte tudo no liquidificador.
2. Bata até ficar homogêneo.
3. Toma logo depois do treino.

DICA DO LIFE: Bebe nos 30 minutos após o treino. É quando o músculo mais absorve.'),

('Shake Detox Verde', 'Limpa o organismo sem perder energia', 'shakes',
 '{"proteina":5,"carboidrato":14,"gordura":1}', 85, 'chef', '#06b6d4', TRUE, FALSE, 20,
'POR QUE: Leve, refrescante e cheio de micronutriente. Bom pra começar o dia.

INGREDIENTES (1 porção):
- 1 punhado de couve ou espinafre
- 1/2 maçã verde
- Suco de 1/2 limão
- 200ml de água de coco
- Gengibre e gelo

PREPARO:
1. Junte tudo no liquidificador.
2. Bata bem até dissolver as folhas.
3. Sirva gelado.

DICA DO LIFE: Não coa. A fibra da couve é metade do benefício.'),

('Vitamina de Banana e Whey', 'Simples, cremosa e saciante', 'shakes',
 '{"proteina":30,"carboidrato":40,"gordura":6}', 350, 'chef', '#06b6d4', TRUE, FALSE, 21,
'POR QUE: Café da manhã líquido pra quem não tem tempo. Cremoso e sustenta.

INGREDIENTES (1 porção):
- 1 banana
- 1 scoop de whey (30g)
- 200ml de leite ou bebida vegetal
- 1 colher de aveia
- Canela

PREPARO:
1. Junte tudo no liquidificador.
2. Bata até ficar cremoso.
3. Sirva com canela.

DICA DO LIFE: Congela a banana em rodelas na véspera. O shake fica tipo milk-shake.'),

('Shake de Morango Cremoso', 'Gostoso como sobremesa, limpo como refeição', 'shakes',
 '{"proteina":28,"carboidrato":30,"gordura":5}', 290, 'chef', '#06b6d4', TRUE, FALSE, 22,
'POR QUE: Sabor de sobremesa sem sair da linha. Mata a vontade de doce com proteína.

INGREDIENTES (1 porção):
- 100g de morango (fresco ou congelado)
- 1 scoop de whey (30g)
- 150ml de leite ou bebida vegetal
- 2 colheres de iogurte natural
- Gelo

PREPARO:
1. Junte tudo no liquidificador.
2. Bata até cremoso.
3. Sirva gelado.

DICA DO LIFE: Morango congelado dispensa gelo e deixa mais encorpado.'),

-- ===================== CHÁS (#10b981) =====================
('Chá pra Desacelerar', 'Relaxa sem sedação, pra fechar o dia', 'chas',
 '{"proteina":0,"carboidrato":2,"gordura":0}', 8, 'chef', '#10b981', TRUE, FALSE, 23,
'POR QUE: Um ritual quente pra baixar a rotação antes de dormir.

INGREDIENTES (1 xícara):
- 1 colher de camomila seca
- 1 colher de erva-cidreira
- 200ml de água quente
- Mel a gosto (opcional)

PREPARO:
1. Ferva a água e desligue.
2. Acrescente as ervas e tampe.
3. Deixe em infusão por 5 minutos.
4. Coe e adoce se quiser.

DICA DO LIFE: Toma sem pressa, longe da tela. Metade do efeito é o ritual.'),

('Chá Verde Termogênico', 'Um empurrãozinho pro metabolismo', 'chas',
 '{"proteina":0,"carboidrato":1,"gordura":0}', 5, 'chef', '#10b981', TRUE, FALSE, 24,
'POR QUE: Antioxidante e leve estímulo ao metabolismo. Bom no meio da manhã.

INGREDIENTES (1 xícara):
- 1 colher de chá verde
- 200ml de água a 80C
- Rodela de limão

PREPARO:
1. Aqueça a água sem ferver.
2. Acrescente o chá e deixe 3 minutos.
3. Coe e finalize com limão.

DICA DO LIFE: Água fervente queima o chá verde e amarga. 80C é o ponto.'),

('Chá de Gengibre e Limão', 'Quente, cítrico e reconfortante', 'chas',
 '{"proteina":0,"carboidrato":4,"gordura":0}', 18, 'chef', '#10b981', TRUE, FALSE, 25,
'POR QUE: Aquece, ajuda a digestão e dá aquela sensação de cuidado.

INGREDIENTES (1 xícara):
- 3 rodelas de gengibre
- Suco de 1/2 limão
- 200ml de água
- Mel a gosto

PREPARO:
1. Ferva a água com o gengibre por 5 minutos.
2. Desligue e acrescente o limão.
3. Adoce com mel se quiser.

DICA DO LIFE: Depois de comer demais, esse chá é seu melhor amigo.');

COMMIT;
