import { Preferences } from '@capacitor/preferences'

/**
 * Adapter de storage para o Supabase Auth.
 *
 * Por que existe: o PWA usava localStorage, que não é o mecanismo correto
 * num app nativo. Preferences usa SharedPreferences no Android e
 * UserDefaults no iOS — sobrevive a reinstalação do WebView e é o caminho
 * suportado pela plataforma.
 *
 * Nenhum dado de negócio mora aqui. Apenas o token de sessão.
 */
export const capacitorAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key })
    return value
  },
  async setItem(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value })
  },
  async removeItem(key: string): Promise<void> {
    await Preferences.remove({ key })
  },
}
