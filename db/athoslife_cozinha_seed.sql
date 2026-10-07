-- ============================================================================
-- SEED — Cozinha ATHOSlife · Catálogo de lançamento (25 receitas)
-- Nomes e textos revistos em 2026-10-07 (athoslife_cozinha_nomes_migration.sql).
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
('Salada Power de Frango e Grão-de-Bico', 'Prato cheio, leve e que segura a fome', 'emagrecimento',
 '{"proteina":22,"carboidrato":18,"gordura":8}', 230, 'chef', '#22c55e', TRUE, TRUE, 1,
'SOBRE O PRATO: Uma salada de verdade, não de enfeite: muito volume de folha, frango e grão-de-bico pra sustentar até a próxima refeição.

INGREDIENTES (1 porção):
- Folhas à vontade (alface, rúcula, espinafre)
- 100g de frango desfiado
- 50g de grão-de-bico cozido
- 1 tomate e 1/2 cenoura ralada
- 1 fio de azeite (5g) e limão

PREPARO:
1. Lave e seque bem as folhas — folha molhada não segura tempero.
2. Corte o tomate em cubos e rale a cenoura.
3. Se o frango estiver frio, aqueça rapidinho numa frigideira sem óleo.

MONTAGEM:
1. Forre o prato com as folhas — quanto mais, melhor.
2. Distribua o frango e o grão-de-bico por cima.
3. Junte o tomate e a cenoura.
4. Tempere com azeite, limão e sal só na hora de comer.

DICA DO LIFE: Come as folhas primeiro, antes da proteína. A saciedade chega mais cedo.'),

('Overnight Oats Proteico', 'Café da manhã pronto na véspera', 'emagrecimento',
 '{"proteina":28,"carboidrato":45,"gordura":8}', 364, 'chef', '#22c55e', TRUE, TRUE, 2,
'SOBRE O PRATO: Você prepara à noite e acorda com o café pronto: cremoso, gelado e com proteína. Zero desculpa de manhã.

INGREDIENTES (1 porção):
- 40g de aveia em flocos
- 1 scoop de whey (30g)
- 150ml de leite ou bebida vegetal
- 1/2 banana em rodelas
- Canela a gosto

PREPARO:
1. Num pote com tampa, misture a aveia, o whey e o leite até não sobrar pó.
2. Tampe e leve à geladeira de um dia para o outro (mínimo 6 horas).

MONTAGEM:
1. De manhã, mexa bem — se estiver firme demais, junte um pouco de leite.
2. Cubra com as rodelas de banana e polvilhe canela.
3. Come gelado, direto do pote.

DICA DO LIFE: Faz dois potes de uma vez. Amanhã de manhã você me agradece.'),

('Sopa Termogênica', 'Quente, leve e com gengibre pra noite', 'emagrecimento',
 '{"proteina":20,"carboidrato":22,"gordura":7}', 231, 'chef', '#22c55e', TRUE, FALSE, 3,
'SOBRE O PRATO: Caldo encorpado de frango com gengibre e pimenta: aquece, conforta e não pesa. Perfeita pra noite.

INGREDIENTES (1 porção):
- 100g de frango desfiado
- 1 tomate e 1/2 cebola
- 1 dente de alho
- Gengibre ralado e pimenta a gosto
- Legumes a gosto (abobrinha, cenoura)

PREPARO:
1. Pique a cebola, o alho, o tomate e os legumes.
2. Refogue o alho, a cebola e o gengibre numa panela.
3. Junte o tomate e os legumes e mexa por 2 minutos.
4. Cubra com água, tempere e cozinhe por 15 minutos.
5. Acrescente o frango e deixe ferver mais 5 minutos.

MONTAGEM:
1. Sirva bem quente numa tigela funda.
2. Finalize com uma pitada de pimenta por cima.

DICA DO LIFE: Gengibre e pimenta dão aquele calorzinho gostoso. Quer mais caldo? Só pôr mais água — não muda quase nada nas calorias.'),

('Omelete de Forno com Legumes', 'Proteica e prática pra semana toda', 'emagrecimento',
 '{"proteina":25,"carboidrato":8,"gordura":14}', 258, 'chef', '#22c55e', TRUE, FALSE, 4,
'SOBRE O PRATO: Faz uma vez e come a semana: omelete alta, macia e cheia de legumes. Proteína de verdade no café ou no lanche.

INGREDIENTES (2 porções):
- 4 ovos
- 2 claras
- 1 xícara de legumes picados (tomate, espinafre, cebola)
- Sal, orégano e pimenta

PREPARO:
1. Preaqueça o forno a 180°C e unte uma forma pequena.
2. Bata os ovos e as claras com os temperos.
3. Misture os legumes picados.
4. Despeje na forma e asse por 20 minutos, até firmar no centro.

MONTAGEM:
1. Espere 5 minutos antes de desenformar — assim não quebra.
2. Corte em 2 pedaços (1 por porção).
3. Sirva quente ou guarde em pote na geladeira.

DICA DO LIFE: Leva pro trabalho e come frio, que fica ótimo.'),

('Espaguete de Abobrinha com Frango', 'Cara de macarrão, leveza de legume', 'emagrecimento',
 '{"proteina":38,"carboidrato":12,"gordura":9}', 285, 'chef', '#22c55e', TRUE, FALSE, 5,
'SOBRE O PRATO: A abobrinha em tiras faz as vezes do macarrão, com uma fração das calorias. Frango dourado, tomate e manjericão por cima.

INGREDIENTES (1 porção):
- 150g de frango em cubos
- 1 abobrinha grande em tiras finas
- 1 tomate picado e alho
- 1 fio de azeite (5g)
- Manjericão e sal

PREPARO:
1. Faça tiras finas da abobrinha com um descascador ou fatiador.
2. Doure o frango com o alho no azeite.
3. Junte o tomate e refogue até formar um molhinho.
4. Acrescente a abobrinha e mexa só 2 minutos.

MONTAGEM:
1. Enrole o "espaguete" com um garfo e coloque no centro do prato.
2. Distribua o frango e o molho por cima.
3. Finalize com folhas de manjericão.

DICA DO LIFE: Não cozinha demais a abobrinha — 2 minutos bastam, senão murcha.'),

-- ===================== MASSA (#3b82f6) =====================
('Bowl de Frango Grelhado com Brócolis', 'O clássico de quem treina, bem feito', 'massa',
 '{"proteina":45,"carboidrato":60,"gordura":9}', 497, 'chef', '#3b82f6', TRUE, TRUE, 6,
'SOBRE O PRATO: O básico que funciona: frango grelhado suculento, arroz soltinho e brócolis no ponto. Proteína e carbo na medida pra construir músculo.

INGREDIENTES (1 porção):
- 150g de frango peito grelhado
- 150g de arroz branco cozido
- 100g de brócolis no vapor
- 1 fio de azeite (5g)
- Sal, alho e pimenta

PREPARO:
1. Tempere o frango com sal, alho e pimenta.
2. Grelhe até dourar dos dois lados e deixe descansar 2 minutos.
3. Cozinhe o brócolis no vapor por 5 minutos (fica verde e firme).
4. Aqueça o arroz.

MONTAGEM:
1. Arroz na base do bowl.
2. Frango fatiado de um lado, brócolis do outro.
3. Finalize com o fio de azeite.

DICA DO LIFE: Troca o arroz branco pelo integral e você segura a fome por mais tempo.'),

('Wrap Cremoso de Frango', 'Pronto em 10 minutos e cheio de proteína', 'massa',
 '{"proteina":38,"carboidrato":35,"gordura":12}', 400, 'chef', '#3b82f6', TRUE, FALSE, 7,
'SOBRE O PRATO: Pra quando a fome aperta e o tempo é curto: tortilha crocante por fora, frango cremoso por dentro. 10 minutos e tá na mão.

INGREDIENTES (1 porção):
- 1 tortilha integral
- 120g de frango desfiado
- 2 colheres de requeijão light
- Folhas e tomate
- Sal e pimenta

PREPARO:
1. Tempere o frango com sal e pimenta (aqueça se estiver frio).
2. Fatie o tomate e separe as folhas.

MONTAGEM:
1. Espalhe o requeijão na tortilha.
2. Distribua o frango, as folhas e o tomate numa faixa no centro.
3. Dobre as pontas e enrole bem apertado.
4. Sele na frigideira sem óleo, 1 minuto de cada lado (opcional).
5. Corte na diagonal pra servir.

DICA DO LIFE: Selar na frigideira deixa crocante e o wrap não abre.'),

('Panqueca Fit de Banana com Canela', 'Café da manhã com cara de sobremesa', 'massa',
 '{"proteina":24,"carboidrato":50,"gordura":9}', 375, 'chef', '#3b82f6', TRUE, TRUE, 8,
'SOBRE O PRATO: Doce, macia e cheia de energia, sem farinha branca. A banana adoça e a aveia dá corpo.

INGREDIENTES (1 porção):
- 1 banana amassada
- 2 ovos
- 40g de aveia
- 1 scoop de whey (opcional)
- Canela

PREPARO:
1. Amasse bem a banana e misture com os ovos.
2. Junte a aveia (e o whey, se usar) até virar uma massa.
3. Aqueça a frigideira antiaderente em fogo baixo.
4. Despeje porções pequenas e doure 2 minutos de cada lado.

MONTAGEM:
1. Empilhe as panquecas no prato.
2. Polvilhe canela por cima.

DICA DO LIFE: Fogo baixo e paciência. Panqueca boa não tem pressa.'),

('Macarrão ao Alho com Atum', 'Barato, rápido e proteico', 'massa',
 '{"proteina":32,"carboidrato":58,"gordura":14}', 480, 'chef', '#3b82f6', TRUE, FALSE, 9,
'SOBRE O PRATO: Prato de fim de mês que ainda entrega proteína de verdade: alho dourado no azeite, tomate e atum envolvendo o macarrão.

INGREDIENTES (1 porção):
- 80g de macarrão (peso seco)
- 1 lata de atum escorrido
- 1 tomate picado e alho
- 1 fio de azeite (10g)
- Salsinha e sal

PREPARO:
1. Cozinhe o macarrão al dente e guarde meia concha da água.
2. Doure o alho no azeite e junte o tomate.
3. Acrescente o atum e aqueça.
4. Misture o macarrão e a água guardada até ficar cremoso.

MONTAGEM:
1. Enrole o macarrão no centro do prato.
2. Finalize com salsinha picada.

DICA DO LIFE: A água do macarrão é o segredo do molho cremoso sem creme de leite.'),

('Batata Doce Rústica com Carne', 'Combustível de quem treina pesado', 'massa',
 '{"proteina":40,"carboidrato":55,"gordura":13}', 505, 'chef', '#3b82f6', TRUE, FALSE, 10,
'SOBRE O PRATO: Batata doce assada com casca, dourada por fora e macia por dentro, com carne moída bem temperada. Carbo de qualidade e proteína densa.

INGREDIENTES (1 porção):
- 200g de batata doce com casca, em cubos
- 150g de carne moída magra
- 1/2 cebola e alho
- Tomate e temperos
- Sal e pimenta

PREPARO:
1. Lave bem a batata e corte em cubos médios, com casca.
2. Tempere com sal e pimenta e asse a 200°C por 25 a 30 minutos (ou 20 na air fryer), até dourar.
3. Enquanto isso, refogue a cebola e o alho, junte a carne e deixe dourar.
4. Escorra a gordura, acrescente o tomate e tempere bem.

MONTAGEM:
1. Coloque os cubos de batata no prato.
2. Cubra com a carne moída.
3. Finalize com cheiro-verde, se tiver.

DICA DO LIFE: Escorre a gordura da carne depois de dourar. Corta o excesso sem perder proteína.'),

-- ===================== VEGANO (#84cc16) =====================
('Bowl Mediterrâneo de Grão-de-Bico', 'Proteína vegetal que sustenta', 'vegano',
 '{"proteina":18,"carboidrato":48,"gordura":12}', 360, 'chef', '#84cc16', TRUE, TRUE, 11,
'SOBRE O PRATO: Cheio, colorido e 100% vegetal: grão-de-bico com cominho, salada fresca e limão. Prova que comida sem carne sustenta.

INGREDIENTES (1 porção):
- 150g de grão-de-bico cozido
- 100g de arroz integral
- Tomate, pepino e cebola roxa
- 1 fio de azeite (10g) e limão
- Cominho e sal

PREPARO:
1. Tempere o grão-de-bico com cominho, azeite e sal.
2. Doure numa frigideira por 5 minutos, até ficar crocante.
3. Pique o tomate, o pepino e a cebola roxa em cubos pequenos.

MONTAGEM:
1. Arroz integral na base do bowl.
2. Grão-de-bico de um lado, salada do outro.
3. Finalize com limão espremido por cima.

DICA DO LIFE: Dourar o grão-de-bico antes muda tudo — fica crocante como petisco.'),

('Tofu Dourado no Shoyu com Gergelim', 'Casquinha dourada e muito sabor', 'vegano',
 '{"proteina":20,"carboidrato":18,"gordura":14}', 290, 'chef', '#84cc16', TRUE, FALSE, 12,
'SOBRE O PRATO: Tofu bem temperado ninguém rejeita: cubos dourados no shoyu, legumes no ponto e gergelim por cima.

INGREDIENTES (1 porção):
- 150g de tofu firme em cubos
- Legumes a gosto (pimentão, abobrinha)
- Shoyu e alho
- 1 fio de azeite (5g)
- Gergelim

PREPARO:
1. Seque bem o tofu com papel-toalha.
2. Tempere com shoyu e alho e deixe 5 minutos.
3. Doure os cubos no azeite até criar casquinha.
4. Refogue os legumes rapidamente, ainda crocantes.

MONTAGEM:
1. Legumes no fundo do prato.
2. Tofu dourado por cima.
3. Finalize com gergelim.

DICA DO LIFE: Tofu úmido cozinha em vez de dourar. Secar bem é o segredo.'),

('Lentilha Cremosa ao Cominho', 'O feijão com arroz vegano turbinado', 'vegano',
 '{"proteina":19,"carboidrato":62,"gordura":6}', 385, 'chef', '#84cc16', TRUE, FALSE, 13,
'SOBRE O PRATO: Comida de conforto que nutre: lentilha cremosa com cominho e coentro sobre arroz soltinho.

INGREDIENTES (1 porção):
- 100g de lentilha cozida
- 100g de arroz cozido
- 1/2 cebola e alho
- Tomate e cominho
- Sal e coentro

PREPARO:
1. Refogue a cebola e o alho.
2. Junte o tomate e o cominho e mexa por 2 minutos.
3. Acrescente a lentilha e um pouco de água.
4. Cozinhe amassando alguns grãos até ficar cremoso.

MONTAGEM:
1. Arroz no prato.
2. Lentilha cremosa por cima ou ao lado.
3. Finalize com coentro picado.

DICA DO LIFE: Lentilha com arroz formam proteína completa. Dupla imbatível.'),

('Panqueca Vegana de Banana', 'Sem ovo e sem leite, e dá liga', 'vegano',
 '{"proteina":12,"carboidrato":54,"gordura":8}', 340, 'chef', '#84cc16', TRUE, FALSE, 14,
'SOBRE O PRATO: Café da manhã vegano, simples e gostoso: a banana madura faz o papel do ovo.

INGREDIENTES (1 porção):
- 1 banana madura
- 40g de aveia
- 100ml de bebida vegetal
- Canela e fermento (1 pitada)

PREPARO:
1. Amasse a banana e misture com a bebida vegetal.
2. Junte a aveia, a canela e o fermento.
3. Deixe descansar 5 minutos pra encorpar.
4. Doure em frigideira antiaderente, 2 minutos de cada lado.

MONTAGEM:
1. Empilhe as panquecas no prato.
2. Polvilhe canela por cima.

DICA DO LIFE: Quanto mais madura a banana, mais doce e mais liga.'),

-- ===================== HÁBITOS (#f97316) =====================
('Sorvete de Banana com Cacau e Amendoim', 'Mata a vontade de doce sem o tombo', 'habitos',
 '{"proteina":8,"carboidrato":25,"gordura":6}', 186, 'chef', '#f97316', TRUE, TRUE, 15,
'SOBRE O PRATO: Vontade de doce não é fraqueza — é o corpo pedindo energia rápida. Esse sorvete cremoso de banana com cacau e amendoim mata a vontade sem sabotar.

INGREDIENTES (1 porção):
- 1 banana madura congelada
- 1 colher de cacau 100% (10g)
- 1 colher de pasta de amendoim (15g)
- Canela a gosto

PREPARO:
1. Corte a banana em rodelas e congele (mínimo 4 horas).
2. Bata no processador até virar creme.
3. Junte o cacau e a pasta de amendoim e bata até ficar liso.

MONTAGEM:
1. Coloque numa tigela.
2. Polvilhe canela e come na hora, como sorvete.

DICA DO LIFE: Esse aqui mata a vontade de verdade, e amanhã você não acorda se cobrando. Um passo de cada vez.'),

('Pipoca Defumada com Páprica', 'A troca da besteira da noite', 'habitos',
 '{"proteina":6,"carboidrato":28,"gordura":9}', 210, 'chef', '#f97316', TRUE, FALSE, 16,
'SOBRE O PRATO: Pra fome de assistir série sem atacar o armário: pipoca de panela, crocante e com gostinho defumado.

INGREDIENTES (1 porção):
- 30g de milho de pipoca
- 1 colher de azeite (5g)
- Sal e páprica defumada a gosto

PREPARO:
1. Aqueça o azeite numa panela com tampa.
2. Coloque o milho e tampe.
3. Chacoalhe a panela até parar de estourar.

MONTAGEM:
1. Passe pra uma tigela grande.
2. Tempere com sal e páprica e misture bem.

DICA DO LIFE: Pipoca de panela é fibra e volume. Bem diferente de atacar o salgadinho.'),

('Chips Crocantes de Batata Doce com Alecrim', 'No lugar do salgadinho de pacote', 'habitos',
 '{"proteina":4,"carboidrato":34,"gordura":7}', 220, 'chef', '#f97316', TRUE, FALSE, 17,
'SOBRE O PRATO: A crocância do salgadinho, sem a lista de ingredientes impronunciáveis. Batata doce fininha com alecrim.

INGREDIENTES (1 porção):
- 1 batata doce média em fatias finas
- 1 colher de azeite (5g)
- Sal e alecrim

PREPARO:
1. Preaqueça o forno a 200°C.
2. Fatie a batata bem fininha (um fatiador ajuda).
3. Misture com o azeite, o sal e o alecrim.
4. Espalhe numa assadeira sem sobrepor e asse 20 a 25 minutos, virando na metade.

MONTAGEM:
1. Deixe esfriar 5 minutos — é aí que fica crocante.
2. Sirva numa tigela.

DICA DO LIFE: Trocar o pacote por isso, uma vez que seja, já é uma vitória. Vai empilhando.'),

('Café Gelado Cremoso com Whey', 'No lugar do energético ou do refri', 'habitos',
 '{"proteina":20,"carboidrato":12,"gordura":4}', 165, 'chef', '#f97316', TRUE, FALSE, 18,
'SOBRE O PRATO: A energia que você buscava no energético, agora com proteína e sem a bomba de açúcar. Gelado e cremoso.

INGREDIENTES (1 porção):
- 1 xícara de café gelado
- 1 scoop de whey (30g)
- 100ml de leite ou bebida vegetal
- Gelo e canela

PREPARO:
1. Passe o café e deixe esfriar (ou use o que sobrou do dia).
2. Bata o café, o whey e o leite no liquidificador.
3. Junte o gelo e bata de novo até espumar.

MONTAGEM:
1. Sirva num copo alto.
2. Polvilhe canela por cima.

DICA DO LIFE: Aquele estalo das 15h não precisa vir de lata. Esse te levanta sem o tombo depois.'),

-- ===================== SHAKES (#06b6d4) =====================
('Shake Pós-Treino de Banana e Aveia', 'Proteína e carbo depois do treino', 'shakes',
 '{"proteina":35,"carboidrato":38,"gordura":4}', 328, 'chef', '#06b6d4', TRUE, TRUE, 19,
'SOBRE O PRATO: Depois do treino o corpo pede proteína e carbo. Esse shake entrega os dois, cremoso e rápido.

INGREDIENTES (1 porção):
- 1 scoop de whey (30g)
- 1 banana
- 200ml de leite ou bebida vegetal
- 30g de aveia
- Gelo

PREPARO:
1. Junte tudo no liquidificador.
2. Bata até ficar homogêneo.

MONTAGEM:
1. Sirva num copo grande.
2. Toma logo depois do treino.

DICA DO LIFE: Deixa a banana congelada e leva o shake na garrafa: sai do treino e já tá pronto.'),

('Suco Verde de Maçã e Gengibre', 'Leve, refrescante e cheio de fibra', 'shakes',
 '{"proteina":5,"carboidrato":14,"gordura":1}', 85, 'chef', '#06b6d4', TRUE, FALSE, 20,
'SOBRE O PRATO: Couve, maçã verde e gengibre batidos com água de coco. Leve, refrescante e um jeito fácil de pôr folha verde no dia.

INGREDIENTES (1 porção):
- 1 punhado de couve ou espinafre
- 1/2 maçã verde
- Suco de 1/2 limão
- 200ml de água de coco
- Gengibre e gelo

PREPARO:
1. Lave bem as folhas e corte a maçã em pedaços.
2. Junte tudo no liquidificador.
3. Bata bem até dissolver as folhas.

MONTAGEM:
1. Sirva num copo com gelo.
2. Toma na hora, antes de oxidar.

DICA DO LIFE: Não coa. A fibra da couve é metade da graça.'),

('Vitamina Proteica de Banana', 'Simples, cremosa e saciante', 'shakes',
 '{"proteina":30,"carboidrato":40,"gordura":6}', 350, 'chef', '#06b6d4', TRUE, FALSE, 21,
'SOBRE O PRATO: Café da manhã líquido pra quem não tem tempo: banana, whey e aveia batidos até ficar cremoso.

INGREDIENTES (1 porção):
- 1 banana
- 1 scoop de whey (30g)
- 200ml de leite ou bebida vegetal
- 1 colher de aveia
- Canela

PREPARO:
1. Junte tudo no liquidificador.
2. Bata até ficar cremoso.

MONTAGEM:
1. Sirva num copo.
2. Polvilhe canela por cima.

DICA DO LIFE: Congela a banana em rodelas na véspera. A vitamina fica tipo milk-shake.'),

('Milkshake Fit de Morango', 'Gostoso como sobremesa, leve como lanche', 'shakes',
 '{"proteina":28,"carboidrato":30,"gordura":5}', 290, 'chef', '#06b6d4', TRUE, FALSE, 22,
'SOBRE O PRATO: Sabor de milkshake sem sair da linha: morango, whey e iogurte. Mata a vontade de doce com proteína.

INGREDIENTES (1 porção):
- 100g de morango (fresco ou congelado)
- 1 scoop de whey (30g)
- 150ml de leite ou bebida vegetal
- 2 colheres de iogurte natural
- Gelo

PREPARO:
1. Junte tudo no liquidificador.
2. Bata até ficar cremoso.

MONTAGEM:
1. Sirva num copo bem gelado.
2. Decore com um morango cortado na borda.

DICA DO LIFE: Morango congelado dispensa gelo e deixa mais encorpado.'),

-- ===================== CHÁS (#10b981) =====================
('Chá Calmante de Camomila e Cidreira', 'Um ritual quente pra fechar o dia', 'chas',
 '{"proteina":0,"carboidrato":2,"gordura":0}', 8, 'chef', '#10b981', TRUE, FALSE, 23,
'SOBRE O PRATO: Camomila e erva-cidreira numa xícara quente: um ritual pra baixar a rotação antes de dormir.

INGREDIENTES (1 xícara):
- 1 colher de camomila seca
- 1 colher de erva-cidreira
- 200ml de água quente
- Mel a gosto (opcional)

PREPARO:
1. Ferva a água e desligue o fogo.
2. Acrescente as ervas e tampe.
3. Deixe em infusão por 5 minutos.

MONTAGEM:
1. Coe direto na xícara.
2. Adoce com mel, se quiser.

DICA DO LIFE: Toma sem pressa, longe da tela. Metade do efeito é o ritual.'),

('Chá Verde com Limão', 'Leve e refrescante pro meio da manhã', 'chas',
 '{"proteina":0,"carboidrato":1,"gordura":0}', 5, 'chef', '#10b981', TRUE, FALSE, 24,
'SOBRE O PRATO: Chá verde no ponto certo, sem amargar, com um toque de limão. Leve e bom pro meio da manhã.

INGREDIENTES (1 xícara):
- 1 colher de chá verde
- 200ml de água a 80°C
- Rodela de limão

PREPARO:
1. Aqueça a água até começar a formar bolhinhas, sem ferver.
2. Acrescente o chá e deixe 3 minutos.

MONTAGEM:
1. Coe na xícara.
2. Finalize com a rodela de limão.

DICA DO LIFE: Água fervente queima o chá verde e amarga. 80°C é o ponto.'),

('Chá de Gengibre, Limão e Mel', 'Quente, cítrico e reconfortante', 'chas',
 '{"proteina":0,"carboidrato":4,"gordura":0}', 18, 'chef', '#10b981', TRUE, FALSE, 25,
'SOBRE O PRATO: Gengibre fervido, limão e um fio de mel: aquece e dá aquela sensação de cuidado.

INGREDIENTES (1 xícara):
- 3 rodelas de gengibre
- Suco de 1/2 limão
- 200ml de água
- Mel a gosto

PREPARO:
1. Ferva a água com o gengibre por 5 minutos.
2. Desligue o fogo e junte o limão.

MONTAGEM:
1. Sirva na xícara com as rodelas de gengibre.
2. Adoce com mel, se quiser.

DICA DO LIFE: Depois de uma refeição pesada, esse chá quentinho cai muito bem.');

COMMIT;
