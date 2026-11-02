-- Bebidas de marca (pedido do dono, 27/10: "refrigerante cola eu nunca vi;
-- uma Coca-Cola ou um Guaraná eu já vi"). A base só tinha bebida genérica.
-- Entram 116 bebidas de marca: refrigerantes, sucos, energéticos,
-- isotônicos/eletrólitos, água de coco e chás prontos, com nome em pt/en/es.
-- Valem pra todos os países que o app atende:
--   * marca vendida no mundo todo (Coca-Cola, Pepsi, Fanta, Sprite, Red Bull,
--     Monster, Gatorade, Powerade...): regioes = null, aparece pra todos;
--   * marca regional: só aparece no país dela (Guaraná Antarctica no BR/PT,
--     Jarritos no MX/US, Inca Kola no PE, Irn-Bru no GB/IE, Pocari no JP...).
--
-- Valores: por embalagem típica (porcao_g = ml da lata/garrafa, que é também
-- a porcao_tipica_g: "tomei uma coca" no chat vira 1 lata). São valores
-- TÍPICOS do rótulo; a receita muda um pouco de país pra país (imposto do
-- açúcar no Reino Unido, México, África do Sul...). Pra o valor exato da
-- embalagem, o leitor de código de barras continua sendo o caminho.
--
-- aliases: apelidos da marca ("coca", "coke", "guarana", "redbull") e, no
-- último, as palavras do tipo juntas num texto só ("refrigerante refri soda
-- refresco gaseosa..."). Junto de propósito: "refrigerante" acha as marcas
-- pela busca, mas não conta como nome igual, então o genérico não some.
-- scanner = false: a foto continua casando com a bebida genérica; marca é
-- trabalho do código de barras.

insert into public.alimentos (nome, nome_en, nome_es, porcao_g, calorias, proteina, carboidrato, gordura, regioes, aliases, porcao_tipica_g, categoria, scanner)
select v.nome, v.nome_en, v.nome_es, v.porcao_g, v.calorias, v.proteina, v.carboidrato, v.gordura, v.regioes, v.aliases, v.porcao_tipica_g, 'bebida', false
from (values
  ('Coca-Cola', 'Coca-Cola', 'Coca-Cola', 350, 149, 0, 37, 0, null, array['coca','coke','cocacola','coca cola','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Coca-Cola Sem Açúcar', 'Coke Zero Sugar', 'Coca-Cola Sin Azúcar', 350, 1, 0, 0, 0, null, array['coca zero','coke zero','coca-cola zero','coca sem acucar','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Coca-Cola Diet', 'Diet Coke', 'Coca-Cola Light', 350, 1, 0, 0, 0, null, array['coca light','coca diet','diet coke','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Pepsi', 'Pepsi', 'Pepsi', 350, 150, 0, 39, 0, null, array['pepsi cola','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Pepsi Black (zero açúcar)', 'Pepsi Zero Sugar', 'Pepsi Black (sin azúcar)', 350, 1, 0, 0, 0, null, array['pepsi zero','pepsi black','pepsi max','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Fanta Laranja', 'Fanta Orange', 'Fanta Naranja', 350, 150, 0, 37, 0, null, array['fanta','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Fanta Uva', 'Fanta Grape', 'Fanta Uva', 350, 165, 0, 41, 0, null, array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Fanta Laranja Zero', 'Fanta Orange Zero', 'Fanta Naranja Zero', 350, 2, 0, 0, 0, null, array['fanta zero','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Fanta Guaraná', 'Fanta Guaraná', 'Fanta Guaraná', 350, 140, 0, 35, 0, array['BR']::text[], array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Sprite', 'Sprite', 'Sprite', 350, 130, 0, 33, 0, null, array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Sprite Sem Açúcar', 'Sprite Zero Sugar', 'Sprite Sin Azúcar', 350, 1, 0, 0, 0, null, array['sprite zero','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('7UP', '7UP', '7UP', 350, 140, 0, 36, 0, null, array['seven up','7 up','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Schweppes Citrus', 'Schweppes Citrus', 'Schweppes Citrus', 350, 140, 0, 35, 0, null, array['schweppes','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Água tônica Schweppes', 'Schweppes Tonic Water', 'Tónica Schweppes', 350, 115, 0, 29, 0, null, array['tonica schweppes','schweppes tonica','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Schweppes Ginger Ale', 'Schweppes Ginger Ale', 'Schweppes Ginger Ale', 350, 130, 0, 33, 0, null, array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Dr Pepper', 'Dr Pepper', 'Dr Pepper', 355, 150, 0, 40, 0, array['US','CA','GB','IE','MX']::text[], array['dr. pepper','doctor pepper','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Mountain Dew', 'Mountain Dew', 'Mountain Dew', 355, 170, 0, 46, 0, array['US','CA','IN']::text[], array['mtn dew','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Canada Dry Ginger Ale', 'Canada Dry Ginger Ale', 'Canada Dry Ginger Ale', 355, 140, 0, 36, 0, array['US','CA','MX']::text[], array['canada dry','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('A&W Root Beer', 'A&W Root Beer', 'A&W Root Beer', 355, 170, 0, 46, 0, array['US','CA']::text[], array['root beer','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Guaraná Antarctica', 'Guaraná Antarctica', 'Guaraná Antarctica', 350, 138, 0, 35, 0, array['BR','PT']::text[], array['guarana','guaraná','antarctica','guarana antartica','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Guaraná Antarctica Zero', 'Guaraná Antarctica Zero Sugar', 'Guaraná Antarctica Zero', 350, 2, 0, 0, 0, array['BR','PT']::text[], array['guarana zero','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Guaraná Jesus', 'Guaraná Jesus', 'Guaraná Jesus', 350, 150, 0, 38, 0, array['BR']::text[], array['jesus','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Kuat', 'Kuat guaraná soda', 'Kuat', 350, 140, 0, 35, 0, array['BR']::text[], array['guarana kuat','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Sukita Laranja', 'Sukita orange soda', 'Sukita Naranja', 350, 155, 0, 39, 0, array['BR']::text[], array['sukita','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Soda Limonada Antarctica', 'Antarctica lemon soda', 'Soda Limonada Antarctica', 350, 140, 0, 35, 0, array['BR']::text[], array['soda limonada','soda antarctica','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Itubaína', 'Itubaína soda', 'Itubaína', 350, 150, 0, 37, 0, array['BR']::text[], array['tubaina','itubaina','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Dolly Guaraná', 'Dolly guaraná soda', 'Dolly Guaraná', 350, 140, 0, 35, 0, array['BR']::text[], array['dolly','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('H2OH! Limão', 'H2OH! lemon', 'H2OH! Limón', 500, 10, 0, 2.5, 0, array['BR']::text[], array['h2oh','h2o limao','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 500),
  ('Água tônica Antarctica', 'Antarctica tonic water', 'Tónica Antarctica', 350, 120, 0, 30, 0, array['BR']::text[], array['tonica antarctica','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 350),
  ('Jarritos Tamarindo', 'Jarritos Tamarind', 'Jarritos Tamarindo', 370, 170, 0, 44, 0, array['MX','US']::text[], array['jarritos','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 370),
  ('Jarritos Mandarina', 'Jarritos Mandarin', 'Jarritos Mandarina', 370, 170, 0, 44, 0, array['MX','US']::text[], array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 370),
  ('Sidral Mundet', 'Sidral Mundet apple soda', 'Sidral Mundet', 355, 150, 0, 38, 0, array['MX']::text[], array['sidral','refresco de manzana','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Manzanita Sol', 'Manzanita Sol apple soda', 'Manzanita Sol', 355, 160, 0, 40, 0, array['MX']::text[], array['manzanita','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Squirt', 'Squirt', 'Squirt', 355, 140, 0, 38, 0, array['MX','US']::text[], array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Topo Chico (água mineral)', 'Topo Chico mineral water', 'Topo Chico (agua mineral)', 355, 0, 0, 0, 0, array['MX','US']::text[], array['topo chico','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Peñafiel (água mineral)', 'Peñafiel mineral water', 'Peñafiel (agua mineral)', 355, 0, 0, 0, 0, array['MX']::text[], array['penafiel','agua mineral','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Inca Kola', 'Inca Kola', 'Inca Kola', 500, 200, 0, 50, 0, array['PE','US']::text[], array['inka kola','inca cola','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 500),
  ('Postobón Manzana', 'Postobón apple soda', 'Postobón Manzana', 400, 160, 0, 40, 0, array['CO']::text[], array['postobon','manzana postobon','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 400),
  ('Colombiana', 'Colombiana soda', 'Colombiana', 400, 168, 0, 42, 0, array['CO']::text[], array['colombiana postobon','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 400),
  ('Pony Malta', 'Pony Malta', 'Pony Malta', 330, 165, 1, 39, 0, array['CO','PA','EC']::text[], array['pony','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('Malta Polar', 'Malta Polar', 'Malta Polar', 355, 170, 1.5, 40, 0, array['VE']::text[], array['malta','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Malta (bebida de malte sem álcool)', 'Malt beverage (non-alcoholic)', 'Malta (bebida de malta)', 355, 170, 1.5, 40, 0, array['DO','PR','PA','VE','CO','US']::text[], array['malta goya','malta india','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 355),
  ('Big Cola', 'Big Cola', 'Big Cola', 500, 200, 0, 50, 0, array['PE','MX','EC','CO','GT','CR','VE','BO']::text[], array['bigcola','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 500),
  ('Paso de los Toros Pomelo', 'Paso de los Toros grapefruit soda', 'Paso de los Toros Pomelo', 500, 160, 0, 40, 0, array['AR','UY']::text[], array['paso de los toros','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 500),
  ('Sumol Laranja', 'Sumol orange', 'Sumol Naranja', 330, 90, 0, 21, 0, array['PT','AO','MZ']::text[], array['sumol','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('Kas Laranja', 'Kas orange', 'Kas Naranja', 330, 70, 0, 16, 0, array['ES']::text[], array['kas','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('Kas Limão', 'Kas lemon', 'Kas Limón', 330, 65, 0, 15, 0, array['ES']::text[], array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('Irn-Bru', 'Irn-Bru', 'Irn-Bru', 330, 66, 0, 15.5, 0, array['GB','IE']::text[], array['irn bru','iron brew','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('Tango Laranja', 'Tango Orange', 'Tango Naranja', 330, 60, 0, 14, 0, array['GB','IE']::text[], array['tango','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('Orangina', 'Orangina', 'Orangina', 330, 125, 0.3, 30, 0, array['FR','CH','DE','NL','IT','ES','GB']::text[], array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('San Pellegrino Aranciata', 'San Pellegrino Aranciata', 'San Pellegrino Aranciata', 330, 110, 0, 26, 0, array['IT','CH','DE','FR','GB','US','ES','NL']::text[], array['aranciata','san pellegrino','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('Fritz-Kola', 'Fritz-Kola', 'Fritz-Kola', 330, 132, 0, 33, 0, array['DE','NL','CH']::text[], array['fritz kola','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('Rivella', 'Rivella', 'Rivella', 500, 165, 0, 40, 0, array['CH']::text[], array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 500),
  ('Apfelschorle (suco de maçã com água com gás)', 'Apfelschorle (apple spritzer)', 'Apfelschorle (jugo de manzana con agua con gas)', 330, 80, 0, 19, 0, array['DE','CH','NL']::text[], array['apfelschorle','schorle','suco juice jugo zumo nectar']::text[], 330),
  ('Thums Up', 'Thums Up', 'Thums Up', 300, 130, 0, 32, 0, array['IN']::text[], array['thumbs up','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 300),
  ('Limca', 'Limca', 'Limca', 300, 120, 0, 30, 0, array['IN']::text[], array['refrigerante refri soda refresco gaseosa soft drink pop']::text[], 300),
  ('Frooti', 'Frooti mango drink', 'Frooti', 200, 125, 0, 31, 0, array['IN']::text[], array['suco juice jugo zumo nectar']::text[], 200),
  ('Maaza', 'Maaza mango drink', 'Maaza', 250, 155, 0, 38, 0, array['IN']::text[], array['suco juice jugo zumo nectar']::text[], 250),
  ('Appletiser', 'Appletiser', 'Appletiser', 330, 140, 0, 34, 0, array['ZA','GB']::text[], array['suco juice jugo zumo nectar']::text[], 330),
  ('Stoney Ginger Beer', 'Stoney Ginger Beer', 'Stoney Ginger Beer', 300, 115, 0, 28, 0, array['ZA']::text[], array['stoney','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 300),
  ('Sparletta Creme Soda', 'Sparletta Creme Soda', 'Sparletta Creme Soda', 330, 90, 0, 22, 0, array['ZA']::text[], array['creme soda','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 330),
  ('Bundaberg Ginger Beer', 'Bundaberg Ginger Beer', 'Bundaberg Ginger Beer', 375, 180, 0, 45, 0, array['AU','NZ']::text[], array['bundaberg','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 375),
  ('Solo Limão', 'Solo lemon soda', 'Solo Limón', 375, 160, 0, 40, 0, array['AU']::text[], array['solo','refrigerante refri soda refresco gaseosa soft drink pop']::text[], 375),
  ('Néctar Del Valle', 'Del Valle nectar', 'Néctar Del Valle', 200, 90, 0.2, 22, 0, array['BR','MX','AR','CO','CL','PE','UY','PY','BO','EC','VE','CR','PA','GT','DO','PR']::text[], array['del valle','suco juice jugo zumo nectar']::text[], 200),
  ('Del Valle 100% Uva', 'Del Valle 100% grape juice', 'Del Valle 100% Uva', 200, 130, 0.3, 32, 0, array['BR','MX','AR','CO','CL','PE','UY','PY','BO','EC','VE','CR','PA','GT','DO','PR']::text[], array['del valle uva','suco juice jugo zumo nectar']::text[], 200),
  ('Del Valle Kapo', 'Del Valle Kapo', 'Del Valle Kapo', 200, 55, 0, 13, 0, array['BR']::text[], array['kapo','suco juice jugo zumo nectar']::text[], 200),
  ('Suco Natural One Laranja', 'Natural One orange juice', 'Jugo Natural One Naranja', 300, 135, 2, 30, 0, array['BR']::text[], array['natural one','suco juice jugo zumo nectar']::text[], 300),
  ('Suco do Bem Laranja', 'Do Bem orange juice', 'Jugo Do Bem Naranja', 200, 92, 1, 21, 0, array['BR']::text[], array['do bem','suco do bem','suco juice jugo zumo nectar']::text[], 200),
  ('Néctar Maguary', 'Maguary nectar', 'Néctar Maguary', 200, 90, 0.2, 22, 0, array['BR']::text[], array['maguary','suco juice jugo zumo nectar']::text[], 200),
  ('Suco de uva integral Aurora', 'Aurora 100% grape juice', 'Jugo de uva Aurora', 200, 130, 0.3, 32, 0, array['BR']::text[], array['aurora','suco juice jugo zumo nectar']::text[], 200),
  ('Tang (refresco em pó preparado)', 'Tang (prepared drink mix)', 'Tang (bebida en polvo preparada)', 200, 15, 0, 3.5, 0, null, array['tang','suco em po','refresco en polvo','juguito','suco juice jugo zumo nectar']::text[], 200),
  ('Tropicana Laranja', 'Tropicana orange juice', 'Jugo de naranja Tropicana', 240, 110, 2, 26, 0, array['US','CA','GB','IE','NL','FR']::text[], array['tropicana','suco juice jugo zumo nectar']::text[], 240),
  ('Minute Maid Laranja', 'Minute Maid orange juice', 'Jugo de naranja Minute Maid', 240, 110, 1.5, 27, 0, null, array['minute maid','suco juice jugo zumo nectar']::text[], 240),
  ('Simply Orange', 'Simply Orange juice', 'Jugo Simply Orange', 240, 110, 2, 26, 0, array['US','CA']::text[], array['simply','suco juice jugo zumo nectar']::text[], 240),
  ('Ocean Spray Cranberry', 'Ocean Spray cranberry juice cocktail', 'Jugo de arándano Ocean Spray', 240, 110, 0, 28, 0, array['US','CA','GB','IE']::text[], array['ocean spray','cranberry','suco juice jugo zumo nectar']::text[], 240),
  ('Capri-Sun', 'Capri-Sun', 'Capri-Sun', 200, 70, 0, 17, 0, null, array['capri sun','suco juice jugo zumo nectar']::text[], 200),
  ('Néctar Jumex Manga', 'Jumex mango nectar', 'Néctar Jumex Mango', 335, 175, 0.5, 43, 0, array['MX','US']::text[], array['jumex','suco juice jugo zumo nectar']::text[], 335),
  ('Cepita Laranja', 'Cepita orange juice', 'Cepita Naranja', 200, 80, 0.5, 19, 0, array['AR','UY']::text[], array['cepita','suco juice jugo zumo nectar']::text[], 200),
  ('AdeS (bebida de soja com suco)', 'AdeS soy fruit drink', 'AdeS (bebida de soya)', 200, 80, 2, 16, 1, array['BR','AR','MX','CO','CL','UY','PY','BO']::text[], array['ades','a de s','suco juice jugo zumo nectar']::text[], 200),
  ('Néctar Compal', 'Compal nectar', 'Néctar Compal', 200, 95, 0.3, 22, 0, array['PT','AO','MZ']::text[], array['compal','suco juice jugo zumo nectar']::text[], 200),
  ('Água de coco Kero Coco', 'Kero Coco coconut water', 'Agua de coco Kero Coco', 330, 66, 0.5, 15, 0, array['BR']::text[], array['kero coco','kerococo','agua de coco coconut water']::text[], 330),
  ('Água de coco Obrigado', 'Obrigado coconut water', 'Agua de coco Obrigado', 330, 66, 0.5, 15, 0, array['BR']::text[], array['obrigado','agua de coco coconut water']::text[], 330),
  ('Água de coco Ducoco', 'Ducoco coconut water', 'Agua de coco Ducoco', 200, 40, 0, 9, 0, array['BR']::text[], array['ducoco','agua de coco coconut water']::text[], 200),
  ('Água de coco Vita Coco', 'Vita Coco coconut water', 'Agua de coco Vita Coco', 330, 63, 0.5, 15, 0, null, array['vita coco','vitacoco','agua de coco coconut water']::text[], 330),
  ('Red Bull', 'Red Bull', 'Red Bull', 250, 112, 0, 27, 0, null, array['redbull','energetico energy drink bebida energetica energizante']::text[], 250),
  ('Red Bull Sem Açúcar', 'Red Bull Sugarfree', 'Red Bull Sin Azúcar', 250, 8, 0, 0, 0, null, array['red bull zero','red bull sugar free','energetico energy drink bebida energetica energizante']::text[], 250),
  ('Monster Energy', 'Monster Energy', 'Monster Energy', 473, 210, 0, 54, 0, null, array['monster','energetico energy drink bebida energetica energizante']::text[], 473),
  ('Monster Ultra (zero açúcar)', 'Monster Energy Ultra (zero sugar)', 'Monster Ultra (sin azúcar)', 473, 10, 0, 3, 0, null, array['monster ultra','monster zero','monster branco','energetico energy drink bebida energetica energizante']::text[], 473),
  ('Monster Mango Loco', 'Monster Mango Loco', 'Monster Mango Loco', 473, 200, 0, 50, 0, null, array['mango loco','energetico energy drink bebida energetica energizante']::text[], 473),
  ('TNT Energy Drink', 'TNT Energy Drink', 'TNT Energy Drink', 269, 120, 0, 30, 0, array['BR']::text[], array['tnt','energetico energy drink bebida energetica energizante']::text[], 269),
  ('Fusion Energy Drink', 'Fusion Energy Drink', 'Fusion Energy Drink', 250, 112, 0, 28, 0, array['BR']::text[], array['fusion','energetico energy drink bebida energetica energizante']::text[], 250),
  ('Baly Energy Drink', 'Baly Energy Drink', 'Baly Energy Drink', 250, 110, 0, 27, 0, array['BR']::text[], array['baly','energetico energy drink bebida energetica energizante']::text[], 250),
  ('Celsius', 'Celsius', 'Celsius', 355, 10, 0, 2, 0, array['US','CA','GB','IE']::text[], array['energetico energy drink bebida energetica energizante']::text[], 355),
  ('Rockstar Energy', 'Rockstar Energy', 'Rockstar Energy', 473, 250, 0, 62, 0, array['US','CA']::text[], array['rockstar','energetico energy drink bebida energetica energizante']::text[], 473),
  ('Bang Energy', 'Bang Energy', 'Bang Energy', 473, 0, 0, 0, 0, array['US']::text[], array['bang','energetico energy drink bebida energetica energizante']::text[], 473),
  ('Gatorade', 'Gatorade', 'Gatorade', 500, 120, 0, 30, 0, null, array['gatorad','gatorate','gatoreid','isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Gatorade Zero', 'Gatorade Zero', 'Gatorade Zero', 500, 5, 0, 1, 0, null, array['gatorade sem acucar','isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Powerade', 'Powerade', 'Powerade', 500, 95, 0, 23, 0, null, array['power ade','isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Powerade Zero', 'Powerade Zero', 'Powerade Zero', 500, 0, 0, 0, 0, null, array['isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Pedialyte', 'Pedialyte', 'Pedialyte', 500, 50, 0, 12, 0, null, array['pedialite','isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Electrolit', 'Electrolit', 'Electrolit', 625, 75, 0, 18, 0, array['MX','US','CO','PE','CR','GT','PA','EC','DO']::text[], array['electrolyte mx','isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 625),
  ('Suerox', 'Suerox', 'Suerox', 630, 10, 0, 2, 0, array['MX','US']::text[], array['isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 630),
  ('Liquid I.V. (preparado)', 'Liquid I.V. (mixed)', 'Liquid I.V. (preparado)', 500, 45, 0, 11, 0, array['US','CA','GB','IE','AU']::text[], array['liquid iv','isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Prime Hydration', 'Prime Hydration', 'Prime Hydration', 500, 25, 0, 6, 0, array['US','CA','GB','IE','AU','NZ']::text[], array['prime','isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Pocari Sweat', 'Pocari Sweat', 'Pocari Sweat', 500, 125, 0, 31, 0, array['JP']::text[], array['pocari','isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Aquarius', 'Aquarius', 'Aquarius', 500, 90, 0, 22, 0, array['ES','PT','JP']::text[], array['isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Lucozade Sport', 'Lucozade Sport', 'Lucozade Sport', 500, 50, 0, 12, 0, array['GB','IE']::text[], array['isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Lucozade Energy', 'Lucozade Energy', 'Lucozade Energy', 380, 70, 0, 17, 0, array['GB','IE']::text[], array['lucozade','energetico energy drink bebida energetica energizante']::text[], 380),
  ('Soro de reidratação oral (preparado)', 'Oral rehydration solution (prepared)', 'Suero de rehidratación oral (preparado)', 500, 30, 0, 7, 0, null, array['soro oral','sro','suero oral','ors','isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 500),
  ('Soro caseiro', 'Homemade rehydration drink', 'Suero casero', 200, 30, 0, 8, 0, null, array['isotonico eletrolitos sports drink electrolyte bebida deportiva hidratante electrolitos suero']::text[], 200),
  ('Lipton Ice Tea', 'Lipton Iced Tea', 'Lipton Ice Tea', 300, 60, 0, 15, 0, null, array['lipton','ice tea','cha gelado iced tea te helado te frio']::text[], 300),
  ('Matte Leão (com açúcar)', 'Leão mate tea, sweetened', 'Matte Leão (con azúcar)', 300, 57, 0, 14, 0, array['BR']::text[], array['matte leao','leao','cha gelado iced tea te helado te frio']::text[], 300),
  ('Fuze Tea', 'Fuze Tea', 'Fuze Tea', 300, 54, 0, 13, 0, null, array['fuze','nestea','cha gelado iced tea te helado te frio']::text[], 300),
  ('AriZona Green Tea', 'AriZona Green Tea', 'AriZona Té Verde', 680, 190, 0, 48, 0, array['US','CA','GB','IE','NL']::text[], array['arizona','cha gelado iced tea te helado te frio']::text[], 680),
  ('Oi Ocha (chá verde sem açúcar)', 'Oi Ocha green tea (unsweetened)', 'Oi Ocha (té verde sin azúcar)', 525, 0, 0, 0, 0, array['JP']::text[], array['oi ocha','ocha','cha gelado iced tea te helado te frio']::text[], 525),
  ('Calpis Water', 'Calpis Water', 'Calpis Water', 500, 225, 0.5, 55, 0, array['JP']::text[], array['calpis','suco juice jugo zumo nectar']::text[], 500)

) as v(nome, nome_en, nome_es, porcao_g, calorias, proteina, carboidrato, gordura, regioes, aliases, porcao_tipica_g)
where not exists (
  select 1 from public.alimentos a where public.normalizar_texto(a.nome) = public.normalizar_texto(v.nome)
);

-- Apelidos nas bebidas genéricas que já existiam, pra "refri", "coca" e
-- afins também acharem o genérico quando a marca não importa.
update public.alimentos set aliases = array['refri de cola', 'refrigerante tipo cola']
  where nome in ('Refrigerante cola', 'Refrigerante cola comum') and aliases = '{}';
update public.alimentos set aliases = array['isotonico generico', 'bebida esportiva']
  where nome = 'Isotônico' and aliases = '{}';
