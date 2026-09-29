-- ATHOSlife — Hábitos: lista de bloqueio ampliada (2026-09-29)
--
-- Dono confirmou o bloqueio de conteúdo sexual "e qualquer coisa próxima"
-- disso. Aproveitado para fechar brechas das outras categorias:
--   álcool: drinks, happy hour, coquetel, open bar, bebedeira
--   tabaco: fumante, tabagismo, pod de nicotina
--   drogas: THC/CBD, haxixe, ayahuasca, cogumelo mágico, poppers, opioides e
--           remédio controlado (rivotril, zolpidem, ritalina, venvanse...)
--   apostas: casas de aposta, roleta, pôquer, caça-níquel, loteria, raspadinha
--   sexual: sexo, nudes, OnlyFans, NoFap, fetiche, prostituição, apps de
--           encontro (Tinder/Grindr), Viagra
--
-- Seguem de fora de propósito (bloqueariam hábito saudável): beber, drink,
-- erva, trago, pod, baseado, saque, lean, pó, cheirar, balada, motel.
-- Hábito já existente com nome que passou a ser proibido NÃO é apagado:
-- o trigger só roda em insert / update de nome ou ativo.
-- Espelho no app: domain/entities/habito.ts (TERMOS_PROIBIDOS) — manter igual.

create or replace function public.habito_nome_proibido(p_nome text)
returns boolean
language sql
immutable
as $$
  select public.normalizar_texto(p_nome) ~ (
    '\m(' ||
    -- álcool
    'cerveja|cervejas|breja|chopp|chope|alcool|alcoolica|alcoolicas|alcoolico|bebida alcoolica|' ||
    'bebidas alcoolicas|vinho|vinhos|vodka|vodca|whisky|whiskey|uisque|cachaca|pinga|caipirinha|' ||
    'caipiroska|tequila|gin|rum|licor|espumante|champagne|champanhe|sake|conhaque|absinto|cerveza|' ||
    'cervezas|vino|vinos|borrachera|beer|beers|alcohol|alcoholic|wine|liquor|booze|drunk|bebado|' ||
    'bebada|embriagar|ressaca|hangover|drinks|bebedeira|happy hour|cocktail|coquetel|open bar|' ||
    -- tabaco / nicotina
    'cigarro|cigarros|cigarrinho|fumar|fumo|fumando|fumante|tabagismo|tabaco|nicotina|vape|vapes|' ||
    'vaper|cigarro eletronico|pod de nicotina|narguile|charuto|charutos|palheiro|cigarrillo|' ||
    'cigarrillos|cigarette|cigarettes|smoking|smoke|tobacco|cigar|cigars|hookah|shisha|juul|snus|' ||
    -- drogas e remédio controlado
    'maconha|cannabis|marijuana|marihuana|weed|thc|cbd|haxixe|hashish|skunk|cocaina|cocaine|crack|' ||
    'droga|drogas|drug|drugs|entorpecente|entorpecentes|estupefaciente|heroina|heroin|metanfetamina|' ||
    'meth|ecstasy|mdma|bala de festa|lsd|cetamina|ketamine|lanca perfume|lolo|poppers|ayahuasca|' ||
    'psilocibina|cogumelo magico|magic mushrooms|kratom|opioide|opioides|opioid|opioids|codeina|' ||
    'codeine|oxicodona|oxycodone|fentanil|fentanyl|tramadol|anfetamina|anfetaminas|amphetamine|' ||
    'ritalina|venvanse|adderall|rivotril|clonazepam|zolpidem|benzo|benzodiazepina|benzodiazepinico|' ||
    'porro|porros|' ||
    -- apostas e jogos de azar
    'aposta|apostas|apostar|apostador|apuestas|bet|bets|betano|bet365|sportingbet|sports betting|' ||
    'cassino|casino|gambling|jogo de azar|jogos de azar|juegos de azar|jogo do bicho|tigrinho|' ||
    'fortune tiger|aviator|blaze|roleta|poker|poquer|slot|slots|caca niquel|caca niqueis|loteria|' ||
    'loterias|mega sena|raspadinha|raspadinhas|bingo|' ||
    -- conteúdo e vida sexual
    'pornografia|porno|porn|pornhub|xvideos|xxx|nsfw|hentai|onlyfans|putaria|masturbacao|masturbar|' ||
    'masturbarse|masturbation|masturbate|punheta|siririca|nofap|no fap|fap|sexo|sex|sexual|sexuais|' ||
    'sexting|nudes|nude|nudez|desnudo|desnuda|erotico|erotica|fetiche|fetish|tesao|ejacular|' ||
    'ejaculacao|ejaculation|retencao de semen|semen|prostituicao|prostituta|prostitution|' ||
    'garota de programa|camgirl|orgia|tinder|grindr|viagra|sildenafila|tadalafila' ||
    ')\M'
  );
$$;
