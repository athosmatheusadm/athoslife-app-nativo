-- ATHOSlife — comidas típicas da Índia, Nepal, França e Québec (dono, 28/10:
-- "principalmente comidas"). 79 itens com nome em pt/en/es/fr/hi e apelidos
-- como as pessoas digitam (roti, chapati, paneer, momo, poutine...).
-- Valores por 100 g, de referência: IFCT 2017 (Índia/Nepal), Ciqual (França),
-- USDA (resto). porcao_tipica_g = a porção normal ("1 roti" = 40 g,
-- "1 momo" = 30 g). Valem pra todos os países (regioes = null): comida
-- indiana e francesa existe no mundo todo.
-- Só insere o que ainda não existe (chave: nome_en). Rodar de novo é seguro.

begin;

insert into public.alimentos (nome, nome_en, nome_es, nome_fr, nome_hi, categoria, porcao_g, calorias, proteina, carboidrato, gordura, porcao_tipica_g, representacao, aliases, scanner)
select v.pt, v.en, v.es, v.fr, v.hi, v.cat, v.pg, v.kcal, v.prot, v.carb, v.gord, v.tipica, case when v.prato then 'prato' end, v.apelidos, true
from (values
  ('Chapati (roti de trigo integral)', 'Chapati (whole wheat roti)', 'Chapati (roti de trigo integral)', 'Chapati (roti au blé complet)', 'चपाती (गेहूँ की रोटी)', 'carboidrato', 100, 280, 9, 50, 5, 40, false, array['roti','chapati','chapatti','रोटी','चपाती','fulka']::text[]),
  ('Phulka (roti sem óleo)', 'Phulka (oil-free roti)', 'Phulka (roti sin aceite)', 'Phulka (roti sans huile)', 'फुलका (बिना घी की रोटी)', 'carboidrato', 100, 260, 9.5, 52, 1.8, 35, false, array['phulka','fulka','फुल्का','sukhi roti']::text[]),
  ('Paratha simples', 'Plain paratha', 'Paratha sencillo', 'Paratha nature', 'सादा पराठा', 'carboidrato', 100, 326, 7.5, 45, 13, 80, false, array['paratha','parantha','पराठा','परांठा']::text[]),
  ('Aloo paratha (pão recheado de batata)', 'Aloo paratha (potato-stuffed flatbread)', 'Aloo paratha (pan relleno de papa)', 'Aloo paratha (pain farci aux pommes de terre)', 'आलू पराठा', 'carboidrato', 100, 260, 5.5, 34, 11, 120, false, array['aloo paratha','alu paratha','आलू का पराठा']::text[]),
  ('Paneer (queijo fresco indiano)', 'Paneer (Indian cottage cheese)', 'Paneer (queso fresco indio)', 'Paneer (fromage frais indien)', 'पनीर', 'laticinios', 100, 265, 18.3, 1.2, 20.8, 50, false, array['paneer','panir','पनीर']::text[]),
  ('Palak paneer (espinafre com paneer)', 'Palak paneer (spinach with paneer)', 'Palak paneer (espinaca con paneer)', 'Palak paneer (épinards au paneer)', 'पालक पनीर', 'refeicao', 100, 155, 7, 6, 11.5, 200, true, array['palak paneer','saag paneer','पालक पनीर']::text[]),
  ('Paneer butter masala', 'Paneer butter masala', 'Paneer butter masala', 'Paneer butter masala', 'पनीर बटर मसाला', 'refeicao', 100, 220, 8, 8, 17, 200, true, array['paneer butter masala','paneer makhani','पनीर मखनी']::text[]),
  ('Dal tadka (dal de toor temperado)', 'Dal tadka (tempered toor dal)', 'Dal tadka (dal de toor sazonado)', 'Dal tadka (dal de toor relevé)', 'दाल तड़का', 'leguminosa', 100, 110, 6, 15, 3, 150, true, array['dal tadka','dal fry','toor dal','arhar dal','दाल फ्राई','अरहर दाल','तूर दाल']::text[]),
  ('Dal de moong cozido', 'Cooked moong dal', 'Dal de moong cocido', 'Dal de moong cuit', 'पकी मूंग दाल', 'leguminosa', 100, 105, 7, 16, 1.5, 150, true, array['moong dal','mung dal','मूंग दाल']::text[]),
  ('Chole (grão-de-bico ao curry)', 'Chole (chickpea curry)', 'Chole (garbanzos al curry)', 'Chole (curry de pois chiches)', 'छोले', 'leguminosa', 100, 160, 7.5, 21, 5.5, 200, true, array['chole','chana masala','chhole','छोले मसाला','चना मसाला']::text[]),
  ('Rajma (feijão vermelho ao curry)', 'Rajma (kidney bean curry)', 'Rajma (frijoles rojos al curry)', 'Rajma (curry de haricots rouges)', 'राजमा करी', 'leguminosa', 100, 140, 7, 18, 4.5, 200, true, array['rajma','rajma masala','राजमा मसाला']::text[]),
  ('Kadhi (molho de iogurte com grão-de-bico)', 'Kadhi (yogurt-gram flour curry)', 'Kadhi (curry de yogur y harina de garbanzo)', 'Kadhi (curry au yaourt et farine de pois chiche)', 'कढ़ी', 'refeicao', 100, 90, 3.5, 7, 5, 200, true, array['kadhi','kadi','कढ़ी पकौड़ा']::text[]),
  ('Khichdi (arroz com lentilha)', 'Khichdi (rice and lentil porridge)', 'Khichdi (arroz con lentejas)', 'Khichdi (riz aux lentilles)', 'खिचड़ी', 'refeicao', 100, 120, 4.5, 20, 2.5, 250, true, array['khichdi','khichri','खिचड़ी']::text[]),
  ('Idli', 'Idli (steamed rice cake)', 'Idli (pastel de arroz al vapor)', 'Idli (galette de riz vapeur)', 'इडली', 'carboidrato', 100, 135, 4.5, 28, 0.4, 40, false, array['idli','idly','इडली']::text[]),
  ('Dosa simples', 'Plain dosa', 'Dosa sencilla', 'Dosa nature', 'सादा डोसा', 'carboidrato', 100, 165, 3.9, 29, 3.7, 80, false, array['dosa','dosai','plain dosa','डोसा']::text[]),
  ('Masala dosa', 'Masala dosa', 'Masala dosa', 'Masala dosa', 'मसाला डोसा', 'refeicao', 100, 190, 4, 27, 7, 180, true, array['masala dosa','मसाला डोसा']::text[]),
  ('Sambar', 'Sambar (lentil vegetable stew)', 'Sambar (guiso de lentejas y verduras)', 'Sambar (ragoût de lentilles et légumes)', 'सांभर', 'leguminosa', 100, 65, 3, 9, 1.8, 150, true, array['sambar','sambhar','सांबर']::text[]),
  ('Chutney de coco', 'Coconut chutney', 'Chutney de coco', 'Chutney à la noix de coco', 'नारियल की चटनी', 'gordura', 100, 200, 2.5, 8, 18, 30, false, array['coconut chutney','nariyal chutney','चटनी']::text[]),
  ('Upma', 'Upma (savory semolina)', 'Upma (sémola salada)', 'Upma (semoule salée)', 'उपमा', 'refeicao', 100, 150, 3.5, 22, 5, 180, true, array['upma','uppittu','उपमा']::text[]),
  ('Poha (arroz achatado temperado)', 'Poha (flattened rice)', 'Poha (arroz aplanado)', 'Poha (riz aplati)', 'पोहा', 'refeicao', 100, 160, 3, 28, 4, 150, true, array['poha','pohe','kanda poha','पोहा']::text[]),
  ('Biryani de legumes', 'Vegetable biryani', 'Biryani de verduras', 'Biryani aux légumes', 'वेज बिरयानी', 'refeicao', 100, 160, 3.5, 25, 5, 250, true, array['veg biryani','vegetable biryani','वेज बिरयानी','पुलाव']::text[]),
  ('Biryani de frango', 'Chicken biryani', 'Biryani de pollo', 'Biryani au poulet', 'चिकन बिरयानी', 'refeicao', 100, 180, 9, 22, 6, 250, true, array['chicken biryani','biryani','बिरयानी']::text[]),
  ('Arroz com coalhada (curd rice)', 'Curd rice', 'Arroz con yogur (curd rice)', 'Riz au yaourt (curd rice)', 'दही चावल', 'refeicao', 100, 120, 3, 19, 3.5, 200, true, array['curd rice','dahi chawal','thayir sadam']::text[]),
  ('Jeera rice (arroz com cominho)', 'Jeera rice (cumin rice)', 'Arroz jeera (con comino)', 'Riz jeera (au cumin)', 'जीरा राइस', 'carboidrato', 100, 150, 2.8, 27, 3, 150, true, array['jeera rice','zeera rice','जीरा चावल']::text[]),
  ('Aloo gobi (batata e couve-flor)', 'Aloo gobi (potato and cauliflower)', 'Aloo gobi (papa y coliflor)', 'Aloo gobi (pommes de terre et chou-fleur)', 'आलू गोभी', 'refeicao', 100, 95, 2.5, 10, 5, 150, true, array['aloo gobi','alu gobi','आलू गोभी की सब्ज़ी']::text[]),
  ('Bhindi masala (quiabo temperado)', 'Bhindi masala (spiced okra)', 'Bhindi masala (okra especiada)', 'Bhindi masala (gombo épicé)', 'भिंडी मसाला', 'refeicao', 100, 110, 2.5, 9, 7.5, 120, true, array['bhindi masala','bhindi','भिंडी']::text[]),
  ('Baingan bharta (berinjela assada amassada)', 'Baingan bharta (smoky mashed eggplant)', 'Baingan bharta (berenjena asada)', 'Baingan bharta (purée d’aubergine fumée)', 'बैंगन का भरता', 'refeicao', 100, 100, 2.3, 9, 6.5, 150, true, array['baingan bharta','bharta','बैंगन भरता']::text[]),
  ('Dhokla', 'Dhokla (steamed gram flour cake)', 'Dhokla (pastel de garbanzo al vapor)', 'Dhokla (gâteau vapeur de pois chiche)', 'ढोकला', 'carboidrato', 100, 160, 6.5, 24, 4, 100, false, array['dhokla','khaman','ढोकला']::text[]),
  ('Besan chilla (panqueca de grão-de-bico)', 'Besan chilla (gram flour pancake)', 'Besan chilla (crepe de garbanzo)', 'Besan chilla (crêpe de farine de pois chiche)', 'बेसन चीला', 'refeicao', 100, 190, 9, 22, 7, 100, true, array['besan chilla','cheela','chila','बेसन का चीला']::text[]),
  ('Broto de feijão moong', 'Mung bean sprouts', 'Germinados de soja verde (moong)', 'Pousses de haricot mungo', 'अंकुरित मूंग', 'vegetal', 100, 30, 3, 5.9, 0.2, 100, false, array['sprouts','moong sprouts','अंकुरित','स्प्राउट्स']::text[]),
  ('Masala chai (chá com leite e açúcar)', 'Masala chai (spiced milk tea)', 'Masala chai (té especiado con leche)', 'Masala chai (thé épicé au lait)', 'मसाला चाय', 'bebida', 100, 50, 1.5, 7.5, 1.5, 150, false, array['chai','masala chai','cutting chai','चाय','दूध वाली चाय']::text[]),
  ('Lassi doce', 'Sweet lassi', 'Lassi dulce', 'Lassi sucré', 'मीठी लस्सी', 'bebida', 100, 100, 3.2, 15, 3, 250, false, array['lassi','meethi lassi','लस्सी']::text[]),
  ('Chaas (leitelho temperado)', 'Chaas (spiced buttermilk)', 'Chaas (suero de leche especiado)', 'Chaas (babeurre épicé)', 'छाछ', 'bebida', 100, 25, 1.5, 2.5, 1, 250, false, array['chaas','chhaas','mattha','buttermilk','मट्ठा']::text[]),
  ('Makhana (sementes de lótus torradas)', 'Makhana (roasted fox nuts)', 'Makhana (semillas de loto tostadas)', 'Makhana (graines de lotus grillées)', 'मखाना', 'castanhas', 100, 350, 9.7, 77, 0.1, 25, false, array['makhana','fox nuts','phool makhana','मखाने']::text[]),
  ('Gulab jamun', 'Gulab jamun', 'Gulab jamun', 'Gulab jamun', 'गुलाब जामुन', 'doce', 100, 380, 5, 52, 17, 40, false, array['gulab jamun','गुलाबजामुन']::text[]),
  ('Jalebi', 'Jalebi', 'Jalebi', 'Jalebi', 'जलेबी', 'doce', 100, 450, 3, 65, 20, 50, false, array['jalebi','jilebi','जलेबी']::text[]),
  ('Pakora (bolinho frito de grão-de-bico)', 'Pakora (gram flour fritters)', 'Pakora (buñuelos de garbanzo)', 'Pakora (beignets de pois chiche)', 'पकौड़ा', 'refeicao', 100, 280, 7, 24, 17, 80, true, array['pakora','pakoda','bhaji','bhajji','पकोड़ा','पकौड़े']::text[]),
  ('Pav bhaji', 'Pav bhaji', 'Pav bhaji', 'Pav bhaji', 'पाव भाजी', 'refeicao', 100, 200, 5, 28, 8, 300, true, array['pav bhaji','पावभाजी']::text[]),
  ('Vada pav', 'Vada pav', 'Vada pav', 'Vada pav', 'वड़ा पाव', 'refeicao', 100, 215, 5, 30, 8.5, 140, true, array['vada pav','wada pav','वडा पाव']::text[]),
  ('Frango na manteiga (butter chicken)', 'Butter chicken', 'Pollo a la mantequilla (butter chicken)', 'Poulet au beurre (butter chicken)', 'बटर चिकन', 'refeicao', 100, 180, 13, 5, 12, 200, true, array['butter chicken','murgh makhani','बटर चिकन','मुर्ग मखनी']::text[]),
  ('Frango tandoori', 'Tandoori chicken', 'Pollo tandoori', 'Poulet tandoori', 'तंदूरी चिकन', 'proteina', 100, 150, 25, 3, 4.5, 200, true, array['tandoori chicken','tandoori','तंदूरी']::text[]),
  ('Curry de ovo', 'Egg curry', 'Curry de huevo', 'Curry d’œufs', 'अंडा करी', 'refeicao', 100, 140, 8, 5, 10, 200, true, array['egg curry','anda curry','अंडा करी']::text[]),
  ('Curry de peixe', 'Fish curry', 'Curry de pescado', 'Curry de poisson', 'मछली करी', 'refeicao', 100, 120, 13, 4, 6, 200, true, array['fish curry','machli','माछेर झोल','मछली']::text[]),
  ('Curry de carneiro', 'Mutton curry', 'Curry de cordero', 'Curry de mouton', 'मटन करी', 'refeicao', 100, 200, 15, 4, 14, 200, true, array['mutton curry','mutton','gosht','मटन']::text[]),
  ('Raita (iogurte com pepino)', 'Raita (yogurt with cucumber)', 'Raita (yogur con pepino)', 'Raïta (yaourt au concombre)', 'रायता', 'laticinios', 100, 60, 2.8, 5, 3, 100, false, array['raita','रायता']::text[]),
  ('Dal bhat (arroz, lentilha e legumes)', 'Dal bhat (rice, lentils and vegetables)', 'Dal bhat (arroz, lentejas y verduras)', 'Dal bhat (riz, lentilles et légumes)', 'दाल भात', 'refeicao', 100, 125, 4.5, 22, 2.2, 450, true, array['dal bhat','daal bhat','dal bhat tarkari','दालभात','भात']::text[]),
  ('Momo de legumes (cozido no vapor)', 'Steamed veg momo', 'Momo de verduras al vapor', 'Momo aux légumes vapeur', 'वेज मोमो', 'refeicao', 100, 150, 4.5, 24, 4, 30, true, array['momo','veg momo','momos','मोमोज़']::text[]),
  ('Momo de frango (cozido no vapor)', 'Steamed chicken momo', 'Momo de pollo al vapor', 'Momo au poulet vapeur', 'चिकन मोमो', 'refeicao', 100, 190, 10, 22, 7, 30, true, array['chicken momo','momo','मोमोज़']::text[]),
  ('Momo de búfalo (cozido no vapor)', 'Steamed buff momo', 'Momo de búfalo al vapor', 'Momo au buffle vapeur', 'बफ़ मोमो', 'refeicao', 100, 210, 11, 22, 9, 30, true, array['buff momo','momo','मोमोज़']::text[]),
  ('Sel roti (rosca doce de arroz nepalesa)', 'Sel roti (Nepali rice ring bread)', 'Sel roti (rosca dulce de arroz nepalí)', 'Sel roti (couronne de riz népalaise)', 'सेल रोटी', 'carboidrato', 100, 330, 5, 50, 12, 50, false, array['sel roti','selroti','सेलरोटी']::text[]),
  ('Thukpa (sopa de macarrão com frango)', 'Thukpa (chicken noodle soup)', 'Thukpa (sopa de fideos con pollo)', 'Thukpa (soupe de nouilles au poulet)', 'थुकपा', 'refeicao', 100, 80, 5, 10, 2.2, 400, true, array['thukpa','थुक्पा']::text[]),
  ('Chiura (arroz batido seco)', 'Chiura (beaten rice, dry)', 'Chiura (arroz aplanado seco)', 'Chiura (riz aplati sec)', 'चिउरा', 'carboidrato', 100, 350, 6.6, 77, 1.2, 50, false, array['chiura','chiwda','beaten rice','चिउड़ा']::text[]),
  ('Sopa de gundruk (folhas fermentadas)', 'Gundruk soup (fermented greens)', 'Sopa de gundruk (hojas fermentadas)', 'Soupe de gundruk (feuilles fermentées)', 'गुन्द्रुक को झोल', 'vegetal', 100, 30, 2, 4, 0.7, 200, true, array['gundruk','gundruk ko jhol','गुन्द्रुक']::text[]),
  ('Dhido (mingau de milho ou trigo-sarraceno)', 'Dhido (millet or buckwheat porridge)', 'Dhido (papilla de mijo o alforfón)', 'Dhido (bouillie de millet ou sarrasin)', 'ढिँडो', 'carboidrato', 100, 110, 3, 23, 0.6, 250, true, array['dhido','ढिडो']::text[]),
  ('Chatamari (crepe newari de arroz)', 'Chatamari (Newari rice crepe)', 'Chatamari (crepe newari de arroz)', 'Chatamari (crêpe newar au riz)', 'चटामरी', 'refeicao', 100, 180, 7, 25, 6, 150, true, array['chatamari','चतामरी']::text[]),
  ('Juju dhau (iogurte doce nepalês)', 'Juju dhau (Nepali sweet yogurt)', 'Juju dhau (yogur dulce nepalí)', 'Juju dhau (yaourt sucré népalais)', 'जुजु धौ', 'laticinios', 100, 150, 4.5, 18, 6.5, 150, false, array['juju dhau','dhau','जुजु धउ']::text[]),
  ('Sanduíche jambon-beurre (presunto e manteiga)', 'Jambon-beurre (ham and butter baguette)', 'Jambon-beurre (baguette de jamón y mantequilla)', 'Jambon-beurre', 'जैम्बों-बर (हैम-बटर बैगेट)', 'refeicao', 100, 250, 11, 30, 9.5, 200, true, array['jambon beurre','sandwich jambon','parisien']::text[]),
  ('Quiche lorraine', 'Quiche lorraine', 'Quiche lorraine', 'Quiche lorraine', 'कीश लॉरेन', 'refeicao', 100, 280, 9, 18, 19, 150, true, array['quiche','quiche lorraine']::text[]),
  ('Ratatouille', 'Ratatouille', 'Ratatouille', 'Ratatouille', 'रैटाटुई', 'refeicao', 100, 60, 1.3, 6, 3.5, 200, true, array['ratatouille']::text[]),
  ('Bœuf bourguignon (carne ao vinho tinto)', 'Beef bourguignon (beef stewed in red wine)', 'Bœuf bourguignon (ternera al vino tinto)', 'Bœuf bourguignon', 'बीफ़ बुर्गिन्यों', 'refeicao', 100, 145, 14, 4, 8, 250, true, array['boeuf bourguignon','bourguignon']::text[]),
  ('Blanquette de vitela', 'Veal blanquette', 'Blanqueta de ternera', 'Blanquette de veau', 'वील ब्लांकेट', 'refeicao', 100, 140, 13, 4, 8, 250, true, array['blanquette','blanquette de veau']::text[]),
  ('Steak-frites (bife com batata frita)', 'Steak-frites (steak and fries)', 'Steak-frites (filete con papas fritas)', 'Steak-frites', 'स्टेक-फ़्राइट', 'refeicao', 100, 230, 12, 17, 13, 350, true, array['steak frites','steak frite']::text[]),
  ('Salada niçoise', 'Salade niçoise', 'Ensalada niçoise', 'Salade niçoise', 'सलाद निसवाज़', 'refeicao', 100, 110, 7, 5, 7, 300, true, array['nicoise','salade nicoise']::text[]),
  ('Sopa de cebola gratinada', 'French onion soup', 'Sopa de cebolla gratinada', 'Soupe à l’oignon gratinée', 'फ़्रेंच अनियन सूप', 'refeicao', 100, 100, 4.5, 9, 5, 300, true, array['soupe a l oignon','onion soup']::text[]),
  ('Pain au chocolat', 'Pain au chocolat (chocolate croissant)', 'Napolitana de chocolate (pain au chocolat)', 'Pain au chocolat', 'पैन ओ शोकोला', 'doce', 100, 400, 7.5, 45, 21, 60, false, array['pain au chocolat','chocolatine','chocolate croissant']::text[]),
  ('Galette completa (crepe de trigo-sarraceno)', 'Galette complète (buckwheat crepe with ham, egg and cheese)', 'Galette complète (crepe de alforfón con jamón, huevo y queso)', 'Galette complète', 'गालेत कॉम्प्लेत (बकव्हीट क्रेप)', 'refeicao', 100, 200, 11, 17, 10, 220, true, array['galette','galette complete','galette bretonne']::text[]),
  ('Fromage blanc 0%', 'Fat-free fromage blanc', 'Fromage blanc 0%', 'Fromage blanc 0 %', 'फ़्रोमाज ब्लां 0%', 'laticinios', 100, 46, 7.5, 4, 0.1, 100, false, array['fromage blanc','faisselle']::text[]),
  ('Petit-suisse natural', 'Plain petit-suisse', 'Petit-suisse natural', 'Petit-suisse nature', 'पेटी-सुइस', 'laticinios', 100, 135, 9, 3.5, 9.5, 60, false, array['petit suisse','petits suisses']::text[]),
  ('Compota de maçã sem açúcar', 'Unsweetened apple compote', 'Compota de manzana sin azúcar', 'Compote de pommes sans sucre ajouté', 'बिना चीनी का सेब कॉम्पोट', 'fruta', 100, 55, 0.3, 12.5, 0.1, 100, false, array['compote','compote de pommes','applesauce']::text[]),
  ('Hachis parmentier (escondidinho francês)', 'Hachis parmentier (French cottage pie)', 'Hachis parmentier (pastel de carne y puré)', 'Hachis parmentier', 'आशी पार्मेंटिए', 'refeicao', 100, 140, 8, 10, 7.5, 300, true, array['hachis parmentier','parmentier']::text[]),
  ('Gratin dauphinois (batata gratinada)', 'Gratin dauphinois (scalloped potatoes)', 'Gratin dauphinois (papas gratinadas)', 'Gratin dauphinois', 'ग्रैटिन डोफ़िनुआ (आलू ग्रैटिन)', 'refeicao', 100, 140, 3.5, 12, 8.5, 200, true, array['gratin dauphinois','gratin']::text[]),
  ('Cuscuz marroquino completo (couscous royal)', 'Couscous royal (meat and vegetable couscous)', 'Cuscús royal (con carne y verduras)', 'Couscous royal', 'कूसकूस रॉयल', 'refeicao', 100, 160, 9, 18, 6, 350, true, array['couscous royal','couscous']::text[]),
  ('Tajine de frango', 'Chicken tagine', 'Tajín de pollo', 'Tajine de poulet', 'चिकन ताजीन', 'refeicao', 100, 120, 11, 7, 5.5, 300, true, array['tajine','tagine','tajine poulet']::text[]),
  ('Poutine (batata frita com queijo e molho)', 'Poutine (fries with cheese curds and gravy)', 'Poutine (papas fritas con queso y salsa)', 'Poutine', 'पुतीन', 'refeicao', 100, 220, 6.5, 23, 11.5, 400, true, array['poutine']::text[]),
  ('Pâté chinois (escondidinho do Québec)', 'Pâté chinois (Québec shepherd’s pie)', 'Pâté chinois (pastel de carne de Quebec)', 'Pâté chinois', 'पाते शिनुआ', 'refeicao', 100, 130, 7, 12, 6, 300, true, array['pate chinois']::text[]),
  ('Tourtière (torta de carne do Québec)', 'Tourtière (Québec meat pie)', 'Tourtière (pastel de carne de Quebec)', 'Tourtière', 'तूर्तियेर (मीट पाई)', 'refeicao', 100, 270, 10, 20, 17, 150, true, array['tourtiere','tourtiere du lac']::text[]),
  ('Feijão ao bacon com bordo (fèves au lard)', 'Fèves au lard (maple baked beans with pork)', 'Frijoles con tocino y arce (fèves au lard)', 'Fèves au lard', 'फ़ेव ओ लार (बेक्ड बीन्स)', 'leguminosa', 100, 150, 6, 22, 4, 200, true, array['feves au lard','beans']::text[]),
  ('Cretons (patê de porco do Québec)', 'Cretons (Québec pork spread)', 'Cretons (paté de cerdo de Quebec)', 'Cretons', 'क्रेतों (पोर्क स्प्रेड)', 'proteina', 100, 300, 13, 3, 26, 30, false, array['cretons']::text[]),
  ('Pouding chômeur (bolo com calda de bordo)', 'Pouding chômeur (maple syrup pudding cake)', 'Pouding chômeur (pastel con jarabe de arce)', 'Pouding chômeur', 'पूडिंग शोमर', 'doce', 100, 330, 3.5, 52, 12, 120, false, array['pouding chomeur']::text[])
) as v(pt, en, es, fr, hi, cat, pg, kcal, prot, carb, gord, tipica, prato, apelidos)
where not exists (select 1 from public.alimentos a where a.nome_en = v.en);

-- Apelidos indianos/franceses em itens que já existiam.
update public.alimentos a
set aliases = (select array_agg(distinct x) from unnest(coalesce(a.aliases, '{}') || v.apelidos) x)
from (values
  ('Rice pudding', array['kheer', 'खीर', 'payasam']),
  ('Pea soup', array['soupe aux pois']),
  ('Roasted chickpeas', array['bhuna chana', 'भुना चना', 'chana']),
  ('Plain whole-milk yogurt', array['curd', 'dahi']),
  ('Lentil dal', array['dal', 'daal', 'masoor dal', 'मसूर दाल']),
  ('Cooked white rice', array['chawal', 'bhat']),
  ('Naan', array['naan', 'नान', 'butter naan']),
  ('Ghee', array['ghee', 'घी']),
  ('Cooked red kidney beans', array['rajma']),
  ('Whole milk', array['doodh']),
  ('Baguette', array['tradition']),
  ('Croissant', array['croissant au beurre'])
) as v(en, apelidos)
where a.nome_en = v.en;

commit;

