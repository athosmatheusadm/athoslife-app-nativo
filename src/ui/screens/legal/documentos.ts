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
export const VERSAO_DOCUMENTOS = 'v2.2-2026-09-29'

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
  atualizado: 'Última atualização: 28 de setembro de 2026',
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
        'O app é destinado a pessoas com 16 anos ou mais. Se você tem entre 16 e 18 anos, precisa da autorização de um responsável legal.',
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
  atualizado: 'Última atualização: 28 de setembro de 2026',
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
        'O app não é destinado a menores de 16 anos. Se soubermos que coletamos dados de alguém abaixo dessa idade sem autorização, apagaremos esses dados.',
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
  atualizado: 'Last updated: September 28, 2026',
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
        'The app is intended for people aged 16 or older. If you are under 18 (or the age of majority where you live), you need permission from a parent or legal guardian.',
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
  atualizado: 'Last updated: September 28, 2026',
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
        "The app is not intended for children under 16. If we learn we've collected data from someone under that age without permission, we'll delete it.",
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
  atualizado: 'Última actualización: 28 de septiembre de 2026',
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
        'La app está destinada a personas de 16 años o más. Si tienes entre 16 y 18 años, necesitas la autorización de tu representante legal.',
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
  atualizado: 'Última actualización: 28 de septiembre de 2026',
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
        'La app no está destinada a menores de 16 años. Si sabemos que hemos recopilado datos de alguien menor de esa edad sin autorización, los eliminaremos.',
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

export const TERMOS: Record<Idioma, Documento> = { 'pt-BR': termosPt, en: termsEn, es: terminosEs }
export const POLITICA: Record<Idioma, Documento> = { 'pt-BR': politicaPt, en: privacyEn, es: politicaEs }
