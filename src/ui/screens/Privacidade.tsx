import { dataLocalISO } from '@domain/rules/datas'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { authRepository } from '@data/repositories/authRepository'
import { privacidadeRepository } from '@data/repositories/privacidadeRepository'
import { profileRepository } from '@data/repositories/profileRepository'
import { CabecalhoSubpagina } from '@ui/components/CabecalhoSubpagina'
import { useI18n } from '@/i18n/I18nProvider'
import { avisar, vibrar } from '@ui/feedback'

/**
 * Sub-página "Privacidade e dados" do Perfil.
 *
 * Exportar: baixa um JSON real com todo dado pessoal do usuário (direito
 * de portabilidade). Excluir: apaga a conta de verdade, confirmando a
 * senha (ver privacidadeRepository.excluirConta).
 */
export function Privacidade() {
  const navigate = useNavigate()
  const { profile, refresh } = useSession()
  const [trocandoHabitos, setTrocandoHabitos] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [erroExport, setErroExport] = useState(false)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)
  const [senha, setSenha] = useState('')
  const [pedidoEnviado, setPedidoEnviado] = useState(false)
  const { m } = useI18n()
  const t = m.perfil.privacidade

  if (!profile) return null

  async function exportar() {
    setErroExport(false)
    setExportando(true)
    try {
      const dados = await privacidadeRepository.exportarMeusDados()
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `athoslife-meus-dados-${dataLocalISO()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setErroExport(true)
    } finally {
      setExportando(false)
    }
  }

  async function confirmarExclusao() {
    setErroExclusao(null)
    setExcluindo(true)
    try {
      const r = await privacidadeRepository.excluirConta(senha)
      if (r !== 'ok') {
        setErroExclusao(r === 'senha_incorreta' ? t.senhaIncorreta : t.muitasTentativas)
        setExcluindo(false)
        return
      }
      setPedidoEnviado(true)
      avisar.ok(t.pedidoOk)
      await authRepository.limparSessaoLocal()
      navigate('/login', { replace: true })
    } catch {
      setErroExclusao(t.erroExclusao)
      setExcluindo(false)
    }
  }

  return (
    <main className="pb-24 pt-safe-t">
      <CabecalhoSubpagina titulo={t.titulo} />

      <section className="mx-5 mt-2 rounded-2xl border border-surface-4 bg-surface-2 p-4">
        <p className="text-sm font-bold text-content-hi">{t.consentimento}</p>
        <p className="mt-1 text-micro text-content-low">
          {profile.consentimentoAceito ? t.termosAceitos : t.termosNao}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-micro text-content-low">{t.habitos(profile.consentimentoHabitos)}</p>
          <button
            type="button"
            disabled={trocandoHabitos}
            onClick={() => {
              // Retirar o consentimento só esconde a tela e tira os hábitos
              // do contexto do Life; os registros continuam até a exclusão.
              setTrocandoHabitos(true)
              void profileRepository
                .definirConsentimentoHabitos(!profile.consentimentoHabitos)
                .then(() => {
                  vibrar.leve()
                  return refresh()
                })
                .catch(() => avisar.erro(m.perfil.erroSalvar))
                .finally(() => setTrocandoHabitos(false))
            }}
            className="min-h-11 flex-none rounded-pill border border-surface-4 px-4 text-sm font-semibold text-content-mid active:bg-white/5 disabled:opacity-50"
          >
            {profile.consentimentoHabitos ? t.retirar : t.autorizar}
          </button>
        </div>
      </section>

      {/* Memória do Life (consentimento próprio): ver, fixar e apagar o que ele lembra. */}
      <button
        type="button"
        onClick={() => navigate('/perfil/privacidade/life')}
        className="mx-5 mt-3 flex min-h-16 w-[calc(100%-2.5rem)] items-center gap-3 rounded-2xl border border-surface-4 bg-surface-2 p-4 text-left active:bg-white/5"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-content-hi">{m.perfil.memoriaLife.titulo}</span>
          <span className="mt-0.5 block text-micro text-content-low">{m.perfil.memoriaLife.linha}</span>
        </span>
        <span aria-hidden="true" className="text-content-low">›</span>
      </button>

      <section className="mx-5 mt-5">
        <h2 className="mb-1 text-sm font-bold text-content-hi">{t.exportarTitulo}</h2>
        <p className="mb-3 text-micro text-content-low">{t.exportarTexto}</p>
        <button
          type="button"
          onClick={() => void exportar()}
          disabled={exportando}
          className="min-h-12 w-full rounded-2xl border border-brand/60 text-sm font-bold text-brand transition-colors active:bg-brand/10 disabled:opacity-50"
        >
          {exportando ? t.gerando : t.baixar}
        </button>
        {erroExport && <p role="alert" className="mt-2 text-micro text-accent-danger">{t.erroExport}</p>}
      </section>

      <section className="mx-5 mt-8">
        <h2 className="mb-1 text-sm font-bold text-accent-danger">{t.excluirTitulo}</h2>
        <p className="mb-3 text-micro text-content-low">{t.excluirTexto}</p>

        {pedidoEnviado ? (
          <p className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-micro text-accent-danger">
            {t.pedidoOk}
          </p>
        ) : !confirmandoExclusao ? (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className="min-h-12 w-full rounded-2xl border border-accent-danger/50 text-sm font-bold text-accent-danger transition-colors active:bg-accent-danger/10"
          >
            {t.solicitar}
          </button>
        ) : (
          <div className="rounded-2xl border border-accent-danger/50 bg-accent-danger/10 p-4">
            <p className="text-sm font-semibold text-content-hi">{t.certeza}</p>
            <p className="mt-1 text-micro text-content-low">{t.semVolta}</p>
            <label className="mt-3 block">
              <span className="sr-only">{t.senha}</span>
              <input
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={t.senha}
                className="min-h-12 w-full rounded-xl border border-surface-4 bg-surface-1 px-4 text-base text-content-hi placeholder:text-content-low focus:border-accent-danger focus:outline-none"
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmandoExclusao(false)
                  setSenha('')
                  setErroExclusao(null)
                }}
                className="min-h-12 flex-1 rounded-xl border border-surface-4 text-sm font-semibold text-content-mid active:bg-white/5"
              >
                {t.cancelar}
              </button>
              <button
                type="button"
                onClick={() => void confirmarExclusao()}
                disabled={excluindo || senha.length === 0}
                className="min-h-12 flex-1 rounded-xl bg-accent-danger text-sm font-bold text-white disabled:opacity-50"
              >
                {excluindo ? t.enviando : t.simExcluir}
              </button>
            </div>
          </div>
        )}
        {erroExclusao && <p role="alert" className="mt-2 text-micro text-accent-danger">{erroExclusao}</p>}
      </section>
    </main>
  )
}
