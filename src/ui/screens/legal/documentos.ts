import type { Idioma } from '@domain/rules/localidade'

/**
 * Termos de uso + Política de privacidade — RASCUNHO escrito pelo Claude
 * (2026-09-28), a revisar por advogado antes da publicação na Play.
 * Campos entre [colchetes] o dono precisa preencher.
 *
 * Mudou o texto de forma relevante? Suba VERSAO_DOCUMENTOS — ela vai pro
 * perfil no aceite (profiles.consentimento_versao) e permite pedir novo
 * aceite depois.
 */
export const VERSAO_DOCUMENTOS = 'v2.3-2026-10-21'

export interface Secao {
  readonly titulo: string
  readonly paragrafos: readonly string[]
}

export interface Documento {
  readonly titulo: string
  readonly atualizado: string
  readonly secoes: readonly Secao[]
}

const CONTROLADOR_PT = '[RAZÃO SOCIAL], inscrita no CNPJ [NÚMERO], com sede em [ENDEREÇO] ("ATHOSlife", "nós")'
const CONTROLADOR_EN = '[COMPANY LEGAL NAME], Brazilian tax ID (CNPJ) [NUMBER], located at [ADDRESS] ("ATHOSlife", "we")'
const CONTATO = '[E-MAIL DE PRIVACIDADE]'

const termosPt: Documento = {
  titulo: 'Termos de uso',
  atualizado: 'Última atualização: 21 de outubro de 2026',
  secoes: [
    {
      titulo: '1. Quem somos e o que é o app',
      paragrafos: [
        `O ATHOSlife é um aplicativo de acompanhamento de alimentação, hidratação, treino, hábitos e bem-estar, oferecido por ${CONTROLADOR_PT}.`,
        'Ao criar uma conta ou usar o app, você concorda com estes Termos e com a Política de privacidade. Se não concordar, não use o app.',
      ],
    },
    {
      titulo: '2. Não é aconselhamento médico',
      paragrafos: [
        'O ATHOSlife e o personagem Life oferecem informação geral e ferramentas de registro. Nada no app é diagnóstico, prescrição ou tratamento, e não substitui nutricionista, médico, psicólogo ou profissional de educação física.',
        'Metas de calorias, macronutrientes e água calculadas pelo app são estimativas de partida, que você pode e deve ajustar com um profissional. Procure orientação profissional antes de mudar dieta ou treino, principalmente se tiver alguma condição de saúde, estiver grávida ou amamentando.',
        'Em caso de emergência ou pensamento de se machucar, procure imediatamente o serviço de emergência do seu país.',
      ],
    },
    {
      titulo: '3. Quem pode usar',
      paragrafos: [
        'O app é destinado a pessoas com 18 anos ou mais. Ao criar a conta, você declara ter pelo menos 18 anos.',
        'Você é responsável por manter sua senha em segredo e pelas atividades feitas na sua conta.',
      ],
    },
    {
      titulo: '4. Inteligência artificial',
      paragrafos: [
        'Algumas funções usam IA (conversa com o Life, análise de foto de refeição, sugestão de receitas). As respostas podem conter erros, inclusive nos valores nutricionais estimados. Confira antes de confiar nelas.',
        'Não envie ao Life dados de terceiros nem informações que você não queira que sejam processadas pela IA.',
      ],
    },
    {
      titulo: '5. Plano grátis, assinatura e cancelamento',
      paragrafos: [
        'O app tem um plano grátis com limites de uso e um plano pago (Premium) com mais recursos. Os limites e recursos de cada plano aparecem na tela de planos do app.',
        'A assinatura é vendida e cobrada pela Google Play, no preço e na moeda mostrados na loja do seu país. Ela renova automaticamente ao fim de cada período, a menos que você cancele pela Google Play antes da renovação.',
        'Se houver período de teste grátis, a cobrança começa ao fim do teste, a menos que você cancele antes. Reembolsos seguem as regras da Google Play e o direito do consumidor do seu país.',
      ],
    },
    {
      titulo: '5-A. Planos de referência e declaração de veracidade',
      paragrafos: [
        'O plano pago pode montar planos de referência de treino e de alimentação a partir das suas escolhas e de diretrizes gerais e públicas. É uma sugestão editável, não prescrição individual, e não substitui profissional de Educação Física, nutricionista ou médico.',
        'Antes do primeiro plano você responde um check de saúde e declara que as informações são verdadeiras e completas. Se alguma resposta indicar ponto de atenção (por exemplo, problema cardíaco, gravidez ou transtorno alimentar), o app recomenda que você procure um médico antes de começar. Se, mesmo orientado(a), você decidir receber o plano, declara estar ciente dessa orientação; o plano então é montado de forma mais conservadora (treino em nível iniciante; alimentação apenas para manutenção do peso, conforme o caso). As declarações ficam registradas com data e hora e não podem ser alteradas. Menores de 18 anos não recebem plano automático.',
        'Se você omitir ou informar dados falsos (como idade, gravidez ou doença) para obter um plano, os riscos e danos decorrentes são de sua exclusiva responsabilidade (Código de Defesa do Consumidor, art. 14, §3º, II). Podemos suspender o recurso ou a conta quando houver indício de informação falsa.',
        'A carga (peso) dos exercícios é sempre definida por você. Interrompa o exercício e procure atendimento se sentir dor, tontura, falta de ar fora do normal ou mal-estar.',
      ],
    },
    {
      titulo: '6. Uso aceitável',
      paragrafos: [
        'Você concorda em não usar o app para fins ilegais, não tentar burlar limites de uso ou de plano, não acessar contas de outras pessoas, não fazer engenharia reversa do serviço e não enviar conteúdo ofensivo, ilegal ou que viole direitos de terceiros.',
        'Podemos suspender ou encerrar contas que violem estes Termos.',
      ],
    },
    {
      titulo: '7. Conteúdo e propriedade intelectual',
      paragrafos: [
        'O app, a marca ATHOSlife, o personagem Life, receitas, ilustrações e textos pertencem ao ATHOSlife ou a seus licenciantes. Você recebe uma licença pessoal, não exclusiva e intransferível para usar o app.',
        'Os dados que você registra continuam seus. Você nos autoriza a processá-los apenas para oferecer o serviço, conforme a Política de privacidade.',
      ],
    },
    {
      titulo: '8. Limitação de responsabilidade',
      paragrafos: [
        'O app é oferecido "como está". Na medida permitida pela lei, não nos responsabilizamos por decisões tomadas com base em informações do app, por indisponibilidade temporária ou por perda de dados causada por fatores fora do nosso controle.',
        'Nada nestes Termos limita direitos que a lei do seu país garante ao consumidor e que não possam ser afastados por contrato.',
      ],
    },
    {
      titulo: '9. Encerramento da conta',
      paragrafos: [
        'Você pode parar de usar o app e pedir a exclusão da conta a qualquer momento em Perfil > Privacidade. Cancelar a conta não cancela automaticamente a assinatura na Google Play — cancele também por lá.',
      ],
    },
    {
      titulo: '10. Mudanças e lei aplicável',
      paragrafos: [
        'Podemos atualizar estes Termos. Mudanças relevantes serão avisadas no app, e poderemos pedir um novo aceite.',
        'Estes Termos seguem a lei brasileira. Fica eleito o foro de [CIDADE/UF], sem prejuízo do foro do domicílio do consumidor e das normas obrigatórias do país de residência do usuário.',
        `Contato: ${CONTATO}.`,
      ],
    },
  ],
}

const politicaPt: Documento = {
  titulo: 'Política de privacidade',
  atualizado: 'Última atualização: 21 de outubro de 2026',
  secoes: [
    {
      titulo: '1. Controlador e contato',
      paragrafos: [
        `O controlador dos seus dados é ${CONTROLADOR_PT}. Encarregado de dados (DPO) e contato de privacidade: ${CONTATO}.`,
      ],
    },
    {
      titulo: '2. Dados que coletamos',
      paragrafos: [
        'Conta: e-mail e senha (a senha é guardada de forma criptografada pelo nosso provedor de autenticação).',
        'Perfil: nome, idade, sexo, altura, peso, objetivo, idioma, país, fuso horário, unidades de medida e respostas do questionário inicial (rotina, sono, treino, preferências alimentares, alergias, suplementos, consumo de água e nível de estresse).',
        'Dados de saúde e bem-estar que você registra: refeições e alimentos, água, peso, treinos, passos, humor e check-ins emocionais, e hábitos que você acompanha, inclusive hábitos que deseja reduzir.',
        'Conversas com o Life, sua foto de perfil (se você enviar) e fotos de refeições enviadas para análise — estas são analisadas e descartadas, não ficam guardadas. Códigos de barras lidos pelo leitor do app.',
        'Dados técnicos mínimos para o app funcionar e ficar seguro (por exemplo, registros de uso da IA, erros e data do último acesso). Não usamos cookies de publicidade.',
      ],
    },
    {
      titulo: '3. Para que usamos e com qual base legal',
      paragrafos: [
        'Oferecer o app e suas funções (execução do contrato — LGPD art. 7º, V; GDPR art. 6(1)(b)).',
        'Dados de saúde: tratados com o seu consentimento específico e destacado, dado na tela de consentimento (LGPD art. 11, I; GDPR art. 9(2)(a)). Você pode retirar esse consentimento a qualquer momento, mas sem ele o app não consegue funcionar.',
        'Segurança, prevenção de abuso e controle de limites dos planos (legítimo interesse — LGPD art. 7º, IX; GDPR art. 6(1)(f)).',
        'Cumprir obrigações legais e fiscais (LGPD art. 7º, II; GDPR art. 6(1)(c)).',
        'Não vendemos seus dados. Não usamos seus dados de saúde para publicidade.',
      ],
    },
    {
      titulo: '4. Inteligência artificial',
      paragrafos: [
        'Quando você conversa com o Life, analisa uma foto de prato ou pede uma receita, o texto ou a imagem e um resumo do seu dia (por exemplo, água e refeições registradas) são enviados à API Gemini, do Google, para gerar a resposta. Pela configuração da API paga, o Google não usa esses dados para treinar modelos.',
        'Mensagens com sinais de risco à vida recebem uma resposta fixa com contatos de ajuda. Nesses casos guardamos só o termo que disparou o alerta, nunca o texto completo, para fins de segurança.',
      ],
    },
    {
      titulo: '5. Com quem compartilhamos',
      paragrafos: [
        'Supabase (banco de dados, autenticação e armazenamento), Google (IA Gemini e, quando houver assinatura, Google Play para pagamentos) e Open Food Facts (recebe apenas o número do código de barras lido, sem nenhum dado seu).',
        'Esses fornecedores tratam os dados em nosso nome e seguindo nossas instruções. Também podemos compartilhar dados quando a lei ou uma autoridade exigir.',
      ],
    },
    {
      titulo: '6. Transferência internacional',
      paragrafos: [
        'Nossos fornecedores podem guardar e processar dados fora do seu país, inclusive nos Estados Unidos. Nesses casos usamos as garantias previstas em lei, como cláusulas contratuais padrão (LGPD art. 33; GDPR art. 46).',
      ],
    },
    {
      titulo: '7. Por quanto tempo guardamos',
      paragrafos: [
        'Enquanto sua conta existir. Ao pedir a exclusão, apagamos ou anonimizamos seus dados em até 30 dias, exceto o que a lei nos obrigue a manter por mais tempo (por exemplo, registros fiscais de pagamento).',
      ],
    },
    {
      titulo: '8. Seus direitos',
      paragrafos: [
        'Você pode confirmar se tratamos seus dados, acessá-los, corrigi-los, exportá-los (portabilidade), pedir a exclusão, retirar o consentimento e se opor a tratamentos baseados em legítimo interesse. Exportar e pedir exclusão estão em Perfil > Privacidade; o resto é pelo contato acima.',
        'Você também pode reclamar à autoridade de proteção de dados do seu país (no Brasil, a ANPD; na União Europeia, a autoridade do seu país de residência).',
        'Residentes da Califórnia (EUA): você tem os direitos da CCPA/CPRA de saber, apagar, corrigir e limitar o uso de dados sensíveis. Não vendemos nem "compartilhamos" dados pessoais para publicidade comportamental.',
      ],
    },
    {
      titulo: '9. Segurança',
      paragrafos: [
        'Usamos conexão criptografada, controle de acesso por usuário no banco de dados e acesso restrito da equipe. Nenhum sistema é 100% seguro; se houver um incidente relevante, avisaremos você e as autoridades conforme a lei.',
      ],
    },
    {
      titulo: '10. Idade mínima',
      paragrafos: [
        'O app não é destinado a menores de 18 anos. Se soubermos que coletamos dados de alguém abaixo dessa idade, apagaremos a conta e esses dados.',
      ],
    },
    {
      titulo: '11. Mudanças nesta política',
      paragrafos: [
        'Avisaremos no app sobre mudanças relevantes e, quando a lei exigir, pediremos um novo consentimento.',
      ],
    },
  ],
}

const termsEn: Documento = {
  titulo: 'Terms of Use',
  atualizado: 'Last updated: October 21, 2026',
  secoes: [
    {
      titulo: '1. Who we are',
      paragrafos: [
        `ATHOSlife is an app for tracking food, hydration, workouts, habits and well-being, provided by ${CONTROLADOR_EN}.`,
        "By creating an account or using the app, you agree to these Terms and to the Privacy Policy. If you don't agree, don't use the app.",
      ],
    },
    {
      titulo: '2. Not medical advice',
      paragrafos: [
        'ATHOSlife and the Life character provide general information and logging tools. Nothing in the app is a diagnosis, prescription or treatment, and it does not replace a dietitian, doctor, psychologist or fitness professional.',
        'Calorie, macronutrient and water goals calculated by the app are starting estimates that you can and should adjust with a professional. Seek professional advice before changing your diet or training, especially if you have a health condition or are pregnant or breastfeeding.',
        'In an emergency, or if you are thinking about hurting yourself, contact your local emergency services right away.',
      ],
    },
    {
      titulo: '3. Eligibility',
      paragrafos: [
        'The app is intended for people aged 18 or older. By creating an account, you confirm that you are at least 18.',
        'You are responsible for keeping your password secret and for activity in your account.',
      ],
    },
    {
      titulo: '4. Artificial intelligence',
      paragrafos: [
        'Some features use AI (chatting with Life, meal photo analysis, recipe suggestions). Answers may contain mistakes, including in estimated nutrition values. Double-check before relying on them.',
        "Don't send Life other people's data or information you don't want processed by AI.",
      ],
    },
    {
      titulo: '5. Free plan, subscription and cancellation',
      paragrafos: [
        'The app has a free plan with usage limits and a paid plan (Premium) with more features. The limits and features of each plan are shown on the plans screen.',
        "Subscriptions are sold and billed by Google Play, at the price and currency shown in your country's store. They renew automatically at the end of each period unless you cancel in Google Play before renewal.",
        'If there is a free trial, billing starts when the trial ends unless you cancel before then. Refunds follow Google Play policies and the consumer laws of your country.',
      ],
    },
    {
      titulo: '5-A. Reference plans and truthfulness declaration',
      paragrafos: [
        'The paid plan can build reference workout and meal plans from your choices and general public guidelines. It is an editable suggestion, not an individual prescription, and does not replace a fitness professional, dietitian or doctor.',
        'Before your first plan you answer a health check and declare that your information is true and complete. If an answer points to a health concern (for example, a heart condition, pregnancy or an eating disorder), the app recommends that you see a doctor before starting. If, after that advice, you still choose to receive the plan, you declare that you are aware of it; the plan is then built more conservatively (beginner-level workouts; weight-maintenance meal plans only, as applicable). These declarations are recorded with date and time and cannot be changed. People under 18 do not receive an automatic plan.',
        'If you omit or give false information (such as age, pregnancy or illness) to obtain a plan, the resulting risks and damages are your sole responsibility, to the extent permitted by the law of your country. We may suspend the feature or the account when there are signs of false information.',
        'You always choose the load (weight) of each exercise. Stop exercising and seek care if you feel pain, dizziness, unusual shortness of breath or feel unwell.',
      ],
    },
    {
      titulo: '6. Acceptable use',
      paragrafos: [
        "You agree not to use the app for illegal purposes, try to bypass usage or plan limits, access other people's accounts, reverse-engineer the service, or upload offensive or unlawful content or content that infringes others' rights.",
        'We may suspend or terminate accounts that break these Terms.',
      ],
    },
    {
      titulo: '7. Content and intellectual property',
      paragrafos: [
        'The app, the ATHOSlife brand, the Life character, recipes, illustrations and texts belong to ATHOSlife or its licensors. You get a personal, non-exclusive, non-transferable license to use the app.',
        'The data you log remains yours. You allow us to process it only to provide the service, as described in the Privacy Policy.',
      ],
    },
    {
      titulo: '8. Limitation of liability',
      paragrafos: [
        'The app is provided "as is". To the extent permitted by law, we are not liable for decisions made based on information in the app, for temporary unavailability, or for data loss caused by factors beyond our control.',
        'Nothing in these Terms limits consumer rights granted by the laws of your country that cannot be waived by contract.',
      ],
    },
    {
      titulo: '9. Closing your account',
      paragrafos: [
        "You can stop using the app and request account deletion at any time in Profile > Privacy. Deleting your account doesn't automatically cancel your Google Play subscription — cancel it there too.",
      ],
    },
    {
      titulo: '10. Changes and governing law',
      paragrafos: [
        "We may update these Terms. We'll notify you in the app about material changes and may ask you to accept them again.",
        'These Terms are governed by the laws of Brazil, without prejudice to the mandatory consumer-protection laws of your country of residence and your right to bring claims where you live.',
        `Contact: ${CONTATO}.`,
      ],
    },
  ],
}

const privacyEn: Documento = {
  titulo: 'Privacy Policy',
  atualizado: 'Last updated: October 21, 2026',
  secoes: [
    {
      titulo: '1. Controller and contact',
      paragrafos: [`The controller of your data is ${CONTROLADOR_EN}. Data protection officer and privacy contact: ${CONTATO}.`],
    },
    {
      titulo: '2. Data we collect',
      paragrafos: [
        'Account: email and password (the password is stored encrypted by our authentication provider).',
        'Profile: name, age, sex, height, weight, goal, language, country, time zone, measurement units, and your answers to the initial questionnaire (routine, sleep, workouts, food preferences, allergies, supplements, water intake and stress level).',
        'Health and well-being data you log: meals and foods, water, weight, workouts, steps, mood and emotional check-ins, and habits you track, including habits you want to cut back on.',
        'Chats with Life, your profile photo (if you upload one) and meal photos sent for analysis — these are analyzed and discarded, not stored. Barcodes scanned with the in-app reader.',
        'Minimal technical data needed for the app to work and stay secure (for example AI usage logs, errors and last access date). We do not use advertising cookies.',
      ],
    },
    {
      titulo: '3. Why we use it and legal basis',
      paragrafos: [
        'To provide the app and its features (performance of a contract — GDPR art. 6(1)(b); LGPD art. 7, V).',
        'Health data: processed with your explicit consent, given on the consent screen (GDPR art. 9(2)(a); LGPD art. 11, I). You can withdraw it at any time, but the app cannot work without it.',
        'Security, abuse prevention and plan-limit enforcement (legitimate interests — GDPR art. 6(1)(f); LGPD art. 7, IX).',
        'Legal and tax obligations (GDPR art. 6(1)(c); LGPD art. 7, II).',
        "We don't sell your data. We don't use your health data for advertising.",
      ],
    },
    {
      titulo: '4. Artificial intelligence',
      paragrafos: [
        "When you chat with Life, analyze a meal photo or ask for a recipe, the text or image and a summary of your day (for example logged water and meals) are sent to Google's Gemini API to generate the answer. Under the paid API terms, Google does not use this data to train its models.",
        'Messages showing signs of risk to life get a fixed reply with help contacts. In those cases we store only the term that triggered the alert, never the full message, for safety purposes.',
      ],
    },
    {
      titulo: '5. Who we share it with',
      paragrafos: [
        'Supabase (database, authentication and storage), Google (Gemini AI and, for subscriptions, Google Play billing) and Open Food Facts (receives only the scanned barcode number, none of your data).',
        'These providers process data on our behalf and under our instructions. We may also share data when required by law or by an authority.',
      ],
    },
    {
      titulo: '6. International transfers',
      paragrafos: [
        'Our providers may store and process data outside your country, including in the United States. In those cases we rely on legal safeguards such as standard contractual clauses (GDPR art. 46; LGPD art. 33).',
      ],
    },
    {
      titulo: '7. Retention',
      paragrafos: [
        "As long as your account exists. When you request deletion, we delete or anonymize your data within 30 days, except what the law requires us to keep longer (for example payment tax records).",
      ],
    },
    {
      titulo: '8. Your rights',
      paragrafos: [
        'You can access, correct, export (portability) and delete your data, withdraw consent, and object to processing based on legitimate interests. Export and deletion are in Profile > Privacy; for everything else, use the contact above.',
        "You can also complain to your country's data protection authority.",
        'California residents: you have CCPA/CPRA rights to know, delete, correct and limit the use of sensitive personal information. We do not sell or "share" personal information for cross-context behavioral advertising.',
      ],
    },
    {
      titulo: '9. Security',
      paragrafos: [
        "We use encrypted connections, per-user access control in the database and restricted staff access. No system is 100% secure; if a relevant incident happens, we'll notify you and the authorities as required by law.",
      ],
    },
    {
      titulo: '10. Minimum age',
      paragrafos: [
        "The app is not intended for anyone under 18. If we learn we've collected data from someone under that age, we'll delete the account and that data.",
      ],
    },
    {
      titulo: '11. Changes to this policy',
      paragrafos: ["We'll notify you in the app about material changes and ask for new consent where the law requires."],
    },
  ],
}

const CONTROLADOR_ES = '[RAZÓN SOCIAL], con número de identificación fiscal brasileño (CNPJ) [NÚMERO], con domicilio en [DIRECCIÓN] ("ATHOSlife", "nosotros")'

const terminosEs: Documento = {
  titulo: 'Términos de uso',
  atualizado: 'Última actualización: 21 de octubre de 2026',
  secoes: [
    {
      titulo: '1. Quiénes somos y qué es la app',
      paragrafos: [
        `ATHOSlife es una aplicación de seguimiento de alimentación, hidratación, entrenamiento, hábitos y bienestar, ofrecida por ${CONTROLADOR_ES}.`,
        'Al crear una cuenta o usar la app, aceptas estos Términos y la Política de privacidad. Si no estás de acuerdo, no uses la app.',
      ],
    },
    {
      titulo: '2. No es consejo médico',
      paragrafos: [
        'ATHOSlife y el personaje Life ofrecen información general y herramientas de registro. Nada en la app es diagnóstico, prescripción ni tratamiento, y no sustituye a un nutricionista, médico, psicólogo o profesional de educación física.',
        'Las metas de calorías, macronutrientes y agua que calcula la app son estimaciones iniciales, que puedes y debes ajustar con un profesional. Busca orientación profesional antes de cambiar tu dieta o entrenamiento, sobre todo si tienes alguna condición de salud, estás embarazada o en período de lactancia.',
        'En caso de emergencia o de pensamientos de hacerte daño, acude de inmediato al servicio de emergencias de tu país.',
      ],
    },
    {
      titulo: '3. Quién puede usarla',
      paragrafos: [
        'La app está destinada a personas de 18 años o más. Al crear la cuenta, declaras tener al menos 18 años.',
        'Eres responsable de mantener tu contraseña en secreto y de la actividad realizada en tu cuenta.',
      ],
    },
    {
      titulo: '4. Inteligencia artificial',
      paragrafos: [
        'Algunas funciones usan IA (conversación con Life, análisis de fotos de comidas, sugerencia de recetas). Las respuestas pueden contener errores, incluso en los valores nutricionales estimados. Revísalas antes de confiar en ellas.',
        'No envíes a Life datos de terceros ni información que no quieras que la IA procese.',
      ],
    },
    {
      titulo: '5. Plan gratuito, suscripción y cancelación',
      paragrafos: [
        'La app tiene un plan gratuito con límites de uso y un plan de pago (Premium) con más funciones. Los límites y funciones de cada plan aparecen en la pantalla de planes de la app.',
        'La suscripción se vende y se cobra a través de Google Play, al precio y en la moneda que muestra la tienda de tu país. Se renueva automáticamente al final de cada período, salvo que la canceles en Google Play antes de la renovación.',
        'Si hay un período de prueba gratuito, el cobro empieza al terminar la prueba, salvo que canceles antes. Los reembolsos siguen las reglas de Google Play y la ley de protección al consumidor de tu país.',
      ],
    },
    {
      titulo: '5-A. Planes de referencia y declaración de veracidad',
      paragrafos: [
        'El plan de pago puede armar planes de referencia de entrenamiento y alimentación a partir de tus elecciones y de pautas generales y públicas. Es una sugerencia editable, no una prescripción individual, y no sustituye a un profesional de Educación Física, nutricionista o médico.',
        'Antes del primer plan respondes un chequeo de salud y declaras que la información es verdadera y completa. Si alguna respuesta indica un punto de atención (por ejemplo, problema cardíaco, embarazo o trastorno alimentario), la app te recomienda consultar a un médico antes de empezar. Si, aun habiendo sido orientado(a), decides recibir el plan, declaras estar al tanto de esa orientación; el plan se arma entonces de forma más conservadora (entrenamiento de nivel principiante; alimentación solo para mantener el peso, según el caso). Las declaraciones quedan registradas con fecha y hora y no pueden modificarse. Los menores de 18 años no reciben plan automático.',
        'Si omites o informas datos falsos (como edad, embarazo o enfermedad) para obtener un plan, los riesgos y daños que resulten son de tu exclusiva responsabilidad (Código de Defensa del Consumidor de Brasil, art. 14, §3, II). Podemos suspender la función o la cuenta cuando haya indicios de información falsa.',
        'La carga (peso) de los ejercicios siempre la defines tú. Detén el ejercicio y busca atención si sientes dolor, mareo, falta de aire fuera de lo normal o malestar.',
      ],
    },
    {
      titulo: '6. Uso aceptable',
      paragrafos: [
        'Aceptas no usar la app con fines ilegales, no intentar eludir límites de uso o de plan, no acceder a cuentas de otras personas, no hacer ingeniería inversa del servicio y no enviar contenido ofensivo, ilegal o que viole derechos de terceros.',
        'Podemos suspender o cerrar cuentas que incumplan estos Términos.',
      ],
    },
    {
      titulo: '7. Contenido y propiedad intelectual',
      paragrafos: [
        'La app, la marca ATHOSlife, el personaje Life, las recetas, ilustraciones y textos pertenecen a ATHOSlife o a sus licenciantes. Recibes una licencia personal, no exclusiva e intransferible para usar la app.',
        'Los datos que registras siguen siendo tuyos. Nos autorizas a tratarlos solo para prestar el servicio, conforme a la Política de privacidad.',
      ],
    },
    {
      titulo: '8. Limitación de responsabilidad',
      paragrafos: [
        'La app se ofrece "tal cual". En la medida en que la ley lo permita, no somos responsables de decisiones tomadas con base en información de la app, de indisponibilidad temporal ni de pérdida de datos causada por factores ajenos a nuestro control.',
        'Nada en estos Términos limita los derechos que la ley de tu país garantiza al consumidor y que no pueden excluirse por contrato.',
      ],
    },
    {
      titulo: '9. Cierre de la cuenta',
      paragrafos: [
        'Puedes dejar de usar la app y pedir la eliminación de tu cuenta en cualquier momento en Perfil > Privacidad. Eliminar la cuenta no cancela automáticamente la suscripción en Google Play; cancélala también allí.',
      ],
    },
    {
      titulo: '10. Cambios y ley aplicable',
      paragrafos: [
        'Podemos actualizar estos Términos. Te avisaremos en la app de los cambios relevantes y podremos pedirte una nueva aceptación.',
        'Estos Términos se rigen por la ley brasileña. Se elige el fuero de [CIUDAD/ESTADO], sin perjuicio del fuero del domicilio del consumidor y de las normas imperativas del país de residencia del usuario.',
        `Contacto: ${CONTATO}.`,
      ],
    },
  ],
}

const politicaEs: Documento = {
  titulo: 'Política de privacidad',
  atualizado: 'Última actualización: 21 de octubre de 2026',
  secoes: [
    {
      titulo: '1. Responsable y contacto',
      paragrafos: [
        `El responsable de tus datos es ${CONTROLADOR_ES}. Encargado de protección de datos (DPO) y contacto de privacidad: ${CONTATO}.`,
      ],
    },
    {
      titulo: '2. Datos que recopilamos',
      paragrafos: [
        'Cuenta: correo electrónico y contraseña (la contraseña la guarda cifrada nuestro proveedor de autenticación).',
        'Perfil: nombre, edad, sexo, estatura, peso, objetivo, idioma, país, zona horaria, unidades de medida y respuestas del cuestionario inicial (rutina, sueño, entrenamiento, preferencias alimentarias, alergias, suplementos, consumo de agua y nivel de estrés).',
        'Datos de salud y bienestar que registras: comidas y alimentos, agua, peso, entrenamientos, pasos, estado de ánimo y check-ins emocionales, y hábitos que sigues, incluidos los que quieres reducir.',
        'Conversaciones con Life, tu foto de perfil (si la envías) y fotos de comidas enviadas para análisis; estas se analizan y se descartan, no se guardan. Códigos de barras leídos por el lector de la app.',
        'Datos técnicos mínimos para que la app funcione y sea segura (por ejemplo, registros de uso de la IA, errores y fecha del último acceso). No usamos cookies publicitarias.',
      ],
    },
    {
      titulo: '3. Para qué los usamos y con qué base legal',
      paragrafos: [
        'Ofrecer la app y sus funciones (ejecución del contrato — LGPD art. 7, V; RGPD art. 6(1)(b)).',
        'Datos de salud: tratados con tu consentimiento específico y destacado, otorgado en la pantalla de consentimiento (LGPD art. 11, I; RGPD art. 9(2)(a)). Puedes retirar ese consentimiento en cualquier momento, pero sin él la app no puede funcionar.',
        'Seguridad, prevención de abusos y control de los límites de los planes (interés legítimo — LGPD art. 7, IX; RGPD art. 6(1)(f)).',
        'Cumplir obligaciones legales y fiscales (LGPD art. 7, II; RGPD art. 6(1)(c)).',
        'No vendemos tus datos. No usamos tus datos de salud para publicidad.',
      ],
    },
    {
      titulo: '4. Inteligencia artificial',
      paragrafos: [
        'Cuando conversas con Life, analizas una foto de un plato o pides una receta, el texto o la imagen y un resumen de tu día (por ejemplo, agua y comidas registradas) se envían a la API Gemini de Google para generar la respuesta. Según la configuración de la API de pago, Google no usa estos datos para entrenar modelos.',
        'Los mensajes con señales de riesgo para la vida reciben una respuesta fija con contactos de ayuda. En esos casos guardamos solo el término que activó la alerta, nunca el texto completo, por motivos de seguridad.',
      ],
    },
    {
      titulo: '5. Con quién los compartimos',
      paragrafos: [
        'Supabase (base de datos, autenticación y almacenamiento), Google (IA Gemini y, cuando haya suscripción, Google Play para los pagos) y Open Food Facts (recibe solo el número del código de barras leído, sin ningún dato tuyo).',
        'Estos proveedores tratan los datos en nuestro nombre y siguiendo nuestras instrucciones. También podemos compartir datos cuando la ley o una autoridad lo exija.',
      ],
    },
    {
      titulo: '6. Transferencia internacional',
      paragrafos: [
        'Nuestros proveedores pueden guardar y tratar datos fuera de tu país, incluso en Estados Unidos. En esos casos usamos las garantías previstas por la ley, como las cláusulas contractuales tipo (LGPD art. 33; RGPD art. 46).',
      ],
    },
    {
      titulo: '7. Cuánto tiempo los guardamos',
      paragrafos: [
        'Mientras tu cuenta exista. Al pedir la eliminación, borramos o anonimizamos tus datos en un plazo de 30 días, salvo lo que la ley nos obligue a conservar por más tiempo (por ejemplo, registros fiscales de pagos).',
      ],
    },
    {
      titulo: '8. Tus derechos',
      paragrafos: [
        'Puedes confirmar si tratamos tus datos, acceder a ellos, corregirlos, exportarlos (portabilidad), pedir su eliminación, retirar el consentimiento y oponerte a tratamientos basados en interés legítimo. Exportar y pedir la eliminación están en Perfil > Privacidad; lo demás, a través del contacto indicado arriba.',
        'También puedes presentar una reclamación ante la autoridad de protección de datos de tu país (en Brasil, la ANPD; en la Unión Europea, la autoridad de tu país de residencia).',
        'Residentes de California (EE. UU.): tienes los derechos de la CCPA/CPRA a saber, eliminar, corregir y limitar el uso de datos sensibles. No vendemos ni "compartimos" datos personales para publicidad comportamental.',
      ],
    },
    {
      titulo: '9. Seguridad',
      paragrafos: [
        'Usamos conexión cifrada, control de acceso por usuario en la base de datos y acceso restringido del equipo. Ningún sistema es 100% seguro; si ocurre un incidente relevante, te avisaremos a ti y a las autoridades según lo exija la ley.',
      ],
    },
    {
      titulo: '10. Edad mínima',
      paragrafos: [
        'La app no está destinada a menores de 18 años. Si sabemos que hemos recopilado datos de alguien menor de esa edad, eliminaremos la cuenta y esos datos.',
      ],
    },
    {
      titulo: '11. Cambios en esta política',
      paragrafos: [
        'Te avisaremos en la app de los cambios relevantes y, cuando la ley lo exija, te pediremos un nuevo consentimiento.',
      ],
    },
  ],
}

// fr/hi: em inglês até as versões próprias serem escritas (pendente no WORKLOG, 28/10).
const CONTROLADOR_FR = '[RAISON SOCIALE], numéro d’identification fiscale brésilien (CNPJ) [NUMÉRO], dont le siège est situé à [ADRESSE] (« ATHOSlife », « nous »)'

const conditionsFr: Documento = {
  titulo: 'Conditions d’utilisation',
  atualizado: 'Dernière mise à jour : 21 octobre 2026',
  secoes: [
    {
      titulo: '1. Qui sommes-nous',
      paragrafos: [
        `ATHOSlife est une application de suivi de l’alimentation, de l’hydratation, des entraînements, des habitudes et du bien-être, fournie par ${CONTROLADOR_FR}.`,
        'En créant un compte ou en utilisant l’application, tu acceptes ces Conditions et la Politique de confidentialité. Si tu n’es pas d’accord, n’utilise pas l’application.',
      ],
    },
    {
      titulo: '2. Pas un avis médical',
      paragrafos: [
        'ATHOSlife et le personnage Life fournissent des informations générales et des outils de suivi. Rien dans l’application ne constitue un diagnostic, une prescription ou un traitement, et elle ne remplace pas un diététicien, un médecin, un psychologue ou un professionnel du sport.',
        'Les objectifs de calories, de macronutriments et d’eau calculés par l’application sont des estimations de départ que tu peux et dois ajuster avec un professionnel. Demande conseil à un professionnel avant de modifier ton alimentation ou ton entraînement, surtout si tu as un problème de santé ou si tu es enceinte ou allaites.',
        'En cas d’urgence, ou si tu penses à te faire du mal, contacte immédiatement les services d’urgence de ton pays.',
      ],
    },
    {
      titulo: '3. Conditions d’accès',
      paragrafos: [
        'L’application est destinée aux personnes de 18 ans ou plus. En créant un compte, tu confirmes avoir au moins 18 ans.',
        'Tu es responsable de la confidentialité de ton mot de passe et de l’activité de ton compte.',
      ],
    },
    {
      titulo: '4. Intelligence artificielle',
      paragrafos: [
        'Certaines fonctionnalités utilisent l’IA (discussion avec Life, analyse de photos de repas, suggestions de recettes). Les réponses peuvent contenir des erreurs, y compris dans les valeurs nutritionnelles estimées. Vérifie avant de t’y fier.',
        'N’envoie pas à Life les données d’autres personnes ni des informations que tu ne veux pas voir traitées par une IA.',
      ],
    },
    {
      titulo: '5. Formule gratuite, abonnement et résiliation',
      paragrafos: [
        'L’application propose une formule gratuite avec des limites d’utilisation et une formule payante (Premium) avec plus de fonctionnalités. Les limites et fonctionnalités de chaque formule sont indiquées sur l’écran des formules.',
        'Les abonnements sont vendus et facturés par Google Play, au prix et dans la devise affichés dans la boutique de ton pays. Ils se renouvellent automatiquement à la fin de chaque période, sauf si tu résilies dans Google Play avant le renouvellement.',
        'S’il existe un essai gratuit, la facturation commence à la fin de l’essai, sauf résiliation avant cette date. Les remboursements suivent les règles de Google Play et le droit de la consommation de ton pays.',
      ],
    },
    {
      titulo: '5-A. Programmes de référence et déclaration de véracité',
      paragrafos: [
        'La formule payante peut créer des programmes d’entraînement et d’alimentation de référence à partir de tes choix et de recommandations publiques générales. Il s’agit d’une suggestion modifiable, pas d’une prescription individuelle, et elle ne remplace pas un professionnel du sport, un diététicien ou un médecin.',
        'Avant ton premier programme, tu réponds à un questionnaire de santé et déclares que tes informations sont vraies et complètes. Si une réponse indique un risque pour la santé (par exemple une maladie cardiaque, une grossesse ou un trouble du comportement alimentaire), l’application te recommande de consulter un médecin avant de commencer. Si, après ce conseil, tu choisis quand même de recevoir le programme, tu déclares en avoir connaissance ; le programme est alors construit de façon plus prudente (entraînements de niveau débutant ; programmes alimentaires de maintien du poids uniquement, selon le cas). Ces déclarations sont enregistrées avec la date et l’heure et ne peuvent pas être modifiées. Les personnes de moins de 18 ans ne reçoivent pas de programme automatique.',
        'Si tu omets ou fournis de fausses informations (comme l’âge, une grossesse ou une maladie) pour obtenir un programme, les risques et dommages qui en résultent relèvent de ta seule responsabilité, dans la mesure permise par la loi de ton pays. Nous pouvons suspendre la fonctionnalité ou le compte en cas d’indices de fausses informations.',
        'Tu choisis toujours la charge (le poids) de chaque exercice. Arrête l’exercice et consulte si tu ressens une douleur, des vertiges, un essoufflement inhabituel ou un malaise.',
      ],
    },
    {
      titulo: '6. Utilisation acceptable',
      paragrafos: [
        'Tu t’engages à ne pas utiliser l’application à des fins illégales, à ne pas contourner les limites d’utilisation ou de formule, à ne pas accéder aux comptes d’autres personnes, à ne pas faire de rétro-ingénierie du service et à ne pas publier de contenu offensant, illicite ou portant atteinte aux droits d’autrui.',
        'Nous pouvons suspendre ou supprimer les comptes qui ne respectent pas ces Conditions.',
      ],
    },
    {
      titulo: '7. Contenu et propriété intellectuelle',
      paragrafos: [
        'L’application, la marque ATHOSlife, le personnage Life, les recettes, les illustrations et les textes appartiennent à ATHOSlife ou à ses concédants. Tu reçois une licence personnelle, non exclusive et non transférable pour utiliser l’application.',
        'Les données que tu enregistres restent les tiennes. Tu nous autorises à les traiter uniquement pour fournir le service, comme décrit dans la Politique de confidentialité.',
      ],
    },
    {
      titulo: '8. Limitation de responsabilité',
      paragrafos: [
        'L’application est fournie « en l’état ». Dans la mesure permise par la loi, nous ne sommes pas responsables des décisions prises sur la base des informations de l’application, des indisponibilités temporaires ni des pertes de données dues à des facteurs indépendants de notre volonté.',
        'Rien dans ces Conditions ne limite les droits des consommateurs accordés par les lois de ton pays auxquels il ne peut être renoncé par contrat.',
      ],
    },
    {
      titulo: '9. Fermeture du compte',
      paragrafos: [
        'Tu peux arrêter d’utiliser l’application et demander la suppression de ton compte à tout moment dans Profil > Confidentialité et données. Supprimer ton compte ne résilie pas automatiquement ton abonnement Google Play : résilie-le aussi là-bas.',
      ],
    },
    {
      titulo: '10. Modifications et droit applicable',
      paragrafos: [
        'Nous pouvons mettre à jour ces Conditions. Nous te préviendrons dans l’application en cas de changement important et pourrons te demander de les accepter à nouveau.',
        'Ces Conditions sont régies par le droit brésilien, sans préjudice des lois impératives de protection des consommateurs de ton pays de résidence et de ton droit d’agir là où tu vis.',
        `Contact : ${CONTATO}.`,
      ],
    },
  ],
}

const confidentialiteFr: Documento = {
  titulo: 'Politique de confidentialité',
  atualizado: 'Dernière mise à jour : 21 octobre 2026',
  secoes: [
    {
      titulo: '1. Responsable du traitement et contact',
      paragrafos: [`Le responsable du traitement de tes données est ${CONTROLADOR_FR}. Délégué à la protection des données et contact confidentialité : ${CONTATO}.`],
    },
    {
      titulo: '2. Données collectées',
      paragrafos: [
        'Compte : e-mail et mot de passe (le mot de passe est stocké chiffré par notre fournisseur d’authentification).',
        'Profil : nom, âge, sexe, taille, poids, objectif, langue, pays, fuseau horaire, unités de mesure et réponses au questionnaire initial (routine, sommeil, entraînement, préférences alimentaires, allergies, compléments, consommation d’eau et niveau de stress).',
        'Données de santé et de bien-être que tu enregistres : repas et aliments, eau, poids, entraînements, pas, humeur et check-ins émotionnels, et habitudes suivies, y compris celles que tu veux réduire.',
        'Discussions avec Life, ta photo de profil (si tu en ajoutes une) et les photos de repas envoyées pour analyse — elles sont analysées puis supprimées, pas conservées. Codes-barres scannés avec le lecteur de l’application.',
        'Données techniques minimales nécessaires au fonctionnement et à la sécurité de l’application (par exemple journaux d’utilisation de l’IA, erreurs et date du dernier accès). Nous n’utilisons pas de cookies publicitaires.',
      ],
    },
    {
      titulo: '3. Finalités et base légale',
      paragrafos: [
        'Fournir l’application et ses fonctionnalités (exécution du contrat — RGPD art. 6(1)(b) ; LGPD art. 7, V).',
        'Données de santé : traitées avec ton consentement explicite, donné sur l’écran de consentement (RGPD art. 9(2)(a) ; LGPD art. 11, I). Tu peux le retirer à tout moment, mais l’application ne peut pas fonctionner sans lui.',
        'Sécurité, prévention des abus et respect des limites des formules (intérêt légitime — RGPD art. 6(1)(f) ; LGPD art. 7, IX).',
        'Obligations légales et fiscales (RGPD art. 6(1)(c) ; LGPD art. 7, II).',
        'Nous ne vendons pas tes données. Nous n’utilisons pas tes données de santé à des fins publicitaires.',
      ],
    },
    {
      titulo: '4. Intelligence artificielle',
      paragrafos: [
        'Quand tu discutes avec Life, analyses une photo de repas ou demandes une recette, le texte ou l’image et un résumé de ta journée (par exemple l’eau et les repas enregistrés) sont envoyés à l’API Gemini de Google pour générer la réponse. Selon les conditions de l’API payante, Google n’utilise pas ces données pour entraîner ses modèles.',
        'Les messages présentant des signes de risque pour la vie reçoivent une réponse fixe avec des contacts d’aide. Dans ces cas, nous conservons uniquement le terme qui a déclenché l’alerte, jamais le message complet, pour des raisons de sécurité.',
      ],
    },
    {
      titulo: '5. Avec qui nous les partageons',
      paragrafos: [
        'Supabase (base de données, authentification et stockage), Google (IA Gemini et, pour les abonnements, la facturation Google Play) et Open Food Facts (reçoit uniquement le numéro du code-barres scanné, aucune de tes données).',
        'Ces prestataires traitent les données pour notre compte et selon nos instructions. Nous pouvons aussi partager des données lorsque la loi ou une autorité l’exige.',
      ],
    },
    {
      titulo: '6. Transferts internationaux',
      paragrafos: [
        'Nos prestataires peuvent stocker et traiter des données hors de ton pays, notamment aux États-Unis. Dans ce cas, nous nous appuyons sur des garanties légales comme les clauses contractuelles types (RGPD art. 46 ; LGPD art. 33).',
      ],
    },
    {
      titulo: '7. Durée de conservation',
      paragrafos: [
        'Tant que ton compte existe. Quand tu demandes la suppression, nous supprimons ou anonymisons tes données sous 30 jours, sauf ce que la loi nous oblige à conserver plus longtemps (par exemple les justificatifs fiscaux de paiement).',
      ],
    },
    {
      titulo: '8. Tes droits',
      paragrafos: [
        'Tu peux accéder à tes données, les rectifier, les exporter (portabilité) et les supprimer, retirer ton consentement et t’opposer aux traitements fondés sur l’intérêt légitime. L’export et la suppression se trouvent dans Profil > Confidentialité et données ; pour le reste, utilise le contact ci-dessus.',
        'Tu peux aussi déposer une réclamation auprès de l’autorité de protection des données de ton pays (en France, la CNIL).',
        'Résidents de Californie : tu disposes des droits CCPA/CPRA de savoir, supprimer, rectifier et limiter l’utilisation des informations personnelles sensibles. Nous ne vendons ni ne « partageons » d’informations personnelles pour de la publicité comportementale inter-contextes.',
      ],
    },
    {
      titulo: '9. Sécurité',
      paragrafos: [
        'Nous utilisons des connexions chiffrées, un contrôle d’accès par utilisateur dans la base de données et un accès restreint pour l’équipe. Aucun système n’est sûr à 100 % ; en cas d’incident important, nous te préviendrons, ainsi que les autorités, comme la loi l’exige.',
      ],
    },
    {
      titulo: '10. Âge minimum',
      paragrafos: [
        'L’application n’est pas destinée aux moins de 18 ans. Si nous apprenons avoir collecté des données d’une personne de moins de cet âge, nous supprimerons le compte et ces données.',
      ],
    },
    {
      titulo: '11. Modifications de cette politique',
      paragrafos: ['Nous te préviendrons dans l’application en cas de changement important et demanderons un nouveau consentement lorsque la loi l’exige.'],
    },
  ],
}

const CONTROLADOR_HI = '[कंपनी का कानूनी नाम], ब्राज़ीलियन टैक्स आईडी (CNPJ) [नंबर], पता [पता] ("ATHOSlife", "हम")'

const termsHi: Documento = {
  titulo: 'उपयोग की शर्तें',
  atualizado: 'अंतिम अपडेट: 21 अक्टूबर 2026',
  secoes: [
    {
      titulo: '1. हम कौन हैं',
      paragrafos: [
        `ATHOSlife खाना, पानी, वर्कआउट, आदतों और वेल-बीइंग को ट्रैक करने का ऐप है, जिसे ${CONTROLADOR_HI} उपलब्ध कराता है।`,
        'अकाउंट बनाकर या ऐप इस्तेमाल करके आप इन शर्तों और प्राइवेसी पॉलिसी से सहमत होते हैं। अगर आप सहमत नहीं हैं, तो ऐप इस्तेमाल न करें।',
      ],
    },
    {
      titulo: '2. यह मेडिकल सलाह नहीं है',
      paragrafos: [
        'ATHOSlife और Life कैरेक्टर सामान्य जानकारी और रिकॉर्ड रखने के टूल देते हैं। ऐप की कोई भी चीज़ डायग्नोसिस, प्रिस्क्रिप्शन या इलाज नहीं है, और यह डाइटीशियन, डॉक्टर, साइकोलॉजिस्ट या फिटनेस प्रोफेशनल की जगह नहीं लेता।',
        'ऐप जो कैलोरी, मैक्रोन्यूट्रिएंट और पानी के लक्ष्य निकालता है, वे शुरुआती अनुमान हैं, जिन्हें आप किसी प्रोफेशनल के साथ बदल सकते हैं और बदलना चाहिए। डाइट या ट्रेनिंग बदलने से पहले प्रोफेशनल सलाह लें, ख़ासकर अगर आपको कोई हेल्थ कंडीशन है या आप प्रेग्नेंट हैं या बच्चे को दूध पिलाती हैं।',
        'इमरजेंसी में, या अगर आप ख़ुद को नुकसान पहुँचाने के बारे में सोच रहे हैं, तो तुरंत अपने इलाके की इमरजेंसी सेवा से संपर्क करें।',
      ],
    },
    {
      titulo: '3. पात्रता',
      paragrafos: [
        'यह ऐप 18 साल या उससे ज़्यादा उम्र के लोगों के लिए है। अकाउंट बनाकर आप पुष्टि करते हैं कि आपकी उम्र कम से कम 18 साल है।',
        'अपना पासवर्ड गुप्त रखना और अपने अकाउंट की गतिविधि आपकी ज़िम्मेदारी है।',
      ],
    },
    {
      titulo: '4. आर्टिफ़िशियल इंटेलिजेंस',
      paragrafos: [
        'कुछ फ़ीचर AI इस्तेमाल करते हैं (Life से चैट, खाने की फ़ोटो का विश्लेषण, रेसिपी के सुझाव)। जवाबों में गलतियाँ हो सकती हैं, अनुमानित न्यूट्रिशन वैल्यू में भी। भरोसा करने से पहले जाँच लें।',
        'Life को दूसरे लोगों का डेटा या ऐसी जानकारी न भेजें जिसे आप AI से प्रोसेस नहीं करवाना चाहते।',
      ],
    },
    {
      titulo: '5. फ़्री प्लान, सब्सक्रिप्शन और कैंसिलेशन',
      paragrafos: [
        'ऐप में इस्तेमाल की सीमा वाला एक फ़्री प्लान और ज़्यादा फ़ीचर वाला पेड प्लान (Premium) है। हर प्लान की सीमाएँ और फ़ीचर प्लान वाली स्क्रीन पर दिखते हैं।',
        'सब्सक्रिप्शन Google Play बेचता है और उसी से बिल होता है, आपके देश के स्टोर में दिखाई गई कीमत और करेंसी में। हर अवधि के अंत में यह अपने-आप रिन्यू होता है, जब तक आप रिन्यूअल से पहले Google Play में कैंसिल न करें।',
        'अगर फ़्री ट्रायल है, तो ट्रायल ख़त्म होते ही बिलिंग शुरू होती है, जब तक आप उससे पहले कैंसिल न करें। रिफ़ंड Google Play की नीतियों और आपके देश के उपभोक्ता क़ानूनों के अनुसार होते हैं।',
      ],
    },
    {
      titulo: '5-A. रेफ़रेंस प्लान और सच्चाई की घोषणा',
      paragrafos: [
        'पेड प्लान आपकी पसंद और सामान्य सार्वजनिक दिशानिर्देशों से रेफ़रेंस वर्कआउट और डाइट प्लान बना सकता है। यह बदला जा सकने वाला सुझाव है, व्यक्तिगत प्रिस्क्रिप्शन नहीं, और यह फिटनेस प्रोफेशनल, डाइटीशियन या डॉक्टर की जगह नहीं लेता।',
        'पहले प्लान से पहले आप एक हेल्थ चेक का जवाब देते हैं और घोषणा करते हैं कि आपकी जानकारी सच और पूरी है। अगर कोई जवाब किसी हेल्थ जोखिम की ओर इशारा करे (जैसे दिल की बीमारी, प्रेग्नेंसी या ईटिंग डिसऑर्डर), तो ऐप शुरू करने से पहले डॉक्टर से मिलने की सलाह देता है। अगर इस सलाह के बाद भी आप प्लान लेना चुनते हैं, तो आप घोषणा करते हैं कि आप इससे अवगत हैं; तब प्लान ज़्यादा सावधानी से बनता है (शुरुआती स्तर के वर्कआउट; ज़रूरत के हिसाब से सिर्फ़ वज़न बनाए रखने वाले डाइट प्लान)। ये घोषणाएँ तारीख़ और समय के साथ दर्ज होती हैं और बदली नहीं जा सकतीं। 18 साल से कम उम्र के लोगों को ऑटोमैटिक प्लान नहीं मिलता।',
        'अगर आप प्लान पाने के लिए कोई जानकारी छिपाते हैं या गलत देते हैं (जैसे उम्र, प्रेग्नेंसी या बीमारी), तो उससे होने वाले जोखिम और नुकसान की ज़िम्मेदारी सिर्फ़ आपकी है, जहाँ तक आपके देश का क़ानून अनुमति देता है। गलत जानकारी के संकेत मिलने पर हम फ़ीचर या अकाउंट निलंबित कर सकते हैं।',
        'हर एक्सरसाइज़ का लोड (वज़न) हमेशा आप चुनते हैं। दर्द, चक्कर, असामान्य साँस फूलना या तबीयत ख़राब लगे तो एक्सरसाइज़ रोकें और मदद लें।',
      ],
    },
    {
      titulo: '6. स्वीकार्य इस्तेमाल',
      paragrafos: [
        'आप सहमत हैं कि ऐप को ग़ैरक़ानूनी कामों के लिए इस्तेमाल नहीं करेंगे, इस्तेमाल या प्लान की सीमाओं को बायपास करने की कोशिश नहीं करेंगे, दूसरों के अकाउंट एक्सेस नहीं करेंगे, सेवा की रिवर्स-इंजीनियरिंग नहीं करेंगे, और आपत्तिजनक, ग़ैरक़ानूनी या दूसरों के अधिकारों का उल्लंघन करने वाला कंटेंट अपलोड नहीं करेंगे।',
        'इन शर्तों को तोड़ने वाले अकाउंट हम निलंबित या बंद कर सकते हैं।',
      ],
    },
    {
      titulo: '7. कंटेंट और बौद्धिक संपदा',
      paragrafos: [
        'ऐप, ATHOSlife ब्रांड, Life कैरेक्टर, रेसिपी, इलस्ट्रेशन और टेक्स्ट ATHOSlife या उसके लाइसेंसदाताओं के हैं। आपको ऐप इस्तेमाल करने के लिए व्यक्तिगत, नॉन-एक्सक्लूसिव और नॉन-ट्रांसफ़रेबल लाइसेंस मिलता है।',
        'आप जो डेटा दर्ज करते हैं, वह आपका ही रहता है। आप हमें उसे सिर्फ़ सेवा देने के लिए प्रोसेस करने की अनुमति देते हैं, जैसा प्राइवेसी पॉलिसी में बताया गया है।',
      ],
    },
    {
      titulo: '8. देनदारी की सीमा',
      paragrafos: [
        'ऐप "जैसा है" के आधार पर दिया जाता है। क़ानून की अनुमति की सीमा तक, ऐप की जानकारी के आधार पर लिए गए फ़ैसलों, अस्थायी अनुपलब्धता, या हमारे नियंत्रण से बाहर के कारणों से हुए डेटा लॉस के लिए हम ज़िम्मेदार नहीं हैं।',
        'इन शर्तों की कोई भी बात आपके देश के क़ानून से मिले उन उपभोक्ता अधिकारों को सीमित नहीं करती जिन्हें कॉन्ट्रैक्ट से छोड़ा नहीं जा सकता।',
      ],
    },
    {
      titulo: '9. अकाउंट बंद करना',
      paragrafos: [
        'आप कभी भी ऐप इस्तेमाल करना बंद कर सकते हैं और प्रोफ़ाइल > प्राइवेसी और डेटा में अकाउंट डिलीट करने का अनुरोध कर सकते हैं। अकाउंट डिलीट करने से आपका Google Play सब्सक्रिप्शन अपने-आप कैंसिल नहीं होता — उसे वहाँ भी कैंसिल करें।',
      ],
    },
    {
      titulo: '10. बदलाव और लागू क़ानून',
      paragrafos: [
        'हम इन शर्तों को अपडेट कर सकते हैं। बड़े बदलावों की सूचना हम ऐप में देंगे और आपसे दोबारा स्वीकार करने को कह सकते हैं।',
        'ये शर्तें ब्राज़ील के क़ानून के अधीन हैं, आपके निवास वाले देश के अनिवार्य उपभोक्ता-संरक्षण क़ानूनों और जहाँ आप रहते हैं वहाँ दावा करने के आपके अधिकार को प्रभावित किए बिना।',
        `संपर्क: ${CONTATO}।`,
      ],
    },
  ],
}

const privacyHi: Documento = {
  titulo: 'प्राइवेसी पॉलिसी',
  atualizado: 'अंतिम अपडेट: 21 अक्टूबर 2026',
  secoes: [
    {
      titulo: '1. डेटा नियंत्रक और संपर्क',
      paragrafos: [`आपके डेटा का नियंत्रक ${CONTROLADOR_HI} है। डेटा प्रोटेक्शन ऑफ़िसर और प्राइवेसी संपर्क: ${CONTATO}।`],
    },
    {
      titulo: '2. हम कौन-सा डेटा लेते हैं',
      paragrafos: [
        'अकाउंट: ईमेल और पासवर्ड (पासवर्ड हमारे ऑथेंटिकेशन प्रोवाइडर के पास एन्क्रिप्टेड रूप में रहता है)।',
        'प्रोफ़ाइल: नाम, उम्र, लिंग, लंबाई, वज़न, लक्ष्य, भाषा, देश, टाइम ज़ोन, माप की इकाइयाँ, और शुरुआती सवालों के जवाब (रूटीन, नींद, वर्कआउट, खाने की पसंद, एलर्जी, सप्लीमेंट, पानी और स्ट्रेस का स्तर)।',
        'आपके दर्ज किए हेल्थ और वेल-बीइंग डेटा: भोजन और खाद्य पदार्थ, पानी, वज़न, वर्कआउट, कदम, मूड और इमोशनल चेक-इन, और जिन आदतों को आप ट्रैक करते हैं, उनमें वे आदतें भी जिन्हें आप कम करना चाहते हैं।',
        'Life से चैट, आपकी प्रोफ़ाइल फ़ोटो (अगर आप लगाते हैं) और विश्लेषण के लिए भेजी गई खाने की फ़ोटो — इनका विश्लेषण करके इन्हें हटा दिया जाता है, सेव नहीं किया जाता। ऐप के रीडर से स्कैन किए गए बारकोड।',
        'ऐप चलाने और सुरक्षित रखने के लिए ज़रूरी न्यूनतम तकनीकी डेटा (जैसे AI इस्तेमाल के लॉग, एरर और आख़िरी एक्सेस की तारीख़)। हम विज्ञापन वाली कुकीज़ इस्तेमाल नहीं करते।',
      ],
    },
    {
      titulo: '3. हम इसे क्यों इस्तेमाल करते हैं और क़ानूनी आधार',
      paragrafos: [
        'ऐप और उसके फ़ीचर देने के लिए (कॉन्ट्रैक्ट का पालन — GDPR अनु. 6(1)(b); LGPD अनु. 7, V)।',
        'हेल्थ डेटा: आपकी स्पष्ट सहमति से प्रोसेस होता है, जो आप सहमति वाली स्क्रीन पर देते हैं (GDPR अनु. 9(2)(a); LGPD अनु. 11, I)। आप इसे कभी भी वापस ले सकते हैं, लेकिन इसके बिना ऐप काम नहीं कर सकता।',
        'सुरक्षा, दुरुपयोग रोकना और प्लान की सीमाएँ लागू करना (वैध हित — GDPR अनु. 6(1)(f); LGPD अनु. 7, IX)।',
        'क़ानूनी और टैक्स दायित्व (GDPR अनु. 6(1)(c); LGPD अनु. 7, II)।',
        'हम आपका डेटा नहीं बेचते। हम आपके हेल्थ डेटा को विज्ञापन के लिए इस्तेमाल नहीं करते।',
      ],
    },
    {
      titulo: '4. आर्टिफ़िशियल इंटेलिजेंस',
      paragrafos: [
        'जब आप Life से चैट करते हैं, खाने की फ़ोटो का विश्लेषण करते हैं या रेसिपी माँगते हैं, तो टेक्स्ट या इमेज और आपके दिन का सारांश (जैसे दर्ज पानी और भोजन) जवाब बनाने के लिए Google की Gemini API को भेजा जाता है। पेड API की शर्तों के तहत Google इस डेटा से अपने मॉडल ट्रेन नहीं करता।',
        'जिन मैसेज में जान के जोखिम के संकेत हों, उन्हें मदद के संपर्कों वाला एक तय जवाब मिलता है। ऐसे मामलों में सुरक्षा के लिए हम सिर्फ़ वह शब्द सेव करते हैं जिससे अलर्ट आया, पूरा मैसेज कभी नहीं।',
      ],
    },
    {
      titulo: '5. हम किसके साथ साझा करते हैं',
      paragrafos: [
        'Supabase (डेटाबेस, ऑथेंटिकेशन और स्टोरेज), Google (Gemini AI और, सब्सक्रिप्शन के लिए, Google Play बिलिंग) और Open Food Facts (सिर्फ़ स्कैन किए गए बारकोड का नंबर पाता है, आपका कोई डेटा नहीं)।',
        'ये प्रोवाइडर हमारी ओर से और हमारे निर्देशों पर डेटा प्रोसेस करते हैं। क़ानून या किसी प्राधिकरण की माँग पर भी हम डेटा साझा कर सकते हैं।',
      ],
    },
    {
      titulo: '6. अंतरराष्ट्रीय ट्रांसफ़र',
      paragrafos: [
        'हमारे प्रोवाइडर आपके देश के बाहर, अमेरिका समेत, डेटा स्टोर और प्रोसेस कर सकते हैं। ऐसे मामलों में हम स्टैंडर्ड कॉन्ट्रैक्चुअल क्लॉज़ जैसे क़ानूनी सुरक्षा उपायों पर निर्भर रहते हैं (GDPR अनु. 46; LGPD अनु. 33)।',
      ],
    },
    {
      titulo: '7. डेटा कितने समय रखा जाता है',
      paragrafos: [
        'जब तक आपका अकाउंट है। डिलीट का अनुरोध करने पर हम 30 दिनों के अंदर आपका डेटा डिलीट या अनाम कर देते हैं, सिवाय उसके जिसे क़ानून के अनुसार ज़्यादा समय रखना ज़रूरी है (जैसे भुगतान के टैक्स रिकॉर्ड)।',
      ],
    },
    {
      titulo: '8. आपके अधिकार',
      paragrafos: [
        'आप अपना डेटा देख, सुधार, एक्सपोर्ट (पोर्टेबिलिटी) और डिलीट कर सकते हैं, सहमति वापस ले सकते हैं, और वैध हित पर आधारित प्रोसेसिंग पर आपत्ति कर सकते हैं। एक्सपोर्ट और डिलीट प्रोफ़ाइल > प्राइवेसी और डेटा में हैं; बाक़ी सब के लिए ऊपर दिए संपर्क का इस्तेमाल करें।',
        'आप अपने देश के डेटा प्रोटेक्शन प्राधिकरण से शिकायत भी कर सकते हैं।',
        'कैलिफ़ोर्निया के निवासी: आपके पास CCPA/CPRA के तहत जानने, डिलीट करने, सुधारने और संवेदनशील व्यक्तिगत जानकारी के इस्तेमाल को सीमित करने के अधिकार हैं। हम क्रॉस-कॉन्टेक्स्ट बिहेवियरल विज्ञापन के लिए व्यक्तिगत जानकारी न बेचते हैं न "साझा" करते हैं।',
      ],
    },
    {
      titulo: '9. सुरक्षा',
      paragrafos: [
        'हम एन्क्रिप्टेड कनेक्शन, डेटाबेस में हर यूज़र के लिए एक्सेस कंट्रोल और टीम के लिए सीमित एक्सेस इस्तेमाल करते हैं। कोई भी सिस्टम 100% सुरक्षित नहीं होता; कोई गंभीर घटना होने पर हम क़ानून के अनुसार आपको और प्राधिकरणों को सूचित करेंगे।',
      ],
    },
    {
      titulo: '10. न्यूनतम उम्र',
      paragrafos: [
        'यह ऐप 18 साल से कम उम्र के लोगों के लिए नहीं है। अगर हमें पता चलता है कि हमने इससे कम उम्र के किसी व्यक्ति का डेटा लिया है, तो हम अकाउंट और वह डेटा डिलीट कर देंगे।',
      ],
    },
    {
      titulo: '11. इस पॉलिसी में बदलाव',
      paragrafos: ['बड़े बदलावों की सूचना हम ऐप में देंगे और जहाँ क़ानून ज़रूरी बनाए, वहाँ नई सहमति माँगेंगे।'],
    },
  ],
}

export const TERMOS: Record<Idioma, Documento> = { 'pt-BR': termosPt, en: termsEn, es: terminosEs, fr: conditionsFr, hi: termsHi }
export const POLITICA: Record<Idioma, Documento> = { 'pt-BR': politicaPt, en: privacyEn, es: politicaEs, fr: confidentialiteFr, hi: privacyHi }
