-- ATHOSlife — 13 receitas salgadas da Cozinha (12/11/2026, segundo lote)
--
-- Pedido do dono depois do primeiro lote: mais 13, com foco em salgados.
-- Mesmas categorias de hoje, texto em pt/en/es/fr/hi, macros aproximados
-- (TACO) POR PORÇÃO, `ordem` 38–50. Pode rodar de novo: só insere a receita
-- que ainda não existe com aquele título.
-- Gerado por scripts/receitas/receitas_salgadas_2026_11_12.py.

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Nuggets de Frango Crocantes', 'Casquinha dourada de forno, sem fritura', 'emagrecimento',
  '{"proteina": 42, "carboidrato": 14, "gordura": 10}'::jsonb, 320, 25, '#22c55e', true, true,
  'SOBRE O PRATO: Pedaços de frango com casquinha crocante de aveia e parmesão, assados até dourar. Estalam na mordida e não levam óleo.

INGREDIENTES (1 porção):
- 150g de peito de frango em cubos
- 1 clara de ovo
- 20g de farinha de aveia
- 10g de parmesão ralado
- 1 colher de chá de páprica defumada
- Sal, alho em pó e pimenta a gosto

PREPARO:
1. Tempere o frango com sal, alho e pimenta.
2. Misture a aveia, o parmesão e a páprica num prato.
3. Passe cada cubo na clara e depois na mistura, apertando pra grudar.
4. Asse a 200°C por 18 a 20 minutos, virando na metade, até dourar.

MONTAGEM:
1. Sirva quente, com mostarda ou um molho de iogurte com limão.

DICA DO LIFE: Faz o dobro e congela cru, já empanado. Vai direto do freezer pro forno.',
  38, array['carne','ovo','gluten','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Crispy Chicken Nuggets", "subtitulo": "Golden oven crust, no frying"}, "es": {"titulo": "Nuggets de Pollo Crujientes", "subtitulo": "Costra dorada al horno, sin freír"}, "fr": {"titulo": "Nuggets de Poulet Croustillants", "subtitulo": "Croûte dorée au four, sans friture"}, "hi": {"titulo": "कुरकुरे चिकन नगेट्स", "subtitulo": "ओवन में सुनहरी परत, बिना तले"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Chicken pieces in a crunchy oat and parmesan crust, baked until golden. They snap when you bite and use no oil.\n\nINGREDIENTS (1 serving):\n- 150g chicken breast, cubed\n- 1 egg white\n- 20g oat flour\n- 10g grated parmesan\n- 1 teaspoon smoked paprika\n- Salt, garlic powder and pepper to taste\n\nPREPARATION:\n1. Season the chicken with salt, garlic and pepper.\n2. Mix the oat flour, parmesan and paprika on a plate.\n3. Dip each cube in the egg white, then in the mixture, pressing so it sticks.\n4. Bake at 200°C for 18 to 20 minutes, turning halfway, until golden.\n\nTO SERVE:\n1. Serve hot, with mustard or a lemon yogurt dip.\n\nLIFE''S TIP: Make a double batch and freeze them raw, already coated. They go straight from freezer to oven.", "es": "SOBRE EL PLATO: Trozos de pollo con costra crujiente de avena y parmesano, horneados hasta dorar. Crujen al morder y no llevan aceite.\n\nINGREDIENTES (1 porción):\n- 150g de pechuga de pollo en cubos\n- 1 clara de huevo\n- 20g de harina de avena\n- 10g de parmesano rallado\n- 1 cucharadita de pimentón ahumado\n- Sal, ajo en polvo y pimienta a gusto\n\nPREPARACIÓN:\n1. Sazona el pollo con sal, ajo y pimienta.\n2. Mezcla la avena, el parmesano y el pimentón en un plato.\n3. Pasa cada cubo por la clara y luego por la mezcla, apretando para que se pegue.\n4. Hornea a 200°C de 18 a 20 minutos, dando la vuelta a la mitad, hasta dorar.\n\nMONTAJE:\n1. Sirve caliente, con mostaza o una salsa de yogur con limón.\n\nCONSEJO DE LIFE: Haz el doble y congélalos crudos, ya empanizados. Van directo del congelador al horno.", "fr": "À PROPOS DU PLAT : Des morceaux de poulet dans une croûte croustillante d’avoine et de parmesan, cuits au four jusqu’à dorer. Ça craque sous la dent, sans huile.\n\nINGRÉDIENTS (1 portion) :\n- 150 g de blanc de poulet en dés\n- 1 blanc d’œuf\n- 20 g de farine d’avoine\n- 10 g de parmesan râpé\n- 1 cuillère à café de paprika fumé\n- Sel, ail en poudre et poivre selon ton goût\n\nPRÉPARATION :\n1. Assaisonne le poulet avec le sel, l’ail et le poivre.\n2. Mélange la farine d’avoine, le parmesan et le paprika dans une assiette.\n3. Trempe chaque dé dans le blanc d’œuf puis dans le mélange, en appuyant pour que ça accroche.\n4. Enfourne à 200 °C pendant 18 à 20 minutes, en retournant à mi-cuisson, jusqu’à ce que ce soit doré.\n\nDRESSAGE :\n1. Sers chaud, avec de la moutarde ou une sauce yaourt-citron.\n\nL’ASTUCE DE LIFE : Fais-en le double et congèle-les crus, déjà panés. Ils passent directement du congélateur au four.", "hi": "इस डिश के बारे में: ओट्स और पार्मेज़ान की कुरकुरी परत वाले चिकन के टुकड़े, सुनहरा होने तक बेक किए हुए। काटते ही कुरकुराते हैं और तेल नहीं लगता।\n\nसामग्री (1 सर्विंग):\n- 150 g चिकन ब्रेस्ट, टुकड़ों में\n- 1 अंडे की सफ़ेदी\n- 20 g ओट्स का आटा\n- 10 g कसा पार्मेज़ान\n- 1 छोटा चम्मच स्मोक्ड पैप्रिका\n- स्वाद अनुसार नमक, लहसुन पाउडर और काली मिर्च\n\nबनाने का तरीक़ा:\n1. चिकन में नमक, लहसुन और काली मिर्च लगाएँ।\n2. प्लेट में ओट्स का आटा, पार्मेज़ान और पैप्रिका मिलाएँ।\n3. हर टुकड़े को सफ़ेदी में और फिर मिश्रण में लपेटें, दबाकर चिपकाएँ।\n4. 200°C पर 18 से 20 मिनट बेक करें, बीच में पलटें, सुनहरा होने तक।\n\nपरोसने का तरीक़ा:\n1. गरम परोसें, मस्टर्ड या नींबू वाली दही की चटनी के साथ।\n\nLife की टिप: दुगुना बनाइए और कच्चे, परत लगे हुए ही जमा दीजिए। फ़्रीज़र से सीधे ओवन में जाते हैं।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Nuggets de Frango Crocantes');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Escondidinho de Batata Doce com Carne', 'Purê dourado por cima, carne suculenta embaixo', 'massa',
  '{"proteina": 28, "carboidrato": 33, "gordura": 15}'::jsonb, 380, 35, '#3b82f6', true, false,
  'SOBRE O PRATO: Carne moída bem temperada escondida debaixo de um purê de batata doce, com queijo gratinado por cima.

INGREDIENTES (1 porção):
- 150g de batata doce cozida
- 100g de patinho moído
- 40g de molho de tomate
- 20g de cebola picada
- 20g de muçarela ralada
- 1 colher de chá de azeite (5ml)
- Alho, sal e cheiro-verde a gosto

PREPARO:
1. Amasse a batata doce ainda quente com uma pitada de sal até virar purê.
2. Refogue a cebola e o alho no azeite, junte a carne e doure bem.
3. Acrescente o molho de tomate e o cheiro-verde e cozinhe 3 minutos.
4. Num refratário, ponha a carne, cubra com o purê e a muçarela e leve ao forno a 200°C por 15 minutos, até gratinar.

MONTAGEM:
1. Espere 5 minutos antes de servir, pra firmar.
2. Acompanha bem uma salada de folhas.

DICA DO LIFE: Dá pra montar no domingo e deixar na geladeira. Na hora é só gratinar.',
  39, array['carne','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Sweet Potato & Beef Bake", "subtitulo": "Golden mash on top, juicy beef underneath"}, "es": {"titulo": "Pastel de Batata y Carne", "subtitulo": "Puré dorado arriba, carne jugosa abajo"}, "fr": {"titulo": "Parmentier de Patate Douce au Bœuf", "subtitulo": "Purée dorée dessus, bœuf juteux dessous"}, "hi": {"titulo": "शकरकंद और कीमे का बेक", "subtitulo": "ऊपर सुनहरा मैश, नीचे रसीला कीमा"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Well-seasoned ground beef hidden under sweet potato mash, with melted cheese on top. The Brazilian \"escondidinho\".\n\nINGREDIENTS (1 serving):\n- 150g cooked sweet potato\n- 100g lean ground beef\n- 40g tomato sauce\n- 20g chopped onion\n- 20g shredded mozzarella\n- 1 teaspoon olive oil (5ml)\n- Garlic, salt and chopped herbs to taste\n\nPREPARATION:\n1. Mash the sweet potato while still hot with a pinch of salt.\n2. Soften the onion and garlic in the oil, add the beef and brown well.\n3. Add the tomato sauce and herbs and cook for 3 minutes.\n4. In a baking dish, layer the beef, cover with the mash and mozzarella and bake at 200°C for 15 minutes, until golden.\n\nTO SERVE:\n1. Wait 5 minutes before serving so it sets.\n2. It goes well with a leafy salad.\n\nLIFE''S TIP: You can assemble it on Sunday and keep it in the fridge. Then it only needs the oven.", "es": "SOBRE EL PLATO: Carne molida bien sazonada escondida bajo un puré de batata (camote), con queso gratinado por encima. El \"escondidinho\" brasileño.\n\nINGREDIENTES (1 porción):\n- 150g de batata (camote) cocida\n- 100g de carne molida magra\n- 40g de salsa de tomate\n- 20g de cebolla picada\n- 20g de mozzarella rallada\n- 1 cucharadita de aceite de oliva (5ml)\n- Ajo, sal y hierbas picadas a gusto\n\nPREPARACIÓN:\n1. Aplasta la batata todavía caliente con una pizca de sal hasta hacerla puré.\n2. Sofríe la cebolla y el ajo en el aceite, añade la carne y dórala bien.\n3. Agrega la salsa de tomate y las hierbas y cocina 3 minutos.\n4. En una fuente, pon la carne, cubre con el puré y la mozzarella y hornea a 200°C durante 15 minutos, hasta gratinar.\n\nMONTAJE:\n1. Espera 5 minutos antes de servir, para que tome firmeza.\n2. Queda bien con una ensalada de hojas.\n\nCONSEJO DE LIFE: Puedes armarlo el domingo y dejarlo en la nevera. Luego solo hay que gratinar.", "fr": "À PROPOS DU PLAT : Du bœuf haché bien assaisonné caché sous une purée de patate douce, avec du fromage gratiné. L’« escondidinho » brésilien.\n\nINGRÉDIENTS (1 portion) :\n- 150 g de patate douce cuite\n- 100 g de bœuf haché maigre\n- 40 g de sauce tomate\n- 20 g d’oignon haché\n- 20 g de mozzarella râpée\n- 1 cuillère à café d’huile d’olive (5 ml)\n- Ail, sel et herbes hachées selon ton goût\n\nPRÉPARATION :\n1. Écrase la patate douce encore chaude avec une pincée de sel pour en faire une purée.\n2. Fais revenir l’oignon et l’ail dans l’huile, ajoute le bœuf et fais-le bien dorer.\n3. Ajoute la sauce tomate et les herbes et laisse cuire 3 minutes.\n4. Dans un plat, dépose le bœuf, recouvre de purée et de mozzarella et enfourne à 200 °C pendant 15 minutes, jusqu’à gratiner.\n\nDRESSAGE :\n1. Attends 5 minutes avant de servir, pour qu’il se tienne.\n2. Il va bien avec une salade verte.\n\nL’ASTUCE DE LIFE : Tu peux le monter le dimanche et le garder au frais. Il ne reste qu’à le gratiner.", "hi": "इस डिश के बारे में: अच्छे से मसालेदार कीमा, शकरकंद के मैश के नीचे छिपा हुआ, ऊपर पिघला चीज़। ब्राज़ील का \"एस्कोंडिदिन्यो\"।\n\nसामग्री (1 सर्विंग):\n- 150 g उबला शकरकंद\n- 100 g लीन कीमा (बीफ़)\n- 40 g टमाटर सॉस\n- 20 g कटा प्याज़\n- 20 g कसा मोज़रेला\n- 1 छोटा चम्मच ऑलिव ऑयल (5 ml)\n- स्वाद अनुसार लहसुन, नमक और हरा धनिया\n\nबनाने का तरीक़ा:\n1. गरम शकरकंद को चुटकी भर नमक के साथ मसलकर मैश बना लें।\n2. तेल में प्याज़ और लहसुन भूनें, कीमा डालें और अच्छे से सुनहरा करें।\n3. टमाटर सॉस और हरा धनिया डालकर 3 मिनट पकाएँ।\n4. बेकिंग डिश में कीमा रखें, ऊपर मैश और मोज़रेला डालें और 200°C पर 15 मिनट, सुनहरा होने तक बेक करें।\n\nपरोसने का तरीक़ा:\n1. परोसने से पहले 5 मिनट रुकें, ताकि जम जाए।\n2. साथ में पत्तेदार सलाद अच्छा लगता है।\n\nLife की टिप: इतवार को तैयार करके फ़्रिज में रख सकते हैं। फिर बस बेक करना है।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Escondidinho de Batata Doce com Carne');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Macarrão Cremoso com Frango e Brócolis', 'Molho branco de uma panela só', 'massa',
  '{"proteina": 34, "carboidrato": 52, "gordura": 13}'::jsonb, 460, 20, '#3b82f6', true, true,
  'SOBRE O PRATO: Macarrão envolvido num molho branco cremoso, com frango dourado e brócolis bem verde. Uma panela só e pouca louça.

INGREDIENTES (1 porção):
- 60g de macarrão cru (penne ou parafuso)
- 100g de peito de frango em cubos
- 80g de brócolis em buquês
- 2 colheres de sopa de requeijão light (30g)
- 1 colher de chá de azeite (5ml)
- 1 dente de alho picado
- Sal e pimenta a gosto

PREPARO:
1. Cozinhe o macarrão em água com sal; nos 3 minutos finais, junte o brócolis. Reserve meia xícara da água e escorra.
2. Na mesma panela, aqueça o azeite, doure o alho e o frango temperado por uns 6 minutos.
3. Volte o macarrão e o brócolis, junte o requeijão e 3 a 4 colheres da água do cozimento e mexa até ficar cremoso.

MONTAGEM:
1. Sirva na hora, com pimenta moída por cima.

DICA DO LIFE: A água do cozimento é o truque: é ela que deixa o molho cremoso sem precisar de creme de leite.',
  40, array['gluten','carne','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Creamy Chicken & Broccoli Pasta", "subtitulo": "One-pot white sauce"}, "es": {"titulo": "Pasta Cremosa con Pollo y Brócoli", "subtitulo": "Salsa blanca en una sola olla"}, "fr": {"titulo": "Pâtes Crémeuses Poulet et Brocoli", "subtitulo": "Sauce blanche dans une seule casserole"}, "hi": {"titulo": "चिकन और ब्रोकली वाला क्रीमी पास्ता", "subtitulo": "एक ही बर्तन में वाइट सॉस"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Pasta coated in a creamy white sauce, with browned chicken and bright green broccoli. One pot and little washing up.\n\nINGREDIENTS (1 serving):\n- 60g dry pasta (penne or fusilli)\n- 100g chicken breast, cubed\n- 80g broccoli florets\n- 2 tablespoons light cream cheese (30g)\n- 1 teaspoon olive oil (5ml)\n- 1 garlic clove, minced\n- Salt and pepper to taste\n\nPREPARATION:\n1. Cook the pasta in salted water; add the broccoli for the last 3 minutes. Save half a cup of the water and drain.\n2. In the same pot, heat the oil and brown the garlic and seasoned chicken for about 6 minutes.\n3. Return the pasta and broccoli, add the cream cheese and 3 to 4 tablespoons of the pasta water and stir until creamy.\n\nTO SERVE:\n1. Serve right away, with fresh ground pepper on top.\n\nLIFE''S TIP: The pasta water is the trick: it makes the sauce creamy with no cream at all.", "es": "SOBRE EL PLATO: Pasta envuelta en una salsa blanca cremosa, con pollo dorado y brócoli bien verde. Una sola olla y poco que lavar.\n\nINGREDIENTES (1 porción):\n- 60g de pasta cruda (penne o tornillos)\n- 100g de pechuga de pollo en cubos\n- 80g de brócoli en ramitos\n- 2 cucharadas de queso crema light (30g)\n- 1 cucharadita de aceite de oliva (5ml)\n- 1 diente de ajo picado\n- Sal y pimienta a gusto\n\nPREPARACIÓN:\n1. Cuece la pasta en agua con sal; en los últimos 3 minutos añade el brócoli. Reserva media taza del agua y escurre.\n2. En la misma olla, calienta el aceite y dora el ajo y el pollo sazonado unos 6 minutos.\n3. Devuelve la pasta y el brócoli, añade el queso crema y de 3 a 4 cucharadas del agua de cocción y remueve hasta que quede cremoso.\n\nMONTAJE:\n1. Sirve al momento, con pimienta molida por encima.\n\nCONSEJO DE LIFE: El agua de cocción es el truco: es lo que vuelve cremosa la salsa sin usar nata.", "fr": "À PROPOS DU PLAT : Des pâtes enrobées d’une sauce blanche crémeuse, avec du poulet doré et du brocoli bien vert. Une seule casserole et peu de vaisselle.\n\nINGRÉDIENTS (1 portion) :\n- 60 g de pâtes crues (penne ou fusilli)\n- 100 g de blanc de poulet en dés\n- 80 g de brocoli en fleurettes\n- 2 cuillères à soupe de fromage frais allégé (30 g)\n- 1 cuillère à café d’huile d’olive (5 ml)\n- 1 gousse d’ail hachée\n- Sel et poivre selon ton goût\n\nPRÉPARATION :\n1. Cuis les pâtes dans l’eau salée ; ajoute le brocoli les 3 dernières minutes. Garde une demi-tasse d’eau de cuisson et égoutte.\n2. Dans la même casserole, chauffe l’huile puis dore l’ail et le poulet assaisonné pendant environ 6 minutes.\n3. Remets les pâtes et le brocoli, ajoute le fromage frais et 3 à 4 cuillères d’eau de cuisson et remue jusqu’à ce que ce soit crémeux.\n\nDRESSAGE :\n1. Sers tout de suite, avec du poivre moulu dessus.\n\nL’ASTUCE DE LIFE : L’eau de cuisson, c’est l’astuce : c’est elle qui rend la sauce crémeuse sans crème.", "hi": "इस डिश के बारे में: क्रीमी वाइट सॉस में लिपटा पास्ता, सुनहरे चिकन और हरी-भरी ब्रोकली के साथ। एक ही बर्तन और कम बर्तन धोने।\n\nसामग्री (1 सर्विंग):\n- 60 g कच्चा पास्ता (पेने या फ़ुसिली)\n- 100 g चिकन ब्रेस्ट, टुकड़ों में\n- 80 g ब्रोकली के फूल\n- 2 बड़े चम्मच लाइट क्रीम चीज़ (30 g)\n- 1 छोटा चम्मच ऑलिव ऑयल (5 ml)\n- 1 कली लहसुन, कटी हुई\n- स्वाद अनुसार नमक और काली मिर्च\n\nबनाने का तरीक़ा:\n1. नमक वाले पानी में पास्ता उबालें; आख़िरी 3 मिनट में ब्रोकली डाल दें। आधा कप पानी बचाकर छान लें।\n2. उसी बर्तन में तेल गरम करें, लहसुन और नमक-मिर्च लगा चिकन लगभग 6 मिनट सुनहरा करें।\n3. पास्ता और ब्रोकली वापस डालें, क्रीम चीज़ और 3 से 4 बड़े चम्मच बचा हुआ पानी मिलाएँ और क्रीमी होने तक चलाएँ।\n\nपरोसने का तरीक़ा:\n1. तुरंत परोसें, ऊपर ताज़ी पिसी काली मिर्च डालकर।\n\nLife की टिप: पास्ता का पानी ही राज़ है: उसी से सॉस बिना क्रीम के क्रीमी बनता है।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Macarrão Cremoso com Frango e Brócolis');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Arroz de Forno Cremoso', 'Aproveita o arroz de ontem e sai gratinado', 'massa',
  '{"proteina": 36, "carboidrato": 41, "gordura": 11}'::jsonb, 416, 25, '#3b82f6', true, false,
  'SOBRE O PRATO: Arroz misturado com frango desfiado, milho e requeijão, coberto de queijo e gratinado no forno. Comida de casa de vó.

INGREDIENTES (1 porção):
- 120g de arroz branco cozido
- 80g de frango cozido desfiado
- 30g de milho verde
- 1 colher de sopa cheia de requeijão light (20g)
- 20g de muçarela ralada
- 4 rodelas de tomate
- Orégano, sal e cheiro-verde a gosto

PREPARO:
1. Misture o arroz, o frango, o milho, o requeijão e o cheiro-verde e acerte o sal.
2. Passe pra um refratário pequeno e alise.
3. Cubra com o tomate, a muçarela e o orégano e leve ao forno a 200°C por 15 minutos, até o queijo dourar.

MONTAGEM:
1. Sirva quente, direto do refratário.

DICA DO LIFE: Arroz de ontem fica até melhor aqui. Nada de jogar sobra fora.',
  41, array['carne','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Creamy Baked Rice", "subtitulo": "Uses yesterday’s rice and comes out golden"}, "es": {"titulo": "Arroz al Horno Cremoso", "subtitulo": "Aprovecha el arroz de ayer y sale gratinado"}, "fr": {"titulo": "Riz Crémeux au Four", "subtitulo": "Avec le riz de la veille, et bien gratiné"}, "hi": {"titulo": "क्रीमी बेक्ड राइस", "subtitulo": "कल के चावल से, ऊपर से सुनहरा"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Rice mixed with shredded chicken, corn and cream cheese, topped with cheese and baked until golden. Proper home cooking.\n\nINGREDIENTS (1 serving):\n- 120g cooked white rice\n- 80g cooked shredded chicken\n- 30g sweet corn\n- 1 heaped tablespoon light cream cheese (20g)\n- 20g shredded mozzarella\n- 4 tomato slices\n- Oregano, salt and chopped herbs to taste\n\nPREPARATION:\n1. Mix the rice, chicken, corn, cream cheese and herbs and adjust the salt.\n2. Transfer to a small baking dish and smooth the top.\n3. Cover with the tomato, mozzarella and oregano and bake at 200°C for 15 minutes, until the cheese browns.\n\nTO SERVE:\n1. Serve hot, straight from the dish.\n\nLIFE''S TIP: Yesterday’s rice is even better here. No leftovers in the bin.", "es": "SOBRE EL PLATO: Arroz mezclado con pollo desmenuzado, maíz y queso crema, cubierto de queso y gratinado al horno. Comida de casa.\n\nINGREDIENTES (1 porción):\n- 120g de arroz blanco cocido\n- 80g de pollo cocido desmenuzado\n- 30g de maíz dulce\n- 1 cucharada colmada de queso crema light (20g)\n- 20g de mozzarella rallada\n- 4 rodajas de tomate\n- Orégano, sal y hierbas picadas a gusto\n\nPREPARACIÓN:\n1. Mezcla el arroz, el pollo, el maíz, el queso crema y las hierbas y ajusta la sal.\n2. Pásalo a una fuente pequeña y alisa.\n3. Cubre con el tomate, la mozzarella y el orégano y hornea a 200°C durante 15 minutos, hasta que el queso se dore.\n\nMONTAJE:\n1. Sirve caliente, directo de la fuente.\n\nCONSEJO DE LIFE: El arroz de ayer queda incluso mejor aquí. Nada de tirar sobras.", "fr": "À PROPOS DU PLAT : Du riz mélangé à du poulet effiloché, du maïs et du fromage frais, recouvert de fromage et gratiné au four. De la vraie cuisine de maison.\n\nINGRÉDIENTS (1 portion) :\n- 120 g de riz blanc cuit\n- 80 g de poulet cuit effiloché\n- 30 g de maïs doux\n- 1 cuillère à soupe bombée de fromage frais allégé (20 g)\n- 20 g de mozzarella râpée\n- 4 rondelles de tomate\n- Origan, sel et herbes hachées selon ton goût\n\nPRÉPARATION :\n1. Mélange le riz, le poulet, le maïs, le fromage frais et les herbes, puis rectifie le sel.\n2. Verse dans un petit plat et lisse le dessus.\n3. Recouvre de tomate, de mozzarella et d’origan et enfourne à 200 °C pendant 15 minutes, jusqu’à ce que le fromage dore.\n\nDRESSAGE :\n1. Sers chaud, directement dans le plat.\n\nL’ASTUCE DE LIFE : Le riz de la veille est encore meilleur ici. On ne jette pas les restes.", "hi": "इस डिश के बारे में: रेशेदार चिकन, मकई और क्रीम चीज़ मिले चावल, ऊपर चीज़ डालकर ओवन में सुनहरे किए हुए। घर जैसा खाना।\n\nसामग्री (1 सर्विंग):\n- 120 g पके सफ़ेद चावल\n- 80 g पका हुआ रेशेदार चिकन\n- 30 g स्वीट कॉर्न\n- 1 भरा बड़ा चम्मच लाइट क्रीम चीज़ (20 g)\n- 20 g कसा मोज़रेला\n- टमाटर के 4 स्लाइस\n- स्वाद अनुसार ओरेगानो, नमक और हरा धनिया\n\nबनाने का तरीक़ा:\n1. चावल, चिकन, मकई, क्रीम चीज़ और हरा धनिया मिलाएँ और नमक ठीक करें।\n2. छोटी बेकिंग डिश में डालकर बराबर करें।\n3. ऊपर टमाटर, मोज़रेला और ओरेगानो रखें और 200°C पर 15 मिनट, चीज़ सुनहरा होने तक बेक करें।\n\nपरोसने का तरीक़ा:\n1. गरम परोसें, सीधे डिश से।\n\nLife की टिप: कल के चावल यहाँ और अच्छे लगते हैं। बचा हुआ फेंकना नहीं।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Arroz de Forno Cremoso');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Tacos de Carne com Guacamole', 'Carne temperada, abacate cremoso e limão', 'massa',
  '{"proteina": 27, "carboidrato": 26, "gordura": 16}'::jsonb, 345, 15, '#3b82f6', true, true,
  'SOBRE O PRATO: Tortilhas quentinhas com carne bem temperada, guacamole fresco e tomate. Pra comer com a mão, espremendo limão por cima.

INGREDIENTES (1 porção):
- 2 tortilhas pequenas (40g)
- 100g de patinho moído
- 40g de abacate maduro
- 40g de tomate e cebola picados
- 1 colher de chá de azeite (5ml)
- 1/2 limão
- Cominho, páprica, sal e coentro a gosto

PREPARO:
1. Doure a carne no azeite com cominho, páprica e sal, por uns 6 minutos, até ficar soltinha.
2. Amasse o abacate com suco de limão, sal e um pouco da cebola.
3. Aqueça as tortilhas numa frigideira seca, 30 segundos de cada lado.

MONTAGEM:
1. Divida a carne nas tortilhas e cubra com o guacamole, o tomate e o coentro.
2. Esprema limão por cima e coma na hora.

DICA DO LIFE: Põe tudo na mesa e cada um monta o seu. Vira jantar de sexta.',
  42, array['carne','gluten']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Beef Tacos with Guacamole", "subtitulo": "Seasoned beef, creamy avocado and lime"}, "es": {"titulo": "Tacos de Carne con Guacamole", "subtitulo": "Carne sazonada, aguacate cremoso y limón"}, "fr": {"titulo": "Tacos au Bœuf et Guacamole", "subtitulo": "Bœuf épicé, avocat crémeux et citron vert"}, "hi": {"titulo": "बीफ़ टाको, ग्वाकामोले के साथ", "subtitulo": "मसालेदार कीमा, क्रीमी एवोकाडो और नींबू"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Warm tortillas with well-seasoned beef, fresh guacamole and tomato. Eat with your hands, with lime squeezed on top.\n\nINGREDIENTS (1 serving):\n- 2 small tortillas (40g)\n- 100g lean ground beef\n- 40g ripe avocado\n- 40g chopped tomato and onion\n- 1 teaspoon olive oil (5ml)\n- 1/2 lime\n- Cumin, paprika, salt and cilantro to taste\n\nPREPARATION:\n1. Brown the beef in the oil with cumin, paprika and salt for about 6 minutes, until crumbly.\n2. Mash the avocado with lime juice, salt and a little of the onion.\n3. Warm the tortillas in a dry pan, 30 seconds per side.\n\nTO SERVE:\n1. Divide the beef between the tortillas and top with guacamole, tomato and cilantro.\n2. Squeeze lime over them and eat right away.\n\nLIFE''S TIP: Put everything on the table and let everyone build their own. It turns into Friday dinner.", "es": "SOBRE EL PLATO: Tortillas calientes con carne bien sazonada, guacamole fresco y tomate. Para comer con la mano, con limón exprimido encima.\n\nINGREDIENTES (1 porción):\n- 2 tortillas pequeñas (40g)\n- 100g de carne molida magra\n- 40g de aguacate maduro\n- 40g de tomate y cebolla picados\n- 1 cucharadita de aceite de oliva (5ml)\n- 1/2 limón\n- Comino, pimentón, sal y cilantro a gusto\n\nPREPARACIÓN:\n1. Dora la carne en el aceite con comino, pimentón y sal, unos 6 minutos, hasta que quede suelta.\n2. Aplasta el aguacate con jugo de limón, sal y un poco de la cebolla.\n3. Calienta las tortillas en una sartén seca, 30 segundos por lado.\n\nMONTAJE:\n1. Reparte la carne en las tortillas y cubre con el guacamole, el tomate y el cilantro.\n2. Exprime limón por encima y come al momento.\n\nCONSEJO DE LIFE: Pon todo en la mesa y que cada uno arme el suyo. Se vuelve cena de viernes.", "fr": "À PROPOS DU PLAT : Des tortillas bien chaudes avec du bœuf bien assaisonné, du guacamole frais et de la tomate. À manger avec les doigts, avec un trait de citron vert.\n\nINGRÉDIENTS (1 portion) :\n- 2 petites tortillas (40 g)\n- 100 g de bœuf haché maigre\n- 40 g d’avocat mûr\n- 40 g de tomate et d’oignon hachés\n- 1 cuillère à café d’huile d’olive (5 ml)\n- 1/2 citron vert\n- Cumin, paprika, sel et coriandre selon ton goût\n\nPRÉPARATION :\n1. Fais dorer le bœuf dans l’huile avec le cumin, le paprika et le sel, environ 6 minutes, jusqu’à ce qu’il soit bien émietté.\n2. Écrase l’avocat avec le jus de citron vert, du sel et un peu d’oignon.\n3. Réchauffe les tortillas dans une poêle sèche, 30 secondes de chaque côté.\n\nDRESSAGE :\n1. Répartis le bœuf sur les tortillas puis ajoute le guacamole, la tomate et la coriandre.\n2. Presse du citron vert dessus et mange tout de suite.\n\nL’ASTUCE DE LIFE : Pose tout sur la table et chacun monte le sien. Ça devient le dîner du vendredi.", "hi": "इस डिश के बारे में: गरम टॉर्टिला में मसालेदार कीमा, ताज़ा ग्वाकामोले और टमाटर। हाथ से खाने के लिए, ऊपर नींबू निचोड़कर।\n\nसामग्री (1 सर्विंग):\n- 2 छोटी टॉर्टिला (40 g)\n- 100 g लीन कीमा (बीफ़)\n- 40 g पका एवोकाडो\n- 40 g कटा टमाटर और प्याज़\n- 1 छोटा चम्मच ऑलिव ऑयल (5 ml)\n- 1/2 नींबू\n- स्वाद अनुसार जीरा, पैप्रिका, नमक और हरा धनिया\n\nबनाने का तरीक़ा:\n1. तेल में कीमे को जीरा, पैप्रिका और नमक के साथ लगभग 6 मिनट, खिला-खिला होने तक भूनें।\n2. एवोकाडो को नींबू के रस, नमक और थोड़े प्याज़ के साथ मसल लें।\n3. सूखे पैन में टॉर्टिला को हर तरफ़ 30 सेकंड गरम करें।\n\nपरोसने का तरीक़ा:\n1. टॉर्टिला पर कीमा बाँटें और ऊपर ग्वाकामोले, टमाटर और धनिया डालें।\n2. ऊपर नींबू निचोड़ें और तुरंत खाएँ।\n\nLife की टिप: सब कुछ मेज़ पर रखिए और हर कोई अपना बनाए। शुक्रवार का डिनर बन जाता है।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Tacos de Carne com Guacamole');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Coxinha de Batata Doce Assada', 'Dourada por fora, frango cremoso por dentro', 'emagrecimento',
  '{"proteina": 26, "carboidrato": 33, "gordura": 5}'::jsonb, 283, 40, '#22c55e', true, true,
  'SOBRE O PRATO: Coxinha com massa de batata doce e recheio de frango com requeijão, assada até dourar. Rende 3 coxinhas.

INGREDIENTES (1 porção):
- 120g de batata doce cozida
- 70g de frango cozido desfiado
- 2 colheres de chá de requeijão light (10g)
- 15g de farinha de aveia
- Sal, cheiro-verde e páprica a gosto

PREPARO:
1. Amasse a batata doce com sal até virar uma massa lisa e deixe esfriar.
2. Misture o frango com o requeijão e o cheiro-verde.
3. Com as mãos úmidas, abra a massa na palma, recheie, feche em formato de coxinha e passe na farinha de aveia com páprica.
4. Asse a 200°C por 20 a 25 minutos, até dourar.

MONTAGEM:
1. Sirva quente, com molho de pimenta ou mostarda.

DICA DO LIFE: Massa fria modela muito melhor. Se grudar, molha a mão de novo.',
  43, array['carne','lactose','gluten']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Baked Sweet Potato Coxinha", "subtitulo": "Golden outside, creamy chicken inside"}, "es": {"titulo": "Coxinha de Batata al Horno", "subtitulo": "Dorada por fuera, pollo cremoso por dentro"}, "fr": {"titulo": "Coxinha de Patate Douce au Four", "subtitulo": "Dorée dehors, poulet crémeux dedans"}, "hi": {"titulo": "बेक्ड शकरकंद कोशीन्या", "subtitulo": "बाहर से सुनहरा, अंदर क्रीमी चिकन"}}'::jsonb,
  '{"en": "ABOUT THE DISH: The Brazilian chicken croquette with a sweet potato dough and a creamy chicken filling, baked until golden. Makes 3.\n\nINGREDIENTS (1 serving):\n- 120g cooked sweet potato\n- 70g cooked shredded chicken\n- 2 teaspoons light cream cheese (10g)\n- 15g oat flour\n- Salt, chopped herbs and paprika to taste\n\nPREPARATION:\n1. Mash the sweet potato with salt into a smooth dough and let it cool.\n2. Mix the chicken with the cream cheese and herbs.\n3. With damp hands, flatten the dough in your palm, fill, close into a teardrop shape and roll in oat flour with paprika.\n4. Bake at 200°C for 20 to 25 minutes, until golden.\n\nTO SERVE:\n1. Serve hot, with hot sauce or mustard.\n\nLIFE''S TIP: Cold dough shapes much better. If it sticks, wet your hands again.", "es": "SOBRE EL PLATO: La croqueta brasileña de pollo con masa de batata (camote) y relleno cremoso de pollo, horneada hasta dorar. Salen 3.\n\nINGREDIENTES (1 porción):\n- 120g de batata (camote) cocida\n- 70g de pollo cocido desmenuzado\n- 2 cucharaditas de queso crema light (10g)\n- 15g de harina de avena\n- Sal, hierbas picadas y pimentón a gusto\n\nPREPARACIÓN:\n1. Aplasta la batata con sal hasta tener una masa lisa y deja enfriar.\n2. Mezcla el pollo con el queso crema y las hierbas.\n3. Con las manos húmedas, extiende la masa en la palma, rellena, cierra en forma de gota y pásala por la harina de avena con pimentón.\n4. Hornea a 200°C de 20 a 25 minutos, hasta dorar.\n\nMONTAJE:\n1. Sirve caliente, con salsa picante o mostaza.\n\nCONSEJO DE LIFE: La masa fría se moldea mucho mejor. Si se pega, moja las manos otra vez.", "fr": "À PROPOS DU PLAT : La croquette brésilienne au poulet, avec une pâte de patate douce et une farce crémeuse, cuite au four jusqu’à dorer. Pour 3 pièces.\n\nINGRÉDIENTS (1 portion) :\n- 120 g de patate douce cuite\n- 70 g de poulet cuit effiloché\n- 2 cuillères à café de fromage frais allégé (10 g)\n- 15 g de farine d’avoine\n- Sel, herbes hachées et paprika selon ton goût\n\nPRÉPARATION :\n1. Écrase la patate douce avec du sel pour obtenir une pâte lisse et laisse refroidir.\n2. Mélange le poulet avec le fromage frais et les herbes.\n3. Les mains humides, aplatis la pâte dans ta paume, garnis, referme en forme de goutte et roule dans la farine d’avoine au paprika.\n4. Enfourne à 200 °C pendant 20 à 25 minutes, jusqu’à ce que ce soit doré.\n\nDRESSAGE :\n1. Sers chaud, avec une sauce piquante ou de la moutarde.\n\nL’ASTUCE DE LIFE : La pâte froide se façonne bien mieux. Si elle colle, remouille tes mains.", "hi": "इस डिश के बारे में: ब्राज़ील का चिकन क्रोकेट, शकरकंद के आटे और क्रीमी चिकन की भरावन के साथ, सुनहरा होने तक बेक किया हुआ। 3 बनते हैं।\n\nसामग्री (1 सर्विंग):\n- 120 g उबला शकरकंद\n- 70 g पका हुआ रेशेदार चिकन\n- 2 छोटे चम्मच लाइट क्रीम चीज़ (10 g)\n- 15 g ओट्स का आटा\n- स्वाद अनुसार नमक, हरा धनिया और पैप्रिका\n\nबनाने का तरीक़ा:\n1. शकरकंद को नमक के साथ मसलकर चिकना आटा बना लें और ठंडा होने दें।\n2. चिकन में क्रीम चीज़ और हरा धनिया मिलाएँ।\n3. गीले हाथों से हथेली पर आटा फैलाएँ, भरें, बूँद के आकार में बंद करें और पैप्रिका वाले ओट्स के आटे में लपेटें।\n4. 200°C पर 20 से 25 मिनट, सुनहरा होने तक बेक करें।\n\nपरोसने का तरीक़ा:\n1. गरम परोसें, तीखी चटनी या मस्टर्ड के साथ।\n\nLife की टिप: ठंडा आटा कहीं बेहतर आकार लेता है। चिपके तो हाथ फिर गीले कर लीजिए।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Coxinha de Batata Doce Assada');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Batata Recheada com Frango', 'Casca firme, recheio cremoso e queijo gratinado', 'emagrecimento',
  '{"proteina": 30, "carboidrato": 25, "gordura": 9}'::jsonb, 304, 15, '#22c55e', true, false,
  'SOBRE O PRATO: Batata aberta ao meio, recheada de frango cremoso e coberta de queijo derretido. A batata recheada de quiosque, feita em casa.

INGREDIENTES (1 porção):
- 1 batata média cozida com casca (200g)
- 70g de frango cozido desfiado
- 1 colher de sopa cheia de requeijão light (20g)
- 15g de muçarela ralada
- Cebolinha, sal e pimenta a gosto

PREPARO:
1. Corte a batata ao meio no comprimento e afofe o miolo com um garfo, sem furar a casca.
2. Misture o frango com o requeijão, sal e pimenta.
3. Recheie as metades, cubra com a muçarela e leve ao forno a 200°C por 10 minutos (ou 4 minutos na airfryer), até gratinar.

MONTAGEM:
1. Finalize com cebolinha picada e sirva quente.

DICA DO LIFE: Cozinha a batata no micro-ondas, 6 minutos furada com o garfo, e o jantar sai em 15.',
  44, array['carne','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Chicken Stuffed Potato", "subtitulo": "Firm skin, creamy filling and melted cheese"}, "es": {"titulo": "Papa Rellena de Pollo", "subtitulo": "Cáscara firme, relleno cremoso y queso gratinado"}, "fr": {"titulo": "Pomme de Terre Farcie au Poulet", "subtitulo": "Peau ferme, farce crémeuse et fromage gratiné"}, "hi": {"titulo": "चिकन भरा आलू", "subtitulo": "सख़्त छिलका, क्रीमी भरावन और पिघला चीज़"}}'::jsonb,
  '{"en": "ABOUT THE DISH: A potato split in half, filled with creamy chicken and topped with melted cheese. The street-stand stuffed potato, made at home.\n\nINGREDIENTS (1 serving):\n- 1 medium potato cooked in its skin (200g)\n- 70g cooked shredded chicken\n- 1 heaped tablespoon light cream cheese (20g)\n- 15g shredded mozzarella\n- Chives, salt and pepper to taste\n\nPREPARATION:\n1. Halve the potato lengthwise and fluff the inside with a fork without piercing the skin.\n2. Mix the chicken with the cream cheese, salt and pepper.\n3. Fill the halves, top with mozzarella and bake at 200°C for 10 minutes (or 4 minutes in the air fryer), until golden.\n\nTO SERVE:\n1. Finish with chopped chives and serve hot.\n\nLIFE''S TIP: Cook the potato in the microwave, 6 minutes pricked with a fork, and dinner is out in 15.", "es": "SOBRE EL PLATO: Papa abierta por la mitad, rellena de pollo cremoso y cubierta de queso derretido. La papa rellena de puesto callejero, hecha en casa.\n\nINGREDIENTES (1 porción):\n- 1 papa mediana cocida con cáscara (200g)\n- 70g de pollo cocido desmenuzado\n- 1 cucharada colmada de queso crema light (20g)\n- 15g de mozzarella rallada\n- Cebollín, sal y pimienta a gusto\n\nPREPARACIÓN:\n1. Corta la papa por la mitad a lo largo y ahueca el centro con un tenedor, sin romper la cáscara.\n2. Mezcla el pollo con el queso crema, sal y pimienta.\n3. Rellena las mitades, cubre con la mozzarella y hornea a 200°C durante 10 minutos (o 4 minutos en freidora de aire), hasta gratinar.\n\nMONTAJE:\n1. Termina con cebollín picado y sirve caliente.\n\nCONSEJO DE LIFE: Cuece la papa en el microondas, 6 minutos pinchada con un tenedor, y la cena sale en 15.", "fr": "À PROPOS DU PLAT : Une pomme de terre ouverte en deux, garnie de poulet crémeux et recouverte de fromage fondu. La pomme de terre farcie des stands, faite maison.\n\nINGRÉDIENTS (1 portion) :\n- 1 pomme de terre moyenne cuite avec la peau (200 g)\n- 70 g de poulet cuit effiloché\n- 1 cuillère à soupe bombée de fromage frais allégé (20 g)\n- 15 g de mozzarella râpée\n- Ciboulette, sel et poivre selon ton goût\n\nPRÉPARATION :\n1. Coupe la pomme de terre en deux dans la longueur et écrase la chair à la fourchette, sans percer la peau.\n2. Mélange le poulet avec le fromage frais, le sel et le poivre.\n3. Garnis les moitiés, recouvre de mozzarella et enfourne à 200 °C pendant 10 minutes (ou 4 minutes à l’air fryer), jusqu’à gratiner.\n\nDRESSAGE :\n1. Termine avec de la ciboulette ciselée et sers chaud.\n\nL’ASTUCE DE LIFE : Cuis la pomme de terre au micro-ondes, 6 minutes piquée à la fourchette, et le dîner est prêt en 15.", "hi": "इस डिश के बारे में: बीच से खुला आलू, क्रीमी चिकन से भरा और ऊपर पिघला चीज़। ठेले वाला भरवाँ आलू, घर पर।\n\nसामग्री (1 सर्विंग):\n- 1 मध्यम आलू, छिलके समेत उबला (200 g)\n- 70 g पका हुआ रेशेदार चिकन\n- 1 भरा बड़ा चम्मच लाइट क्रीम चीज़ (20 g)\n- 15 g कसा मोज़रेला\n- स्वाद अनुसार हरा प्याज़, नमक और काली मिर्च\n\nबनाने का तरीक़ा:\n1. आलू को लंबाई में आधा काटें और छिलका तोड़े बिना अंदर का हिस्सा काँटे से फुला लें।\n2. चिकन में क्रीम चीज़, नमक और काली मिर्च मिलाएँ।\n3. दोनों हिस्सों में भरें, ऊपर मोज़रेला डालें और 200°C पर 10 मिनट (या एयर फ़्रायर में 4 मिनट), सुनहरा होने तक बेक करें।\n\nपरोसने का तरीक़ा:\n1. ऊपर कटा हरा प्याज़ डालें और गरम परोसें।\n\nLife की टिप: आलू को काँटे से गोदकर 6 मिनट माइक्रोवेव में पका लीजिए, और डिनर 15 मिनट में तैयार।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Batata Recheada com Frango');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Omelete Cremoso de Queijo e Tomate', 'Macio, dobrado e com queijo derretendo', 'emagrecimento',
  '{"proteina": 19, "carboidrato": 3, "gordura": 20}'::jsonb, 270, 8, '#22c55e', false, false,
  'SOBRE O PRATO: Omelete macio, de fogo baixo, dobrado sobre queijo derretido e tomate. Simples, e por isso mesmo difícil de errar.

INGREDIENTES (1 porção):
- 2 ovos
- 25g de muçarela ralada
- 40g de tomate em cubos
- 1 colher de chá de manteiga (5g)
- Sal, orégano e cebolinha a gosto

PREPARO:
1. Bata os ovos com uma pitada de sal só até misturar.
2. Derreta a manteiga em fogo baixo, despeje os ovos e mexa devagar com a espátula por 1 minuto.
3. Pare de mexer, espalhe o queijo, o tomate e o orégano numa metade e deixe mais 1 minuto.

MONTAGEM:
1. Dobre o omelete ao meio e passe pro prato.
2. Finalize com cebolinha.

DICA DO LIFE: Fogo baixo e paciência: é isso que deixa o omelete cremoso em vez de borrachudo.',
  45, array['ovo','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Creamy Cheese & Tomato Omelet", "subtitulo": "Soft, folded and oozing cheese"}, "es": {"titulo": "Omelet Cremoso de Queso y Tomate", "subtitulo": "Suave, doblado y con queso derretido"}, "fr": {"titulo": "Omelette Crémeuse Fromage et Tomate", "subtitulo": "Moelleuse, pliée, avec du fromage fondant"}, "hi": {"titulo": "चीज़ और टमाटर वाला क्रीमी ऑमलेट", "subtitulo": "नरम, मुड़ा हुआ और पिघलता चीज़"}}'::jsonb,
  '{"en": "ABOUT THE DISH: A soft, low-heat omelet folded over melted cheese and tomato. Simple, and that is exactly why it is hard to get wrong.\n\nINGREDIENTS (1 serving):\n- 2 eggs\n- 25g shredded mozzarella\n- 40g diced tomato\n- 1 teaspoon butter (5g)\n- Salt, oregano and chives to taste\n\nPREPARATION:\n1. Beat the eggs with a pinch of salt just until combined.\n2. Melt the butter over low heat, pour in the eggs and stir slowly with a spatula for 1 minute.\n3. Stop stirring, scatter the cheese, tomato and oregano over one half and cook 1 more minute.\n\nTO SERVE:\n1. Fold the omelet in half and slide it onto a plate.\n2. Finish with chives.\n\nLIFE''S TIP: Low heat and patience: that is what makes an omelet creamy instead of rubbery.", "es": "SOBRE EL PLATO: Omelet suave, a fuego bajo, doblado sobre queso derretido y tomate. Sencillo, y justo por eso difícil de fallar.\n\nINGREDIENTES (1 porción):\n- 2 huevos\n- 25g de mozzarella rallada\n- 40g de tomate en cubos\n- 1 cucharadita de mantequilla (5g)\n- Sal, orégano y cebollín a gusto\n\nPREPARACIÓN:\n1. Bate los huevos con una pizca de sal solo hasta mezclar.\n2. Derrite la mantequilla a fuego bajo, vierte los huevos y remueve despacio con la espátula 1 minuto.\n3. Deja de remover, reparte el queso, el tomate y el orégano en una mitad y deja 1 minuto más.\n\nMONTAJE:\n1. Dobla el omelet por la mitad y pásalo al plato.\n2. Termina con cebollín.\n\nCONSEJO DE LIFE: Fuego bajo y paciencia: eso es lo que lo deja cremoso en vez de gomoso.", "fr": "À PROPOS DU PLAT : Une omelette moelleuse, cuite à feu doux, repliée sur du fromage fondu et de la tomate. Simple, et c’est justement pour ça qu’on la rate rarement.\n\nINGRÉDIENTS (1 portion) :\n- 2 œufs\n- 25 g de mozzarella râpée\n- 40 g de tomate en dés\n- 1 cuillère à café de beurre (5 g)\n- Sel, origan et ciboulette selon ton goût\n\nPRÉPARATION :\n1. Bats les œufs avec une pincée de sel, juste assez pour les mélanger.\n2. Fais fondre le beurre à feu doux, verse les œufs et remue doucement à la spatule pendant 1 minute.\n3. Arrête de remuer, répartis le fromage, la tomate et l’origan sur une moitié et laisse encore 1 minute.\n\nDRESSAGE :\n1. Replie l’omelette en deux et glisse-la dans l’assiette.\n2. Termine avec de la ciboulette.\n\nL’ASTUCE DE LIFE : Feu doux et patience : c’est ce qui rend l’omelette crémeuse plutôt que caoutchouteuse.", "hi": "इस डिश के बारे में: धीमी आँच पर बना नरम ऑमलेट, पिघले चीज़ और टमाटर पर मोड़ा हुआ। सीधा-सादा, और इसीलिए बिगड़ना मुश्किल।\n\nसामग्री (1 सर्विंग):\n- 2 अंडे\n- 25 g कसा मोज़रेला\n- 40 g कटा टमाटर\n- 1 छोटा चम्मच मक्खन (5 g)\n- स्वाद अनुसार नमक, ओरेगानो और हरा प्याज़\n\nबनाने का तरीक़ा:\n1. अंडों को चुटकी भर नमक के साथ बस मिलने तक फेंटें।\n2. धीमी आँच पर मक्खन पिघलाएँ, अंडे डालें और स्पैचुला से 1 मिनट धीरे-धीरे चलाएँ।\n3. चलाना बंद करें, आधे हिस्से पर चीज़, टमाटर और ओरेगानो फैलाएँ और 1 मिनट और रखें।\n\nपरोसने का तरीक़ा:\n1. ऑमलेट को आधा मोड़ें और प्लेट में निकालें।\n2. ऊपर हरा प्याज़ डालें।\n\nLife की टिप: धीमी आँच और सब्र: इसी से ऑमलेट रबड़ जैसा नहीं, क्रीमी बनता है।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Omelete Cremoso de Queijo e Tomate');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Hambúrguer de Grão-de-Bico', 'Crocante por fora, macio por dentro, 100% vegetal', 'vegano',
  '{"proteina": 18, "carboidrato": 68, "gordura": 12}'::jsonb, 440, 25, '#84cc16', true, false,
  'SOBRE O PRATO: Hambúrguer de grão-de-bico temperado com cominho e alho, dourado na frigideira e servido no pão com salada.

INGREDIENTES (1 porção):
- 120g de grão-de-bico cozido e escorrido
- 15g de aveia em flocos finos
- 20g de cebola picada
- 1 dente de alho
- 1 colher de chá de azeite (5ml)
- 1 pão de hambúrguer vegano (50g)
- Alface, tomate, cominho, páprica e sal a gosto

PREPARO:
1. Amasse o grão-de-bico com um garfo, deixando alguns pedaços.
2. Misture a aveia, a cebola, o alho amassado, o cominho, a páprica e o sal até dar liga.
3. Molde um disco firme e leve 10 minutos à geladeira.
4. Doure na frigideira com o azeite, 4 minutos de cada lado, sem mexer.

MONTAGEM:
1. Toste o pão e monte com alface, tomate e o hambúrguer.
2. Vai bem com mostarda ou homus.

DICA DO LIFE: Os 10 minutos de geladeira é que seguram o hambúrguer inteiro na frigideira.',
  46, array['gluten']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Chickpea Burger", "subtitulo": "Crisp outside, soft inside, 100% plant-based"}, "es": {"titulo": "Hamburguesa de Garbanzos", "subtitulo": "Crujiente por fuera, tierna por dentro, 100% vegetal"}, "fr": {"titulo": "Burger de Pois Chiches", "subtitulo": "Croustillant dehors, moelleux dedans, 100 % végétal"}, "hi": {"titulo": "छोले का बर्गर", "subtitulo": "बाहर से कुरकुरा, अंदर से नरम, 100% शाकाहारी"}}'::jsonb,
  '{"en": "ABOUT THE DISH: A chickpea patty seasoned with cumin and garlic, browned in the pan and served in a bun with salad.\n\nINGREDIENTS (1 serving):\n- 120g cooked, drained chickpeas\n- 15g fine rolled oats\n- 20g chopped onion\n- 1 garlic clove\n- 1 teaspoon olive oil (5ml)\n- 1 vegan burger bun (50g)\n- Lettuce, tomato, cumin, paprika and salt to taste\n\nPREPARATION:\n1. Mash the chickpeas with a fork, leaving some chunks.\n2. Mix in the oats, onion, crushed garlic, cumin, paprika and salt until it holds together.\n3. Shape a firm patty and chill for 10 minutes.\n4. Brown in the pan with the oil, 4 minutes per side, without moving it.\n\nTO SERVE:\n1. Toast the bun and stack with lettuce, tomato and the patty.\n2. It goes well with mustard or hummus.\n\nLIFE''S TIP: Those 10 minutes in the fridge are what keep the patty in one piece in the pan.", "es": "SOBRE EL PLATO: Hamburguesa de garbanzos sazonada con comino y ajo, dorada en la sartén y servida en pan con ensalada.\n\nINGREDIENTES (1 porción):\n- 120g de garbanzos cocidos y escurridos\n- 15g de avena en hojuelas finas\n- 20g de cebolla picada\n- 1 diente de ajo\n- 1 cucharadita de aceite de oliva (5ml)\n- 1 pan de hamburguesa vegano (50g)\n- Lechuga, tomate, comino, pimentón y sal a gusto\n\nPREPARACIÓN:\n1. Aplasta los garbanzos con un tenedor, dejando algunos trozos.\n2. Mezcla la avena, la cebolla, el ajo machacado, el comino, el pimentón y la sal hasta que ligue.\n3. Forma un disco firme y llévalo 10 minutos a la nevera.\n4. Dóralo en la sartén con el aceite, 4 minutos por lado, sin moverlo.\n\nMONTAJE:\n1. Tuesta el pan y arma con lechuga, tomate y la hamburguesa.\n2. Va bien con mostaza o hummus.\n\nCONSEJO DE LIFE: Esos 10 minutos de nevera son los que mantienen la hamburguesa entera en la sartén.", "fr": "À PROPOS DU PLAT : Un steak de pois chiches relevé de cumin et d’ail, doré à la poêle et servi dans un pain avec de la salade.\n\nINGRÉDIENTS (1 portion) :\n- 120 g de pois chiches cuits et égouttés\n- 15 g de petits flocons d’avoine\n- 20 g d’oignon haché\n- 1 gousse d’ail\n- 1 cuillère à café d’huile d’olive (5 ml)\n- 1 pain à burger végane (50 g)\n- Salade, tomate, cumin, paprika et sel selon ton goût\n\nPRÉPARATION :\n1. Écrase les pois chiches à la fourchette en laissant quelques morceaux.\n2. Ajoute l’avoine, l’oignon, l’ail écrasé, le cumin, le paprika et le sel, et mélange jusqu’à ce que ça se tienne.\n3. Forme un steak ferme et mets-le 10 minutes au frais.\n4. Fais-le dorer à la poêle avec l’huile, 4 minutes de chaque côté, sans le bouger.\n\nDRESSAGE :\n1. Toaste le pain et monte avec la salade, la tomate et le steak.\n2. Il va bien avec de la moutarde ou du houmous.\n\nL’ASTUCE DE LIFE : Ce sont les 10 minutes au frais qui gardent le steak entier dans la poêle.", "hi": "इस डिश के बारे में: जीरे और लहसुन से मसालेदार छोले की पैटी, पैन में सुनहरी की हुई और सलाद के साथ बन में परोसी हुई।\n\nसामग्री (1 सर्विंग):\n- 120 g उबले और छाने हुए छोले\n- 15 g बारीक रोल्ड ओट्स\n- 20 g कटा प्याज़\n- 1 कली लहसुन\n- 1 छोटा चम्मच ऑलिव ऑयल (5 ml)\n- 1 वीगन बर्गर बन (50 g)\n- स्वाद अनुसार सलाद पत्ता, टमाटर, जीरा, पैप्रिका और नमक\n\nबनाने का तरीक़ा:\n1. छोलों को काँटे से मसलें, कुछ टुकड़े रहने दें।\n2. ओट्स, प्याज़, कुचला लहसुन, जीरा, पैप्रिका और नमक मिलाएँ, जब तक बँध न जाए।\n3. सख़्त पैटी बनाएँ और 10 मिनट फ़्रिज में रखें।\n4. पैन में तेल के साथ हर तरफ़ 4 मिनट, बिना हिलाए सुनहरा करें।\n\nपरोसने का तरीक़ा:\n1. बन सेकें और सलाद, टमाटर और पैटी रखें।\n2. मस्टर्ड या हम्मस के साथ अच्छा लगता है।\n\nLife की टिप: फ़्रिज के वही 10 मिनट पैटी को पैन में टूटने से बचाते हैं।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Hambúrguer de Grão-de-Bico');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Arroz Frito Colorido com Tofu', 'Soltinho, de frigideira quente, com shoyu', 'vegano',
  '{"proteina": 11, "carboidrato": 43, "gordura": 8}'::jsonb, 292, 15, '#84cc16', true, false,
  'SOBRE O PRATO: Arroz salteado em fogo alto com tofu dourado, cenoura, ervilha e shoyu. Sabor de restaurante oriental em 15 minutos.

INGREDIENTES (1 porção):
- 120g de arroz branco cozido e frio
- 80g de tofu firme em cubos
- 30g de cenoura em cubinhos
- 30g de ervilha
- 1 colher de sopa de shoyu
- 1 colher de chá de óleo ou azeite (5ml)
- Alho, gengibre e cebolinha a gosto

PREPARO:
1. Aqueça bem a frigideira com o óleo e doure o tofu de todos os lados. Reserve.
2. Na mesma frigideira, refogue o alho, o gengibre e a cenoura por 2 minutos.
3. Junte o arroz frio e a ervilha e salteie em fogo alto por 3 minutos, mexendo.
4. Volte o tofu, regue com o shoyu e misture.

MONTAGEM:
1. Finalize com bastante cebolinha e sirva na hora.

DICA DO LIFE: Arroz gelado, de ontem, é o segredo do arroz frito soltinho.',
  47, array['soja','gluten']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Colorful Fried Rice with Tofu", "subtitulo": "Fluffy, hot-pan, with soy sauce"}, "es": {"titulo": "Arroz Frito de Colores con Tofu", "subtitulo": "Suelto, de sartén caliente, con salsa de soja"}, "fr": {"titulo": "Riz Sauté Coloré au Tofu", "subtitulo": "Bien détaché, à la poêle chaude, à la sauce soja"}, "hi": {"titulo": "टोफ़ू वाला रंगीन फ़्राइड राइस", "subtitulo": "खिला-खिला, गरम पैन में, सोया सॉस के साथ"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Rice stir-fried over high heat with golden tofu, carrot, peas and soy sauce. Takeout flavor in 15 minutes.\n\nINGREDIENTS (1 serving):\n- 120g cooked white rice, cold\n- 80g firm tofu, cubed\n- 30g diced carrot\n- 30g peas\n- 1 tablespoon soy sauce\n- 1 teaspoon oil (5ml)\n- Garlic, ginger and scallions to taste\n\nPREPARATION:\n1. Heat the pan well with the oil and brown the tofu on all sides. Set aside.\n2. In the same pan, cook the garlic, ginger and carrot for 2 minutes.\n3. Add the cold rice and peas and stir-fry over high heat for 3 minutes.\n4. Return the tofu, add the soy sauce and toss.\n\nTO SERVE:\n1. Finish with plenty of scallions and serve right away.\n\nLIFE''S TIP: Cold, day-old rice is the secret to fried rice that stays fluffy.", "es": "SOBRE EL PLATO: Arroz salteado a fuego alto con tofu dorado, zanahoria, guisantes y salsa de soja. Sabor de restaurante oriental en 15 minutos.\n\nINGREDIENTES (1 porción):\n- 120g de arroz blanco cocido y frío\n- 80g de tofu firme en cubos\n- 30g de zanahoria en cubitos\n- 30g de guisantes\n- 1 cucharada de salsa de soja\n- 1 cucharadita de aceite (5ml)\n- Ajo, jengibre y cebollín a gusto\n\nPREPARACIÓN:\n1. Calienta bien la sartén con el aceite y dora el tofu por todos los lados. Reserva.\n2. En la misma sartén, sofríe el ajo, el jengibre y la zanahoria 2 minutos.\n3. Añade el arroz frío y los guisantes y saltea a fuego alto 3 minutos, removiendo.\n4. Devuelve el tofu, rocía con la salsa de soja y mezcla.\n\nMONTAJE:\n1. Termina con bastante cebollín y sirve al momento.\n\nCONSEJO DE LIFE: El arroz frío, de ayer, es el secreto del arroz frito bien suelto.", "fr": "À PROPOS DU PLAT : Du riz sauté à feu vif avec du tofu doré, de la carotte, des petits pois et de la sauce soja. Un goût de restaurant asiatique en 15 minutes.\n\nINGRÉDIENTS (1 portion) :\n- 120 g de riz blanc cuit et froid\n- 80 g de tofu ferme en dés\n- 30 g de carotte en petits dés\n- 30 g de petits pois\n- 1 cuillère à soupe de sauce soja\n- 1 cuillère à café d’huile (5 ml)\n- Ail, gingembre et ciboule selon ton goût\n\nPRÉPARATION :\n1. Chauffe bien la poêle avec l’huile et dore le tofu sur toutes ses faces. Réserve.\n2. Dans la même poêle, fais revenir l’ail, le gingembre et la carotte pendant 2 minutes.\n3. Ajoute le riz froid et les petits pois et fais sauter à feu vif 3 minutes, en remuant.\n4. Remets le tofu, arrose de sauce soja et mélange.\n\nDRESSAGE :\n1. Termine avec beaucoup de ciboule et sers tout de suite.\n\nL’ASTUCE DE LIFE : Le riz froid de la veille, c’est le secret d’un riz sauté bien détaché.", "hi": "इस डिश के बारे में: तेज़ आँच पर भुने चावल, सुनहरे टोफ़ू, गाजर, मटर और सोया सॉस के साथ। 15 मिनट में रेस्टोरेंट जैसा स्वाद।\n\nसामग्री (1 सर्विंग):\n- 120 g पके और ठंडे सफ़ेद चावल\n- 80 g फ़र्म टोफ़ू, टुकड़ों में\n- 30 g बारीक कटी गाजर\n- 30 g मटर\n- 1 बड़ा चम्मच सोया सॉस\n- 1 छोटा चम्मच तेल (5 ml)\n- स्वाद अनुसार लहसुन, अदरक और हरा प्याज़\n\nबनाने का तरीक़ा:\n1. पैन को तेल के साथ अच्छे से गरम करें और टोफ़ू को हर तरफ़ से सुनहरा करें। अलग रखें।\n2. उसी पैन में लहसुन, अदरक और गाजर 2 मिनट भूनें।\n3. ठंडे चावल और मटर डालें और तेज़ आँच पर 3 मिनट चलाते हुए भूनें।\n4. टोफ़ू वापस डालें, सोया सॉस डालकर मिलाएँ।\n\nपरोसने का तरीक़ा:\n1. ऊपर ढेर सारा हरा प्याज़ डालें और तुरंत परोसें।\n\nLife की टिप: कल के ठंडे चावल ही खिले-खिले फ़्राइड राइस का राज़ हैं।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Arroz Frito Colorido com Tofu');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Sanduíche Natural de Frango Cremoso', 'No lugar do salgado da padaria', 'habitos',
  '{"proteina": 25, "carboidrato": 27, "gordura": 6}'::jsonb, 259, 10, '#f97316', false, false,
  'SOBRE O PRATO: Pão macio, recheio cremoso de frango com cenoura e folhas crocantes. O sanduíche natural de vitrine, feito do seu jeito.

INGREDIENTES (1 porção):
- 2 fatias de pão integral (50g)
- 60g de frango cozido desfiado
- 20g de cenoura ralada
- 1 colher de sopa de requeijão light (15g)
- 2 folhas de alface
- Sal, limão e salsinha a gosto

PREPARO:
1. Misture o frango, a cenoura, o requeijão, a salsinha, umas gotas de limão e sal até virar um creme.
2. Espalhe o recheio numa fatia de pão.
3. Cubra com a alface e feche com a outra fatia.

MONTAGEM:
1. Corte na diagonal e sirva.
2. Pra levar, embrulhe em papel-manteiga e mantenha gelado.

DICA DO LIFE: O recheio dura 3 dias na geladeira. Faz um pote e monta o sanduíche na hora.',
  48, array['gluten','carne','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Creamy Chicken Deli Sandwich", "subtitulo": "Instead of the fried bakery snack"}, "es": {"titulo": "Sándwich de Pollo Cremoso", "subtitulo": "En lugar del frito de la panadería"}, "fr": {"titulo": "Sandwich au Poulet Crémeux", "subtitulo": "À la place du beignet de la boulangerie"}, "hi": {"titulo": "क्रीमी चिकन सैंडविच", "subtitulo": "बेकरी के तले हुए स्नैक की जगह"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Soft bread, a creamy chicken and carrot filling and crisp leaves. The deli-case sandwich, made your way.\n\nINGREDIENTS (1 serving):\n- 2 slices whole wheat bread (50g)\n- 60g cooked shredded chicken\n- 20g grated carrot\n- 1 tablespoon light cream cheese (15g)\n- 2 lettuce leaves\n- Salt, lemon and parsley to taste\n\nPREPARATION:\n1. Mix the chicken, carrot, cream cheese, parsley, a few drops of lemon and salt into a creamy filling.\n2. Spread the filling on one slice of bread.\n3. Top with the lettuce and close with the other slice.\n\nTO SERVE:\n1. Cut diagonally and serve.\n2. To take away, wrap in parchment paper and keep it cold.\n\nLIFE''S TIP: The filling keeps for 3 days in the fridge. Make a jar and build the sandwich when you need it.", "es": "SOBRE EL PLATO: Pan suave, relleno cremoso de pollo con zanahoria y hojas crujientes. El sándwich de vitrina, hecho a tu manera.\n\nINGREDIENTES (1 porción):\n- 2 rebanadas de pan integral (50g)\n- 60g de pollo cocido desmenuzado\n- 20g de zanahoria rallada\n- 1 cucharada de queso crema light (15g)\n- 2 hojas de lechuga\n- Sal, limón y perejil a gusto\n\nPREPARACIÓN:\n1. Mezcla el pollo, la zanahoria, el queso crema, el perejil, unas gotas de limón y sal hasta formar una crema.\n2. Unta el relleno en una rebanada de pan.\n3. Cubre con la lechuga y cierra con la otra rebanada.\n\nMONTAJE:\n1. Corta en diagonal y sirve.\n2. Para llevar, envuélvelo en papel de horno y mantenlo frío.\n\nCONSEJO DE LIFE: El relleno dura 3 días en la nevera. Haz un frasco y arma el sándwich al momento.", "fr": "À PROPOS DU PLAT : Du pain moelleux, une garniture crémeuse de poulet et de carotte et des feuilles croquantes. Le sandwich de vitrine, fait à ta façon.\n\nINGRÉDIENTS (1 portion) :\n- 2 tranches de pain complet (50 g)\n- 60 g de poulet cuit effiloché\n- 20 g de carotte râpée\n- 1 cuillère à soupe de fromage frais allégé (15 g)\n- 2 feuilles de salade\n- Sel, citron et persil selon ton goût\n\nPRÉPARATION :\n1. Mélange le poulet, la carotte, le fromage frais, le persil, quelques gouttes de citron et du sel jusqu’à obtenir une crème.\n2. Étale la garniture sur une tranche de pain.\n3. Ajoute la salade et referme avec l’autre tranche.\n\nDRESSAGE :\n1. Coupe en diagonale et sers.\n2. À emporter : emballe-le dans du papier cuisson et garde-le au frais.\n\nL’ASTUCE DE LIFE : La garniture se garde 3 jours au frais. Prépare un pot et monte le sandwich au dernier moment.", "hi": "इस डिश के बारे में: नरम ब्रेड, गाजर वाली क्रीमी चिकन की भरावन और कुरकुरे पत्ते। दुकान जैसा सैंडविच, अपने तरीक़े से।\n\nसामग्री (1 सर्विंग):\n- होल व्हीट ब्रेड के 2 स्लाइस (50 g)\n- 60 g पका हुआ रेशेदार चिकन\n- 20 g कसी गाजर\n- 1 बड़ा चम्मच लाइट क्रीम चीज़ (15 g)\n- सलाद के 2 पत्ते\n- स्वाद अनुसार नमक, नींबू और पार्सले\n\nबनाने का तरीक़ा:\n1. चिकन, गाजर, क्रीम चीज़, पार्सले, नींबू की कुछ बूँदें और नमक मिलाकर क्रीमी भरावन बना लें।\n2. भरावन को ब्रेड के एक स्लाइस पर फैलाएँ।\n3. ऊपर सलाद का पत्ता रखें और दूसरे स्लाइस से बंद करें।\n\nपरोसने का तरीक़ा:\n1. तिरछा काटें और परोसें।\n2. साथ ले जाना हो तो बटर पेपर में लपेटें और ठंडा रखें।\n\nLife की टिप: भरावन फ़्रिज में 3 दिन चलती है। एक डिब्बा बना लीजिए और ज़रूरत पर सैंडविच तैयार।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Sanduíche Natural de Frango Cremoso');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Pastel de Frigideira de Carne', 'Crocante e dourado, sem mergulhar no óleo', 'habitos',
  '{"proteina": 23, "carboidrato": 22, "gordura": 10}'::jsonb, 271, 12, '#f97316', true, false,
  'SOBRE O PRATO: Pastel de carne com queijo feito na tortilha, dobrado e tostado na frigideira até ficar crocante. A vontade de pastel de feira, resolvida.

INGREDIENTES (1 porção):
- 1 tortilha integral (40g)
- 70g de patinho moído
- 30g de tomate e cebola picados
- 15g de muçarela ralada
- Alho, sal, cheiro-verde e pimenta a gosto

PREPARO:
1. Refogue a carne com o alho, a cebola e o tomate até secar bem; tempere e junte o cheiro-verde.
2. Ponha a carne e a muçarela em metade da tortilha e dobre.
3. Aperte as bordas com um garfo e toste numa frigideira seca, 2 minutos de cada lado, até ficar crocante.

MONTAGEM:
1. Corte ao meio e sirva quente.
2. Vai bem com vinagrete ou molho de pimenta.

DICA DO LIFE: O recheio tem que estar sequinho. É isso que deixa o pastel crocante em vez de mole.',
  49, array['gluten','carne','lactose']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Skillet Beef Pastel", "subtitulo": "Crisp and golden, no deep frying"}, "es": {"titulo": "Empanada de Carne a la Sartén", "subtitulo": "Crujiente y dorada, sin sumergir en aceite"}, "fr": {"titulo": "Chausson au Bœuf à la Poêle", "subtitulo": "Croustillant et doré, sans bain d’huile"}, "hi": {"titulo": "तवे पर बना बीफ़ पास्तेल", "subtitulo": "कुरकुरा और सुनहरा, बिना तेल में डुबोए"}}'::jsonb,
  '{"en": "ABOUT THE DISH: The Brazilian street-market turnover with beef and cheese, made with a tortilla, folded and toasted in a skillet until crisp.\n\nINGREDIENTS (1 serving):\n- 1 whole wheat tortilla (40g)\n- 70g lean ground beef\n- 30g chopped tomato and onion\n- 15g shredded mozzarella\n- Garlic, salt, chopped herbs and pepper to taste\n\nPREPARATION:\n1. Cook the beef with the garlic, onion and tomato until quite dry; season and add the herbs.\n2. Put the beef and mozzarella on half of the tortilla and fold.\n3. Press the edges with a fork and toast in a dry skillet, 2 minutes per side, until crisp.\n\nTO SERVE:\n1. Cut in half and serve hot.\n2. It goes well with a tomato and onion salsa or hot sauce.\n\nLIFE''S TIP: The filling has to be dry. That is what keeps it crisp instead of soggy.", "es": "SOBRE EL PLATO: El \"pastel\" brasileño de feria, de carne con queso, hecho con tortilla, doblado y tostado en la sartén hasta quedar crujiente.\n\nINGREDIENTES (1 porción):\n- 1 tortilla integral (40g)\n- 70g de carne molida magra\n- 30g de tomate y cebolla picados\n- 15g de mozzarella rallada\n- Ajo, sal, hierbas picadas y pimienta a gusto\n\nPREPARACIÓN:\n1. Sofríe la carne con el ajo, la cebolla y el tomate hasta que quede bien seca; sazona y añade las hierbas.\n2. Pon la carne y la mozzarella en media tortilla y dobla.\n3. Aprieta los bordes con un tenedor y tuesta en una sartén seca, 2 minutos por lado, hasta que quede crujiente.\n\nMONTAJE:\n1. Corta por la mitad y sirve caliente.\n2. Va bien con pico de gallo o salsa picante.\n\nCONSEJO DE LIFE: El relleno tiene que estar seco. Eso es lo que la deja crujiente en vez de blanda.", "fr": "À PROPOS DU PLAT : Le « pastel » brésilien des marchés, bœuf et fromage, fait avec une tortilla, plié et toasté à la poêle jusqu’à être croustillant.\n\nINGRÉDIENTS (1 portion) :\n- 1 tortilla complète (40 g)\n- 70 g de bœuf haché maigre\n- 30 g de tomate et d’oignon hachés\n- 15 g de mozzarella râpée\n- Ail, sel, herbes hachées et poivre selon ton goût\n\nPRÉPARATION :\n1. Fais revenir le bœuf avec l’ail, l’oignon et la tomate jusqu’à ce qu’il soit bien sec ; assaisonne et ajoute les herbes.\n2. Dépose le bœuf et la mozzarella sur une moitié de la tortilla et plie.\n3. Presse les bords à la fourchette et toaste dans une poêle sèche, 2 minutes de chaque côté, jusqu’à ce que ce soit croustillant.\n\nDRESSAGE :\n1. Coupe en deux et sers chaud.\n2. Il va bien avec une salsa tomate-oignon ou une sauce piquante.\n\nL’ASTUCE DE LIFE : La farce doit être bien sèche. C’est ce qui le garde croustillant plutôt que mou.", "hi": "इस डिश के बारे में: ब्राज़ील के बाज़ार वाला कीमा-चीज़ पास्तेल, टॉर्टिला से बना, मोड़कर तवे पर कुरकुरा होने तक सेका हुआ।\n\nसामग्री (1 सर्विंग):\n- 1 होल व्हीट टॉर्टिला (40 g)\n- 70 g लीन कीमा (बीफ़)\n- 30 g कटा टमाटर और प्याज़\n- 15 g कसा मोज़रेला\n- स्वाद अनुसार लहसुन, नमक, हरा धनिया और काली मिर्च\n\nबनाने का तरीक़ा:\n1. कीमे को लहसुन, प्याज़ और टमाटर के साथ अच्छे से सूखने तक भूनें; नमक-मिर्च और हरा धनिया डालें।\n2. टॉर्टिला के आधे हिस्से पर कीमा और मोज़रेला रखें और मोड़ दें।\n3. किनारों को काँटे से दबाएँ और सूखे तवे पर हर तरफ़ 2 मिनट, कुरकुरा होने तक सेकें।\n\nपरोसने का तरीक़ा:\n1. आधा काटें और गरम परोसें।\n2. टमाटर-प्याज़ के सालसा या तीखी चटनी के साथ अच्छा लगता है।\n\nLife की टिप: भरावन सूखी होनी चाहिए। इसी से यह नरम नहीं, कुरकुरा रहता है।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Pastel de Frigideira de Carne');

insert into public.receitas_cozinha
  (titulo, subtitulo, categoria, macros, kcal, tempo_preparo_min, cor_tema, premium, destaque, conteudo, ordem, alergenos, temas, tipo_prato, mascote_modo, traducoes, conteudo_traducoes)
select 'Sopa Cremosa de Abóbora com Frango', 'Aveludada, quentinha e sem creme de leite', 'emagrecimento',
  '{"proteina": 22, "carboidrato": 24, "gordura": 8}'::jsonb, 246, 25, '#22c55e', false, false,
  'SOBRE O PRATO: Abóbora cozida e batida até ficar aveludada, com frango desfiado por cima. O cremoso vem da própria abóbora.

INGREDIENTES (1 porção):
- 200g de abóbora cabotiá em cubos
- 60g de frango cozido desfiado
- 20g de cebola picada
- 1 dente de alho
- 1 colher de chá de azeite (5ml)
- 300ml de água
- Sal, pimenta e cheiro-verde a gosto

PREPARO:
1. Refogue a cebola e o alho no azeite.
2. Junte a abóbora e a água e cozinhe por 15 minutos, até ficar bem macia.
3. Bata no liquidificador (ou com o mixer) até ficar liso e volte à panela.
4. Acerte o sal e a pimenta e aqueça mais 2 minutos.

MONTAGEM:
1. Sirva num prato fundo com o frango desfiado por cima.
2. Finalize com cheiro-verde e um fio de azeite.

DICA DO LIFE: Rende bem em dobro: congela em porções e tem janta pronta nos dias corridos.',
  50, array['carne']::text[], '{}'::text[], 'salgado', 'chef',
  '{"en": {"titulo": "Creamy Pumpkin Soup with Chicken", "subtitulo": "Velvety, warm and with no cream"}, "es": {"titulo": "Crema de Calabaza con Pollo", "subtitulo": "Aterciopelada, calientita y sin nata"}, "fr": {"titulo": "Velouté de Potiron au Poulet", "subtitulo": "Onctueux, bien chaud et sans crème"}, "hi": {"titulo": "चिकन वाला क्रीमी कद्दू सूप", "subtitulo": "मख़मली, गरमागरम और बिना क्रीम के"}}'::jsonb,
  '{"en": "ABOUT THE DISH: Pumpkin cooked and blended until velvety, with shredded chicken on top. The creaminess comes from the pumpkin itself.\n\nINGREDIENTS (1 serving):\n- 200g kabocha pumpkin, cubed\n- 60g cooked shredded chicken\n- 20g chopped onion\n- 1 garlic clove\n- 1 teaspoon olive oil (5ml)\n- 300ml water\n- Salt, pepper and chopped herbs to taste\n\nPREPARATION:\n1. Soften the onion and garlic in the oil.\n2. Add the pumpkin and water and cook for 15 minutes, until very tender.\n3. Blend until smooth and return to the pot.\n4. Adjust the salt and pepper and heat for 2 more minutes.\n\nTO SERVE:\n1. Serve in a deep bowl with the shredded chicken on top.\n2. Finish with herbs and a drizzle of olive oil.\n\nLIFE''S TIP: It doubles well: freeze it in portions and dinner is ready on busy days.", "es": "SOBRE EL PLATO: Calabaza cocida y licuada hasta quedar aterciopelada, con pollo desmenuzado por encima. La cremosidad viene de la propia calabaza.\n\nINGREDIENTES (1 porción):\n- 200g de calabaza en cubos\n- 60g de pollo cocido desmenuzado\n- 20g de cebolla picada\n- 1 diente de ajo\n- 1 cucharadita de aceite de oliva (5ml)\n- 300ml de agua\n- Sal, pimienta y hierbas picadas a gusto\n\nPREPARACIÓN:\n1. Sofríe la cebolla y el ajo en el aceite.\n2. Añade la calabaza y el agua y cocina 15 minutos, hasta que esté bien tierna.\n3. Licúa hasta que quede lisa y devuélvela a la olla.\n4. Ajusta la sal y la pimienta y calienta 2 minutos más.\n\nMONTAJE:\n1. Sirve en un plato hondo con el pollo desmenuzado por encima.\n2. Termina con hierbas y un hilo de aceite de oliva.\n\nCONSEJO DE LIFE: Rinde bien al doble: congélala en porciones y hay cena lista en los días con prisa.", "fr": "À PROPOS DU PLAT : Du potiron cuit puis mixé jusqu’à devenir velouté, avec du poulet effiloché par-dessus. L’onctuosité vient du potiron lui-même.\n\nINGRÉDIENTS (1 portion) :\n- 200 g de potiron en dés\n- 60 g de poulet cuit effiloché\n- 20 g d’oignon haché\n- 1 gousse d’ail\n- 1 cuillère à café d’huile d’olive (5 ml)\n- 300 ml d’eau\n- Sel, poivre et herbes hachées selon ton goût\n\nPRÉPARATION :\n1. Fais revenir l’oignon et l’ail dans l’huile.\n2. Ajoute le potiron et l’eau et laisse cuire 15 minutes, jusqu’à ce qu’il soit bien tendre.\n3. Mixe jusqu’à ce que ce soit lisse puis remets dans la casserole.\n4. Rectifie le sel et le poivre et réchauffe encore 2 minutes.\n\nDRESSAGE :\n1. Sers dans une assiette creuse avec le poulet effiloché par-dessus.\n2. Termine avec des herbes et un filet d’huile d’olive.\n\nL’ASTUCE DE LIFE : Il se double très bien : congèle-le en portions et le dîner est prêt les jours chargés.", "hi": "इस डिश के बारे में: उबालकर मख़मली होने तक पीसा हुआ कद्दू, ऊपर रेशेदार चिकन। क्रीमीपन कद्दू से ही आता है।\n\nसामग्री (1 सर्विंग):\n- 200 g कद्दू, टुकड़ों में\n- 60 g पका हुआ रेशेदार चिकन\n- 20 g कटा प्याज़\n- 1 कली लहसुन\n- 1 छोटा चम्मच ऑलिव ऑयल (5 ml)\n- 300 ml पानी\n- स्वाद अनुसार नमक, काली मिर्च और हरा धनिया\n\nबनाने का तरीक़ा:\n1. तेल में प्याज़ और लहसुन भूनें।\n2. कद्दू और पानी डालें और 15 मिनट, अच्छे से नरम होने तक पकाएँ।\n3. चिकना होने तक ब्लेंड करें और वापस बर्तन में डालें।\n4. नमक और काली मिर्च ठीक करें और 2 मिनट और गरम करें।\n\nपरोसने का तरीक़ा:\n1. गहरी प्लेट में परोसें, ऊपर रेशेदार चिकन डालकर।\n2. ऊपर हरा धनिया और थोड़ा ऑलिव ऑयल डालें।\n\nLife की टिप: दुगुना बनाना आसान है: हिस्सों में जमा दीजिए और भागदौड़ वाले दिन डिनर तैयार।"}'::jsonb
where not exists (select 1 from public.receitas_cozinha where titulo = 'Sopa Cremosa de Abóbora com Frango');
