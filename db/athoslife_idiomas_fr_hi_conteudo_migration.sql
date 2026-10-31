-- ATHOSlife — francês (fr) e hindi (hi) no conteúdo do banco (dono, 28/10).
-- Soma as chaves "fr" e "hi" nas traduções que já existem (en/es), sem
-- mexer nelas. Rodar de novo é seguro (sobrescreve só fr/hi).
-- Partes: conquistas, exercícios, receitas e a função do modo de preparo.

begin;

-- ---------------------------------------------------------------- conquistas
update public.conquistas_catalogo c
set traducoes = coalesce(c.traducoes, '{}'::jsonb)
  || jsonb_build_object(
       'fr', jsonb_build_object('nome', v.fr_nome, 'descricao', v.fr_desc),
       'hi', jsonb_build_object('nome', v.hi_nome, 'descricao', v.hi_desc))
from (values
  ('atleta_athos', 'Athlète Athos', '50 séances terminées', 'Athos एथलीट', '50 वर्कआउट पूरे'),
  ('bem_hidratado', 'Bien hydraté', 'Objectif d’eau atteint 3 jours d’affilée', 'अच्छी तरह हाइड्रेटेड', 'लगातार 3 दिन पानी का लक्ष्य पूरा'),
  ('cem_dias', '100 jours Élite', '100 jours d’affilée', '100 दिन एलीट', 'लगातार 100 दिन'),
  ('dia_perfeito', 'Journée parfaite', '4 repas en 1 jour', 'परफ़ेक्ट दिन', '1 दिन में 4 बार खाना दर्ज'),
  ('duas_semanas', 'Deux semaines inarrêtable', '14 jours d’affilée', 'दो हफ़्ते, नॉन-स्टॉप', 'लगातार 14 दिन'),
  ('inabalavel', 'Inébranlable', '30 séances en 30 jours', 'अडिग', '30 दिन में 30 वर्कआउट'),
  ('macros_no_alvo', 'Macros dans le mille', 'Toutes les macros dans l’objectif pendant 14 jours', 'मैक्रो निशाने पर', '14 दिन तक सारे मैक्रो लक्ष्य में'),
  ('mes_de_ferro', 'Mois de fer', '20 séances terminées', 'लोहे का महीना', '20 वर्कआउट पूरे'),
  ('mes_disciplinado', 'Mois discipliné', 'Tous les repas notés pendant 30 jours', 'अनुशासित महीना', '30 दिन तक हर खाना दर्ज'),
  ('mestre_hidratacao', 'Maître de l’hydratation', 'Objectif d’eau atteint 7 jours d’affilée', 'हाइड्रेशन मास्टर', 'लगातार 7 दिन पानी का लक्ष्य पूरा'),
  ('meta_alcancada', 'Objectif atteint', 'Atteindre le poids cible fixé au départ', 'लक्ष्य हासिल', 'शुरुआत में तय किया वज़न पा लिया'),
  ('meta_proteina', 'Objectif protéines', 'Objectif de protéines atteint 5 jours d’affilée', 'प्रोटीन लक्ष्य', 'लगातार 5 दिन प्रोटीन का लक्ष्य पूरा'),
  ('monitor_fiel', 'Suivi fidèle', 'Noter son poids 4 semaines d’affilée', 'पक्का ट्रैकर', 'लगातार 4 हफ़्ते वज़न दर्ज'),
  ('oceano', 'Océan', 'Objectif d’eau atteint 21 jours d’affilée', 'सागर', 'लगातार 21 दिन पानी का लक्ष्य पूरा'),
  ('pegando_ritmo', 'Trouver le rythme', '3 jours d’affilée dans l’app', 'रफ़्तार पकड़ी', 'ऐप में लगातार 3 दिन'),
  ('primeira_gota', 'Première goutte', 'Noter de l’eau pour la première fois', 'पहली बूँद', 'पहली बार पानी दर्ज किया'),
  ('primeira_refeicao', 'Premier repas', 'Noter 1 repas', 'पहला खाना', '1 खाना दर्ज किया'),
  ('primeiro_passo', 'Premier pas', 'Ouvrir l’app pour la première fois', 'पहला कदम', 'पहली बार ऐप खोला'),
  ('primeiro_registro_peso', 'Première pesée', 'Noter son poids pour la première fois', 'पहला वज़न', 'पहली बार वज़न दर्ज किया'),
  ('primeiro_suor', 'Première sueur', 'Terminer 1 séance', 'पहला पसीना', '1 वर्कआउट पूरा'),
  ('semana_limpa', 'Semaine nickel', 'Tous les repas notés pendant 7 jours', 'साफ़-सुथरा हफ़्ता', '7 दिन तक हर खाना दर्ज'),
  ('sete_treinos', '7 jours d’entraînement', '7 séances terminées', '7 दिन वर्कआउट', '7 वर्कआउट पूरे'),
  ('transformacao', 'Transformation', 'Perdre ou prendre 3 kg', 'बदलाव', '3 kg घटाया या बढ़ाया'),
  ('tres_treinos_semana', '3 séances dans la semaine', '3 séances en 7 jours', 'हफ़्ते में 3 वर्कआउट', '7 दिन में 3 वर्कआउट'),
  ('trinta_dias', '30 jours Légendaire', '30 jours d’affilée', '30 दिन लेजेंडरी', 'लगातार 30 दिन'),
  ('uma_semana_forte', 'Une semaine solide', '7 jours d’affilée', 'एक दमदार हफ़्ता', 'लगातार 7 दिन')
) as v(id, fr_nome, fr_desc, hi_nome, hi_desc)
where c.id = v.id;

-- ---------------------------------------------------------------- exercícios
-- Chave: o nome em inglês (estável; evita depender dos uuid gerados).
-- Hindi: nome como se fala na academia indiana (inglês em devanágari).
update public.exercicios_catalogo e
set traducoes = coalesce(e.traducoes, '{}'::jsonb)
  || jsonb_build_object(
       'fr', jsonb_strip_nulls(jsonb_build_object('nome', v.fr_nome,
               'como_executar', case when v.fr_c1 is not null then jsonb_build_array(v.fr_c1, v.fr_c2) end,
               'musculos_trabalhados', v.fr_m)),
       'hi', jsonb_strip_nulls(jsonb_build_object('nome', v.hi_nome,
               'como_executar', case when v.hi_c1 is not null then jsonb_build_array(v.hi_c1, v.hi_c2) end,
               'musculos_trabalhados', v.hi_m)))
from (values
  ('Single-Arm Cable Triceps Extension', 'Extension triceps à la poulie, un bras', 'सिंगल-आर्म केबल ट्राइसेप्स एक्सटेंशन', null, null, null, null, null, null),
  ('Cable Pullover', 'Pull-over à la poulie', 'केबल पुलओवर',
    'Face à la poulie haute, bras tendus et buste légèrement penché en avant.', 'Descends la barre jusqu’aux cuisses en gardant les coudes légèrement fléchis.', 'Travaille le grand dorsal, avec l’accent sur l’extension de l’épaule.',
    'हाई पुली की तरफ़ मुँह करें, बाँहें सीधी और धड़ थोड़ा आगे झुका हुआ।', 'कोहनी हल्की मुड़ी रखते हुए बार को जाँघों तक नीचे लाएँ।', 'लैट्स पर काम करता है, ख़ासकर कंधे के एक्सटेंशन पर।'),
  ('Cable Crunch', 'Crunch à la poulie', 'केबल क्रंच', null, null, null, null, null, null),
  ('Concentration Curl', 'Curl concentré', 'कॉन्सन्ट्रेशन कर्ल', null, null, null, null, null, null),
  ('Cable Lateral Raise', 'Élévation latérale à la poulie', 'केबल लेटरल रेज़', null, null, null, null, null, null),
  ('Russian Twist', 'Rotation russe', 'रशियन ट्विस्ट', null, null, null, null, null, null),
  ('Alternating Dumbbell Curl', 'Curl alterné aux haltères', 'ऑल्टरनेटिंग डंबल कर्ल', null, null, null, null, null, null),
  ('Cable Upright Row', 'Tirage menton à la poulie', 'केबल अपराइट रो', null, null, null, null, null, null),
  ('Cable Curl', 'Curl à la poulie', 'केबल कर्ल', null, null, null, null, null, null),
  ('Mountain Climber', 'Mountain climber', 'माउंटेन क्लाइंबर', null, null, null, null, null, null),
  ('Cable Hip Abduction', 'Abduction de hanche à la poulie', 'केबल हिप एब्डक्शन', null, null, null, null, null, null),
  ('Lying Leg Curl', 'Leg curl allongé', 'लाइंग लेग कर्ल',
    'Allonge-toi sur le ventre, aligne les genoux et place les chevilles sous le boudin.', 'Plie les genoux en ramenant les talons vers les fessiers, puis reviens.', 'Travaille les ischio-jambiers, avec l’aide des mollets.',
    'पेट के बल लेटें, घुटने सीध में रखें और टखने पैड के नीचे।', 'घुटने मोड़कर एड़ियों को ग्लूट्स की तरफ़ लाएँ और वापस जाएँ।', 'हैमस्ट्रिंग पर काम करता है, पिंडलियों की मदद से।'),
  ('Hip Abduction Machine', 'Machine à abducteurs', 'हिप एब्डक्शन मशीन',
    'Assieds-toi le dos calé, genoux serrés contre les coussins.', 'Écarte les genoux sans décoller les pieds et reviens en contrôlant.', 'Travaille les fessiers, surtout le côté des hanches.',
    'पीठ टिकाकर बैठें, घुटने पैड से सटे हुए।', 'पैर उठाए बिना घुटने बाहर खोलें और कंट्रोल से वापस लाएँ।', 'ग्लूट्स पर, ख़ासकर कूल्हों के किनारे पर काम करता है।'),
  ('Leg Raise', 'Relevé de jambes', 'लेग रेज़', null, null, null, null, null, null),
  ('Seated Leg Curl', 'Leg curl assis', 'सीटेड लेग कर्ल',
    'Assieds-toi le dos calé, jambes tendues et chevilles sur le boudin.', 'Ramène le boudin vers l’arrière avec les talons et reviens lentement.', 'Travaille les ischio-jambiers, avec l’aide des mollets.',
    'पीठ टिकाकर बैठें, पैर सीधे और टखने पैड पर।', 'एड़ियों से पैड को पीछे खींचें और धीरे वापस जाएँ।', 'हैमस्ट्रिंग पर काम करता है, पिंडलियों की मदद से।'),
  ('Barbell Curl', 'Curl à la barre', 'बारबेल कर्ल', null, null, null, null, null, null),
  ('Standing Calf Raise', 'Mollets debout', 'स्टैंडिंग काफ़ रेज़',
    'Épaules sous les coussins, avant des pieds sur la plateforme, corps bien droit.', 'Monte sur la pointe des pieds, contracte les mollets et redescends lentement.', 'Travaille surtout le gastrocnémien, en haut du mollet.',
    'कंधे पैड के नीचे, पंजे प्लेटफ़ॉर्म पर और शरीर सीधा।', 'पंजों पर ऊपर उठें, पिंडलियाँ कसें और धीरे नीचे आएँ।', 'मुख्य रूप से पिंडली के ऊपरी हिस्से (गैस्ट्रोक्नेमियस) पर काम करता है।'),
  ('Flat Dumbbell Fly', 'Écarté couché aux haltères', 'फ़्लैट डंबल फ़्लाई',
    'Allongé sur le banc, haltères au-dessus de la poitrine, coudes légèrement fléchis.', 'Ouvre les bras jusqu’à sentir l’étirement et reviens en serrant les pectoraux.', 'Travaille les pectoraux, avec l’accent sur l’intérieur.',
    'बेंच पर लेटें, डंबल छाती के ऊपर और कोहनी हल्की मुड़ी।', 'खिंचाव महसूस होने तक बाँहें खोलें और छाती कसते हुए वापस लाएँ।', 'छाती पर, ख़ासकर अंदरूनी हिस्से पर काम करता है।'),
  ('Push-up', 'Pompes', 'पुश-अप',
    'Mains au sol, bras tendus et corps bien aligné.', 'Descends la poitrine en contrôlant et pousse le sol pour remonter.', 'Travaille pectoraux, épaules et triceps au poids du corps.',
    'हाथ ज़मीन पर, बाँहें सीधी और शरीर एक सीध में।', 'कंट्रोल से छाती नीचे लाएँ और ज़मीन को धकेलकर ऊपर आएँ।', 'शरीर के वज़न से छाती, कंधे और ट्राइसेप्स पर काम करता है।'),
  ('Neutral-Grip Pull-up', 'Traction prise neutre', 'न्यूट्रल-ग्रिप पुल-अप', null, null, null, null, null, null),
  ('Machine Shoulder Press', 'Développé épaules à la machine', 'मशीन शोल्डर प्रेस', null, null, null, null, null, null),
  ('Sissy Squat', 'Sissy squat', 'सिसी स्क्वैट', null, null, null, null, null, null),
  ('Machine Lateral Raise', 'Élévation latérale à la machine', 'मशीन लेटरल रेज़', null, null, null, null, null, null),
  ('Front Raise', 'Élévation frontale', 'फ़्रंट रेज़',
    'Haltères devant les cuisses, bras tendus et buste gainé.', 'Monte les bras devant toi jusqu’à hauteur d’épaules et redescends lentement.', 'Travaille surtout l’avant des épaules.',
    'डंबल जाँघों के सामने, बाँहें सीधी और धड़ मज़बूत।', 'बाँहें सामने कंधे की ऊँचाई तक उठाएँ और धीरे नीचे लाएँ।', 'मुख्य रूप से कंधों के अगले हिस्से पर काम करता है।'),
  ('Stiff-Leg Deadlift', 'Soulevé de terre jambes tendues', 'स्टिफ़-लेग डेडलिफ़्ट', null, null, null, null, null, null),
  ('Glute Machine', 'Machine à fessiers', 'ग्लूट मशीन', null, null, null, null, null, null),
  ('Incline Dumbbell Press', 'Développé incliné aux haltères', 'इनक्लाइन डंबल प्रेस',
    'Haltères près de la poitrine, banc incliné et coudes fléchis.', 'Pousse les haltères jusqu’à tendre les bras, en les rapprochant sans les cogner.', 'Travaille le haut des pectoraux, les épaules et les triceps.',
    'डंबल छाती के पास, बेंच इनक्लाइन और कोहनी मुड़ी।', 'बाँहें सीधी होने तक डंबल ऊपर धकेलें, बिना टकराए पास लाएँ।', 'ऊपरी छाती, कंधे और ट्राइसेप्स पर काम करता है।'),
  ('Stability Ball Knee Tuck', 'Ramené de genoux sur ballon', 'स्टेबिलिटी बॉल नी टक', null, null, null, null, null, null),
  ('Hip Adduction Machine', 'Machine à adducteurs', 'हिप एडक्शन मशीन', null, null, null, null, null, null),
  ('Parallel Bar Dips', 'Dips aux barres parallèles', 'पैरेलल बार डिप्स', null, null, null, null, null, null),
  ('Oblique Crunch', 'Crunch oblique', 'ऑब्लीक क्रंच', null, null, null, null, null, null),
  ('T-Bar Row', 'Rowing T-bar', 'टी-बार रो', null, null, null, null, null, null),
  ('Barbell Bench Press', 'Développé couché à la barre', 'बारबेल बेंच प्रेस',
    'Allongé sur le banc, pieds bien au sol, mains sur la barre un peu plus écartées que les épaules.', 'Pousse la barre jusqu’à tendre les bras, en gardant le mouvement contrôlé.', 'Travaille le milieu des pectoraux, avec l’aide des épaules et des triceps.',
    'बेंच पर लेटें, पैर ज़मीन पर जमे हुए और हाथ बार पर कंधों से थोड़े चौड़े।', 'कंट्रोल रखते हुए बाँहें सीधी होने तक बार ऊपर धकेलें।', 'छाती के बीच वाले हिस्से पर, कंधों और ट्राइसेप्स की मदद से।'),
  ('Dumbbell Pullover', 'Pull-over à l’haltère', 'डंबल पुलओवर', null, null, null, null, null, null),
  ('Close-Grip Bench Press', 'Développé couché prise serrée', 'क्लोज़-ग्रिप बेंच प्रेस', null, null, null, null, null, null),
  ('Preacher Curl', 'Curl au pupitre', 'प्रीचर कर्ल', null, null, null, null, null, null),
  ('Single-Arm Pulldown', 'Tirage vertical un bras', 'सिंगल-आर्म पुलडाउन', null, null, null, null, null, null),
  ('Pull-up', 'Traction', 'पुल-अप',
    'Prends la barre en prise large, bras tendus et corps stable.', 'Tire-toi jusqu’à ce que la poitrine approche la barre et redescends en contrôlant.', 'Travaille le dos, surtout le grand dorsal, plus les biceps.',
    'चौड़ी पकड़ से बार पकड़ें, बाँहें सीधी और शरीर स्थिर।', 'छाती बार के पास आने तक ख़ुद को ऊपर खींचें और कंट्रोल से नीचे आएँ।', 'पीठ पर, ख़ासकर लैट्स पर, और बाइसेप्स पर काम करता है।'),
  ('Machine Pulldown', 'Tirage vertical à la machine', 'मशीन पुलडाउन',
    'Assieds-toi le dos calé, bras tendus sur les poignées.', 'Tire les poignées vers le bas en ramenant les coudes vers le buste.', 'Travaille le dos, avec l’accent sur le grand dorsal et le milieu du dos.',
    'पीठ टिकाकर बैठें, बाँहें हैंडल पर सीधी।', 'कोहनियों को धड़ की तरफ़ लाते हुए हैंडल नीचे खींचें।', 'पीठ पर, ख़ासकर लैट्स और बीच की पीठ पर काम करता है।'),
  ('Side Plank', 'Gainage latéral', 'साइड प्लैंक', null, null, null, null, null, null),
  ('Leg Press Calf Raise', 'Mollets à la presse', 'लेग प्रेस काफ़ रेज़', null, null, null, null, null, null),
  ('Bicycle Crunch', 'Crunch vélo', 'बाइसिकल क्रंच', null, null, null, null, null, null),
  ('Pec Deck', 'Pec deck', 'पेक डेक',
    'Assieds-toi le dos calé, bras ouverts sur la machine.', 'Rapproche les bras devant toi en serrant les pectoraux.', 'Isole les pectoraux, avec l’accent sur l’intérieur.',
    'पीठ टिकाकर बैठें, बाँहें मशीन पर खुली।', 'छाती कसते हुए बाँहें सामने पास लाएँ।', 'छाती को अलग से, ख़ासकर अंदरूनी हिस्से को टारगेट करता है।'),
  ('Dumbbell Sumo Squat', 'Squat sumo à l’haltère', 'डंबल सूमो स्क्वैट', null, null, null, null, null, null),
  ('Bulgarian Split Squat', 'Squat bulgare', 'बल्गेरियन स्प्लिट स्क्वैट',
    'Pose un pied sur le banc derrière toi et garde l’autre bien au sol.', 'Descends en gardant le genou avant aligné et remonte en contrôlant.', 'Travaille quadriceps et fessiers, une jambe à la fois.',
    'एक पैर पीछे बेंच पर रखें और दूसरा ज़मीन पर जमाएँ।', 'आगे वाला घुटना सीध में रखकर नीचे जाएँ और कंट्रोल से ऊपर आएँ।', 'क्वाड्स और ग्लूट्स पर, एक-एक पैर पर फ़ोकस के साथ।'),
  ('Bench Dips', 'Dips sur banc', 'बेंच डिप्स', null, null, null, null, null, null),
  ('Neutral-Grip Pulldown', 'Tirage vertical prise neutre', 'न्यूट्रल-ग्रिप पुलडाउन', null, null, null, null, null, null),
  ('V-up', 'V-up', 'वी-अप', null, null, null, null, null, null),
  ('Decline Push-up', 'Pompes déclinées', 'डिक्लाइन पुश-अप', null, null, null, null, null, null),
  ('Front Plank', 'Gainage', 'फ़्रंट प्लैंक', null, null, null, null, null, null),
  ('Lat Pulldown', 'Tirage vertical', 'लैट पुलडाउन',
    'Prends la barre en prise large, buste droit et bras tendus.', 'Tire la barre vers la poitrine en serrant les omoplates.', 'Travaille le dos, surtout le grand dorsal et les biceps.',
    'चौड़ी पकड़ से बार पकड़ें, धड़ सीधा और बाँहें सीधी।', 'कंधे की हड्डियाँ (शोल्डर ब्लेड) कसते हुए बार छाती तक खींचें।', 'पीठ पर, ख़ासकर लैट्स और बाइसेप्स पर काम करता है।'),
  ('Cable Crossover', 'Écarté à la poulie vis-à-vis', 'केबल क्रॉसओवर',
    'Place-toi entre les poulies, buste légèrement en avant et bras ouverts.', 'Tire les poignées vers l’avant et rapproche les mains en serrant les pectoraux.', 'Travaille les pectoraux, avec l’accent sur la contraction.',
    'दोनों पुली के बीच खड़े हों, धड़ थोड़ा आगे और बाँहें खुली।', 'हैंडल आगे खींचें और छाती कसते हुए हाथ पास लाएँ।', 'छाती पर, ख़ासकर कसाव (स्क्वीज़) पर काम करता है।'),
  ('Reverse Lunge', 'Fente arrière', 'रिवर्स लंज', null, null, null, null, null, null),
  ('Farmer''s Walk', 'Marche du fermier', 'फ़ार्मर्स वॉक', null, null, null, null, null, null),
  ('Leg Extension', 'Leg extension', 'लेग एक्सटेंशन',
    'Assieds-toi le dos calé, tibias derrière le boudin de la machine.', 'Tends les genoux sans les verrouiller et redescends la charge en contrôlant.', 'Travaille surtout les quadriceps, à l’avant des cuisses.',
    'पीठ टिकाकर बैठें, पिंडलियाँ मशीन के पैड के पीछे।', 'घुटने लॉक किए बिना सीधे करें और कंट्रोल से वज़न नीचे लाएँ।', 'मुख्य रूप से जाँघ के अगले हिस्से (क्वाड्स) पर काम करता है।'),
  ('Seated Calf Raise', 'Mollets assis', 'सीटेड काफ़ रेज़',
    'Assieds-toi, genoux sous le coussin et avant des pieds sur la plateforme.', 'Monte les talons le plus haut possible et redescends en contrôlant.', 'Travaille surtout le soléaire, en bas du mollet.',
    'घुटने पैड के नीचे और पंजे प्लेटफ़ॉर्म पर रखकर बैठें।', 'एड़ियाँ जितना हो सके ऊपर उठाएँ और कंट्रोल से नीचे लाएँ।', 'मुख्य रूप से पिंडली के निचले हिस्से (सोलियस) पर काम करता है।'),
  ('Hammer Curl', 'Curl marteau', 'हैमर कर्ल', null, null, null, null, null, null),
  ('Dumbbell Shrug', 'Shrug aux haltères', 'डंबल श्रग',
    'Debout, haltères le long du corps et épaules relâchées.', 'Monte les épaules vers les oreilles et redescends en contrôlant.', 'Travaille surtout les trapèzes, en haut du dos.',
    'डंबल बगल में रखकर खड़े हों, कंधे ढीले।', 'कंधों को कानों की तरफ़ उठाएँ और कंट्रोल से नीचे लाएँ।', 'मुख्य रूप से ऊपरी पीठ के ट्रैप्स पर काम करता है।'),
  ('Cable Hip Extension', 'Extension de hanche à la poulie', 'केबल हिप एक्सटेंशन', null, null, null, null, null, null),
  ('Barbell Back Squat', 'Squat à la barre', 'बारबेल बैक स्क्वैट',
    'Barre posée sur les épaules, pieds écartés et dos neutre.', 'Descends en pliant hanches et genoux, puis remonte en poussant le sol.', 'Travaille quadriceps, fessiers et ischio-jambiers.',
    'बार कंधों पर, पैर खुले और रीढ़ सीधी (न्यूट्रल)।', 'कूल्हे और घुटने मोड़कर नीचे जाएँ और ज़मीन धकेलकर ऊपर आएँ।', 'क्वाड्स, ग्लूट्स और हैमस्ट्रिंग पर काम करता है।'),
  ('Reverse Curl', 'Curl prise inversée', 'रिवर्स कर्ल', null, null, null, null, null, null),
  ('Ab Crunch Machine', 'Machine à abdos', 'एब क्रंच मशीन', null, null, null, null, null, null),
  ('Hack Squat', 'Hack squat', 'हैक स्क्वैट',
    'Dos et épaules calés contre les coussins, pieds sur la plateforme, dos neutre.', 'Descends en contrôlant et pousse la plateforme sans verrouiller les genoux.', 'Travaille quadriceps et fessiers, avec l’aide des ischio-jambiers.',
    'पीठ और कंधे पैड से टिकाएँ, पैर प्लेटफ़ॉर्म पर और रीढ़ सीधी।', 'कंट्रोल से नीचे जाएँ और घुटने लॉक किए बिना प्लेटफ़ॉर्म धकेलें।', 'क्वाड्स और ग्लूट्स पर, हैमस्ट्रिंग की मदद से।'),
  ('Rope Triceps Pushdown', 'Extension triceps à la corde', 'रोप ट्राइसेप्स पुशडाउन', null, null, null, null, null, null),
  ('Machine Rear Delt Fly', 'Oiseau à la machine', 'मशीन रियर डेल्ट फ़्लाई', null, null, null, null, null, null),
  ('Front Squat', 'Squat avant', 'फ़्रंट स्क्वैट', null, null, null, null, null, null),
  ('Diamond Push-up', 'Pompes diamant', 'डायमंड पुश-अप', null, null, null, null, null, null),
  ('Barbell Good Morning', 'Good morning à la barre', 'बारबेल गुड मॉर्निंग', null, null, null, null, null, null),
  ('Skull Crusher', 'Barre au front', 'स्कल क्रशर', null, null, null, null, null, null),
  ('Burpee', 'Burpee', 'बर्पी', null, null, null, null, null, null),
  ('Hip Thrust', 'Hip thrust', 'हिप थ्रस्ट',
    'Haut du dos contre le banc, genoux fléchis et barre sur les hanches.', 'Monte les hanches en serrant les fessiers et redescends en contrôlant.', 'Travaille surtout les fessiers, avec l’aide des ischio-jambiers.',
    'ऊपरी पीठ बेंच पर टिकाएँ, घुटने मोड़ें और बार कूल्हों पर रखें।', 'ग्लूट्स कसते हुए कूल्हे ऊपर उठाएँ और कंट्रोल से नीचे लाएँ।', 'मुख्य रूप से ग्लूट्स पर, हैमस्ट्रिंग की मदद से।'),
  ('Barbell Bent-Over Row', 'Rowing barre buste penché', 'बारबेल बेंट-ओवर रो',
    'Penche le buste en avant, dos neutre et barre sous les épaules.', 'Tire la barre vers le ventre en gardant les coudes près du corps.', 'Travaille le dos, avec l’accent sur le grand dorsal et le milieu du dos.',
    'धड़ आगे झुकाएँ, रीढ़ सीधी और बार कंधों के नीचे।', 'कोहनियाँ पास रखते हुए बार पेट की तरफ़ खींचें।', 'पीठ पर, ख़ासकर लैट्स और बीच की पीठ पर काम करता है।'),
  ('Dumbbell Reverse Fly', 'Oiseau aux haltères', 'डंबल रिवर्स फ़्लाई',
    'Penche le buste en avant, dos neutre et haltères sous les épaules.', 'Monte les bras sur les côtés et reviens lentement, sans élan.', 'Travaille l’arrière des épaules et le haut du dos.',
    'धड़ आगे झुकाएँ, रीढ़ सीधी और डंबल कंधों के नीचे।', 'बाँहें बगल में उठाएँ और बिना झटके के धीरे वापस लाएँ।', 'कंधों के पिछले हिस्से और ऊपरी पीठ पर काम करता है।'),
  ('Converging Machine Press', 'Développé convergent à la machine', 'कन्वर्जिंग मशीन प्रेस', null, null, null, null, null, null),
  ('One-Arm Dumbbell Row', 'Rowing haltère un bras', 'वन-आर्म डंबल रो',
    'Une main et un genou sur le banc, dos neutre, haltère en suspension.', 'Tire l’haltère vers les côtes et redescends en contrôlant.', 'Travaille le grand dorsal, les rhomboïdes et l’arrière des épaules.',
    'एक हाथ और एक घुटना बेंच पर, रीढ़ सीधी और डंबल लटका हुआ।', 'डंबल पसलियों की तरफ़ खींचें और कंट्रोल से नीचे लाएँ।', 'लैट्स, रॉमबॉइड्स और कंधों के पिछले हिस्से पर काम करता है।'),
  ('Chin-up', 'Traction supination', 'चिन-अप', null, null, null, null, null, null),
  ('Dumbbell Triceps Kickback', 'Kickback triceps à l’haltère', 'डंबल ट्राइसेप्स किकबैक', null, null, null, null, null, null),
  ('Cable Hip Adduction', 'Adduction de hanche à la poulie', 'केबल हिप एडक्शन', null, null, null, null, null, null),
  ('Decline Bench Press', 'Développé décliné', 'डिक्लाइन बेंच प्रेस',
    'Allongé sur le banc décliné, pieds calés et barre alignée au-dessus de la poitrine.', 'Descends la barre en contrôlant jusqu’à la poitrine et pousse-la vers le haut.', 'Travaille le bas des pectoraux, avec l’aide des épaules et des triceps.',
    'डिक्लाइन बेंच पर लेटें, पैर फँसे हुए और बार छाती के ऊपर सीध में।', 'कंट्रोल से बार छाती तक लाएँ और ऊपर धकेलें।', 'निचली छाती पर, कंधों और ट्राइसेप्स की मदद से।'),
  ('Cable Triceps Pushdown', 'Extension triceps à la poulie', 'केबल ट्राइसेप्स पुशडाउन', null, null, null, null, null, null),
  ('Dumbbell Shoulder Press', 'Développé épaules aux haltères', 'डंबल शोल्डर प्रेस',
    'Haltères à hauteur d’épaules, coudes fléchis et buste gainé.', 'Pousse les haltères vers le haut sans verrouiller les coudes et reviens.', 'Travaille les épaules, avec l’aide des triceps.',
    'डंबल कंधे की ऊँचाई पर, कोहनी मुड़ी और धड़ मज़बूत।', 'कोहनी लॉक किए बिना डंबल ऊपर धकेलें और वापस लाएँ।', 'कंधों पर, ट्राइसेप्स की मदद से।'),
  ('Nordic Curl', 'Nordic curl', 'नॉर्डिक कर्ल', null, null, null, null, null, null),
  ('45° Leg Press', 'Presse à cuisses 45°', '45° लेग प्रेस',
    'Dos calé, pieds sur la plateforme et genoux fléchis.', 'Pousse la plateforme sans verrouiller les genoux et reviens en contrôlant.', 'Travaille quadriceps, fessiers et ischio-jambiers.',
    'पीठ टिकाएँ, पैर प्लेटफ़ॉर्म पर और घुटने मुड़े।', 'घुटने लॉक किए बिना प्लेटफ़ॉर्म धकेलें और कंट्रोल से वापस आएँ।', 'क्वाड्स, ग्लूट्स और हैमस्ट्रिंग पर काम करता है।'),
  ('Face Pull', 'Face pull', 'फ़ेस पुल',
    'Tiens la corde à hauteur du visage, bras tendus et buste gainé.', 'Tire la corde vers le visage en ouvrant les coudes, puis reviens.', 'Travaille l’arrière des épaules et les muscles du haut du dos.',
    'रस्सी चेहरे की ऊँचाई पर पकड़ें, बाँहें सीधी और धड़ मज़बूत।', 'कोहनियाँ बाहर खोलते हुए रस्सी चेहरे की तरफ़ खींचें और वापस जाएँ।', 'कंधों के पिछले हिस्से और ऊपरी पीठ की मांसपेशियों पर काम करता है।'),
  ('Cable Glute Kickback', 'Kickback fessier à la poulie', 'केबल ग्लूट किकबैक',
    'Tiens le support, buste gainé et câble attaché à la cheville.', 'Pousse la jambe vers l’arrière en serrant le fessier et reviens lentement.', 'Travaille surtout les fessiers, avec l’aide des ischio-jambiers.',
    'सहारा पकड़ें, धड़ मज़बूत रखें और केबल टखने से बँधी हो।', 'ग्लूट कसते हुए पैर पीछे धकेलें और धीरे वापस लाएँ।', 'मुख्य रूप से ग्लूट्स पर, हैमस्ट्रिंग की मदद से।'),
  ('Machine Row', 'Rowing à la machine', 'मशीन रो', null, null, null, null, null, null),
  ('Back Extension (Roman Chair)', 'Extension lombaire (banc à lombaires)', 'बैक एक्सटेंशन (रोमन चेयर)',
    'Hanches calées sur le banc, buste incliné et dos neutre.', 'Remonte le buste jusqu’à aligner le corps et redescends lentement.', 'Travaille les lombaires, les érecteurs du rachis et les fessiers.',
    'कूल्हे बेंच पर टिकाएँ, धड़ झुका हुआ और रीढ़ सीधी।', 'शरीर एक सीध में आने तक धड़ ऊपर उठाएँ और धीरे वापस जाएँ।', 'कमर, रीढ़ की मांसपेशियों और ग्लूट्स पर काम करता है।'),
  ('Incline Push-up', 'Pompes inclinées', 'इनक्लाइन पुश-अप', null, null, null, null, null, null),
  ('Dumbbell Lunge', 'Fentes aux haltères', 'डंबल लंज',
    'Debout, haltères le long du corps et buste droit.', 'Fais un pas en avant, plie les genoux et pousse sur le sol pour revenir.', 'Travaille quadriceps et fessiers, avec l’aide des ischio-jambiers.',
    'डंबल बगल में पकड़कर खड़े हों और धड़ सीधा रखें।', 'एक कदम आगे बढ़ाएँ, घुटने मोड़ें और ज़मीन धकेलकर वापस आएँ।', 'क्वाड्स और ग्लूट्स पर, हैमस्ट्रिंग की मदद से।'),
  ('Goblet Squat', 'Goblet squat', 'गॉब्लेट स्क्वैट', null, null, null, null, null, null),
  ('Deadlift', 'Soulevé de terre', 'डेडलिफ़्ट',
    'Pieds sous la barre, hanches en arrière, genoux fléchis et dos neutre.', 'Tends hanches et genoux, garde la barre près du corps et redescends en contrôlant.', 'Travaille fessiers, ischio-jambiers, lombaires et dos.',
    'पैर बार के नीचे, कूल्हे पीछे, घुटने मुड़े और रीढ़ सीधी।', 'कूल्हे और घुटने सीधे करें, बार शरीर के पास रखें और कंट्रोल से नीचे लाएँ।', 'ग्लूट्स, हैमस्ट्रिंग, कमर और पीठ पर काम करता है।'),
  ('Bench Step-up', 'Montée sur banc', 'बेंच स्टेप-अप', null, null, null, null, null, null),
  ('Crunch', 'Crunch', 'क्रंच', null, null, null, null, null, null),
  ('Seated Cable Row', 'Rowing assis à la poulie', 'सीटेड केबल रो',
    'Assieds-toi genoux légèrement fléchis, buste droit et bras tendus.', 'Tire la poignée vers le ventre en serrant les omoplates, puis reviens.', 'Travaille le dos, surtout le milieu du dos et le grand dorsal.',
    'घुटने हल्के मुड़े, धड़ सीधा और बाँहें सीधी रखकर बैठें।', 'शोल्डर ब्लेड कसते हुए हैंडल पेट की तरफ़ खींचें और वापस जाएँ।', 'पीठ पर, ख़ासकर बीच की पीठ और लैट्स पर काम करता है।'),
  ('Plank Shoulder Tap', 'Gainage avec touche d’épaule', 'प्लैंक शोल्डर टैप', null, null, null, null, null, null),
  ('Dumbbell Lateral Raise', 'Élévation latérale aux haltères', 'डंबल लेटरल रेज़',
    'Debout, haltères le long du corps et coudes légèrement fléchis.', 'Monte les bras jusqu’à hauteur d’épaules et redescends en contrôlant.', 'Travaille surtout le côté des épaules.',
    'डंबल बगल में और कोहनी हल्की मुड़ी रखकर खड़े हों।', 'बाँहें कंधे की ऊँचाई तक उठाएँ और कंट्रोल से नीचे लाएँ।', 'मुख्य रूप से कंधों के किनारे वाले हिस्से पर काम करता है।'),
  ('Machine Chest Press', 'Développé pectoraux à la machine', 'मशीन चेस्ट प्रेस',
    'Assieds-toi le dos calé, poignées près de la poitrine.', 'Pousse les poignées vers l’avant sans verrouiller les coudes et reviens.', 'Travaille les pectoraux, avec l’aide des épaules et des triceps.',
    'पीठ टिकाकर बैठें, हैंडल छाती के पास।', 'कोहनी लॉक किए बिना हैंडल आगे धकेलें और वापस लाएँ।', 'छाती पर, कंधों और ट्राइसेप्स की मदद से।'),
  ('Overhead Triceps Extension', 'Extension triceps au-dessus de la tête', 'ओवरहेड ट्राइसेप्स एक्सटेंशन', null, null, null, null, null, null),
  ('Arnold Press', 'Développé Arnold', 'आर्नल्ड प्रेस', null, null, null, null, null, null),
  ('Dead Bug', 'Dead bug', 'डेड बग', null, null, null, null, null, null)
) as v(en, fr_nome, hi_nome, fr_c1, fr_c2, fr_m, hi_c1, hi_c2, hi_m)
where e.traducoes->'en'->>'nome' = v.en;

-- ---------------------------------------------------------------- receitas
-- Chave: o título em inglês. Rótulos das seções em fr/hi são lidos por
-- src/domain/rules/cozinha.ts (À PROPOS / INGRÉDIENTS / PRÉPARATION /
-- DRESSAGE / L’ASTUCE DE LIFE; इस डिश के बारे में / सामग्री / बनाने का
-- तरीक़ा / परोसने का तरीक़ा / Life की टिप).
update public.receitas_cozinha r
set traducoes = coalesce(r.traducoes, '{}'::jsonb)
      || jsonb_build_object(
           'fr', jsonb_build_object('titulo', v.fr_t, 'subtitulo', v.fr_s),
           'hi', jsonb_build_object('titulo', v.hi_t, 'subtitulo', v.hi_s)),
    conteudo_traducoes = coalesce(r.conteudo_traducoes, '{}'::jsonb)
      || jsonb_build_object('fr', v.fr_c, 'hi', v.hi_c)
from (values
  ($r$Chicken & Chickpea Power Salad$r$, $r$Salade énergie poulet et pois chiches$r$, $r$Une assiette complète, légère, qui tient au corps$r$, $r$À PROPOS DU PLAT : Une vraie salade, pas une garniture : plein de verdure, du poulet et des pois chiches pour tenir jusqu’au prochain repas.

INGRÉDIENTS (1 portion) :
- Verdure à volonté (laitue, roquette, épinards)
- 100 g de poulet effiloché
- 50 g de pois chiches cuits
- 1 tomate et 1/2 carotte râpée
- Un filet d’huile d’olive (5 g) et du citron

PRÉPARATION :
1. Lave et sèche bien la verdure — des feuilles mouillées ne retiennent pas la sauce.
2. Coupe la tomate en dés et râpe la carotte.
3. Si le poulet est froid, réchauffe-le vite fait à la poêle sans huile.

DRESSAGE :
1. Couvre l’assiette de verdure — plus il y en a, mieux c’est.
2. Répartis le poulet et les pois chiches par-dessus.
3. Ajoute la tomate et la carotte.
4. Assaisonne d’huile d’olive, de citron et de sel juste avant de manger.

L’ASTUCE DE LIFE : Mange la verdure en premier, avant les protéines. Tu te sentiras rassasié plus vite.$r$, $r$चिकन और छोले का पावर सलाद$r$, $r$भरी-पूरी थाली, हल्की भी और देर तक भूख नहीं लगती$r$, $r$इस डिश के बारे में: सजावट वाला नहीं, असली सलाद: ढेर सारी हरी पत्तियाँ, चिकन और छोले, ताकि अगले खाने तक पेट भरा रहे।

सामग्री (1 सर्विंग):
- हरी पत्तियाँ जितनी चाहें (लेट्यूस, रुकोला, पालक)
- 100 g उबला-नोचा चिकन
- 50 g उबले छोले
- 1 टमाटर और 1/2 कद्दूकस की हुई गाजर
- थोड़ा ऑलिव ऑयल (5 g) और नींबू

बनाने का तरीक़ा:
1. पत्तियाँ धोकर अच्छे से सुखाएँ — गीली पत्तियों पर ड्रेसिंग नहीं टिकती।
2. टमाटर काटें और गाजर कद्दूकस करें।
3. चिकन ठंडा हो तो बिना तेल के पैन में जल्दी से गर्म कर लें।

परोसने का तरीक़ा:
1. प्लेट पत्तियों से भर दें — जितनी ज़्यादा, उतना अच्छा।
2. ऊपर चिकन और छोले फैलाएँ।
3. टमाटर और गाजर डालें।
4. खाने से ठीक पहले ऑलिव ऑयल, नींबू और नमक डालें।

Life की टिप: प्रोटीन से पहले हरी पत्तियाँ खाइए। पेट जल्दी भरा महसूस होगा।$r$),
  ($r$Protein Overnight Oats$r$, $r$Overnight oats protéinés$r$, $r$Le petit-déj prêt dès la veille$r$, $r$À PROPOS DU PLAT : Tu le prépares le soir et tu te réveilles avec le petit-déj prêt : crémeux, frais et plein de protéines. Zéro excuse le matin.

INGRÉDIENTS (1 portion) :
- 40 g de flocons d’avoine
- 1 dose de whey (30 g)
- 150 ml de lait ou de boisson végétale
- 1/2 banane en rondelles
- Cannelle selon ton goût

PRÉPARATION :
1. Dans un bocal avec couvercle, mélange l’avoine, la whey et le lait jusqu’à ce qu’il ne reste plus de poudre.
2. Ferme et mets au frigo toute la nuit (au moins 6 heures).

DRESSAGE :
1. Le matin, mélange bien — si c’est trop épais, ajoute un trait de lait.
2. Ajoute les rondelles de banane et saupoudre de cannelle.
3. Mange-le frais, directement dans le bocal.

L’ASTUCE DE LIFE : Prépare deux bocaux d’un coup. Demain matin, tu me remercieras.$r$, $r$प्रोटीन ओवरनाइट ओट्स$r$, $r$नाश्ता रात को ही तैयार$r$, $r$इस डिश के बारे में: रात को बनाइए और सुबह नाश्ता तैयार मिलेगा: क्रीमी, ठंडा और प्रोटीन से भरा। सुबह कोई बहाना नहीं।

सामग्री (1 सर्विंग):
- 40 g ओट्स
- 1 स्कूप व्हे (30 g)
- 150 ml दूध या प्लांट-बेस्ड दूध
- 1/2 केला, गोल कटा हुआ
- स्वाद अनुसार दालचीनी

बनाने का तरीक़ा:
1. ढक्कन वाले जार में ओट्स, व्हे और दूध तब तक मिलाएँ जब तक पाउडर न बचे।
2. ढककर पूरी रात फ़्रिज में रखें (कम से कम 6 घंटे)।

परोसने का तरीक़ा:
1. सुबह अच्छे से मिलाएँ — ज़्यादा गाढ़ा हो तो थोड़ा दूध डालें।
2. ऊपर केले के टुकड़े रखें और दालचीनी छिड़कें।
3. ठंडा ही, सीधे जार से खाइए।

Life की टिप: एक साथ दो जार बना लीजिए। कल सुबह आप मुझे शुक्रिया कहेंगे।$r$),
  ($r$Thermogenic Soup$r$, $r$Soupe thermogénique$r$, $r$Chaude, légère et au gingembre pour le soir$r$, $r$À PROPOS DU PLAT : Un bouillon de poulet consistant au gingembre et au poivre : il réchauffe, réconforte et ne pèse pas. Parfait pour le soir.

INGRÉDIENTS (1 portion) :
- 100 g de poulet effiloché
- 1 tomate et 1/2 oignon
- 1 gousse d’ail
- Gingembre râpé et poivre selon ton goût
- Légumes selon ton goût (courgette, carotte)

PRÉPARATION :
1. Émince l’oignon, l’ail, la tomate et les légumes.
2. Fais revenir l’ail, l’oignon et le gingembre dans une casserole.
3. Ajoute la tomate et les légumes et remue 2 minutes.
4. Couvre d’eau, assaisonne et laisse cuire 15 minutes.
5. Ajoute le poulet et laisse frémir encore 5 minutes.

DRESSAGE :
1. Sers bien chaud dans un bol creux.
2. Termine avec une pincée de poivre.

L’ASTUCE DE LIFE : Le gingembre et le poivre donnent cette bonne chaleur. Tu veux plus de bouillon ? Ajoute de l’eau — ça ne change presque rien aux calories.$r$, $r$थर्मोजेनिक सूप$r$, $r$गर्म, हल्का और अदरक वाला — शाम के लिए$r$, $r$इस डिश के बारे में: अदरक और काली मिर्च वाला गाढ़ा चिकन शोरबा: गर्माहट देता है, सुकून देता है और भारी नहीं लगता। शाम के लिए परफ़ेक्ट।

सामग्री (1 सर्विंग):
- 100 g उबला-नोचा चिकन
- 1 टमाटर और 1/2 प्याज़
- 1 लहसुन की कली
- स्वाद अनुसार कद्दूकस अदरक और काली मिर्च
- स्वाद अनुसार सब्ज़ियाँ (तोरी, गाजर)

बनाने का तरीक़ा:
1. प्याज़, लहसुन, टमाटर और सब्ज़ियाँ काट लें।
2. पतीले में लहसुन, प्याज़ और अदरक भूनें।
3. टमाटर और सब्ज़ियाँ डालकर 2 मिनट चलाएँ।
4. पानी डालें, मसाला करें और 15 मिनट पकाएँ।
5. चिकन डालें और 5 मिनट और धीमी आँच पर पकाएँ।

परोसने का तरीक़ा:
1. गहरे कटोरे में गरमा-गरम परोसें।
2. ऊपर चुटकी भर काली मिर्च डालें।

Life की टिप: अदरक और काली मिर्च से अच्छी गर्माहट आती है। ज़्यादा शोरबा चाहिए? बस पानी बढ़ा दें — कैलोरी लगभग नहीं बदलती।$r$),
  ($r$Baked Veggie Omelet$r$, $r$Omelette aux légumes au four$r$, $r$Riche en protéines et pratique pour toute la semaine$r$, $r$À PROPOS DU PLAT : Tu la fais une fois et tu en manges toute la semaine : une omelette haute, moelleuse et pleine de légumes. De vraies protéines au petit-déj ou au goûter.

INGRÉDIENTS (2 portions) :
- 4 œufs
- 2 blancs d’œufs
- 1 tasse de légumes émincés (tomate, épinards, oignon)
- Sel, origan et poivre

PRÉPARATION :
1. Préchauffe le four à 180 °C et graisse un petit plat.
2. Bats les œufs et les blancs avec les assaisonnements.
3. Incorpore les légumes émincés.
4. Verse dans le plat et enfourne 20 minutes, jusqu’à ce que le centre soit pris.

DRESSAGE :
1. Attends 5 minutes avant de démouler — comme ça, elle ne se casse pas.
2. Coupe en 2 parts (1 par portion).
3. Sers tiède ou garde dans une boîte au frigo.

L’ASTUCE DE LIFE : Emporte-la au travail et mange-la froide — elle est super comme ça.$r$, $r$बेक्ड वेजी ऑमलेट$r$, $r$प्रोटीन से भरपूर और पूरे हफ़्ते के लिए आसान$r$, $r$इस डिश के बारे में: एक बार बनाइए और पूरे हफ़्ते खाइए: ऊँचा, मुलायम और सब्ज़ियों से भरा ऑमलेट। नाश्ते या स्नैक में असली प्रोटीन।

सामग्री (2 सर्विंग):
- 4 अंडे
- 2 अंडे की सफ़ेदी
- 1 कप कटी सब्ज़ियाँ (टमाटर, पालक, प्याज़)
- नमक, ऑरेगैनो और काली मिर्च

बनाने का तरीक़ा:
1. ओवन 180°C पर गर्म करें और छोटी बेकिंग डिश को चिकना करें।
2. अंडे और सफ़ेदी मसालों के साथ फेंटें।
3. कटी सब्ज़ियाँ मिलाएँ।
4. डिश में डालें और 20 मिनट बेक करें, जब तक बीच से जम न जाए।

परोसने का तरीक़ा:
1. निकालने से पहले 5 मिनट रुकें — इससे टूटेगा नहीं।
2. 2 टुकड़ों में काटें (हर सर्विंग में 1)।
3. गुनगुना परोसें या डिब्बे में फ़्रिज में रखें।

Life की टिप: ऑफ़िस ले जाइए और ठंडा खाइए — ऐसे भी बढ़िया लगता है।$r$),
  ($r$Zucchini Spaghetti with Chicken$r$, $r$Spaghettis de courgette au poulet$r$, $r$L’allure des pâtes, la légèreté des légumes$r$, $r$À PROPOS DU PLAT : Des lanières de courgette remplacent les pâtes, pour une fraction des calories. Poulet doré, tomate et basilic par-dessus.

INGRÉDIENTS (1 portion) :
- 150 g de poulet en dés
- 1 grosse courgette en fines lanières
- 1 tomate hachée et de l’ail
- Un filet d’huile d’olive (5 g)
- Basilic et sel

PRÉPARATION :
1. Taille la courgette en fines lanières avec un économe ou un spiraliseur.
2. Fais dorer le poulet avec l’ail dans l’huile d’olive.
3. Ajoute la tomate et laisse cuire jusqu’à obtenir une sauce légère.
4. Ajoute la courgette et remue 2 minutes seulement.

DRESSAGE :
1. Enroule les « spaghettis » à la fourchette et pose-les au centre de l’assiette.
2. Répartis le poulet et la sauce par-dessus.
3. Termine avec des feuilles de basilic.

L’ASTUCE DE LIFE : Ne cuis pas trop la courgette — 2 minutes suffisent, sinon elle ramollit.$r$, $r$चिकन के साथ तोरी स्पेगेटी$r$, $r$दिखे पास्ता जैसा, हल्का सब्ज़ी जैसा$r$, $r$इस डिश के बारे में: तोरी की पतली पट्टियाँ पास्ता की जगह लेती हैं, बहुत कम कैलोरी में। ऊपर सुनहरा चिकन, टमाटर और तुलसी।

सामग्री (1 सर्विंग):
- 150 g चिकन के टुकड़े
- 1 बड़ी तोरी, पतली पट्टियों में
- 1 कटा टमाटर और लहसुन
- थोड़ा ऑलिव ऑयल (5 g)
- तुलसी (बेसिल) और नमक

बनाने का तरीक़ा:
1. पीलर या स्पाइरलाइज़र से तोरी की पतली पट्टियाँ बनाएँ।
2. ऑलिव ऑयल में लहसुन के साथ चिकन सुनहरा करें।
3. टमाटर डालें और हल्की सॉस बनने तक पकाएँ।
4. तोरी डालें और सिर्फ़ 2 मिनट चलाएँ।

परोसने का तरीक़ा:
1. काँटे से "स्पेगेटी" लपेटें और प्लेट के बीच रखें।
2. ऊपर चिकन और सॉस फैलाएँ।
3. तुलसी की पत्तियों से सजाएँ।

Life की टिप: तोरी ज़्यादा न पकाएँ — 2 मिनट काफ़ी हैं, वरना गल जाती है।$r$),
  ($r$Grilled Chicken & Broccoli Bowl$r$, $r$Bol poulet grillé et brocoli$r$, $r$Le classique de la salle, bien fait$r$, $r$À PROPOS DU PLAT : Les bases qui marchent : poulet grillé juteux, riz moelleux et brocoli cuit juste ce qu’il faut. Protéines et glucides dans les bonnes quantités pour prendre du muscle.

INGRÉDIENTS (1 portion) :
- 150 g de blanc de poulet grillé
- 150 g de riz blanc cuit
- 100 g de brocoli vapeur
- Un filet d’huile d’olive (5 g)
- Sel, ail et poivre

PRÉPARATION :
1. Assaisonne le poulet avec le sel, l’ail et le poivre.
2. Grille-le jusqu’à ce qu’il soit doré des deux côtés et laisse reposer 2 minutes.
3. Fais cuire le brocoli à la vapeur 5 minutes (il reste vert et ferme).
4. Réchauffe le riz.

DRESSAGE :
1. Le riz au fond du bol.
2. Le poulet tranché d’un côté, le brocoli de l’autre.
3. Termine avec le filet d’huile d’olive.

L’ASTUCE DE LIFE : Remplace le riz blanc par du riz complet et tu resteras rassasié plus longtemps.$r$, $r$ग्रिल्ड चिकन और ब्रोकली बाउल$r$, $r$जिम वालों का क्लासिक, सही तरीक़े से$r$, $r$इस डिश के बारे में: वो बेसिक्स जो काम करते हैं: रसीला ग्रिल्ड चिकन, खिले-खिले चावल और सही पकी ब्रोकली। मसल बनाने के लिए सही मात्रा में प्रोटीन और कार्ब्स।

सामग्री (1 सर्विंग):
- 150 g ग्रिल्ड चिकन ब्रेस्ट
- 150 g पके सफ़ेद चावल
- 100 g भाप में पकी ब्रोकली
- थोड़ा ऑलिव ऑयल (5 g)
- नमक, लहसुन और काली मिर्च

बनाने का तरीक़ा:
1. चिकन पर नमक, लहसुन और काली मिर्च लगाएँ।
2. दोनों तरफ़ सुनहरा होने तक ग्रिल करें और 2 मिनट रखा रहने दें।
3. ब्रोकली को 5 मिनट भाप में पकाएँ (हरी और कुरकुरी रहती है)।
4. चावल गर्म करें।

परोसने का तरीक़ा:
1. बाउल में नीचे चावल।
2. एक तरफ़ कटा चिकन, दूसरी तरफ़ ब्रोकली।
3. ऊपर से थोड़ा ऑलिव ऑयल डालें।

Life की टिप: सफ़ेद चावल की जगह ब्राउन राइस लें, पेट ज़्यादा देर भरा रहेगा।$r$),
  ($r$Creamy Chicken Wrap$r$, $r$Wrap crémeux au poulet$r$, $r$Prêt en 10 minutes et plein de protéines$r$, $r$À PROPOS DU PLAT : Pour quand tu as faim et peu de temps : une tortilla croustillante dehors, du poulet crémeux dedans. 10 minutes et c’est dans ta main.

INGRÉDIENTS (1 portion) :
- 1 tortilla complète
- 120 g de poulet effiloché
- 2 cuillères à soupe de fromage frais allégé
- Verdure et tomate
- Sel et poivre

PRÉPARATION :
1. Assaisonne le poulet de sel et de poivre (réchauffe-le s’il est froid).
2. Tranche la tomate et garde la verdure de côté.

DRESSAGE :
1. Étale le fromage frais sur la tortilla.
2. Dispose le poulet, la verdure et la tomate en bande au milieu.
3. Replie les bords et roule bien serré.
4. Saisis à la poêle sans huile, 1 minute par face (facultatif).
5. Coupe en biais pour servir.

L’ASTUCE DE LIFE : Le passage à la poêle le rend croustillant et empêche le wrap de s’ouvrir.$r$, $r$क्रीमी चिकन रैप$r$, $r$10 मिनट में तैयार और प्रोटीन से भरा$r$, $r$इस डिश के बारे में: जब भूख हो और समय कम: बाहर से कुरकुरी टॉर्टिला, अंदर क्रीमी चिकन। 10 मिनट और हाथ में तैयार।

सामग्री (1 सर्विंग):
- 1 होल-व्हीट टॉर्टिला (या गेहूँ की रोटी)
- 120 g उबला-नोचा चिकन
- 2 बड़े चम्मच लाइट क्रीम चीज़ (या हंग कर्ड)
- हरी पत्तियाँ और टमाटर
- नमक और काली मिर्च

बनाने का तरीक़ा:
1. चिकन में नमक और काली मिर्च मिलाएँ (ठंडा हो तो गर्म कर लें)।
2. टमाटर काटें और पत्तियाँ अलग रखें।

परोसने का तरीक़ा:
1. टॉर्टिला पर क्रीम चीज़ फैलाएँ।
2. बीच में एक पट्टी में चिकन, पत्तियाँ और टमाटर रखें।
3. किनारे मोड़ें और कसकर लपेटें।
4. बिना तेल के पैन में हर तरफ़ 1 मिनट सेकें (वैकल्पिक)।
5. तिरछा काटकर परोसें।

Life की टिप: पैन में सेकने से कुरकुरा होता है और रैप खुलता नहीं।$r$),
  ($r$Healthy Banana Cinnamon Pancakes$r$, $r$Pancakes banane-cannelle healthy$r$, $r$Un petit-déj qui a un goût de dessert$r$, $r$À PROPOS DU PLAT : Sucré, moelleux et plein d’énergie, sans farine blanche. La banane sucre et l’avoine donne de la tenue.

INGRÉDIENTS (1 portion) :
- 1 banane écrasée
- 2 œufs
- 40 g de flocons d’avoine
- 1 dose de whey (facultatif)
- Cannelle

PRÉPARATION :
1. Écrase bien la banane et mélange-la avec les œufs.
2. Ajoute l’avoine (et la whey, si tu en mets) jusqu’à obtenir une pâte.
3. Fais chauffer une poêle antiadhésive à feu doux.
4. Verse de petites portions et fais dorer 2 minutes de chaque côté.

DRESSAGE :
1. Empile les pancakes dans l’assiette.
2. Saupoudre de cannelle.

L’ASTUCE DE LIFE : Feu doux et patience. Un bon pancake, ça ne se presse pas.$r$, $r$हेल्दी केला-दालचीनी पैनकेक$r$, $r$ऐसा नाश्ता जो मिठाई जैसा लगे$r$, $r$इस डिश के बारे में: मीठा, मुलायम और एनर्जी से भरा, बिना मैदे के। केला मिठास देता है और ओट्स गाढ़ापन।

सामग्री (1 सर्विंग):
- 1 मसला हुआ केला
- 2 अंडे
- 40 g ओट्स
- 1 स्कूप व्हे (वैकल्पिक)
- दालचीनी

बनाने का तरीक़ा:
1. केले को अच्छे से मसलें और अंडों के साथ मिलाएँ।
2. ओट्स (और व्हे, अगर डाल रहे हैं) डालकर घोल बनाएँ।
3. नॉन-स्टिक पैन धीमी आँच पर गर्म करें।
4. छोटे-छोटे हिस्से डालें और हर तरफ़ 2 मिनट सुनहरा करें।

परोसने का तरीक़ा:
1. पैनकेक प्लेट में एक के ऊपर एक रखें।
2. ऊपर दालचीनी छिड़कें।

Life की टिप: धीमी आँच और धीरज। अच्छा पैनकेक जल्दबाज़ी में नहीं बनता।$r$),
  ($r$Garlic Pasta with Tuna$r$, $r$Pâtes à l’ail et au thon$r$, $r$Pas cher, rapide et riche en protéines$r$, $r$À PROPOS DU PLAT : Un plat de fin de mois qui apporte quand même de vraies protéines : ail doré à l’huile d’olive, tomate et thon qui enrobent les pâtes.

INGRÉDIENTS (1 portion) :
- 80 g de pâtes (poids cru)
- 1 boîte de thon égoutté
- 1 tomate hachée et de l’ail
- Un filet d’huile d’olive (10 g)
- Persil et sel

PRÉPARATION :
1. Fais cuire les pâtes al dente et garde une demi-louche d’eau de cuisson.
2. Fais dorer l’ail dans l’huile d’olive et ajoute la tomate.
3. Ajoute le thon et fais chauffer.
4. Mélange les pâtes et l’eau gardée jusqu’à ce que ce soit crémeux.

DRESSAGE :
1. Enroule les pâtes au centre de l’assiette.
2. Termine avec du persil haché.

L’ASTUCE DE LIFE : L’eau de cuisson, c’est le secret d’une sauce crémeuse sans crème.$r$, $r$टूना के साथ गार्लिक पास्ता$r$, $r$सस्ता, जल्दी बनने वाला और प्रोटीन से भरपूर$r$, $r$इस डिश के बारे में: महीने के आख़िर वाली डिश जो फिर भी असली प्रोटीन देती है: ऑलिव ऑयल में सुनहरा लहसुन, टमाटर और टूना पास्ता पर लिपटे हुए।

सामग्री (1 सर्विंग):
- 80 g पास्ता (सूखा वज़न)
- 1 डिब्बा टूना, पानी निकला हुआ
- 1 कटा टमाटर और लहसुन
- थोड़ा ऑलिव ऑयल (10 g)
- धनिया/पार्सले और नमक

बनाने का तरीक़ा:
1. पास्ता अल डेंटे उबालें और आधा करछी उबला पानी बचा लें।
2. ऑलिव ऑयल में लहसुन सुनहरा करें और टमाटर डालें।
3. टूना डालकर गर्म करें।
4. पास्ता और बचा पानी डालकर क्रीमी होने तक मिलाएँ।

परोसने का तरीक़ा:
1. पास्ता प्लेट के बीच लपेटकर रखें।
2. ऊपर कटा धनिया/पार्सले डालें।

Life की टिप: पास्ता का पानी ही बिना क्रीम के क्रीमी सॉस का राज़ है।$r$),
  ($r$Rustic Sweet Potato with Beef$r$, $r$Patate douce rustique au bœuf$r$, $r$Du carburant pour ceux qui s’entraînent dur$r$, $r$À PROPOS DU PLAT : Patate douce rôtie avec la peau, dorée dehors et fondante dedans, avec du bœuf haché bien assaisonné. Des glucides de qualité et des protéines denses.

INGRÉDIENTS (1 portion) :
- 200 g de patate douce avec la peau, en dés
- 150 g de bœuf haché maigre
- 1/2 oignon et de l’ail
- Tomate et épices
- Sel et poivre

PRÉPARATION :
1. Lave bien la patate douce et coupe-la en dés moyens, avec la peau.
2. Assaisonne de sel et de poivre et fais rôtir à 200 °C pendant 25 à 30 minutes (ou 20 au air fryer), jusqu’à ce qu’elle dore.
3. Pendant ce temps, fais revenir l’oignon et l’ail, ajoute le bœuf et laisse dorer.
4. Retire la graisse, ajoute la tomate et assaisonne bien.

DRESSAGE :
1. Dispose les dés de patate douce dans l’assiette.
2. Recouvre de bœuf haché.
3. Termine avec des herbes fraîches, si tu en as.

L’ASTUCE DE LIFE : Retire la graisse du bœuf après l’avoir doré. Ça enlève l’excès sans perdre de protéines.$r$, $r$बीफ़ के साथ देसी स्टाइल शकरकंद$r$, $r$जम कर वर्कआउट करने वालों का ईंधन$r$, $r$इस डिश के बारे में: छिलके समेत भुना शकरकंद, बाहर से सुनहरा और अंदर से नरम, अच्छे मसाले वाले कीमे के साथ। अच्छे कार्ब्स और भरपूर प्रोटीन। (बीफ़ की जगह चिकन या मटन कीमा भी चलेगा।)

सामग्री (1 सर्विंग):
- 200 g छिलके वाला शकरकंद, टुकड़ों में
- 150 g लीन कीमा
- 1/2 प्याज़ और लहसुन
- टमाटर और मसाले
- नमक और काली मिर्च

बनाने का तरीक़ा:
1. शकरकंद अच्छे से धोएँ और छिलके समेत मध्यम टुकड़ों में काटें।
2. नमक-मिर्च लगाकर 200°C पर 25 से 30 मिनट भूनें (या एयर फ़्रायर में 20), जब तक सुनहरा न हो।
3. तब तक प्याज़ और लहसुन भूनें, कीमा डालें और भूरा होने दें।
4. चर्बी निकाल दें, टमाटर डालें और अच्छे से मसाला करें।

परोसने का तरीक़ा:
1. प्लेट में शकरकंद के टुकड़े रखें।
2. ऊपर कीमा डालें।
3. ताज़ा हरा धनिया हो तो ऊपर डालें।

Life की टिप: कीमा भूनने के बाद चर्बी निकाल दें। प्रोटीन कम किए बिना फ़ालतू फ़ैट कट जाता है।$r$),
  ($r$Mediterranean Chickpea Bowl$r$, $r$Bol méditerranéen aux pois chiches$r$, $r$Des protéines végétales qui calent$r$, $r$À PROPOS DU PLAT : Copieux, coloré et 100 % végétal : pois chiches au cumin, salade fraîche et citron. La preuve que sans viande, on tient aussi.

INGRÉDIENTS (1 portion) :
- 150 g de pois chiches cuits
- 100 g de riz complet
- Tomate, concombre et oignon rouge
- Un filet d’huile d’olive (10 g) et du citron
- Cumin et sel

PRÉPARATION :
1. Assaisonne les pois chiches de cumin, d’huile d’olive et de sel.
2. Fais-les dorer à la poêle 5 minutes, jusqu’à ce qu’ils croustillent.
3. Coupe la tomate, le concombre et l’oignon rouge en petits dés.

DRESSAGE :
1. Le riz complet au fond du bol.
2. Les pois chiches d’un côté, la salade de l’autre.
3. Termine avec un filet de citron.

L’ASTUCE DE LIFE : Faire dorer les pois chiches avant change tout — ils deviennent croustillants comme un snack.$r$, $r$मेडिटेरेनियन छोले बाउल$r$, $r$पौधों वाला प्रोटीन जो पेट भरा रखे$r$, $r$इस डिश के बारे में: भरपेट, रंग-बिरंगा और 100% शाकाहारी: जीरे वाले छोले, ताज़ा सलाद और नींबू। सबूत कि बिना मांस के भी दम रहता है।

सामग्री (1 सर्विंग):
- 150 g उबले छोले
- 100 g ब्राउन राइस
- टमाटर, खीरा और लाल प्याज़
- थोड़ा ऑलिव ऑयल (10 g) और नींबू
- जीरा और नमक

बनाने का तरीक़ा:
1. छोलों में जीरा, ऑलिव ऑयल और नमक मिलाएँ।
2. पैन में 5 मिनट भूनें, जब तक कुरकुरे न हो जाएँ।
3. टमाटर, खीरा और लाल प्याज़ बारीक काटें।

परोसने का तरीक़ा:
1. बाउल में नीचे ब्राउन राइस।
2. एक तरफ़ छोले, दूसरी तरफ़ सलाद।
3. ऊपर नींबू निचोड़ें।

Life की टिप: पहले छोले भूनने से सब बदल जाता है — वे स्नैक जैसे कुरकुरे हो जाते हैं।$r$),
  ($r$Golden Soy Sauce Tofu with Sesame$r$, $r$Tofu doré à la sauce soja et au sésame$r$, $r$Croûte dorée et plein de saveur$r$, $r$À PROPOS DU PLAT : Personne ne refuse un tofu bien assaisonné : des dés dorés à la sauce soja, des légumes cuits juste comme il faut et du sésame par-dessus.

INGRÉDIENTS (1 portion) :
- 150 g de tofu ferme en dés
- Légumes selon ton goût (poivron, courgette)
- Sauce soja et ail
- Un filet d’huile d’olive (5 g)
- Graines de sésame

PRÉPARATION :
1. Sèche bien le tofu avec du papier absorbant.
2. Assaisonne de sauce soja et d’ail et laisse reposer 5 minutes.
3. Fais dorer les dés dans l’huile d’olive jusqu’à former une croûte.
4. Fais sauter rapidement les légumes, en les gardant croquants.

DRESSAGE :
1. Les légumes au fond de l’assiette.
2. Le tofu doré par-dessus.
3. Termine avec les graines de sésame.

L’ASTUCE DE LIFE : Un tofu humide cuit à la vapeur au lieu de dorer. Bien le sécher, c’est le secret.$r$, $r$सोया सॉस और तिल वाला सुनहरा टोफ़ू$r$, $r$सुनहरी परत और भरपूर स्वाद$r$, $r$इस डिश के बारे में: अच्छे मसाले वाले टोफ़ू को कोई मना नहीं करता: सोया सॉस में सुनहरे टुकड़े, सही पकी सब्ज़ियाँ और ऊपर तिल। (टोफ़ू की जगह पनीर भी चलेगा।)

सामग्री (1 सर्विंग):
- 150 g फ़र्म टोफ़ू, टुकड़ों में
- स्वाद अनुसार सब्ज़ियाँ (शिमला मिर्च, तोरी)
- सोया सॉस और लहसुन
- थोड़ा ऑलिव ऑयल (5 g)
- तिल

बनाने का तरीक़ा:
1. टोफ़ू को पेपर टॉवल से अच्छे से सुखाएँ।
2. सोया सॉस और लहसुन लगाकर 5 मिनट रखा रहने दें।
3. ऑलिव ऑयल में टुकड़ों को परत बनने तक सुनहरा करें।
4. सब्ज़ियाँ जल्दी से भूनें, कुरकुरी रखें।

परोसने का तरीक़ा:
1. प्लेट में नीचे सब्ज़ियाँ।
2. ऊपर सुनहरा टोफ़ू।
3. तिल छिड़ककर सजाएँ।

Life की टिप: गीला टोफ़ू सुनहरा होने की जगह भाप में पकता है। अच्छे से सुखाना ही राज़ है।$r$),
  ($r$Creamy Cumin Lentils$r$, $r$Lentilles crémeuses au cumin$r$, $r$Le riz-haricots version vegan, en mieux$r$, $r$À PROPOS DU PLAT : Un plat réconfortant qui nourrit : des lentilles crémeuses au cumin et à la coriandre sur un riz moelleux.

INGRÉDIENTS (1 portion) :
- 100 g de lentilles cuites
- 100 g de riz cuit
- 1/2 oignon et de l’ail
- Tomate et cumin
- Sel et coriandre

PRÉPARATION :
1. Fais revenir l’oignon et l’ail.
2. Ajoute la tomate et le cumin et remue 2 minutes.
3. Ajoute les lentilles et un peu d’eau.
4. Laisse cuire en écrasant une partie des lentilles, jusqu’à ce que ce soit crémeux.

DRESSAGE :
1. Le riz dans l’assiette.
2. Les lentilles crémeuses dessus ou à côté.
3. Termine avec de la coriandre hachée.

L’ASTUCE DE LIFE : Lentilles et riz ensemble, c’est une protéine complète. Un duo imbattable.$r$, $r$जीरे वाली क्रीमी मसूर दाल$r$, $r$दाल-चावल, थोड़ा और बेहतर$r$, $r$इस डिश के बारे में: दिल को सुकून देने वाला खाना जो पोषण भी दे: जीरे और हरे धनिये वाली गाढ़ी मसूर दाल, खिले चावलों पर।

सामग्री (1 सर्विंग):
- 100 g पकी मसूर दाल
- 100 g पके चावल
- 1/2 प्याज़ और लहसुन
- टमाटर और जीरा
- नमक और हरा धनिया

बनाने का तरीक़ा:
1. प्याज़ और लहसुन भूनें।
2. टमाटर और जीरा डालकर 2 मिनट चलाएँ।
3. दाल और थोड़ा पानी डालें।
4. कुछ दाल को घोटते हुए गाढ़ा होने तक पकाएँ।

परोसने का तरीक़ा:
1. प्लेट में चावल।
2. ऊपर या साथ में गाढ़ी दाल।
3. कटा हरा धनिया डालें।

Life की टिप: दाल और चावल साथ में पूरा प्रोटीन बनाते हैं। बेमिसाल जोड़ी।$r$),
  ($r$Vegan Banana Pancakes$r$, $r$Pancakes vegan à la banane$r$, $r$Sans œufs, sans lait, et ils tiennent quand même$r$, $r$À PROPOS DU PLAT : Un petit-déj vegan simple et gourmand : la banane bien mûre fait le travail de l’œuf.

INGRÉDIENTS (1 portion) :
- 1 banane bien mûre
- 40 g de flocons d’avoine
- 100 ml de boisson végétale
- Cannelle et levure chimique (1 pincée)

PRÉPARATION :
1. Écrase la banane et mélange-la avec la boisson végétale.
2. Ajoute l’avoine, la cannelle et la levure.
3. Laisse reposer 5 minutes pour que ça épaississe.
4. Fais dorer dans une poêle antiadhésive, 2 minutes de chaque côté.

DRESSAGE :
1. Empile les pancakes dans l’assiette.
2. Saupoudre de cannelle.

L’ASTUCE DE LIFE : Plus la banane est mûre, plus elle est sucrée et mieux elle lie la pâte.$r$, $r$वीगन केला पैनकेक$r$, $r$न अंडा, न दूध, फिर भी जुड़े रहते हैं$r$, $r$इस डिश के बारे में: आसान और स्वादिष्ट वीगन नाश्ता: पका केला अंडे का काम करता है।

सामग्री (1 सर्विंग):
- 1 पका केला
- 40 g ओट्स
- 100 ml प्लांट-बेस्ड दूध
- दालचीनी और बेकिंग पाउडर (1 चुटकी)

बनाने का तरीक़ा:
1. केला मसलें और प्लांट-बेस्ड दूध के साथ मिलाएँ।
2. ओट्स, दालचीनी और बेकिंग पाउडर डालें।
3. गाढ़ा होने के लिए 5 मिनट रखा रहने दें।
4. नॉन-स्टिक पैन में हर तरफ़ 2 मिनट सुनहरा करें।

परोसने का तरीक़ा:
1. पैनकेक प्लेट में एक के ऊपर एक रखें।
2. ऊपर दालचीनी छिड़कें।

Life की टिप: केला जितना पका, उतना मीठा और उतना अच्छा जोड़ता है।$r$),
  ($r$Banana Ice Cream with Cocoa & Peanut$r$, $r$Glace banane, cacao et cacahuète$r$, $r$Calme l’envie de sucré sans le coup de barre$r$, $r$À PROPOS DU PLAT : Une envie de sucré, ce n’est pas une faiblesse — c’est ton corps qui demande de l’énergie rapide. Cette glace crémeuse à la banane, au cacao et au beurre de cacahuète la satisfait sans tout gâcher.

INGRÉDIENTS (1 portion) :
- 1 banane mûre congelée
- 1 cuillère à soupe de cacao 100 % (10 g)
- 1 cuillère à soupe de beurre de cacahuète (15 g)
- Cannelle selon ton goût

PRÉPARATION :
1. Coupe la banane en rondelles et congèle-la (au moins 4 heures).
2. Mixe au robot jusqu’à ce que ce soit crémeux.
3. Ajoute le cacao et le beurre de cacahuète et mixe jusqu’à obtenir une texture lisse.

DRESSAGE :
1. Mets-la dans un bol.
2. Saupoudre de cannelle et mange tout de suite, comme une glace.

L’ASTUCE DE LIFE : Celle-ci calme vraiment l’envie, et demain tu ne te réveilleras pas en t’en voulant. Un pas après l’autre.$r$, $r$कोको और मूंगफली वाली केले की आइसक्रीम$r$, $r$मीठे की तलब मिटाए, बिना पछतावे के$r$, $r$इस डिश के बारे में: मीठे की तलब कमज़ोरी नहीं — यह शरीर का जल्दी एनर्जी माँगना है। कोको और पीनट बटर वाली यह क्रीमी केले की आइसक्रीम तलब मिटाती है, बिना प्लान बिगाड़े।

सामग्री (1 सर्विंग):
- 1 पका जमा हुआ केला
- 1 बड़ा चम्मच 100% कोको (10 g)
- 1 बड़ा चम्मच पीनट बटर (15 g)
- स्वाद अनुसार दालचीनी

बनाने का तरीक़ा:
1. केला गोल काटें और जमा दें (कम से कम 4 घंटे)।
2. फ़ूड प्रोसेसर में क्रीमी होने तक पीसें।
3. कोको और पीनट बटर डालकर चिकना होने तक पीसें।

परोसने का तरीक़ा:
1. कटोरी में डालें।
2. दालचीनी छिड़कें और तुरंत आइसक्रीम की तरह खाएँ।

Life की टिप: यह सच में तलब मिटाती है, और कल सुबह आप ख़ुद को कोसते हुए नहीं उठेंगे। एक-एक कदम।$r$),
  ($r$Smoked Paprika Popcorn$r$, $r$Pop-corn au paprika fumé$r$, $r$L’alternative au grignotage du soir$r$, $r$À PROPOS DU PLAT : Pour la faim devant une série sans dévaliser le placard : du pop-corn maison, croquant, avec une touche fumée.

INGRÉDIENTS (1 portion) :
- 30 g de maïs à pop-corn
- 1 cuillère à soupe d’huile d’olive (5 g)
- Sel et paprika fumé selon ton goût

PRÉPARATION :
1. Fais chauffer l’huile dans une casserole avec couvercle.
2. Ajoute le maïs et couvre.
3. Secoue la casserole jusqu’à ce que ça arrête d’éclater.

DRESSAGE :
1. Verse dans un grand saladier.
2. Assaisonne de sel et de paprika et mélange bien.

L’ASTUCE DE LIFE : Le pop-corn maison, c’est des fibres et du volume. Rien à voir avec un paquet de chips.$r$, $r$स्मोक्ड पैपरिका पॉपकॉर्न$r$, $r$रात के जंक फ़ूड की जगह$r$, $r$इस डिश के बारे में: सीरीज़ देखते वक़्त की भूख, बिना अलमारी खंगाले: घर का कुरकुरा पॉपकॉर्न, हल्के धुएँ वाले स्वाद के साथ।

सामग्री (1 सर्विंग):
- 30 g पॉपकॉर्न के दाने
- 1 बड़ा चम्मच ऑलिव ऑयल (5 g)
- स्वाद अनुसार नमक और स्मोक्ड पैपरिका (या चाट मसाला)

बनाने का तरीक़ा:
1. ढक्कन वाले पतीले में तेल गर्म करें।
2. दाने डालकर ढक दें।
3. फूटना बंद होने तक पतीला हिलाते रहें।

परोसने का तरीक़ा:
1. बड़े कटोरे में निकालें।
2. नमक और पैपरिका डालकर अच्छे से मिलाएँ।

Life की टिप: घर का पॉपकॉर्न फ़ाइबर और मात्रा देता है। चिप्स के पैकेट से बिल्कुल अलग।$r$),
  ($r$Crispy Rosemary Sweet Potato Chips$r$, $r$Chips croustillantes de patate douce au romarin$r$, $r$À la place des chips en sachet$r$, $r$À PROPOS DU PLAT : Le croquant des chips, sans la liste d’ingrédients imprononçables. De la patate douce fine au romarin.

INGRÉDIENTS (1 portion) :
- 1 patate douce moyenne en fines tranches
- 1 cuillère à soupe d’huile d’olive (5 g)
- Sel et romarin

PRÉPARATION :
1. Préchauffe le four à 200 °C.
2. Coupe la patate douce en tranches très fines (une mandoline aide).
3. Mélange avec l’huile d’olive, le sel et le romarin.
4. Étale sur une plaque sans superposer et enfourne 20 à 25 minutes, en retournant à mi-cuisson.

DRESSAGE :
1. Laisse refroidir 5 minutes — c’est là qu’elles deviennent croustillantes.
2. Sers dans un bol.

L’ASTUCE DE LIFE : Remplacer le paquet par ça, même une seule fois, c’est déjà une victoire. Continue à les accumuler.$r$, $r$रोज़मेरी वाले कुरकुरे शकरकंद चिप्स$r$, $r$पैकेट वाले चिप्स की जगह$r$, $r$इस डिश के बारे में: चिप्स जैसा कुरकुरापन, बिना उन अनजान इंग्रीडिएंट्स की लिस्ट के। रोज़मेरी वाले पतले शकरकंद।

सामग्री (1 सर्विंग):
- 1 मध्यम शकरकंद, पतले स्लाइस में
- 1 बड़ा चम्मच ऑलिव ऑयल (5 g)
- नमक और रोज़मेरी (या अजवाइन)

बनाने का तरीक़ा:
1. ओवन 200°C पर गर्म करें।
2. शकरकंद बहुत पतला काटें (मैंडोलिन से आसान होता है)।
3. ऑलिव ऑयल, नमक और रोज़मेरी में लपेटें।
4. ट्रे पर बिना एक-दूसरे पर चढ़ाए फैलाएँ और 20 से 25 मिनट बेक करें, बीच में पलटें।

परोसने का तरीक़ा:
1. 5 मिनट ठंडा होने दें — तभी कुरकुरे बनते हैं।
2. कटोरे में परोसें।

Life की टिप: पैकेट की जगह यह, एक बार भी, अपने आप में जीत है। ऐसी जीतें जोड़ते रहिए।$r$),
  ($r$Creamy Iced Coffee with Whey$r$, $r$Café glacé crémeux à la whey$r$, $r$À la place d’une boisson énergisante ou d’un soda$r$, $r$À PROPOS DU PLAT : L’énergie que tu cherchais dans une boisson énergisante, avec des protéines et sans la bombe de sucre. Frais et crémeux.

INGRÉDIENTS (1 portion) :
- 1 tasse de café froid
- 1 dose de whey (30 g)
- 100 ml de lait ou de boisson végétale
- Glaçons et cannelle

PRÉPARATION :
1. Prépare le café et laisse-le refroidir (ou utilise celui qui reste de la journée).
2. Mixe le café, la whey et le lait.
3. Ajoute les glaçons et mixe encore jusqu’à ce que ce soit mousseux.

DRESSAGE :
1. Sers dans un grand verre.
2. Saupoudre de cannelle.

L’ASTUCE DE LIFE : Le coup de mou de 15 h n’a pas besoin d’une canette. Celui-ci te relance sans le coup de barre après.$r$, $r$व्हे वाली क्रीमी कोल्ड कॉफ़ी$r$, $r$एनर्जी ड्रिंक या कोल्ड ड्रिंक की जगह$r$, $r$इस डिश के बारे में: जो एनर्जी आप एनर्जी ड्रिंक में ढूँढ रहे थे, अब प्रोटीन के साथ और बिना चीनी के बम के। ठंडी और क्रीमी।

सामग्री (1 सर्विंग):
- 1 कप ठंडी कॉफ़ी
- 1 स्कूप व्हे (30 g)
- 100 ml दूध या प्लांट-बेस्ड दूध
- बर्फ़ और दालचीनी

बनाने का तरीक़ा:
1. कॉफ़ी बनाकर ठंडी होने दें (या दिन की बची कॉफ़ी लें)।
2. कॉफ़ी, व्हे और दूध ब्लेंड करें।
3. बर्फ़ डालकर झाग आने तक फिर ब्लेंड करें।

परोसने का तरीक़ा:
1. लंबे गिलास में परोसें।
2. ऊपर दालचीनी छिड़कें।

Life की टिप: दोपहर 3 बजे की सुस्ती के लिए कैन की ज़रूरत नहीं। यह बाद में थकान के बिना फुर्ती देती है।$r$),
  ($r$Banana Oat Post-Workout Shake$r$, $r$Shake post-séance banane-avoine$r$, $r$Protéines et glucides après l’entraînement$r$, $r$À PROPOS DU PLAT : Après l’entraînement, ton corps réclame des protéines et des glucides. Ce shake apporte les deux, crémeux et rapide.

INGRÉDIENTS (1 portion) :
- 1 dose de whey (30 g)
- 1 banane
- 200 ml de lait ou de boisson végétale
- 30 g de flocons d’avoine
- Glaçons

PRÉPARATION :
1. Mets tout dans le blender.
2. Mixe jusqu’à ce que ce soit lisse.

DRESSAGE :
1. Sers dans un grand verre.
2. Bois-le juste après ta séance.

L’ASTUCE DE LIFE : Garde la banane au congélateur et emporte le shake dans une gourde : tu sors de la salle et c’est prêt.$r$, $r$केला-ओट्स पोस्ट-वर्कआउट शेक$r$, $r$वर्कआउट के बाद प्रोटीन और कार्ब्स$r$, $r$इस डिश के बारे में: वर्कआउट के बाद शरीर प्रोटीन और कार्ब्स माँगता है। यह शेक दोनों देता है, क्रीमी और फटाफट।

सामग्री (1 सर्विंग):
- 1 स्कूप व्हे (30 g)
- 1 केला
- 200 ml दूध या प्लांट-बेस्ड दूध
- 30 g ओट्स
- बर्फ़

बनाने का तरीक़ा:
1. सब कुछ ब्लेंडर में डालें।
2. चिकना होने तक ब्लेंड करें।

परोसने का तरीक़ा:
1. बड़े गिलास में परोसें।
2. वर्कआउट के तुरंत बाद पिएँ।

Life की टिप: केला फ़्रीज़र में रखें और शेक बोतल में ले जाएँ: जिम से निकले और तैयार।$r$),
  ($r$Green Apple & Ginger Juice$r$, $r$Jus pomme verte et gingembre$r$, $r$Léger, rafraîchissant et plein de fibres$r$, $r$À PROPOS DU PLAT : Chou kale, pomme verte et gingembre mixés avec de l’eau de coco. Léger, rafraîchissant et un moyen facile de mettre du vert dans ta journée.

INGRÉDIENTS (1 portion) :
- 1 poignée de chou kale ou d’épinards
- 1/2 pomme verte
- Le jus d’1/2 citron
- 200 ml d’eau de coco
- Gingembre et glaçons

PRÉPARATION :
1. Lave bien la verdure et coupe la pomme en morceaux.
2. Mets tout dans le blender.
3. Mixe bien jusqu’à ce que la verdure soit dissoute.

DRESSAGE :
1. Sers dans un verre avec des glaçons.
2. Bois-le tout de suite, avant qu’il s’oxyde.

L’ASTUCE DE LIFE : Ne le filtre pas. Les fibres du kale, c’est la moitié de l’intérêt.$r$, $r$हरा सेब और अदरक जूस$r$, $r$हल्का, ताज़गी भरा और फ़ाइबर से भरपूर$r$, $r$इस डिश के बारे में: पालक/केल, हरा सेब और अदरक नारियल पानी के साथ ब्लेंड। हल्का, ताज़गी भरा और दिन में हरी सब्ज़ी लेने का आसान तरीक़ा।

सामग्री (1 सर्विंग):
- 1 मुट्ठी केल या पालक
- 1/2 हरा सेब
- 1/2 नींबू का रस
- 200 ml नारियल पानी
- अदरक और बर्फ़

बनाने का तरीक़ा:
1. पत्तियाँ अच्छे से धोएँ और सेब के टुकड़े करें।
2. सब कुछ ब्लेंडर में डालें।
3. पत्तियाँ घुलने तक अच्छे से ब्लेंड करें।

परोसने का तरीक़ा:
1. बर्फ़ वाले गिलास में परोसें।
2. तुरंत पिएँ, काला पड़ने से पहले।

Life की टिप: इसे छानें नहीं। पत्तियों का फ़ाइबर ही आधा फ़ायदा है।$r$),
  ($r$Banana Protein Smoothie$r$, $r$Smoothie protéiné à la banane$r$, $r$Simple, crémeux et rassasiant$r$, $r$À PROPOS DU PLAT : Un petit-déj liquide pour ceux qui n’ont pas le temps : banane, whey et avoine mixées jusqu’à être crémeuses.

INGRÉDIENTS (1 portion) :
- 1 banane
- 1 dose de whey (30 g)
- 200 ml de lait ou de boisson végétale
- 1 cuillère à soupe de flocons d’avoine
- Cannelle

PRÉPARATION :
1. Mets tout dans le blender.
2. Mixe jusqu’à ce que ce soit crémeux.

DRESSAGE :
1. Sers dans un verre.
2. Saupoudre de cannelle.

L’ASTUCE DE LIFE : Congèle la banane en rondelles la veille. Le smoothie devient comme un milkshake.$r$, $r$केला प्रोटीन स्मूदी$r$, $r$आसान, क्रीमी और पेट भरने वाली$r$, $r$इस डिश के बारे में: जिनके पास समय नहीं, उनके लिए पीने वाला नाश्ता: केला, व्हे और ओट्स क्रीमी होने तक ब्लेंड।

सामग्री (1 सर्विंग):
- 1 केला
- 1 स्कूप व्हे (30 g)
- 200 ml दूध या प्लांट-बेस्ड दूध
- 1 बड़ा चम्मच ओट्स
- दालचीनी

बनाने का तरीक़ा:
1. सब कुछ ब्लेंडर में डालें।
2. क्रीमी होने तक ब्लेंड करें।

परोसने का तरीक़ा:
1. गिलास में परोसें।
2. ऊपर दालचीनी छिड़कें।

Life की टिप: रात को केले के टुकड़े जमा दें। स्मूदी मिल्कशेक जैसी बनेगी।$r$),
  ($r$Healthy Strawberry Milkshake$r$, $r$Milkshake fraise healthy$r$, $r$Gourmand comme un dessert, léger comme un goûter$r$, $r$À PROPOS DU PLAT : Le goût du milkshake sans sortir des clous : fraise, whey et yaourt. Ça calme l’envie de sucré avec des protéines.

INGRÉDIENTS (1 portion) :
- 100 g de fraises (fraîches ou surgelées)
- 1 dose de whey (30 g)
- 150 ml de lait ou de boisson végétale
- 2 cuillères à soupe de yaourt nature
- Glaçons

PRÉPARATION :
1. Mets tout dans le blender.
2. Mixe jusqu’à ce que ce soit crémeux.

DRESSAGE :
1. Sers dans un verre bien frais.
2. Décore avec une fraise coupée sur le bord.

L’ASTUCE DE LIFE : Les fraises surgelées remplacent les glaçons et rendent le tout plus épais.$r$, $r$हेल्दी स्ट्रॉबेरी मिल्कशेक$r$, $r$मिठाई जैसा स्वाद, स्नैक जितना हल्का$r$, $r$इस डिश के बारे में: मिल्कशेक का स्वाद, बिना रास्ते से भटके: स्ट्रॉबेरी, व्हे और दही। प्रोटीन के साथ मीठे की तलब मिटाता है।

सामग्री (1 सर्विंग):
- 100 g स्ट्रॉबेरी (ताज़ी या जमी हुई)
- 1 स्कूप व्हे (30 g)
- 150 ml दूध या प्लांट-बेस्ड दूध
- 2 बड़े चम्मच सादा दही
- बर्फ़

बनाने का तरीक़ा:
1. सब कुछ ब्लेंडर में डालें।
2. क्रीमी होने तक ब्लेंड करें।

परोसने का तरीक़ा:
1. अच्छे ठंडे गिलास में परोसें।
2. किनारे पर एक कटी स्ट्रॉबेरी से सजाएँ।

Life की टिप: जमी हुई स्ट्रॉबेरी बर्फ़ की जगह ले लेती है और शेक गाढ़ा बनाती है।$r$),
  ($r$Calming Chamomile & Lemon Balm Tea$r$, $r$Infusion apaisante camomille et mélisse$r$, $r$Un rituel chaud pour finir la journée$r$, $r$À PROPOS DU PLAT : Camomille et mélisse dans une tasse chaude : un rituel pour ralentir avant de dormir.

INGRÉDIENTS (1 tasse) :
- 1 cuillère à soupe de camomille séchée
- 1 cuillère à soupe de mélisse
- 200 ml d’eau chaude
- Miel selon ton goût (facultatif)

PRÉPARATION :
1. Fais bouillir l’eau et coupe le feu.
2. Ajoute les plantes et couvre.
3. Laisse infuser 5 minutes.

DRESSAGE :
1. Filtre directement dans la tasse.
2. Sucre avec du miel, si tu veux.

L’ASTUCE DE LIFE : Bois-la lentement, loin des écrans. La moitié de l’effet, c’est le rituel.$r$, $r$शांत करने वाली कैमोमाइल और लेमन बाम चाय$r$, $r$दिन ख़त्म करने की गर्म रस्म$r$, $r$इस डिश के बारे में: गर्म कप में कैमोमाइल और लेमन बाम: सोने से पहले धीमे होने की एक रस्म।

सामग्री (1 कप):
- 1 बड़ा चम्मच सूखी कैमोमाइल
- 1 बड़ा चम्मच लेमन बाम (या तुलसी की पत्तियाँ)
- 200 ml गर्म पानी
- स्वाद अनुसार शहद (वैकल्पिक)

बनाने का तरीक़ा:
1. पानी उबालें और आँच बंद करें।
2. पत्तियाँ डालकर ढक दें।
3. 5 मिनट रखा रहने दें।

परोसने का तरीक़ा:
1. सीधे कप में छान लें।
2. चाहें तो शहद मिलाएँ।

Life की टिप: धीरे-धीरे पिएँ, स्क्रीन से दूर। आधा असर इस रस्म का ही है।$r$),
  ($r$Green Tea with Lemon$r$, $r$Thé vert au citron$r$, $r$Léger et rafraîchissant pour le milieu de matinée$r$, $r$À PROPOS DU PLAT : Un thé vert infusé juste comme il faut, pas amer, avec une touche de citron. Léger et parfait en milieu de matinée.

INGRÉDIENTS (1 tasse) :
- 1 cuillère à café de thé vert
- 200 ml d’eau à 80 °C
- Une rondelle de citron

PRÉPARATION :
1. Chauffe l’eau jusqu’à ce que de petites bulles se forment, sans bouillir.
2. Ajoute le thé et laisse infuser 3 minutes.

DRESSAGE :
1. Filtre dans la tasse.
2. Termine avec la rondelle de citron.

L’ASTUCE DE LIFE : L’eau bouillante brûle le thé vert et le rend amer. 80 °C, c’est le bon point.$r$, $r$नींबू वाली ग्रीन टी$r$, $r$दोपहर से पहले के लिए हल्की और ताज़गी भरी$r$, $r$इस डिश के बारे में: सही तरीक़े से बनी ग्रीन टी, कड़वी नहीं, हल्के नींबू के साथ। हल्की और सुबह के बीच के लिए बढ़िया।

सामग्री (1 कप):
- 1 छोटा चम्मच ग्रीन टी
- 80°C का 200 ml पानी
- नींबू का एक टुकड़ा

बनाने का तरीक़ा:
1. पानी तब तक गर्म करें जब तक छोटे बुलबुले न बनने लगें, उबालें नहीं।
2. चाय डालें और 3 मिनट रखा रहने दें।

परोसने का तरीक़ा:
1. कप में छान लें।
2. नींबू का टुकड़ा डालें।

Life की टिप: उबलता पानी ग्रीन टी को जला देता है और कड़वा बनाता है। 80°C सबसे सही है।$r$),
  ($r$Ginger, Lemon & Honey Tea$r$, $r$Infusion gingembre, citron et miel$r$, $r$Chaude, acidulée et réconfortante$r$, $r$À PROPOS DU PLAT : Du gingembre bouilli, du citron et un filet de miel : ça réchauffe et ça fait du bien.

INGRÉDIENTS (1 tasse) :
- 3 tranches de gingembre
- Le jus d’1/2 citron
- 200 ml d’eau
- Miel selon ton goût

PRÉPARATION :
1. Fais bouillir l’eau avec le gingembre pendant 5 minutes.
2. Coupe le feu et ajoute le citron.

DRESSAGE :
1. Sers dans la tasse avec les tranches de gingembre.
2. Sucre avec du miel, si tu veux.

L’ASTUCE DE LIFE : Après un repas copieux, cette infusion chaude passe vraiment bien.$r$, $r$अदरक, नींबू और शहद वाली चाय$r$, $r$गर्म, खट्टी-मीठी और सुकून देने वाली$r$, $r$इस डिश के बारे में: उबला अदरक, नींबू और थोड़ा शहद: गर्माहट भी, अपना ख़याल रखने वाला एहसास भी।

सामग्री (1 कप):
- अदरक के 3 टुकड़े
- 1/2 नींबू का रस
- 200 ml पानी
- स्वाद अनुसार शहद

बनाने का तरीक़ा:
1. पानी में अदरक डालकर 5 मिनट उबालें।
2. आँच बंद करें और नींबू डालें।

परोसने का तरीक़ा:
1. अदरक के टुकड़ों के साथ कप में परोसें।
2. चाहें तो शहद मिलाएँ।

Life की टिप: भारी खाने के बाद यह गर्म चाय बहुत अच्छी लगती है।$r$)
) as v(en, fr_t, fr_s, fr_c, hi_t, hi_s, hi_c)
where r.traducoes->'en'->>'titulo' = v.en;

-- Modo de preparo no idioma da pessoa: agora também fr e hi.
create or replace function public.receitas_conteudo_liberado(p_idioma text default 'pt-BR')
returns table(id uuid, conteudo text)
language sql
stable security definer
set search_path to 'public'
as $function$
  select r.id,
         coalesce(
           case when p_idioma in ('en', 'es', 'fr', 'hi') then r.conteudo_traducoes ->> p_idioma end,
           case when p_idioma in ('fr', 'hi') then r.conteudo_traducoes ->> 'en' end,
           r.conteudo
         )
  from public.receitas_cozinha r
  where auth.uid() is not null
    and (not coalesce(r.premium, false) or public.is_premium_like(auth.uid()));
$function$;


commit;
