import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { authRepository } from '@data/repositories/authRepository'
import { privacidadeRepository } from '@data/repositories/privacidadeRepository'

/**
 * Sub-página "Privacidade e dados" do Perfil.
 *
 * Exportar: baixa um JSON real com todo dado pessoal do usuário (direito
 * de portabilidade). Excluir: REGISTRA o pedido e desconecta — não apaga
 * a conta de verdade aqui (o client não tem permissão pra isso, precisa
 * de service role no backend). Ver privacidadeRepository.
 */
export function Privacidade() {
  const navigate = useNavigate()
  const { profile } = useSession()
  const [exportando, setExportando] = useState(false)
  const [erroExport, setErroExport] = useState<string | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)
  const [pedidoEnviado, setPedidoEnviado] = useState(false)

  if (!profile) return null

  async function exportar() {
    setErroExport(null)
    setExportando(true)
    try {
      const dados = await privacidadeRepository.exportarMeusDados()
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `athoslife-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setErroExport('Não deu pra gerar a exportação agora. Tenta de novo em instantes.')
    } finally {
      setExportando(false)
    }
  }

  async function confirmarExclusao() {
    setErroExclusao(null)
    setExcluindo(true)
    try {
      await privacidadeRepository.solicitarExclusaoConta('Solicitado pela tela de Privacidade')
      setPedidoEnviado(true)
      await authRepository.sair()
      navigate('/login', { replace: true })
    } catch {
      setErroExclusao('Não deu pra registrar o pedido agora. Tenta de novo.')
      setExcluindo(false)
    }
  }

  return (
    <main className="pb-24 pt-safe-t">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <button onClick={() => navigate(-1)} aria-label="Voltar" className="text-content-hi">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-xl font-bold text-content-hi">Privacidade e dados</h1>
      </header>

      <section className="mx-5 mt-2 rounded-2xl border border-surface-4 bg-surface-2 p-4">
        <p className="text-sm font-bold text-content-hi">Consentimento</p>
        <p className="mt-1 text-micro text-content-low">
          {profile.consentimentoAceito ? 'Você aceitou os termos de uso.' : 'Termos ainda não aceitos.'}
        </p>
        <p className="mt-1 text-micro text-content-low">
          Acompanhamento de hábitos: {profile.consentimentoHabitos ? 'autorizado' : 'não autorizado'}.
        </p>
      </section>

      <section className="mx-5 mt-5">
        <h2 className="mb-1 text-sm font-bold text-content-hi">Exportar meus dados</h2>
        <p className="mb-3 text-micro text-content-low">
          Baixa um arquivo com tudo que a ATHOSlife guarda sobre você: refeições, água, peso, treinos,
          hábitos, conquistas e favoritos.
        </p>
        <button
          type="button"
          onClick={() => void exportar()}
          disabled={exportando}
          className="w-full rounded-2xl border border-brand/60 py-3 text-sm font-bold text-brand transition-colors active:bg-brand/10 disabled:opacity-50"
        >
          {exportando ? 'Gerando arquivo…' : '⬇ Baixar meus dados (.json)'}
        </button>
        {erroExport && <p className="mt-2 text-micro text-accent-danger">{erroExport}</p>}
      </section>

      <section className="mx-5 mt-8">
        <h2 className="mb-1 text-sm font-bold text-accent-danger">Excluir minha conta</h2>
        <p className="mb-3 text-micro text-content-low">
          Registra seu pedido de exclusão e desconecta você. O apagamento definitivo dos dados é feito
          manualmente por segurança — não é instantâneo.
        </p>

        {pedidoEnviado ? (
          <p className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-micro text-accent-danger">
            Pedido registrado. Você será desconectado.
          </p>
        ) : !confirmandoExclusao ? (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className="w-full rounded-2xl border border-accent-danger/50 py-3 text-sm font-bold text-accent-danger transition-colors active:bg-accent-danger/10"
          >
            Solicitar exclusão de conta
          </button>
        ) : (
          <div className="rounded-2xl border border-accent-danger/50 bg-accent-danger/10 p-4">
            <p className="text-sm font-semibold text-content-hi">Tem certeza?</p>
            <p className="mt-1 text-micro text-content-low">
              Isso não pode ser desfeito por você depois de enviado.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="flex-1 rounded-xl border border-surface-4 py-2.5 text-sm font-semibold text-content-mid"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void confirmarExclusao()}
                disabled={excluindo}
                className="flex-1 rounded-xl bg-accent-danger py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {excluindo ? 'Enviando…' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        )}
        {erroExclusao && <p className="mt-2 text-micro text-accent-danger">{erroExclusao}</p>}
      </section>
    </main>
  )
}
