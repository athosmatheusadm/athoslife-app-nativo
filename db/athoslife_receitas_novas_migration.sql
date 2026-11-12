-- ATHOSlife — 12 receitas novas da Cozinha (12/11/2026)
--
-- Pedido do dono: mais receitas, com cara de "dá água na boca" (doces fit,
-- hambúrguer, estrogonofe, pizza de frigideira). Mesmas 5 categorias de hoje
-- (nada muda no app nem nas travas da tabela), texto em pt/en/es/fr/hi no
-- formato das 25 atuais, macros aproximados (TACO) POR PORÇÃO.
-- Gerado por um script (os textos ficam só aqui). Pode rodar de novo: só
-- insere a receita que ainda não existe com aquele título.

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Bombom de Morango no Pote', 'Creme branco, morango e casquinha de chocolate', 'habitos',
  '{"proteina": 15, "carboidrato": 32, "gordura": 9}'::jsonb, 268, 10, '#f97316', false, true,
  'SOBRE O PRATO: O bombom de morango da confeitaria, em versão de pote: creme branco geladinho, morango fresco e uma casquinha de chocolate que quebra na colher.

INGREDIENTES (1 porção):
- 120g de iogurte natural desnatado
- 2 colheres de sopa de leite em pó desnatado (20g)
- 100g de morango (uns 6)
- 20g de chocolate 70%
- Adoçante ou mel a gosto

PREPARO:
1. Misture o iogurte com o leite em pó e o adoçante até virar um creme grosso.
2. Corte os morangos em pedaços.
3. Derreta o chocolate no micro-ondas, de 20 em 20 segundos, mexendo.

MONTAGEM:
1. Num pote, faça camadas de creme e morango.
2. Cubra com o chocolate derretido e leve à geladeira por 10 minutos, até a casquinha firmar.

DICA DO LIFE: A casquinha estalando na colher é metade do prazer. Faz dois potes: um pra agora, outro pra amanhã.',
  26, array['lactose']::text[], '{}'::text[], 'doce', 'chef',
  '{"en": {"titulo": "Strawberry Bonbon Jar", "subtitulo": "White cream, strawberries and a chocolate shell"}, "es": {"titulo": "Bombón de Fresa en Vaso", "subtitulo": "Crema blanca, fresas y cobertura de chocolate"}, "fr": {"titulo": "Bonbon à la Fraise en Verrine", "subtitulo": "Crème blanche, fraises et coque de chocolat"}, "hi": {"titulo": "स्ट्रॉबेरी बोनबोन जार", "subtitulo": "सफ़ेद क्रीम, स्ट्रॉबेरी और चॉकलेट की परत"}}'::jsonb,
  '{"en": "ABOUT THE DISH: The bakery strawberry bonbon, in a jar: chilled white cream, fresh strawberries and a chocolate shell that cracks under the spoon.\n\nINGREDIENTS (1 serving):\n- 120g plain nonfat yogurt\n- 2 tablespoons nonfat milk powder (20g)\n- 100g strawberries (about 6)\n- 20g 70% chocolate\n- Sweetener or honey to taste\n\nPREPARATION:\n1. Mix the yogurt with the milk powder and sweetener until thick and creamy.\n2. Cut the strawberries into pieces.\n3. Melt the chocolate in the microwave in 20-second bursts, stirring.\n\nTO SERVE:\n1. Layer cream and strawberries in a jar.\n2. Top with the melted chocolate and chill for 10 minutes, until the shell sets.\n\nLIFE''S TIP: The shell cracking under the spoon is half the fun. Make two jars: one for now, one for tomorrow.", "es": "SOBRE EL PLATO: El bombón de fresa de pastelería, en vaso: crema blanca bien fría, fresas frescas y una capa de chocolate que se rompe con la cuchara.\n\nINGREDIENTES (1 porción):\n- 120g de yogur natural descremado\n- 2 cucharadas de leche en polvo descremada (20g)\n- 100g de fresas (unas 6)\n- 20g de chocolate 70%\n- Endulzante o miel a gusto\n\nPREPARACIÓN:\n1. Mezcla el yogur con la leche en polvo y el endulzante hasta que quede una crema espesa.\n2. Corta las fresas en trozos.\n3. Derrite el chocolate en el microondas, de 20 en 20 segundos, removiendo.\n\nMONTAJE:\n1. En un vaso, haz capas de crema y fresas.\n2. Cubre con el chocolate derretido y lleva a la nevera 10 minutos, hasta que la capa endurezca.\n\nCONSEJO DE LIFE: La capa crujiendo con la cuchara es la mitad del placer. Haz dos vasos: uno para ahora y otro para mañana.", "fr": "À PROPOS DU PLAT : Le bonbon à la fraise de pâtisserie, en verrine : crème blanche bien fraîche, fraises et une coque de chocolat qui craque sous la cuillère.\n\nINGRÉDIENTS (1 portion) :\n- 120 g de yaourt nature 0 %\n- 2 cuillères à soupe de lait en poudre écrémé (20 g)\n- 100 g de fraises (environ 6)\n- 20 g de chocolat 70 %\n- Édulcorant ou miel selon ton goût\n\nPRÉPARATION :\n1. Mélange le yaourt, le lait en poudre et l’édulcorant jusqu’à obtenir une crème épaisse.\n2. Coupe les fraises en morceaux.\n3. Fais fondre le chocolat au micro-ondes par tranches de 20 secondes, en remuant.\n\nDRESSAGE :\n1. Dans une verrine, alterne des couches de crème et de fraises.\n2. Nappe de chocolat fondu et mets au frais 10 minutes, le temps que la coque durcisse.\n\nL’ASTUCE DE LIFE : La coque qui craque sous la cuillère, c’est la moitié du plaisir. Fais-en deux : une pour maintenant, une pour demain.", "hi": "इस डिश के बारे में: बेकरी वाला स्ट्रॉबेरी बोनबोन, जार में: ठंडी सफ़ेद क्रीम, ताज़ी स्ट्रॉबेरी और चॉकलेट की परत जो चम्मच से टूटती है।\n\nसामग्री (1 सर्विंग):\n- 120 g बिना मलाई का सादा दही\n- 2 बड़े चम्मच स्किम्ड मिल्क पाउडर (20 g)\n- 100 g स्ट्रॉबेरी (लगभग 6)\n- 20 g 70% चॉकलेट\n- स्वाद अनुसार स्वीटनर या शहद\n\nबनाने का तरीक़ा:\n1. दही, मिल्क पाउडर और स्वीटनर को गाढ़ी क्रीम बनने तक मिलाएँ।\n2. स्ट्रॉबेरी के टुकड़े करें।\n3. चॉकलेट को माइक्रोवेव में 20-20 सेकंड में, चलाते हुए पिघलाएँ।\n\nपरोसने का तरीक़ा:\n1. जार में क्रीम और स्ट्रॉबेरी की परतें लगाएँ।\n2. ऊपर पिघली चॉकलेट डालें और 10 मिनट फ़्रिज में रखें, जब तक परत जम न जाए।\n\nLife की टिप: चम्मच से टूटती परत ही आधा मज़ा है। दो जार बनाइए: एक अभी के लिए, एक कल के लिए।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Bombom de Morango no Pote');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Brigadeiro de Colher Fit', 'Cremoso, de panela, pra comer quentinho', 'habitos',
  '{"proteina": 14, "carboidrato": 28, "gordura": 2}'::jsonb, 166, 10, '#f97316', true, true,
  'SOBRE O PRATO: Brigadeiro de panela, daquele que puxa na colher, feito com leite, leite em pó e cacau. Fica pronto em 10 minutos.

INGREDIENTES (1 porção):
- 150ml de leite desnatado
- 2 colheres de sopa de leite em pó desnatado (20g)
- 1 colher de sopa de cacau 100% (10g)
- 1 colher de chá de amido de milho (5g)
- Adoçante a gosto
- Granulado ou cacau pra finalizar

PREPARO:
1. Dissolva o leite em pó, o cacau e o amido no leite ainda frio, sem deixar grumos.
2. Leve ao fogo baixo, mexendo sempre, por uns 5 minutos, até engrossar e soltar do fundo.
3. Desligue e adoce a gosto.

MONTAGEM:
1. Passe pra um potinho.
2. Finalize com granulado ou cacau e coma de colher, morno ou gelado.

DICA DO LIFE: Brigadeiro de colher é carinho em forma de doce. Come devagar, sem culpa nenhuma.',
  27, array['lactose']::text[], '{}'::text[], 'doce', 'chef',
  '{"en": {"titulo": "Spoon Brigadeiro, Lighter", "subtitulo": "Creamy, stovetop, best eaten warm"}, "es": {"titulo": "Brigadeiro de Cuchara Ligero", "subtitulo": "Cremoso, de olla, para comer tibio"}, "fr": {"titulo": "Brigadeiro à la Cuillère Léger", "subtitulo": "Crémeux, à la casserole, à manger tiède"}, "hi": {"titulo": "चम्मच वाला हल्का ब्रिगेडेरो", "subtitulo": "क्रीमी, पैन में बना, गुनगुना खाने के लिए"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Brazilian stovetop brigadeiro, the kind that stretches on the spoon, made with milk, milk powder and cocoa. Ready in 10 minutes.\n\nINGREDIENTS (1 serving):\n- 150ml skim milk\n- 2 tablespoons nonfat milk powder (20g)\n- 1 tablespoon 100% cocoa (10g)\n- 1 teaspoon cornstarch (5g)\n- Sweetener to taste\n- Sprinkles or cocoa to finish\n\nPREPARATION:\n1. Dissolve the milk powder, cocoa and cornstarch in the cold milk, with no lumps.\n2. Cook over low heat, stirring constantly, for about 5 minutes, until thick and pulling away from the pan.\n3. Turn off the heat and sweeten to taste.\n\nTO SERVE:\n1. Pour into a small bowl.\n2. Finish with sprinkles or cocoa and eat with a spoon, warm or chilled.\n\nLIFE''S TIP: Spoon brigadeiro is a hug in dessert form. Eat it slowly, no guilt at all.", "es": "SOBRE EL PLATO: Brigadeiro brasileño de olla, de esos que se estiran en la cuchara, hecho con leche, leche en polvo y cacao. Listo en 10 minutos.\n\nINGREDIENTES (1 porción):\n- 150ml de leche descremada\n- 2 cucharadas de leche en polvo descremada (20g)\n- 1 cucharada de cacao 100% (10g)\n- 1 cucharadita de fécula de maíz (5g)\n- Endulzante a gusto\n- Chispas o cacao para terminar\n\nPREPARACIÓN:\n1. Disuelve la leche en polvo, el cacao y la fécula en la leche fría, sin grumos.\n2. Lleva a fuego bajo, removiendo siempre, unos 5 minutos, hasta que espese y se despegue del fondo.\n3. Apaga y endulza a gusto.\n\nMONTAJE:\n1. Pásalo a un tazón pequeño.\n2. Termina con chispas o cacao y cómelo con cuchara, tibio o frío.\n\nCONSEJO DE LIFE: El brigadeiro de cuchara es un abrazo en forma de postre. Cómelo despacio, sin ninguna culpa.", "fr": "À PROPOS DU PLAT : Le brigadeiro brésilien à la casserole, celui qui file à la cuillère, préparé avec du lait, du lait en poudre et du cacao. Prêt en 10 minutes.\n\nINGRÉDIENTS (1 portion) :\n- 150 ml de lait écrémé\n- 2 cuillères à soupe de lait en poudre écrémé (20 g)\n- 1 cuillère à soupe de cacao 100 % (10 g)\n- 1 cuillère à café de fécule de maïs (5 g)\n- Édulcorant selon ton goût\n- Vermicelles ou cacao pour finir\n\nPRÉPARATION :\n1. Délaye le lait en poudre, le cacao et la fécule dans le lait froid, sans grumeaux.\n2. Fais cuire à feu doux en remuant sans arrêt, environ 5 minutes, jusqu’à ce que ça épaississe et se détache du fond.\n3. Coupe le feu et sucre à ton goût.\n\nDRESSAGE :\n1. Verse dans un petit bol.\n2. Termine avec des vermicelles ou du cacao et mange à la cuillère, tiède ou frais.\n\nL’ASTUCE DE LIFE : Le brigadeiro à la cuillère, c’est un câlin en dessert. Mange-le doucement, sans aucune culpabilité.", "hi": "इस डिश के बारे में: ब्राज़ील का पैन वाला ब्रिगेडेरो, जो चम्मच पर खिंचता है — दूध, मिल्क पाउडर और कोको से बना। 10 मिनट में तैयार।\n\nसामग्री (1 सर्विंग):\n- 150 ml स्किम्ड दूध\n- 2 बड़े चम्मच स्किम्ड मिल्क पाउडर (20 g)\n- 1 बड़ा चम्मच 100% कोको (10 g)\n- 1 छोटा चम्मच कॉर्नस्टार्च (5 g)\n- स्वाद अनुसार स्वीटनर\n- सजाने के लिए स्प्रिंकल्स या कोको\n\nबनाने का तरीक़ा:\n1. ठंडे दूध में मिल्क पाउडर, कोको और कॉर्नस्टार्च बिना गाँठ के घोलें।\n2. धीमी आँच पर लगातार चलाते हुए लगभग 5 मिनट पकाएँ, जब तक गाढ़ा होकर तले से छूटने न लगे।\n3. आँच बंद करें और स्वाद अनुसार मीठा करें।\n\nपरोसने का तरीक़ा:\n1. छोटी कटोरी में निकालें।\n2. ऊपर स्प्रिंकल्स या कोको डालें और चम्मच से खाएँ, गुनगुना या ठंडा।\n\nLife की टिप: चम्मच वाला ब्रिगेडेरो मिठाई के रूप में एक झप्पी है। आराम से खाइए, बिना किसी अफ़सोस के।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Brigadeiro de Colher Fit');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Cookies de Banana, Aveia e Chocolate', 'Três ingredientes e o cheiro toma a casa', 'habitos',
  '{"proteina": 3, "carboidrato": 22, "gordura": 4}'::jsonb, 137, 20, '#f97316', true, false,
  'SOBRE O PRATO: Cookie macio por dentro, com pedaços de chocolate derretendo. Só banana, aveia e chocolate — rende 6 cookies, 2 por porção.

INGREDIENTES (3 porções):
- 1 banana madura (100g)
- 50g de aveia em flocos
- 20g de chocolate 70% picado
- Canela a gosto

PREPARO:
1. Amasse a banana com um garfo até virar purê.
2. Misture a aveia, a canela e o chocolate picado.
3. Faça 6 bolinhas, achate numa forma forrada e asse a 180°C por 12 a 15 minutos, até dourar.

MONTAGEM:
1. Espere 5 minutos pra firmar.
2. Sirva morno, com o chocolate ainda mole.

DICA DO LIFE: Quentinho, com café, resolve a tarde. Os que sobrarem aguentam 3 dias num pote fechado.',
  28, array['gluten','lactose']::text[], '{}'::text[], 'doce', 'chef',
  '{"en": {"titulo": "Banana, Oat & Chocolate Cookies", "subtitulo": "Three ingredients and the whole house smells amazing"}, "es": {"titulo": "Galletas de Plátano, Avena y Chocolate", "subtitulo": "Tres ingredientes y el olor llena la casa"}, "fr": {"titulo": "Cookies Banane, Avoine et Chocolat", "subtitulo": "Trois ingrédients et toute la maison sent bon"}, "hi": {"titulo": "केला, ओट्स और चॉकलेट कुकीज़", "subtitulo": "तीन चीज़ें और पूरा घर महक उठे"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Soft-centered cookies with melting chocolate chunks. Just banana, oats and chocolate — makes 6 cookies, 2 per serving.\n\nINGREDIENTS (3 servings):\n- 1 ripe banana (100g)\n- 50g rolled oats\n- 20g 70% chocolate, chopped\n- Cinnamon to taste\n\nPREPARATION:\n1. Mash the banana with a fork until smooth.\n2. Mix in the oats, cinnamon and chopped chocolate.\n3. Shape 6 balls, flatten on a lined tray and bake at 180°C for 12 to 15 minutes, until golden.\n\nTO SERVE:\n1. Wait 5 minutes for them to firm up.\n2. Serve warm, while the chocolate is still soft.\n\nLIFE''S TIP: Warm, with coffee, they fix the afternoon. Leftovers keep for 3 days in a closed jar.", "es": "SOBRE EL PLATO: Galleta suave por dentro, con trozos de chocolate derritiéndose. Solo plátano, avena y chocolate — salen 6 galletas, 2 por porción.\n\nINGREDIENTES (3 porciones):\n- 1 plátano maduro (100g)\n- 50g de avena en hojuelas\n- 20g de chocolate 70% picado\n- Canela a gusto\n\nPREPARACIÓN:\n1. Aplasta el plátano con un tenedor hasta hacerlo puré.\n2. Mezcla la avena, la canela y el chocolate picado.\n3. Forma 6 bolitas, aplástalas en una bandeja con papel y hornea a 180°C de 12 a 15 minutos, hasta dorar.\n\nMONTAJE:\n1. Espera 5 minutos para que tomen firmeza.\n2. Sírvelas tibias, con el chocolate todavía blando.\n\nCONSEJO DE LIFE: Tibias, con café, arreglan la tarde. Las que sobren aguantan 3 días en un frasco cerrado.", "fr": "À PROPOS DU PLAT : Un cookie moelleux à cœur, avec des morceaux de chocolat fondant. Juste de la banane, de l’avoine et du chocolat — pour 6 cookies, 2 par portion.\n\nINGRÉDIENTS (3 portions) :\n- 1 banane mûre (100 g)\n- 50 g de flocons d’avoine\n- 20 g de chocolat 70 % haché\n- Cannelle selon ton goût\n\nPRÉPARATION :\n1. Écrase la banane à la fourchette jusqu’à obtenir une purée.\n2. Ajoute l’avoine, la cannelle et le chocolat haché.\n3. Forme 6 boules, aplatis-les sur une plaque chemisée et enfourne à 180 °C pendant 12 à 15 minutes, jusqu’à ce qu’elles dorent.\n\nDRESSAGE :\n1. Attends 5 minutes qu’ils se raffermissent.\n2. Sers-les tièdes, quand le chocolat est encore fondant.\n\nL’ASTUCE DE LIFE : Tièdes, avec un café, ils sauvent l’après-midi. Ceux qui restent se gardent 3 jours dans une boîte fermée.", "hi": "इस डिश के बारे में: अंदर से नरम कुकी, जिसमें चॉकलेट के टुकड़े पिघलते हैं। बस केला, ओट्स और चॉकलेट — 6 कुकीज़ बनती हैं, एक सर्विंग में 2।\n\nसामग्री (3 सर्विंग):\n- 1 पका केला (100 g)\n- 50 g रोल्ड ओट्स\n- 20 g 70% चॉकलेट, कटी हुई\n- स्वाद अनुसार दालचीनी\n\nबनाने का तरीक़ा:\n1. केले को काँटे से मसलकर प्यूरी बना लें।\n2. ओट्स, दालचीनी और कटी चॉकलेट मिलाएँ।\n3. 6 गोले बनाकर ट्रे पर चपटा करें और 180°C पर 12 से 15 मिनट, सुनहरा होने तक बेक करें।\n\nपरोसने का तरीक़ा:\n1. जमने के लिए 5 मिनट रुकें।\n2. गुनगुनी परोसें, जब चॉकलेट अभी नरम हो।\n\nLife की टिप: गुनगुनी कुकीज़ और कॉफ़ी — दोपहर बन जाती है। बची हुई बंद डिब्बे में 3 दिन चलती हैं।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Cookies de Banana, Aveia e Chocolate');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Mousse Cremoso de Maracujá', 'Azedinho, aerado e geladinho', 'habitos',
  '{"proteina": 17, "carboidrato": 26, "gordura": 2}'::jsonb, 186, 10, '#f97316', true, false,
  'SOBRE O PRATO: Mousse de maracujá bem aerado, com a calda de sementes por cima. Doce na medida e azedinho no final.

INGREDIENTES (1 porção):
- 170g de iogurte natural desnatado
- 2 colheres de sopa de leite em pó desnatado (20g)
- Polpa de 1 maracujá (50g)
- 1 colher de chá de gelatina incolor (3g)
- Adoçante a gosto

PREPARO:
1. Hidrate a gelatina em 2 colheres de sopa de água e aqueça 10 segundos no micro-ondas, até dissolver.
2. Bata no liquidificador o iogurte, o leite em pó, metade da polpa e o adoçante.
3. Junte a gelatina e bata mais 1 minuto, pra aerar.

MONTAGEM:
1. Despeje numa taça e leve à geladeira por 2 horas.
2. Cubra com o resto da polpa com as sementes.

DICA DO LIFE: Faz à noite e deixa na geladeira: amanhã tem sobremesa te esperando.',
  29, array['lactose']::text[], '{}'::text[], 'doce', 'chef',
  '{"en": {"titulo": "Creamy Passion Fruit Mousse", "subtitulo": "Tangy, airy and chilled"}, "es": {"titulo": "Mousse Cremoso de Maracuyá", "subtitulo": "Acidito, aireado y bien frío"}, "fr": {"titulo": "Mousse Crémeuse aux Fruits de la Passion", "subtitulo": "Acidulée, aérienne et bien fraîche"}, "hi": {"titulo": "क्रीमी पैशन फ़्रूट मूस", "subtitulo": "खट्टा-मीठा, हल्का और ठंडा"}}'::jsonb,
  '{"en": "ABOUT THE DISH: A light, airy passion fruit mousse with the seedy pulp on top. Just sweet enough, with a tangy finish.\n\nINGREDIENTS (1 serving):\n- 170g plain nonfat yogurt\n- 2 tablespoons nonfat milk powder (20g)\n- Pulp of 1 passion fruit (50g)\n- 1 teaspoon unflavored gelatin (3g)\n- Sweetener to taste\n\nPREPARATION:\n1. Bloom the gelatin in 2 tablespoons of water and microwave for 10 seconds, until dissolved.\n2. Blend the yogurt, milk powder, half the pulp and the sweetener.\n3. Add the gelatin and blend 1 more minute to add air.\n\nTO SERVE:\n1. Pour into a glass and chill for 2 hours.\n2. Top with the rest of the pulp, seeds and all.\n\nLIFE''S TIP: Make it at night and leave it in the fridge: tomorrow there is dessert waiting for you.", "es": "SOBRE EL PLATO: Mousse de maracuyá bien aireado, con la pulpa con semillas por encima. Dulce en su punto y acidito al final.\n\nINGREDIENTES (1 porción):\n- 170g de yogur natural descremado\n- 2 cucharadas de leche en polvo descremada (20g)\n- Pulpa de 1 maracuyá (50g)\n- 1 cucharadita de gelatina sin sabor (3g)\n- Endulzante a gusto\n\nPREPARACIÓN:\n1. Hidrata la gelatina en 2 cucharadas de agua y caliéntala 10 segundos en el microondas, hasta disolver.\n2. Licúa el yogur, la leche en polvo, la mitad de la pulpa y el endulzante.\n3. Añade la gelatina y licúa 1 minuto más, para airear.\n\nMONTAJE:\n1. Vierte en una copa y lleva a la nevera 2 horas.\n2. Cubre con el resto de la pulpa con sus semillas.\n\nCONSEJO DE LIFE: Hazlo de noche y déjalo en la nevera: mañana hay postre esperándote.", "fr": "À PROPOS DU PLAT : Une mousse aux fruits de la passion bien aérienne, avec la pulpe et ses graines par-dessus. Sucrée juste ce qu’il faut, acidulée en fin de bouche.\n\nINGRÉDIENTS (1 portion) :\n- 170 g de yaourt nature 0 %\n- 2 cuillères à soupe de lait en poudre écrémé (20 g)\n- La pulpe d’1 fruit de la passion (50 g)\n- 1 cuillère à café de gélatine en poudre (3 g)\n- Édulcorant selon ton goût\n\nPRÉPARATION :\n1. Fais gonfler la gélatine dans 2 cuillères à soupe d’eau puis chauffe 10 secondes au micro-ondes pour la dissoudre.\n2. Mixe le yaourt, le lait en poudre, la moitié de la pulpe et l’édulcorant.\n3. Ajoute la gélatine et mixe encore 1 minute pour aérer.\n\nDRESSAGE :\n1. Verse dans une coupe et laisse 2 heures au frais.\n2. Recouvre du reste de pulpe avec ses graines.\n\nL’ASTUCE DE LIFE : Prépare-la le soir et laisse-la au frais : demain, un dessert t’attend.", "hi": "इस डिश के बारे में: हवा-सा हल्का पैशन फ़्रूट मूस, ऊपर बीज वाला गूदा। मिठास बस उतनी जितनी चाहिए, आख़िर में हल्की खटास।\n\nसामग्री (1 सर्विंग):\n- 170 g बिना मलाई का सादा दही\n- 2 बड़े चम्मच स्किम्ड मिल्क पाउडर (20 g)\n- 1 पैशन फ़्रूट का गूदा (50 g)\n- 1 छोटा चम्मच बिना स्वाद की जिलेटिन (3 g)\n- स्वाद अनुसार स्वीटनर\n\nबनाने का तरीक़ा:\n1. जिलेटिन को 2 बड़े चम्मच पानी में भिगोएँ और माइक्रोवेव में 10 सेकंड गरम करके घोल लें।\n2. दही, मिल्क पाउडर, आधा गूदा और स्वीटनर ब्लेंड करें।\n3. जिलेटिन डालकर 1 मिनट और ब्लेंड करें, ताकि हवा भर जाए।\n\nपरोसने का तरीक़ा:\n1. गिलास में डालें और 2 घंटे फ़्रिज में रखें।\n2. ऊपर बचा हुआ बीज वाला गूदा डालें।\n\nLife की टिप: रात को बनाकर फ़्रिज में रख दीजिए: कल मीठा आपका इंतज़ार कर रहा होगा।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Mousse Cremoso de Maracujá');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Pudim de Chia com Manga e Coco', 'Cremoso, tropical e pronto na geladeira', 'vegano',
  '{"proteina": 4, "carboidrato": 23, "gordura": 9}'::jsonb, 185, 5, '#84cc16', true, false,
  'SOBRE O PRATO: A chia incha no leite de coco e vira um pudim cremoso; por cima, manga madura em cubos. Parece sobremesa de hotel.

INGREDIENTES (1 porção):
- 2 colheres de sopa de chia (20g)
- 150ml de bebida vegetal de coco
- 80g de manga madura em cubos
- Coco ralado sem açúcar pra finalizar
- Adoçante a gosto

PREPARO:
1. Misture a chia, a bebida de coco e o adoçante num pote.
2. Espere 5 minutos, mexa de novo pra não empelotar e tampe.
3. Deixe na geladeira por pelo menos 3 horas (ou a noite toda).

MONTAGEM:
1. Mexa o pudim e cubra com a manga em cubos.
2. Finalize com coco ralado.

DICA DO LIFE: Monta à noite, em 5 minutos, e acorda com o café da manhã pronto.',
  30, array[]::text[], '{}'::text[], 'doce', 'chef',
  '{"en": {"titulo": "Chia Pudding with Mango & Coconut", "subtitulo": "Creamy, tropical and ready in the fridge"}, "es": {"titulo": "Pudín de Chía con Mango y Coco", "subtitulo": "Cremoso, tropical y listo en la nevera"}, "fr": {"titulo": "Pudding de Chia, Mangue et Coco", "subtitulo": "Crémeux, tropical et prêt au frigo"}, "hi": {"titulo": "आम और नारियल वाली चिया पुडिंग", "subtitulo": "क्रीमी, ट्रॉपिकल और फ़्रिज में तैयार"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Chia swells in coconut milk into a creamy pudding, topped with cubes of ripe mango. It looks like a hotel dessert.\n\nINGREDIENTS (1 serving):\n- 2 tablespoons chia seeds (20g)\n- 150ml coconut milk drink\n- 80g ripe mango, cubed\n- Unsweetened shredded coconut to finish\n- Sweetener to taste\n\nPREPARATION:\n1. Mix the chia, coconut drink and sweetener in a jar.\n2. Wait 5 minutes, stir again so it does not clump, and cover.\n3. Chill for at least 3 hours (or overnight).\n\nTO SERVE:\n1. Stir the pudding and top with the mango cubes.\n2. Finish with shredded coconut.\n\nLIFE''S TIP: Put it together at night in 5 minutes and wake up with breakfast ready.", "es": "SOBRE EL PLATO: La chía se hincha en la leche de coco y se vuelve un pudín cremoso; encima, mango maduro en cubos. Parece postre de hotel.\n\nINGREDIENTES (1 porción):\n- 2 cucharadas de chía (20g)\n- 150ml de bebida vegetal de coco\n- 80g de mango maduro en cubos\n- Coco rallado sin azúcar para terminar\n- Endulzante a gusto\n\nPREPARACIÓN:\n1. Mezcla la chía, la bebida de coco y el endulzante en un frasco.\n2. Espera 5 minutos, remueve de nuevo para que no se apelmace y tapa.\n3. Deja en la nevera al menos 3 horas (o toda la noche).\n\nMONTAJE:\n1. Remueve el pudín y cubre con el mango en cubos.\n2. Termina con coco rallado.\n\nCONSEJO DE LIFE: Ármalo de noche, en 5 minutos, y despierta con el desayuno listo.", "fr": "À PROPOS DU PLAT : Le chia gonfle dans le lait de coco et devient un pudding crémeux ; par-dessus, des dés de mangue bien mûre. On dirait un dessert d’hôtel.\n\nINGRÉDIENTS (1 portion) :\n- 2 cuillères à soupe de graines de chia (20 g)\n- 150 ml de boisson végétale à la coco\n- 80 g de mangue mûre en dés\n- Noix de coco râpée non sucrée pour finir\n- Édulcorant selon ton goût\n\nPRÉPARATION :\n1. Mélange le chia, la boisson à la coco et l’édulcorant dans un pot.\n2. Attends 5 minutes, remue encore pour éviter les paquets et ferme.\n3. Laisse au frais au moins 3 heures (ou toute la nuit).\n\nDRESSAGE :\n1. Remue le pudding et recouvre de dés de mangue.\n2. Termine avec la noix de coco râpée.\n\nL’ASTUCE DE LIFE : Prépare-le le soir, en 5 minutes, et réveille-toi avec le petit-déjeuner prêt.", "hi": "इस डिश के बारे में: चिया नारियल के दूध में फूलकर क्रीमी पुडिंग बन जाती है; ऊपर पके आम के टुकड़े। होटल की मिठाई जैसी लगती है।\n\nसामग्री (1 सर्विंग):\n- 2 बड़े चम्मच चिया सीड्स (20 g)\n- 150 ml नारियल का प्लांट-बेस्ड दूध\n- 80 g पका आम, टुकड़ों में\n- सजाने के लिए बिना चीनी का कसा नारियल\n- स्वाद अनुसार स्वीटनर\n\nबनाने का तरीक़ा:\n1. जार में चिया, नारियल का दूध और स्वीटनर मिलाएँ।\n2. 5 मिनट रुकें, फिर चलाएँ ताकि गुठलियाँ न बनें, और ढक दें।\n3. कम से कम 3 घंटे (या रात भर) फ़्रिज में रखें।\n\nपरोसने का तरीक़ा:\n1. पुडिंग को चलाएँ और ऊपर आम के टुकड़े डालें।\n2. कसा नारियल छिड़कें।\n\nLife की टिप: रात को 5 मिनट में बना लीजिए और सुबह नाश्ता तैयार मिलेगा।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Pudim de Chia com Manga e Coco');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Banana Caramelizada com Canela', 'Dourada na frigideira, com iogurte gelado', 'habitos',
  '{"proteina": 5, "carboidrato": 38, "gordura": 5}'::jsonb, 197, 8, '#f97316', false, false,
  'SOBRE O PRATO: Banana dourada na frigideira até caramelizar, com canela e um fio de mel, servida quente sobre iogurte gelado.

INGREDIENTES (1 porção):
- 1 banana madura (100g)
- 1 colher de chá de manteiga (5g)
- 1 colher de chá de mel (7g)
- 100g de iogurte natural desnatado
- Canela a gosto

PREPARO:
1. Corte a banana ao meio, no comprimento.
2. Derreta a manteiga na frigideira e doure a banana por 2 minutos de cada lado.
3. Regue com o mel, polvilhe canela e deixe mais 30 segundos, até caramelizar.

MONTAGEM:
1. Coloque o iogurte gelado num prato fundo.
2. Ponha a banana quente por cima e regue com a calda da frigideira.

DICA DO LIFE: Quente com gelado é covardia. Oito minutos e a vontade de doce está resolvida.',
  31, array['lactose','mel']::text[], '{}'::text[], 'doce', 'chef',
  '{"en": {"titulo": "Caramelized Cinnamon Banana", "subtitulo": "Golden in the pan, with cold yogurt"}, "es": {"titulo": "Plátano Caramelizado con Canela", "subtitulo": "Dorado en la sartén, con yogur frío"}, "fr": {"titulo": "Banane Caramélisée à la Cannelle", "subtitulo": "Dorée à la poêle, avec du yaourt bien frais"}, "hi": {"titulo": "दालचीनी वाला कैरेमलाइज़्ड केला", "subtitulo": "पैन में सुनहरा, ठंडे दही के साथ"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Banana browned in the pan until caramelized, with cinnamon and a drizzle of honey, served hot over cold yogurt.\n\nINGREDIENTS (1 serving):\n- 1 ripe banana (100g)\n- 1 teaspoon butter (5g)\n- 1 teaspoon honey (7g)\n- 100g plain nonfat yogurt\n- Cinnamon to taste\n\nPREPARATION:\n1. Halve the banana lengthwise.\n2. Melt the butter in a pan and brown the banana for 2 minutes per side.\n3. Drizzle with honey, sprinkle cinnamon and cook 30 more seconds, until caramelized.\n\nTO SERVE:\n1. Put the cold yogurt in a shallow bowl.\n2. Lay the hot banana on top and pour over the pan syrup.\n\nLIFE''S TIP: Hot on cold is unfair. Eight minutes and the sweet craving is sorted.", "es": "SOBRE EL PLATO: Plátano dorado en la sartén hasta caramelizar, con canela y un hilo de miel, servido caliente sobre yogur frío.\n\nINGREDIENTES (1 porción):\n- 1 plátano maduro (100g)\n- 1 cucharadita de mantequilla (5g)\n- 1 cucharadita de miel (7g)\n- 100g de yogur natural descremado\n- Canela a gusto\n\nPREPARACIÓN:\n1. Corta el plátano por la mitad, a lo largo.\n2. Derrite la mantequilla en la sartén y dora el plátano 2 minutos por lado.\n3. Rocía con la miel, espolvorea canela y deja 30 segundos más, hasta caramelizar.\n\nMONTAJE:\n1. Pon el yogur frío en un plato hondo.\n2. Coloca el plátano caliente encima y báñalo con el almíbar de la sartén.\n\nCONSEJO DE LIFE: Caliente con frío es trampa. Ocho minutos y el antojo de dulce queda resuelto.", "fr": "À PROPOS DU PLAT : Une banane dorée à la poêle jusqu’à caraméliser, avec de la cannelle et un filet de miel, servie chaude sur du yaourt bien frais.\n\nINGRÉDIENTS (1 portion) :\n- 1 banane mûre (100 g)\n- 1 cuillère à café de beurre (5 g)\n- 1 cuillère à café de miel (7 g)\n- 100 g de yaourt nature 0 %\n- Cannelle selon ton goût\n\nPRÉPARATION :\n1. Coupe la banane en deux dans la longueur.\n2. Fais fondre le beurre dans la poêle et dore la banane 2 minutes de chaque côté.\n3. Arrose de miel, saupoudre de cannelle et laisse encore 30 secondes, jusqu’à caraméliser.\n\nDRESSAGE :\n1. Mets le yaourt frais dans une assiette creuse.\n2. Pose la banane chaude dessus et arrose du jus de la poêle.\n\nL’ASTUCE DE LIFE : Le chaud sur le froid, c’est imbattable. Huit minutes et l’envie de sucré est réglée.", "hi": "इस डिश के बारे में: पैन में कैरेमल होने तक सुनहरा किया केला, दालचीनी और शहद की धार के साथ, ठंडे दही पर गरम परोसा हुआ।\n\nसामग्री (1 सर्विंग):\n- 1 पका केला (100 g)\n- 1 छोटा चम्मच मक्खन (5 g)\n- 1 छोटा चम्मच शहद (7 g)\n- 100 g बिना मलाई का सादा दही\n- स्वाद अनुसार दालचीनी\n\nबनाने का तरीक़ा:\n1. केले को लंबाई में आधा काटें।\n2. पैन में मक्खन पिघलाकर केले को हर तरफ़ 2 मिनट सुनहरा करें।\n3. शहद डालें, दालचीनी छिड़कें और 30 सेकंड और पकाएँ, कैरेमल होने तक।\n\nपरोसने का तरीक़ा:\n1. गहरी प्लेट में ठंडा दही रखें।\n2. ऊपर गरम केला रखें और पैन का सिरप डालें।\n\nLife की टिप: गरम और ठंडे का मेल लाजवाब है। आठ मिनट, और मीठे की तलब ख़त्म।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Banana Caramelizada com Canela');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Hambúrguer Caseiro Suculento', 'Carne alta, queijo derretendo e pão tostado', 'massa',
  '{"proteina": 35, "carboidrato": 27, "gordura": 13}'::jsonb, 371, 15, '#3b82f6', true, true,
  'SOBRE O PRATO: Hambúrguer de verdade: carne magra moldada na mão, selada na chapa, queijo derretendo e pão tostado. Sem cara de dieta.

INGREDIENTES (1 porção):
- 120g de patinho moído
- 1 pão de hambúrguer (50g)
- 1 fatia de muçarela (20g)
- 2 rodelas de tomate
- 1 folha de alface
- 1 colher de chá de mostarda
- Sal e pimenta a gosto

PREPARO:
1. Tempere a carne só com sal e pimenta e molde um disco alto, sem apertar demais.
2. Sele na frigideira bem quente por 3 minutos de cada lado.
3. Ponha o queijo por cima, tampe por 30 segundos pra derreter e toste o pão na mesma frigideira.

MONTAGEM:
1. Passe a mostarda no pão.
2. Monte com alface, tomate e a carne com queijo. Coma na hora.

DICA DO LIFE: Não aperta a carne com a espátula: é isso que deixa o hambúrguer suculento.',
  32, array['carne','gluten','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Juicy Homemade Burger", "subtitulo": "Thick patty, melting cheese and a toasted bun"}, "es": {"titulo": "Hamburguesa Casera Jugosa", "subtitulo": "Carne gruesa, queso derretido y pan tostado"}, "fr": {"titulo": "Burger Maison Juteux", "subtitulo": "Steak épais, fromage fondant et pain toasté"}, "hi": {"titulo": "रसीला घर का बर्गर", "subtitulo": "मोटी पैटी, पिघलता चीज़ और सिका हुआ बन"}}'::jsonb,
  '{"en": "ABOUT THE DISH: A real burger: lean beef shaped by hand, seared hot, cheese melting over it and a toasted bun. Nothing about it looks like diet food.\n\nINGREDIENTS (1 serving):\n- 120g lean ground beef\n- 1 burger bun (50g)\n- 1 slice mozzarella (20g)\n- 2 tomato slices\n- 1 lettuce leaf\n- 1 teaspoon mustard\n- Salt and pepper to taste\n\nPREPARATION:\n1. Season the beef with just salt and pepper and shape a thick patty without packing it tight.\n2. Sear in a very hot pan for 3 minutes per side.\n3. Lay the cheese on top, cover for 30 seconds to melt, and toast the bun in the same pan.\n\nTO SERVE:\n1. Spread the mustard on the bun.\n2. Stack lettuce, tomato and the cheesy patty. Eat right away.\n\nLIFE''S TIP: Do not press the patty with the spatula: that is what keeps a burger juicy.", "es": "SOBRE EL PLATO: Una hamburguesa de verdad: carne magra moldeada a mano, sellada en la plancha, queso derritiéndose y pan tostado. Sin cara de dieta.\n\nINGREDIENTES (1 porción):\n- 120g de carne molida magra\n- 1 pan de hamburguesa (50g)\n- 1 loncha de mozzarella (20g)\n- 2 rodajas de tomate\n- 1 hoja de lechuga\n- 1 cucharadita de mostaza\n- Sal y pimienta a gusto\n\nPREPARACIÓN:\n1. Sazona la carne solo con sal y pimienta y forma un disco grueso, sin apretar demasiado.\n2. Séllala en la sartén bien caliente 3 minutos por lado.\n3. Pon el queso encima, tapa 30 segundos para que se derrita y tuesta el pan en la misma sartén.\n\nMONTAJE:\n1. Unta la mostaza en el pan.\n2. Arma con lechuga, tomate y la carne con queso. Cómela al momento.\n\nCONSEJO DE LIFE: No aplastes la carne con la espátula: eso es lo que la mantiene jugosa.", "fr": "À PROPOS DU PLAT : Un vrai burger : du bœuf maigre façonné à la main, saisi à feu vif, du fromage qui fond et un pain toasté. Rien d’un plat de régime.\n\nINGRÉDIENTS (1 portion) :\n- 120 g de bœuf haché maigre\n- 1 pain à burger (50 g)\n- 1 tranche de mozzarella (20 g)\n- 2 rondelles de tomate\n- 1 feuille de salade\n- 1 cuillère à café de moutarde\n- Sel et poivre selon ton goût\n\nPRÉPARATION :\n1. Assaisonne la viande juste avec du sel et du poivre et forme un steak épais, sans trop tasser.\n2. Saisis-le dans une poêle très chaude 3 minutes de chaque côté.\n3. Pose le fromage dessus, couvre 30 secondes pour le faire fondre et toaste le pain dans la même poêle.\n\nDRESSAGE :\n1. Tartine le pain de moutarde.\n2. Monte avec la salade, la tomate et le steak au fromage. Mange tout de suite.\n\nL’ASTUCE DE LIFE : N’écrase pas le steak avec la spatule : c’est ça qui garde le burger juteux.", "hi": "इस डिश के बारे में: असली बर्गर: हाथ से बनी लीन बीफ़ पैटी, तेज़ आँच पर सिकी, ऊपर पिघलता चीज़ और सिका हुआ बन। डाइट जैसा बिल्कुल नहीं लगता।\n\nसामग्री (1 सर्विंग):\n- 120 g लीन कीमा (बीफ़)\n- 1 बर्गर बन (50 g)\n- 1 स्लाइस मोज़रेला (20 g)\n- टमाटर के 2 स्लाइस\n- सलाद का 1 पत्ता\n- 1 छोटा चम्मच मस्टर्ड\n- स्वाद अनुसार नमक और काली मिर्च\n\nबनाने का तरीक़ा:\n1. कीमे में सिर्फ़ नमक और काली मिर्च डालें और बिना ज़्यादा दबाए मोटी पैटी बनाएँ।\n2. बहुत गरम पैन में हर तरफ़ 3 मिनट सेकें।\n3. ऊपर चीज़ रखें, पिघलने के लिए 30 सेकंड ढकें और उसी पैन में बन सेक लें।\n\nपरोसने का तरीक़ा:\n1. बन पर मस्टर्ड लगाएँ।\n2. सलाद, टमाटर और चीज़ वाली पैटी रखें। तुरंत खाएँ।\n\nLife की टिप: पैटी को स्पैचुला से मत दबाइए: इसी से बर्गर रसीला रहता है।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Hambúrguer Caseiro Suculento');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Estrogonofe Leve de Frango', 'Molho rosado e cremoso, com arroz soltinho', 'massa',
  '{"proteina": 40, "carboidrato": 42, "gordura": 10}'::jsonb, 433, 25, '#3b82f6', true, true,
  'SOBRE O PRATO: O estrogonofe de domingo, com molho rosado e cremoso, champignon e frango macio. O creme vem do iogurte, e ninguém percebe.

INGREDIENTES (1 porção):
- 150g de peito de frango em cubos
- 80g de iogurte natural desnatado
- 60g de molho de tomate
- 50g de champignon fatiado
- 30g de cebola picada
- 1 colher de chá de azeite (5ml)
- 1 colher de chá de mostarda
- 1 colher de chá de ketchup
- 100g de arroz branco cozido
- Sal e pimenta a gosto

PREPARO:
1. Aqueça o azeite, refogue a cebola e doure o frango temperado com sal e pimenta por uns 6 minutos.
2. Junte o champignon, o molho de tomate, a mostarda e o ketchup e cozinhe 3 minutos em fogo baixo.
3. Desligue o fogo, espere 1 minuto e misture o iogurte, pra não talhar.

MONTAGEM:
1. Sirva o estrogonofe ao lado do arroz.
2. Se quiser, finalize com salsinha picada.

DICA DO LIFE: O segredo é pôr o iogurte com o fogo desligado. Fica cremoso igual ao da sua mãe.',
  33, array['carne','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Lighter Chicken Stroganoff", "subtitulo": "Creamy pink sauce with fluffy rice"}, "es": {"titulo": "Strogonoff Ligero de Pollo", "subtitulo": "Salsa rosada y cremosa, con arroz suelto"}, "fr": {"titulo": "Stroganoff de Poulet Léger", "subtitulo": "Sauce rosée et crémeuse, avec du riz bien détaché"}, "hi": {"titulo": "हल्का चिकन स्ट्रोगनॉफ़", "subtitulo": "गुलाबी क्रीमी ग्रेवी, खिले-खिले चावल के साथ"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Sunday stroganoff with a creamy pink sauce, mushrooms and tender chicken. The creaminess comes from yogurt, and nobody notices.\n\nINGREDIENTS (1 serving):\n- 150g chicken breast, cubed\n- 80g plain nonfat yogurt\n- 60g tomato sauce\n- 50g sliced mushrooms\n- 30g chopped onion\n- 1 teaspoon olive oil (5ml)\n- 1 teaspoon mustard\n- 1 teaspoon ketchup\n- 100g cooked white rice\n- Salt and pepper to taste\n\nPREPARATION:\n1. Heat the oil, soften the onion and brown the seasoned chicken for about 6 minutes.\n2. Add the mushrooms, tomato sauce, mustard and ketchup and simmer 3 minutes over low heat.\n3. Turn off the heat, wait 1 minute and stir in the yogurt so it does not split.\n\nTO SERVE:\n1. Serve the stroganoff next to the rice.\n2. Finish with chopped parsley if you like.\n\nLIFE''S TIP: The trick is adding the yogurt with the heat off. It comes out as creamy as the classic.", "es": "SOBRE EL PLATO: El strogonoff del domingo, con salsa rosada y cremosa, champiñones y pollo tierno. La cremosidad viene del yogur, y nadie lo nota.\n\nINGREDIENTES (1 porción):\n- 150g de pechuga de pollo en cubos\n- 80g de yogur natural descremado\n- 60g de salsa de tomate\n- 50g de champiñones en láminas\n- 30g de cebolla picada\n- 1 cucharadita de aceite de oliva (5ml)\n- 1 cucharadita de mostaza\n- 1 cucharadita de kétchup\n- 100g de arroz blanco cocido\n- Sal y pimienta a gusto\n\nPREPARACIÓN:\n1. Calienta el aceite, sofríe la cebolla y dora el pollo sazonado unos 6 minutos.\n2. Añade los champiñones, la salsa de tomate, la mostaza y el kétchup y cocina 3 minutos a fuego bajo.\n3. Apaga el fuego, espera 1 minuto y mezcla el yogur, para que no se corte.\n\nMONTAJE:\n1. Sirve el strogonoff junto al arroz.\n2. Si quieres, termina con perejil picado.\n\nCONSEJO DE LIFE: El secreto es poner el yogur con el fuego apagado. Queda tan cremoso como el clásico.", "fr": "À PROPOS DU PLAT : Le stroganoff du dimanche, avec sa sauce rosée et crémeuse, des champignons et du poulet tendre. Le crémeux vient du yaourt, et personne ne le remarque.\n\nINGRÉDIENTS (1 portion) :\n- 150 g de blanc de poulet en dés\n- 80 g de yaourt nature 0 %\n- 60 g de sauce tomate\n- 50 g de champignons émincés\n- 30 g d’oignon haché\n- 1 cuillère à café d’huile d’olive (5 ml)\n- 1 cuillère à café de moutarde\n- 1 cuillère à café de ketchup\n- 100 g de riz blanc cuit\n- Sel et poivre selon ton goût\n\nPRÉPARATION :\n1. Chauffe l’huile, fais revenir l’oignon puis dore le poulet assaisonné pendant environ 6 minutes.\n2. Ajoute les champignons, la sauce tomate, la moutarde et le ketchup et laisse mijoter 3 minutes à feu doux.\n3. Coupe le feu, attends 1 minute puis incorpore le yaourt, pour qu’il ne tranche pas.\n\nDRESSAGE :\n1. Sers le stroganoff à côté du riz.\n2. Si tu veux, termine avec du persil haché.\n\nL’ASTUCE DE LIFE : Le secret, c’est d’ajouter le yaourt feu éteint. C’est aussi crémeux que le classique.", "hi": "इस डिश के बारे में: इतवार वाला स्ट्रोगनॉफ़ — गुलाबी क्रीमी ग्रेवी, मशरूम और नरम चिकन। क्रीम की जगह दही है, और किसी को पता नहीं चलता।\n\nसामग्री (1 सर्विंग):\n- 150 g चिकन ब्रेस्ट, टुकड़ों में\n- 80 g बिना मलाई का सादा दही\n- 60 g टमाटर सॉस\n- 50 g कटे मशरूम\n- 30 g कटा प्याज़\n- 1 छोटा चम्मच ऑलिव ऑयल (5 ml)\n- 1 छोटा चम्मच मस्टर्ड\n- 1 छोटा चम्मच केचप\n- 100 g पके सफ़ेद चावल\n- स्वाद अनुसार नमक और काली मिर्च\n\nबनाने का तरीक़ा:\n1. तेल गरम करें, प्याज़ भूनें और नमक-मिर्च लगा चिकन लगभग 6 मिनट सुनहरा करें।\n2. मशरूम, टमाटर सॉस, मस्टर्ड और केचप डालकर धीमी आँच पर 3 मिनट पकाएँ।\n3. आँच बंद करें, 1 मिनट रुकें और फिर दही मिलाएँ, ताकि वह फटे नहीं।\n\nपरोसने का तरीक़ा:\n1. स्ट्रोगनॉफ़ को चावल के साथ परोसें।\n2. चाहें तो ऊपर कटा पार्सले डालें।\n\nLife की टिप: राज़ यह है कि दही आँच बंद करके डालें। उतना ही क्रीमी बनता है जितना असली वाला।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Estrogonofe Leve de Frango');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Pizza de Frigideira Marguerita', 'Borda crocante e queijo puxando em 8 minutos', 'emagrecimento',
  '{"proteina": 14, "carboidrato": 24, "gordura": 13}'::jsonb, 265, 8, '#22c55e', false, false,
  'SOBRE O PRATO: Pizza individual feita na frigideira: massa fina e crocante, molho, muçarela derretida e manjericão fresco.

INGREDIENTES (1 porção):
- 1 tortilha integral (40g)
- 2 colheres de sopa de molho de tomate (30g)
- 40g de muçarela ralada
- 4 rodelas de tomate
- Manjericão fresco e orégano
- 1 fio de azeite pra finalizar (opcional)

PREPARO:
1. Aqueça a tortilha numa frigideira seca, em fogo médio, por 1 minuto, e vire.
2. Espalhe o molho, cubra com a muçarela, o tomate e o orégano.
3. Tampe e deixe 3 a 4 minutos em fogo baixo, até o queijo derreter e a base ficar crocante.

MONTAGEM:
1. Passe pra uma tábua e cubra com manjericão fresco.
2. Corte em 4 e coma quente.

DICA DO LIFE: Vontade de pizza numa terça-feira? Essa resolve em 8 minutos, sem esperar o motoboy.',
  34, array['gluten','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Skillet Margherita Pizza", "subtitulo": "Crispy edge and stretchy cheese in 8 minutes"}, "es": {"titulo": "Pizza Margarita de Sartén", "subtitulo": "Borde crujiente y queso que se estira en 8 minutos"}, "fr": {"titulo": "Pizza Margherita à la Poêle", "subtitulo": "Bord croustillant et fromage filant en 8 minutes"}, "hi": {"titulo": "तवा मार्गेरिटा पिज़्ज़ा", "subtitulo": "कुरकुरा किनारा और खिंचता चीज़, 8 मिनट में"}}'::jsonb,
  '{"en": "ABOUT THE DISH: A personal pizza made in a skillet: thin crispy base, sauce, melted mozzarella and fresh basil.\n\nINGREDIENTS (1 serving):\n- 1 whole wheat tortilla (40g)\n- 2 tablespoons tomato sauce (30g)\n- 40g shredded mozzarella\n- 4 tomato slices\n- Fresh basil and oregano\n- A drizzle of olive oil to finish (optional)\n\nPREPARATION:\n1. Warm the tortilla in a dry skillet over medium heat for 1 minute, then flip.\n2. Spread the sauce and top with mozzarella, tomato and oregano.\n3. Cover and cook 3 to 4 minutes over low heat, until the cheese melts and the base is crisp.\n\nTO SERVE:\n1. Slide onto a board and top with fresh basil.\n2. Cut into 4 and eat hot.\n\nLIFE''S TIP: Craving pizza on a Tuesday? This one is done in 8 minutes, no delivery wait.", "es": "SOBRE EL PLATO: Pizza individual hecha en la sartén: base fina y crujiente, salsa, mozzarella derretida y albahaca fresca.\n\nINGREDIENTES (1 porción):\n- 1 tortilla integral (40g)\n- 2 cucharadas de salsa de tomate (30g)\n- 40g de mozzarella rallada\n- 4 rodajas de tomate\n- Albahaca fresca y orégano\n- 1 hilo de aceite de oliva para terminar (opcional)\n\nPREPARACIÓN:\n1. Calienta la tortilla en una sartén seca, a fuego medio, 1 minuto, y dale la vuelta.\n2. Extiende la salsa y cubre con la mozzarella, el tomate y el orégano.\n3. Tapa y deja de 3 a 4 minutos a fuego bajo, hasta que el queso se derrita y la base quede crujiente.\n\nMONTAJE:\n1. Pásala a una tabla y cubre con albahaca fresca.\n2. Corta en 4 y come caliente.\n\nCONSEJO DE LIFE: ¿Antojo de pizza un martes? Esta se resuelve en 8 minutos, sin esperar al repartidor.", "fr": "À PROPOS DU PLAT : Une pizza individuelle faite à la poêle : pâte fine et croustillante, sauce, mozzarella fondue et basilic frais.\n\nINGRÉDIENTS (1 portion) :\n- 1 tortilla complète (40 g)\n- 2 cuillères à soupe de sauce tomate (30 g)\n- 40 g de mozzarella râpée\n- 4 rondelles de tomate\n- Basilic frais et origan\n- 1 filet d’huile d’olive pour finir (facultatif)\n\nPRÉPARATION :\n1. Chauffe la tortilla dans une poêle sèche, à feu moyen, 1 minute, puis retourne-la.\n2. Étale la sauce puis ajoute la mozzarella, la tomate et l’origan.\n3. Couvre et laisse 3 à 4 minutes à feu doux, jusqu’à ce que le fromage fonde et que la base soit croustillante.\n\nDRESSAGE :\n1. Glisse-la sur une planche et parsème de basilic frais.\n2. Coupe en 4 et mange chaud.\n\nL’ASTUCE DE LIFE : Envie de pizza un mardi ? Celle-ci est prête en 8 minutes, sans attendre le livreur.", "hi": "इस डिश के बारे में: तवे पर बना एक व्यक्ति का पिज़्ज़ा: पतला कुरकुरा बेस, सॉस, पिघला मोज़रेला और ताज़ी तुलसी (बेसिल)।\n\nसामग्री (1 सर्विंग):\n- 1 होल व्हीट टॉर्टिला (40 g)\n- 2 बड़े चम्मच टमाटर सॉस (30 g)\n- 40 g कसा मोज़रेला\n- टमाटर के 4 स्लाइस\n- ताज़ी बेसिल और ओरेगानो\n- ऊपर से थोड़ा ऑलिव ऑयल (वैकल्पिक)\n\nबनाने का तरीक़ा:\n1. सूखे तवे पर मध्यम आँच पर टॉर्टिला 1 मिनट गरम करें और पलट दें।\n2. सॉस फैलाएँ, ऊपर मोज़रेला, टमाटर और ओरेगानो रखें।\n3. ढककर धीमी आँच पर 3 से 4 मिनट रखें, जब तक चीज़ पिघल जाए और बेस कुरकुरा हो जाए।\n\nपरोसने का तरीक़ा:\n1. बोर्ड पर निकालें और ऊपर ताज़ी बेसिल डालें।\n2. 4 टुकड़े करें और गरम खाएँ।\n\nLife की टिप: मंगलवार को पिज़्ज़ा का मन? यह 8 मिनट में तैयार, डिलीवरी का इंतज़ार नहीं।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Pizza de Frigideira Marguerita');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Crepioca de Frango Cremoso', 'Dourada por fora, recheio cremoso por dentro', 'emagrecimento',
  '{"proteina": 27, "carboidrato": 19, "gordura": 9}'::jsonb, 269, 10, '#22c55e', true, false,
  'SOBRE O PRATO: Crepioca dourada e flexível, dobrada sobre um recheio de frango desfiado com requeijão. Café da manhã ou jantar rápido.

INGREDIENTES (1 porção):
- 1 ovo
- 2 colheres de sopa de goma de tapioca (30g)
- 60g de frango cozido desfiado
- 1 colher de sopa de requeijão light (15g)
- Sal, orégano e cheiro-verde a gosto

PREPARO:
1. Bata o ovo com a tapioca e uma pitada de sal até ficar liso.
2. Despeje numa frigideira antiaderente quente e deixe 2 minutos de cada lado, até dourar.
3. Misture o frango com o requeijão, o orégano e o cheiro-verde.

MONTAGEM:
1. Ponha o recheio numa metade da crepioca.
2. Dobre, deixe mais 30 segundos na frigideira pra aquecer o recheio e sirva.

DICA DO LIFE: Sobrou frango do almoço? Vira essa crepioca em 10 minutos.',
  35, array['ovo','carne','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Creamy Chicken Crepioca", "subtitulo": "Golden outside, creamy filling inside"}, "es": {"titulo": "Crepioca de Pollo Cremoso", "subtitulo": "Dorada por fuera, relleno cremoso por dentro"}, "fr": {"titulo": "Crepioca au Poulet Crémeux", "subtitulo": "Dorée dehors, garniture crémeuse dedans"}, "hi": {"titulo": "क्रीमी चिकन क्रेपियोका", "subtitulo": "बाहर से सुनहरा, अंदर क्रीमी भरावन"}}'::jsonb,
  '{"en": "ABOUT THE DISH: A golden, flexible egg-and-tapioca crepe folded over shredded chicken with cream cheese. A quick breakfast or dinner.\n\nINGREDIENTS (1 serving):\n- 1 egg\n- 2 tablespoons tapioca starch (30g)\n- 60g cooked shredded chicken\n- 1 tablespoon light cream cheese (15g)\n- Salt, oregano and chopped herbs to taste\n\nPREPARATION:\n1. Whisk the egg with the tapioca and a pinch of salt until smooth.\n2. Pour into a hot nonstick pan and cook 2 minutes per side, until golden.\n3. Mix the chicken with the cream cheese, oregano and herbs.\n\nTO SERVE:\n1. Put the filling on one half of the crepe.\n2. Fold, leave 30 more seconds in the pan to warm the filling, and serve.\n\nLIFE''S TIP: Leftover chicken from lunch? It becomes this crepe in 10 minutes.", "es": "SOBRE EL PLATO: Crepioca dorada y flexible, doblada sobre un relleno de pollo desmenuzado con queso crema. Desayuno o cena rápida.\n\nINGREDIENTES (1 porción):\n- 1 huevo\n- 2 cucharadas de almidón de tapioca (30g)\n- 60g de pollo cocido desmenuzado\n- 1 cucharada de queso crema light (15g)\n- Sal, orégano y hierbas picadas a gusto\n\nPREPARACIÓN:\n1. Bate el huevo con la tapioca y una pizca de sal hasta que quede liso.\n2. Vierte en una sartén antiadherente caliente y deja 2 minutos por lado, hasta dorar.\n3. Mezcla el pollo con el queso crema, el orégano y las hierbas.\n\nMONTAJE:\n1. Pon el relleno en una mitad de la crepioca.\n2. Dobla, deja 30 segundos más en la sartén para calentar el relleno y sirve.\n\nCONSEJO DE LIFE: ¿Sobró pollo del almuerzo? Se convierte en esta crepioca en 10 minutos.", "fr": "À PROPOS DU PLAT : Une crêpe œuf-tapioca dorée et souple, repliée sur du poulet effiloché au fromage frais. Petit-déjeuner ou dîner express.\n\nINGRÉDIENTS (1 portion) :\n- 1 œuf\n- 2 cuillères à soupe de fécule de tapioca (30 g)\n- 60 g de poulet cuit effiloché\n- 1 cuillère à soupe de fromage frais allégé (15 g)\n- Sel, origan et herbes hachées selon ton goût\n\nPRÉPARATION :\n1. Fouette l’œuf avec le tapioca et une pincée de sel jusqu’à ce que ce soit lisse.\n2. Verse dans une poêle antiadhésive chaude et cuis 2 minutes de chaque côté, jusqu’à ce que ce soit doré.\n3. Mélange le poulet avec le fromage frais, l’origan et les herbes.\n\nDRESSAGE :\n1. Dépose la garniture sur une moitié de la crêpe.\n2. Replie, laisse encore 30 secondes dans la poêle pour réchauffer la garniture, puis sers.\n\nL’ASTUCE DE LIFE : Il reste du poulet du déjeuner ? Il devient cette crêpe en 10 minutes.", "hi": "इस डिश के बारे में: अंडे और टैपिओका का सुनहरा, लचीला क्रेप, जिसमें क्रीम चीज़ वाला रेशेदार चिकन भरा है। झटपट नाश्ता या डिनर।\n\nसामग्री (1 सर्विंग):\n- 1 अंडा\n- 2 बड़े चम्मच टैपिओका स्टार्च (30 g)\n- 60 g पका हुआ रेशेदार चिकन\n- 1 बड़ा चम्मच लाइट क्रीम चीज़ (15 g)\n- स्वाद अनुसार नमक, ओरेगानो और कटा हरा धनिया\n\nबनाने का तरीक़ा:\n1. अंडे को टैपिओका और चुटकी भर नमक के साथ चिकना होने तक फेंटें।\n2. गरम नॉन-स्टिक पैन में डालें और हर तरफ़ 2 मिनट, सुनहरा होने तक पकाएँ।\n3. चिकन में क्रीम चीज़, ओरेगानो और हरा धनिया मिलाएँ।\n\nपरोसने का तरीक़ा:\n1. क्रेप के आधे हिस्से पर भरावन रखें।\n2. मोड़ें, भरावन गरम होने के लिए 30 सेकंड और पैन में रखें और परोसें।\n\nLife की टिप: दोपहर का चिकन बच गया? 10 मिनट में यह क्रेप बन जाता है।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Crepioca de Frango Cremoso');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Açaí na Tigela sem Açúcar', 'Roxo, cremoso e com crocante por cima', 'shakes',
  '{"proteina": 8, "carboidrato": 51, "gordura": 7}'::jsonb, 275, 5, '#06b6d4', true, false,
  'SOBRE O PRATO: Açaí batido grosso com banana congelada, sem xarope, coberto com morango e granola. Cremoso de comer de colher.

INGREDIENTES (1 porção):
- 100g de polpa de açaí sem açúcar
- 1 banana congelada em rodelas (100g)
- 100g de iogurte natural desnatado
- 50g de morango fatiado
- 1 colher de sopa de granola (15g)

PREPARO:
1. Bata no liquidificador o açaí, a banana congelada e o iogurte, usando a tecla pulsar.
2. Pare e mexa com uma colher quando travar; não ponha água, pra ficar grosso.

MONTAGEM:
1. Passe pra uma tigela.
2. Cubra com o morango e a granola e coma na hora.

DICA DO LIFE: A banana congelada é que deixa cremoso e doce. Deixa sempre umas rodelas no freezer.',
  36, array['lactose','gluten']::text[], '{}'::text[], 'doce', 'chef',
  '{"en": {"titulo": "No-Sugar Açaí Bowl", "subtitulo": "Purple, creamy and crunchy on top"}, "es": {"titulo": "Bowl de Açaí sin Azúcar", "subtitulo": "Morado, cremoso y con crujiente encima"}, "fr": {"titulo": "Bol d’Açaï sans Sucre", "subtitulo": "Violet, crémeux, avec du croquant dessus"}, "hi": {"titulo": "बिना चीनी का असाई बाउल", "subtitulo": "बैंगनी, क्रीमी और ऊपर से कुरकुरा"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Açaí blended thick with frozen banana, no syrup, topped with strawberries and granola. Creamy enough to eat with a spoon.\n\nINGREDIENTS (1 serving):\n- 100g unsweetened açaí pulp\n- 1 frozen banana, sliced (100g)\n- 100g plain nonfat yogurt\n- 50g sliced strawberries\n- 1 tablespoon granola (15g)\n\nPREPARATION:\n1. Blend the açaí, frozen banana and yogurt using the pulse button.\n2. Stop and stir with a spoon when it jams; do not add water, so it stays thick.\n\nTO SERVE:\n1. Scoop into a bowl.\n2. Top with strawberries and granola and eat right away.\n\nLIFE''S TIP: The frozen banana is what makes it creamy and sweet. Always keep some slices in the freezer.", "es": "SOBRE EL PLATO: Açaí batido espeso con plátano congelado, sin jarabe, cubierto con fresas y granola. Cremoso para comer con cuchara.\n\nINGREDIENTES (1 porción):\n- 100g de pulpa de açaí sin azúcar\n- 1 plátano congelado en rodajas (100g)\n- 100g de yogur natural descremado\n- 50g de fresas en láminas\n- 1 cucharada de granola (15g)\n\nPREPARACIÓN:\n1. Licúa el açaí, el plátano congelado y el yogur usando el botón de pulso.\n2. Para y remueve con una cuchara cuando se trabe; no pongas agua, para que quede espeso.\n\nMONTAJE:\n1. Pásalo a un tazón.\n2. Cubre con las fresas y la granola y cómelo al momento.\n\nCONSEJO DE LIFE: El plátano congelado es lo que lo deja cremoso y dulce. Ten siempre unas rodajas en el congelador.", "fr": "À PROPOS DU PLAT : De l’açaï mixé bien épais avec de la banane congelée, sans sirop, recouvert de fraises et de granola. Crémeux à manger à la cuillère.\n\nINGRÉDIENTS (1 portion) :\n- 100 g de pulpe d’açaï non sucrée\n- 1 banane congelée en rondelles (100 g)\n- 100 g de yaourt nature 0 %\n- 50 g de fraises émincées\n- 1 cuillère à soupe de granola (15 g)\n\nPRÉPARATION :\n1. Mixe l’açaï, la banane congelée et le yaourt par impulsions.\n2. Arrête et remue à la cuillère quand ça bloque ; n’ajoute pas d’eau, pour que ça reste épais.\n\nDRESSAGE :\n1. Verse dans un bol.\n2. Ajoute les fraises et le granola et mange tout de suite.\n\nL’ASTUCE DE LIFE : C’est la banane congelée qui le rend crémeux et sucré. Garde toujours quelques rondelles au congélateur.", "hi": "इस डिश के बारे में: जमे हुए केले के साथ गाढ़ा ब्लेंड किया असाई, बिना सिरप के, ऊपर स्ट्रॉबेरी और ग्रेनोला। इतना क्रीमी कि चम्मच से खाएँ।\n\nसामग्री (1 सर्विंग):\n- 100 g बिना चीनी का असाई पल्प\n- 1 जमा हुआ केला, गोल कटा (100 g)\n- 100 g बिना मलाई का सादा दही\n- 50 g कटी स्ट्रॉबेरी\n- 1 बड़ा चम्मच ग्रेनोला (15 g)\n\nबनाने का तरीक़ा:\n1. असाई, जमा केला और दही को पल्स बटन से ब्लेंड करें।\n2. अटकने पर रोककर चम्मच से चलाएँ; पानी न डालें, ताकि गाढ़ा रहे।\n\nपरोसने का तरीक़ा:\n1. कटोरे में निकालें।\n2. ऊपर स्ट्रॉबेरी और ग्रेनोला डालें और तुरंत खाएँ।\n\nLife की टिप: जमा हुआ केला ही इसे क्रीमी और मीठा बनाता है। फ़्रीज़र में हमेशा कुछ टुकड़े रखिए।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Açaí na Tigela sem Açúcar');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Brownie de Caneca de Chocolate', 'Três minutos e o meio ainda derretendo', 'habitos',
  '{"proteina": 12, "carboidrato": 38, "gordura": 12}'::jsonb, 281, 5, '#f97316', true, false,
  'SOBRE O PRATO: Brownie úmido feito na caneca, no micro-ondas, com um pedaço de chocolate derretendo no meio.

INGREDIENTES (1 porção):
- 1 ovo
- 70g de banana madura amassada
- 1 colher de sopa de cacau 100% (10g)
- 15g de aveia em flocos finos
- 1 colher de chá de fermento químico
- 10g de chocolate 70%
- Adoçante a gosto

PREPARO:
1. Na caneca, misture o ovo, a banana, o cacau, a aveia e o adoçante até ficar homogêneo.
2. Junte o fermento e mexa de leve.
3. Afunde o pedaço de chocolate no meio e leve ao micro-ondas por 1 minuto e meio a 2 minutos.

MONTAGEM:
1. Espere 1 minuto, porque sai muito quente.
2. Coma de colher, direto da caneca.

DICA DO LIFE: Tira antes de secar: o meio molhadinho é o que faz dele um brownie.',
  37, array['ovo','gluten','lactose']::text[], '{}'::text[], 'doce', 'chef',
  '{"en": {"titulo": "Chocolate Mug Brownie", "subtitulo": "Three minutes and the middle is still molten"}, "es": {"titulo": "Brownie de Taza de Chocolate", "subtitulo": "Tres minutos y el centro sigue derretido"}, "fr": {"titulo": "Brownie au Chocolat dans une Tasse", "subtitulo": "Trois minutes et le cœur est encore fondant"}, "hi": {"titulo": "चॉकलेट मग ब्राउनी", "subtitulo": "तीन मिनट और बीच का हिस्सा अब भी पिघला हुआ"}}'::jsonb,
  '{"en": "ABOUT THE DISH: A moist brownie made in a mug, in the microwave, with a piece of chocolate melting in the center.\n\nINGREDIENTS (1 serving):\n- 1 egg\n- 70g mashed ripe banana\n- 1 tablespoon 100% cocoa (10g)\n- 15g fine rolled oats\n- 1 teaspoon baking powder\n- 10g 70% chocolate\n- Sweetener to taste\n\nPREPARATION:\n1. In the mug, mix the egg, banana, cocoa, oats and sweetener until smooth.\n2. Add the baking powder and stir gently.\n3. Push the piece of chocolate into the center and microwave for 1.5 to 2 minutes.\n\nTO SERVE:\n1. Wait 1 minute, it comes out very hot.\n2. Eat with a spoon, straight from the mug.\n\nLIFE''S TIP: Take it out before it dries: the gooey middle is what makes it a brownie.", "es": "SOBRE EL PLATO: Brownie húmedo hecho en taza, en el microondas, con un trozo de chocolate derritiéndose en el centro.\n\nINGREDIENTES (1 porción):\n- 1 huevo\n- 70g de plátano maduro aplastado\n- 1 cucharada de cacao 100% (10g)\n- 15g de avena en hojuelas finas\n- 1 cucharadita de polvo de hornear\n- 10g de chocolate 70%\n- Endulzante a gusto\n\nPREPARACIÓN:\n1. En la taza, mezcla el huevo, el plátano, el cacao, la avena y el endulzante hasta que quede homogéneo.\n2. Añade el polvo de hornear y remueve suavemente.\n3. Hunde el trozo de chocolate en el centro y lleva al microondas de 1 minuto y medio a 2 minutos.\n\nMONTAJE:\n1. Espera 1 minuto, porque sale muy caliente.\n2. Cómelo con cuchara, directo de la taza.\n\nCONSEJO DE LIFE: Sácalo antes de que se seque: el centro húmedo es lo que lo hace brownie.", "fr": "À PROPOS DU PLAT : Un brownie moelleux fait dans une tasse, au micro-ondes, avec un morceau de chocolat qui fond au centre.\n\nINGRÉDIENTS (1 portion) :\n- 1 œuf\n- 70 g de banane mûre écrasée\n- 1 cuillère à soupe de cacao 100 % (10 g)\n- 15 g de petits flocons d’avoine\n- 1 cuillère à café de levure chimique\n- 10 g de chocolat 70 %\n- Édulcorant selon ton goût\n\nPRÉPARATION :\n1. Dans la tasse, mélange l’œuf, la banane, le cacao, l’avoine et l’édulcorant jusqu’à ce que ce soit homogène.\n2. Ajoute la levure et remue doucement.\n3. Enfonce le morceau de chocolat au centre et passe au micro-ondes 1 minute 30 à 2 minutes.\n\nDRESSAGE :\n1. Attends 1 minute, il sort très chaud.\n2. Mange-le à la cuillère, directement dans la tasse.\n\nL’ASTUCE DE LIFE : Sors-le avant qu’il ne sèche : c’est le cœur fondant qui en fait un brownie.", "hi": "इस डिश के बारे में: माइक्रोवेव में, मग में बनी नरम ब्राउनी, जिसके बीच में चॉकलेट का टुकड़ा पिघलता है।\n\nसामग्री (1 सर्विंग):\n- 1 अंडा\n- 70 g मसला हुआ पका केला\n- 1 बड़ा चम्मच 100% कोको (10 g)\n- 15 g बारीक रोल्ड ओट्स\n- 1 छोटा चम्मच बेकिंग पाउडर\n- 10 g 70% चॉकलेट\n- स्वाद अनुसार स्वीटनर\n\nबनाने का तरीक़ा:\n1. मग में अंडा, केला, कोको, ओट्स और स्वीटनर एक-सा होने तक मिलाएँ।\n2. बेकिंग पाउडर डालकर हल्के से चलाएँ।\n3. चॉकलेट का टुकड़ा बीच में दबाएँ और 1.5 से 2 मिनट माइक्रोवेव करें।\n\nपरोसने का तरीक़ा:\n1. 1 मिनट रुकें, बहुत गरम निकलती है।\n2. चम्मच से, सीधे मग से खाएँ।\n\nLife की टिप: सूखने से पहले निकाल लीजिए: बीच का गीला हिस्सा ही इसे ब्राउनी बनाता है।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Brownie de Caneca de Chocolate');
