import type { Idioma } from '@domain/rules/localidade'

/**
 * Termos de uso + Política de privacidade — RASCUNHO escrito pelo Claude
 * (2026-09-28), a revisar por advogado antes da publicação na Play.
 * Campos entre [colchetes] o dono precisa preencher.
 *
 * Mudou o texto de forma relevante? Suba VERSAO_DOCUMENTOS — ela vai pro
 * perfil no aceite (profiles.consentimento_versao) e permite pedir novo
 * aceite depois.
 *
 * Espanhol ainda usa o texto em inglês (tradução jurídica pendente).
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

export const TERMOS: Record<Idioma, Documento> = { 'pt-BR': termosPt, en: termsEn, es: termsEn }
export const POLITICA: Record<Idioma, Documento> = { 'pt-BR': politicaPt, en: privacyEn, es: privacyEn }
