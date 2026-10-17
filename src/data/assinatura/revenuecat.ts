import { Capacitor } from '@capacitor/core'
import {
  LOG_LEVEL,
  PACKAGE_TYPE,
  Purchases,
  PURCHASES_ERROR_CODE,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor'
import { supabase } from '@data/supabase/client'

/**
 * Assinatura pelo RevenueCat (Google Play Billing por baixo).
 *
 * O app compra com o SDK usando o id do usuário do Supabase como appUserID
 * e depois chama a Edge Function rc-sync: o servidor lê o cliente direto na
 * API do RevenueCat e atualiza o perfil (plano, Fundador) via
 * aplicar_cliente_rc (db/athoslife_assinaturas_revenuecat_migration.sql).
 * O app nunca decide o plano.
 *
 * Sem VITE_RC_GOOGLE_KEY ou fora do Android tudo aqui vira no-op — a tela
 * de Plano continua com o aviso de "em breve".
 */

/** Chave PÚBLICA do app Android no RevenueCat ("goog_..."). Pode ficar no app. */
const CHAVE_PUBLICA_ANDROID = import.meta.env.VITE_RC_GOOGLE_KEY ?? ''

export type PlanoLojaId = 'mensal' | 'anual'

export interface PlanoLoja {
  readonly plano: PlanoLojaId
  readonly preco: string
  readonly pacote: PurchasesPackage
}

export interface DireitoServidor {
  readonly plano: string | null
  readonly plano_tipo: 'fundador' | 'premium' | null
  readonly assinatura_expira: string | null
  readonly fundador_numero: number | null
}

export interface ResultadoSync {
  readonly direito: DireitoServidor
  readonly vagas_fundador: number | null
}

export type CodigoErroAssinatura =
  | 'cancelado'
  | 'pendente'
  | 'ja_assinado_outra_conta'
  | 'sem_loja'
  | 'not_authenticated'
  | 'revenuecat_indisponivel'
  | 'generico'

/** Erro com código; a tela traduz pelo i18n (perfil.plano.loja.erros). */
export class ErroAssinatura extends Error {
  constructor(public readonly codigo: CodigoErroAssinatura) {
    super(codigo)
  }
}

export const lojaDisponivel = (): boolean =>
  Capacitor.getPlatform() === 'android' && CHAVE_PUBLICA_ANDROID.length > 0

let usuarioConfigurado: string | null = null
let ouvinte = false

/**
 * Liga o RevenueCat à conta do Supabase e sincroniza o plano.
 * Chamar depois do login e ao abrir o app já logado. Nunca lança.
 */
export async function iniciarAssinaturas(userId: string): Promise<ResultadoSync | null> {
  if (!lojaDisponivel()) return null
  try {
    if (!usuarioConfigurado) {
      if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG })
      await Purchases.configure({ apiKey: CHAVE_PUBLICA_ANDROID, appUserID: userId })
    } else if (usuarioConfigurado !== userId) {
      await Purchases.logIn({ appUserID: userId })
    }
    usuarioConfigurado = userId
    if (!ouvinte) {
      ouvinte = true
      // Renovação ou mudança com o app aberto: confere no servidor.
      let timer: ReturnType<typeof setTimeout> | undefined
      await Purchases.addCustomerInfoUpdateListener(() => {
        clearTimeout(timer)
        timer = setTimeout(() => void sincronizar().catch(() => {}), 1500)
      })
    }
    return await sincronizar()
  } catch (err) {
    console.warn('assinatura: iniciar falhou', err)
    return null
  }
}

/** Chamar no logout. */
export async function encerrarAssinaturas(): Promise<void> {
  if (!lojaDisponivel() || !usuarioConfigurado) return
  try {
    await Purchases.logOut()
  } catch {
    // já era anônimo
  }
  usuarioConfigurado = null
}

/** Planos com preço da loja. Vazio = loja ainda não configurada. */
export async function carregarPlanos(): Promise<PlanoLoja[]> {
  if (!lojaDisponivel() || !usuarioConfigurado) return []
  try {
    const ofertas = await Purchases.getOfferings()
    const pacotes = ofertas.current?.availablePackages ?? []
    const achar = (tipo: PACKAGE_TYPE) => pacotes.find((p) => p.packageType === tipo)
    const lista: [PlanoLojaId, PurchasesPackage | undefined][] = [
      ['mensal', achar(PACKAGE_TYPE.MONTHLY)],
      ['anual', achar(PACKAGE_TYPE.ANNUAL)],
    ]
    return lista.flatMap(([plano, p]) => (p ? [{ plano, preco: p.product.priceString, pacote: p }] : []))
  } catch (err) {
    console.warn('assinatura: ofertas indisponíveis', err)
    return []
  }
}

/** Vagas de Fundador restantes (null = não deu pra consultar). */
export async function vagasFundador(): Promise<number | null> {
  const { data, error } = await supabase.rpc('vagas_fundador_disponiveis')
  return error ? null : (data as number)
}

/** Número de Fundador da própria conta (RLS: só lê o próprio). */
export async function meuNumeroFundador(): Promise<number | null> {
  const { data } = await supabase.from('fundadores').select('numero').maybeSingle<{ numero: number }>()
  return data?.numero ?? null
}

/** Pede ao servidor para ler o RevenueCat e atualizar o perfil. */
export async function sincronizar(): Promise<ResultadoSync> {
  const { data, error } = await supabase.functions.invoke('rc-sync', { body: {} })
  if (error) {
    let codigo = ''
    try {
      codigo = (await (error as { context?: Response }).context?.json())?.error ?? ''
    } catch {
      // sem corpo
    }
    throw new ErroAssinatura(
      codigo === 'not_authenticated' || codigo === 'revenuecat_indisponivel' ? codigo : 'generico',
    )
  }
  return data as ResultadoSync
}

function traduzirErroLoja(e: unknown): never {
  const err = e as { code?: string; userCancelled?: boolean | null }
  if (err.userCancelled || err.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) throw new ErroAssinatura('cancelado')
  if (err.code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) throw new ErroAssinatura('pendente')
  if (err.code === PURCHASES_ERROR_CODE.RECEIPT_ALREADY_IN_USE_ERROR) throw new ErroAssinatura('ja_assinado_outra_conta')
  throw new ErroAssinatura('generico')
}

export async function assinar(plano: PlanoLoja): Promise<ResultadoSync> {
  if (!lojaDisponivel()) throw new ErroAssinatura('sem_loja')
  if (!usuarioConfigurado) throw new ErroAssinatura('not_authenticated')
  try {
    await Purchases.purchasePackage({ aPackage: plano.pacote })
  } catch (e) {
    traduzirErroLoja(e)
  }
  // O RevenueCat já conferiu a compra; o servidor só confirma e aplica no perfil.
  return sincronizar()
}

/** Botão "Restaurar compras". */
export async function restaurar(): Promise<ResultadoSync> {
  if (!lojaDisponivel()) throw new ErroAssinatura('sem_loja')
  if (usuarioConfigurado) {
    try {
      await Purchases.restorePurchases()
    } catch (e) {
      traduzirErroLoja(e)
    }
  }
  return sincronizar()
}

/** Abre a página do Google Play para cancelar ou trocar o cartão. */
export async function gerenciarAssinatura(): Promise<void> {
  let url = 'https://play.google.com/store/account/subscriptions'
  if (lojaDisponivel() && usuarioConfigurado) {
    try {
      const { customerInfo } = await Purchases.getCustomerInfo()
      url = customerInfo.managementURL ?? url
    } catch {
      // usa a página geral
    }
  }
  window.open(url, '_system')
}
