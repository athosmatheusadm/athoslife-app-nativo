import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@app/SessionProvider'
import { profileRepository } from '@data/repositories/profileRepository'
import { pesoRepository } from '@data/repositories/pesoRepository'
import { IDIOMAS, NOMES_IDIOMA } from '@domain/rules/localidade'
import type { FrequenciaTreino } from '@domain/rules/metasIniciais'
import { localidadeAtualDoAparelho, useI18n } from '@/i18n/I18nProvider'
import { volume } from '@/i18n/formatos'
import type { Mensagens } from '@/i18n/mensagens/tipo'
import { useFecharNoVoltar } from '@app/voltarAndroid'
import {
  estadoInicial,
  lerProgresso,
  limparProgresso,
  metasDoEstado,
  paraDadosOnboarding,
  pedeMetaDePeso,
  salvarProgresso,
  TOTAL_ETAPAS,
  validarEtapa,
  type EstadoOnboarding,
  type ErroEtapa,
} from './onboarding/estado'
import {
  CAMPO,
  Cta,
  Eyebrow,
  Lead,
  LifeImagem,
  ListaTags,
  Medida,
  Opcao,
  Opcoes,
  Rotulo,
  Titulo,
} from './onboarding/componentes'

/**
 * Onboarding real — 10 telas, uma por vez (referência do dono:
 * athoslife_onboarding_inteligente_CLAUDE_REFERENCE_v3_10_TELAS.html).
 *
 * Estado único em `onboarding/estado.ts`, salvo no aparelho a cada toque
 * (fechar o app e voltar continua de onde parou). Voltar nunca perde dado.
 * No fim grava tudo de uma vez (profileRepository.concluirOnboarding), com
 * idioma/país/fuso do aparelho, e só então o guard libera a Home.
 *
 * O Life é só camada visual: Fitness na recepção e no treino, Chef na
 * alimentação, azul na água, roxo (calma) na confirmação.
 */

type ChaveLista = {
  [K in keyof EstadoOnboarding]: EstadoOnboarding[K] extends readonly unknown[] ? K : never
}[keyof EstadoOnboarding]

export function Onboarding() {
  const { session, profile, refresh } = useSession()
  const { m, idioma, trocarIdioma } = useI18n()
  const navigate = useNavigate()
  const userId = session?.user.id ?? ''
  const localidade = localidadeAtualDoAparelho()

  const [e, setE] = useState<EstadoOnboarding>(
    () => lerProgresso(userId) ?? estadoInicial(localidade.unidades, profile?.nome ?? null),
  )
  const [erro, setErro] = useState<ErroEtapa>(null)
  const [salvando, setSalvando] = useState(false)
  // 'internet' só quando é falta de conexão de verdade; o resto é recusa do servidor.
  const [erroSalvar, setErroSalvar] = useState<'internet' | 'servidor' | null>(null)

  useEffect(() => {
    if (userId) salvarProgresso(userId, e)
  }, [userId, e])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [e.etapa])

  function mudar(parcial: Partial<EstadoOnboarding>) {
    setErro(null)
    setE((atual) => ({ ...atual, ...parcial }))
  }

  function alternar<K extends ChaveLista>(campo: K, valor: EstadoOnboarding[K][number]) {
    setE((atual) => {
      const lista = atual[campo] as unknown[]
      const nova = lista.includes(valor) ? lista.filter((x) => x !== valor) : [...lista, valor]
      return { ...atual, [campo]: nova }
    })
  }

  function avancar() {
    const problema = validarEtapa(e)
    if (problema) {
      setErro(problema)
      return
    }
    if (e.etapa < TOTAL_ETAPAS - 1) mudar({ etapa: e.etapa + 1 })
  }

  function voltar() {
    if (e.etapa > 0) mudar({ etapa: e.etapa - 1 })
  }

  // Voltar do Android volta uma etapa (antes saía do onboarding inteiro).
  useFecharNoVoltar(e.etapa > 0, voltar)

  async function concluir() {
    const dados = paraDadosOnboarding(e, { ...localidade, idioma })
    if (!dados) {
      // Algum obrigatório sumiu (ex.: storage antigo) — volta pra tela dele.
      mudar({ etapa: validarEtapaQueFalta(e) })
      return
    }
    setSalvando(true)
    setErroSalvar(null)
    try {
      await profileRepository.concluirOnboarding(dados)
      // Primeiro ponto do gráfico de peso da Home.
      await pesoRepository.registrar(dados.pesoKg).catch(() => {})
      limparProgresso(userId)
      await refresh()
      navigate('/home', { replace: true })
    } catch (err) {
      console.error('onboarding: falhou ao salvar', err)
      const semRede = !navigator.onLine || (err instanceof TypeError) || /failed to fetch|network/i.test(String((err as { message?: string })?.message ?? ''))
      setErroSalvar(semRede ? 'internet' : 'servidor')
      setSalvando(false)
    }
  }

  const o = m.onboarding

  if (salvando) {
    return (
      <Casca etapa={e.etapa} m={m}>
        <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
          <div className="mb-5 h-11 w-11 animate-spin rounded-full border-[3px] border-[#1d3425] border-t-[#9cff45]" />
          <Titulo>{o.confirmar.salvando}</Titulo>
          <Lead>{o.confirmar.salvandoLead}</Lead>
        </div>
      </Casca>
    )
  }

  const mensagemErro =
    erro === 'nome'
      ? o.voce.erroNome
      : erro === 'idade'
        ? o.voce.erroIdade
        : erro === 'medidas'
          ? o.corpo.erroMedidas
          : erro === 'objetivo'
            ? o.corpo.erroObjetivo
            : erro === 'meta'
              ? o.corpo.erroMeta
              : erro === 'alergia'
                ? o.comportamento.erroAlergia
                : null

  const rodape = (textoCta: string, acao: () => void = avancar) => (
    <div className="mt-auto pt-6">
      {mensagemErro && <p className="mb-3 text-center text-sm text-accent-danger">{mensagemErro}</p>}
      <Cta onClick={acao}>{textoCta}</Cta>
      {e.etapa > 0 && (
        <button type="button" onClick={voltar} className="mt-2 min-h-12 w-full text-sm text-[#8f9f94] active:text-[#c4d0c7]">
          ← {m.comum.voltar}
        </button>
      )}
    </div>
  )

  let tela: JSX.Element
  switch (e.etapa) {
    case 0:
      tela = (
        <>
          <div className="text-center">
            <LifeImagem src="/life/treino.webp" altura={210} />
            <Eyebrow>{o.boasVindas.eyebrow}</Eyebrow>
            <Titulo>{o.boasVindas.titulo}</Titulo>
            <Lead>{o.boasVindas.lead}</Lead>
          </div>
          <Rotulo>{o.boasVindas.idioma}</Rotulo>
          <Opcoes colunas={3}>
            {IDIOMAS.map((i) => (
              <Opcao key={i} selecionada={idioma === i} onClick={() => trocarIdioma(i)}>
                {NOMES_IDIOMA[i]}
              </Opcao>
            ))}
          </Opcoes>
          {rodape(o.boasVindas.botao)}
        </>
      )
      break

    case 1:
      tela = (
        <>
          <Eyebrow>{o.voce.eyebrow}</Eyebrow>
          <Titulo>{o.voce.nome}</Titulo>
          <input
            value={e.nome}
            onChange={(ev) => mudar({ nome: ev.target.value })}
            placeholder={o.voce.nomePlaceholder}
            maxLength={40}
            autoComplete="given-name"
            className={CAMPO}
          />
          <Rotulo>{o.voce.idade}</Rotulo>
          <input
            value={e.idade}
            onChange={(ev) => mudar({ idade: ev.target.value.replace(/\D/g, '').slice(0, 3) })}
            placeholder={o.voce.idadePlaceholder}
            inputMode="numeric"
            className={CAMPO}
          />
          <Rotulo>{o.voce.sexo}</Rotulo>
          <Opcoes colunas={3}>
            <Opcao icone="♂" selecionada={e.sexo === 'masculino'} onClick={() => mudar({ sexo: e.sexo === 'masculino' ? null : 'masculino' })}>
              {o.voce.masculino}
            </Opcao>
            <Opcao icone="♀" selecionada={e.sexo === 'feminino'} onClick={() => mudar({ sexo: e.sexo === 'feminino' ? null : 'feminino' })}>
              {o.voce.feminino}
            </Opcao>
            <Opcao
              selecionada={e.sexo === 'prefiro_nao_dizer'}
              onClick={() => mudar({ sexo: e.sexo === 'prefiro_nao_dizer' ? null : 'prefiro_nao_dizer' })}
            >
              {o.voce.prefiroNaoDizer}
            </Opcao>
          </Opcoes>
          {rodape(m.comum.continuar)}
        </>
      )
      break

    case 2:
      tela = (
        <>
          <Eyebrow>{o.corpo.eyebrow}</Eyebrow>
          <Titulo>{o.corpo.titulo}</Titulo>
          <div className="mb-3 flex gap-2">
            {(['metrico', 'imperial'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => mudar({ unidades: u })}
                aria-pressed={e.unidades === u}
                className={`min-h-11 rounded-pill border px-4 text-sm font-semibold ${
                  e.unidades === u ? 'border-[#7be153] text-[#f0ffe9]' : 'border-[#2b4a37] text-[#8f9f94]'
                }`}
              >
                {u === 'metrico' ? o.corpo.metrico : o.corpo.imperial}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Medida rotulo={o.corpo.altura}>
              {e.unidades === 'imperial' ? (
                <div className="flex items-baseline gap-1">
                  <input
                    value={e.alturaPes}
                    onChange={(ev) => mudar({ alturaPes: ev.target.value.replace(/\D/g, '').slice(0, 1) })}
                    inputMode="numeric"
                    placeholder="5"
                    className="w-8 bg-transparent text-base text-[#f4f8f4] outline-none"
                  />
                  <span className="text-micro text-[#65756a]">ft</span>
                  <input
                    value={e.alturaPol}
                    onChange={(ev) => mudar({ alturaPol: ev.target.value.replace(/\D/g, '').slice(0, 2) })}
                    inputMode="numeric"
                    placeholder="9"
                    className="w-8 bg-transparent text-base text-[#f4f8f4] outline-none"
                  />
                  <span className="text-micro text-[#65756a]">in</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <input
                    value={e.alturaCm}
                    onChange={(ev) => mudar({ alturaCm: ev.target.value.replace(/\D/g, '').slice(0, 3) })}
                    inputMode="numeric"
                    placeholder={o.corpo.exemplo('175')}
                    className="w-full bg-transparent text-base text-[#f4f8f4] outline-none placeholder:text-[#65756a]"
                  />
                  <span className="text-micro text-[#65756a]">cm</span>
                </div>
              )}
            </Medida>
            <Medida rotulo={o.corpo.peso}>
              <div className="flex items-baseline gap-1">
                <input
                  value={e.peso}
                  onChange={(ev) => mudar({ peso: ev.target.value.replace(/[^\d.,]/g, '').slice(0, 5) })}
                  inputMode="decimal"
                  placeholder={o.corpo.exemplo(e.unidades === 'imperial' ? '155' : '70')}
                  className="w-full bg-transparent text-base text-[#f4f8f4] outline-none placeholder:text-[#65756a]"
                />
                <span className="text-micro text-[#65756a]">{e.unidades === 'imperial' ? 'lb' : 'kg'}</span>
              </div>
            </Medida>
          </div>
          <Rotulo>{o.corpo.objetivo}</Rotulo>
          <Opcoes>
            <Opcao icone="🔥" selecionada={e.objetivos.includes('perder_gordura')} onClick={() => alternar('objetivos', 'perder_gordura')}>
              {o.corpo.perderGordura}
            </Opcao>
            <Opcao icone="💪" selecionada={e.objetivos.includes('ganhar_massa')} onClick={() => alternar('objetivos', 'ganhar_massa')}>
              {o.corpo.ganharMassa}
            </Opcao>
            <Opcao icone="🌱" selecionada={e.objetivos.includes('melhorar_habitos')} onClick={() => alternar('objetivos', 'melhorar_habitos')}>
              {o.corpo.melhorarHabitos}
            </Opcao>
            <Opcao icone="✓" selecionada={e.objetivos.includes('outro')} onClick={() => alternar('objetivos', 'outro')}>
              {o.corpo.outro}
            </Opcao>
          </Opcoes>
          {pedeMetaDePeso(e) && (
            <div className="mt-3">
              <Medida rotulo={o.corpo.pesoMeta}>
                <div className="flex items-baseline gap-1">
                  <input
                    value={e.pesoMeta ?? ''}
                    onChange={(ev) => mudar({ pesoMeta: ev.target.value.replace(/[^\d.,]/g, '').slice(0, 5) })}
                    inputMode="decimal"
                    placeholder={o.corpo.pesoMetaOpcional}
                    className="w-full bg-transparent text-base text-[#f4f8f4] outline-none"
                  />
                  <span className="text-micro text-[#65756a]">{e.unidades === 'imperial' ? 'lb' : 'kg'}</span>
                </div>
              </Medida>
              <p className="mt-1.5 text-micro text-[#65756a]">{o.corpo.pesoMetaDica}</p>
            </div>
          )}
          {rodape(m.comum.continuar)}
        </>
      )
      break

    case 3:
      tela = (
        <>
          <Eyebrow>{o.rotina.eyebrow}</Eyebrow>
          <Titulo>{o.rotina.titulo}</Titulo>
          <Opcoes>
            <Opcao inteira icone="💼" selecionada={e.rotina.includes('trabalho_estudo')} onClick={() => alternar('rotina', 'trabalho_estudo')}>
              {o.rotina.trabalhoEstudo}
            </Opcao>
            <Opcao inteira icone="◉" selecionada={e.rotina.includes('flexivel')} onClick={() => alternar('rotina', 'flexivel')}>
              {o.rotina.flexivel}
            </Opcao>
            <Opcao inteira icone="🖥" selecionada={e.rotina.includes('remoto')} onClick={() => alternar('rotina', 'remoto')}>
              {o.rotina.remoto}
            </Opcao>
            <Opcao inteira icone="✓" selecionada={e.rotina.includes('outro')} onClick={() => alternar('rotina', 'outro')}>
              {o.rotina.outro}
            </Opcao>
          </Opcoes>
          <Rotulo>{o.rotina.sono}</Rotulo>
          <Opcoes colunas={3}>
            {(['<6h', '6-7h', '8h+'] as const).map((s) => (
              <Opcao key={s} selecionada={e.sono === s} onClick={() => mudar({ sono: e.sono === s ? null : s })}>
                {s === '<6h' ? '< 6h' : s === '6-7h' ? '6 – 7h' : '8h+'}
              </Opcao>
            ))}
          </Opcoes>
          {rodape(m.comum.continuar)}
        </>
      )
      break

    case 4:
      tela = (
        <>
          <LifeImagem src="/life/treino.webp" altura={150} />
          <Eyebrow>{o.treino.eyebrow}</Eyebrow>
          <Titulo>{o.treino.titulo}</Titulo>
          <Opcoes>
            {(Object.keys(o.treino.frequencias) as FrequenciaTreino[]).map((f) => (
              <Opcao key={f} selecionada={e.frequencia === f} onClick={() => mudar({ frequencia: e.frequencia === f ? null : f })}>
                {o.treino.frequencias[f]}
              </Opcao>
            ))}
          </Opcoes>
          <Rotulo>{o.treino.local}</Rotulo>
          <Opcoes colunas={3}>
            <Opcao icone="🏋" selecionada={e.locais.includes('academia')} onClick={() => alternar('locais', 'academia')}>
              {o.treino.academia}
            </Opcao>
            <Opcao icone="⌂" selecionada={e.locais.includes('casa')} onClick={() => alternar('locais', 'casa')}>
              {o.treino.casa}
            </Opcao>
            <Opcao icone="⇄" selecionada={e.locais.includes('ambos')} onClick={() => alternar('locais', 'ambos')}>
              {o.treino.ambos}
            </Opcao>
          </Opcoes>
          <Rotulo>{o.treino.tipo}</Rotulo>
          <Opcoes>
            <Opcao selecionada={e.tiposTreino.includes('musculacao')} onClick={() => alternar('tiposTreino', 'musculacao')}>
              {o.treino.musculacao}
            </Opcao>
            <Opcao selecionada={e.tiposTreino.includes('funcional')} onClick={() => alternar('tiposTreino', 'funcional')}>
              {o.treino.funcional}
            </Opcao>
            <Opcao selecionada={e.tiposTreino.includes('cardio')} onClick={() => alternar('tiposTreino', 'cardio')}>
              {o.treino.cardio}
            </Opcao>
            <Opcao selecionada={e.tiposTreino.includes('outro')} onClick={() => alternar('tiposTreino', 'outro')}>
              {o.treino.outro}
            </Opcao>
          </Opcoes>
          {rodape(m.comum.continuar)}
        </>
      )
      break

    case 5:
      tela = (
        <>
          <LifeImagem src="/life/chef.webp" altura={150} />
          <Eyebrow>{o.alimentacao.eyebrow}</Eyebrow>
          <Titulo>{o.alimentacao.titulo}</Titulo>
          <Opcoes>
            {(['2-3', '4', '5+', 'sem_rotina'] as const).map((r) => (
              <Opcao key={r} selecionada={e.refeicoes === r} onClick={() => mudar({ refeicoes: e.refeicoes === r ? null : r })}>
                {r === 'sem_rotina' ? o.alimentacao.semRotina : r === '2-3' ? '2–3' : r}
              </Opcao>
            ))}
          </Opcoes>
          <Rotulo>{o.alimentacao.onde}</Rotulo>
          <Opcoes colunas={3}>
            <Opcao icone="⌂" selecionada={e.ondeCome.includes('casa')} onClick={() => alternar('ondeCome', 'casa')}>
              {o.alimentacao.casa}
            </Opcao>
            <Opcao icone="▦" selecionada={e.ondeCome.includes('trabalho')} onClick={() => alternar('ondeCome', 'trabalho')}>
              {o.alimentacao.trabalho}
            </Opcao>
            <Opcao icone="🍽" selecionada={e.ondeCome.includes('restaurante')} onClick={() => alternar('ondeCome', 'restaurante')}>
              {o.alimentacao.restaurante}
            </Opcao>
            <Opcao inteira icone="◈" selecionada={e.ondeCome.includes('depende')} onClick={() => alternar('ondeCome', 'depende')}>
              {o.alimentacao.depende}
            </Opcao>
          </Opcoes>
          <Rotulo>{o.alimentacao.gosta}</Rotulo>
          <ListaTags
            itens={e.gosta}
            sugestoes={o.alimentacao.sugestoes.filter((s) => !e.naoGosta.includes(s))}
            placeholder={o.alimentacao.placeholderAlimento}
            rotuloAdicionar={m.comum.adicionar}
            rotuloRemover={m.comum.remover}
            onMudar={(gosta) => mudar({ gosta })}
          />
          <Rotulo>{o.alimentacao.naoGosta}</Rotulo>
          <ListaTags
            itens={e.naoGosta}
            sugestoes={[]}
            placeholder={o.alimentacao.placeholderAlimento}
            rotuloAdicionar={m.comum.adicionar}
            rotuloRemover={m.comum.remover}
            onMudar={(naoGosta) => mudar({ naoGosta })}
          />
          {rodape(m.comum.continuar)}
        </>
      )
      break

    case 6: {
      const c = o.comportamento
      const obstaculos = [
        ['doces', c.doces, '🍩'],
        ['comer_fora', c.comerFora, '🍔'],
        ['comer_tarde', c.comerTarde, '⏰'],
        ['refrigerante', c.refrigerante, '🥤'],
        ['motivacao', c.motivacao, '🌟'],
        ['rotina', c.rotina, '♻'],
      ] as const
      const suplementos = [
        ['whey', c.whey],
        ['creatina', c.creatina],
        ['albumina', c.albumina],
        ['outro', c.outro],
        ['nenhum', c.nenhum],
      ] as const
      tela = (
        <>
          <Eyebrow>{c.eyebrow}</Eyebrow>
          <Titulo>{c.titulo}</Titulo>
          <Opcoes>
            {obstaculos.map(([v, rotulo, icone]) => (
              <Opcao key={v} icone={icone} selecionada={e.obstaculos.includes(v)} onClick={() => alternar('obstaculos', v)}>
                {rotulo}
              </Opcao>
            ))}
          </Opcoes>
          <Rotulo>{c.alergia}</Rotulo>
          <Opcoes>
            <Opcao icone="⚠" selecionada={e.alergia === true} onClick={() => mudar({ alergia: e.alergia === true ? null : true })}>
              {c.sim}
            </Opcao>
            <Opcao icone="✓" selecionada={e.alergia === false} onClick={() => mudar({ alergia: e.alergia === false ? null : false })}>
              {c.nao}
            </Opcao>
          </Opcoes>
          {e.alergia && (
            <div className="mt-3">
              <ListaTags
                itens={e.alergias}
                sugestoes={m.perfil.metas.restricoesSugestoes.filter((x) => !e.alergias.some((a) => a.toLowerCase() === x.toLowerCase()))}
                placeholder={c.quais}
                rotuloAdicionar={m.comum.adicionar}
                rotuloRemover={m.comum.remover}
                onMudar={(alergias) => mudar({ alergias })}
              />
            </div>
          )}
          <Rotulo>{c.suplementos}</Rotulo>
          <Opcoes>
            {suplementos.map(([v, rotulo]) => (
              <Opcao
                key={v}
                selecionada={e.suplementos.includes(v)}
                onClick={() =>
                  // "Nenhum" exclui os outros e vice-versa.
                  mudar({
                    suplementos:
                      v === 'nenhum'
                        ? e.suplementos.includes('nenhum') ? [] : ['nenhum']
                        : e.suplementos.includes(v)
                          ? e.suplementos.filter((x) => x !== v)
                          : [...e.suplementos.filter((x) => x !== 'nenhum'), v],
                  })
                }
              >
                {rotulo}
              </Opcao>
            ))}
          </Opcoes>
          {rodape(m.comum.continuar)}
        </>
      )
      break
    }

    case 7:
      tela = (
        <>
          <LifeImagem src="/life/hidratado.webp" altura={150} />
          <Eyebrow>{o.habitos.eyebrow}</Eyebrow>
          <Titulo>{o.habitos.titulo}</Titulo>
          <Opcoes>
            {(['<1L', '1-2L', '2-3L', '3L+'] as const).map((a) => (
              <Opcao key={a} icone="💧" selecionada={e.agua === a} onClick={() => mudar({ agua: e.agua === a ? null : a })}>
                {rotuloAgua(a, e.unidades)}
              </Opcao>
            ))}
          </Opcoes>
          <Rotulo>{o.habitos.estresse}</Rotulo>
          <Opcoes colunas={3}>
            {(['baixo', 'moderado', 'alto'] as const).map((s) => (
              <Opcao
                key={s}
                icone={s === 'baixo' ? '🙂' : s === 'moderado' ? '😐' : '😣'}
                selecionada={e.estresse === s}
                onClick={() => mudar({ estresse: e.estresse === s ? null : s })}
              >
                {o.habitos[s]}
              </Opcao>
            ))}
          </Opcoes>
          {rodape(m.comum.continuar)}
        </>
      )
      break

    case 8: {
      const r = o.resumo
      const metas = metasDoEstado(e)
      const rot = rotulos(m)
      const lista = (itens: readonly string[], mapa: Record<string, string>) =>
        itens.length ? itens.map((x) => mapa[x] ?? x).join(', ') : m.comum.naoInformado
      const linhas: [string, string, number][] = [
        [r.objetivo, lista(e.objetivos, rot.objetivos), 2],
        [
          r.treino,
          [lista(e.locais, rot.locais), e.frequencia ? o.treino.frequencias[e.frequencia] : null].filter(Boolean).join(' · '),
          4,
        ],
        [r.rotina, lista(e.rotina, rot.rotina), 3],
        [r.alimentacao, e.refeicoes ? (e.refeicoes === 'sem_rotina' ? o.alimentacao.semRotina : o.alimentacao.porDia(e.refeicoes.replace('-', '–'))) : m.comum.naoInformado, 5],
        [r.desafio, lista(e.obstaculos, rot.obstaculos), 6],
      ]
      tela = (
        <>
          <Eyebrow>{r.eyebrow}</Eyebrow>
          <Titulo>{r.titulo}</Titulo>
          <Lead>{r.lead}</Lead>
          <div className="mt-4 rounded-xl border border-[#294633] bg-[#08110c] px-3">
            {linhas.map(([k, v, etapa]) => (
              <button
                key={k}
                type="button"
                onClick={() => mudar({ etapa })}
                className="flex w-full justify-between gap-3 border-b border-[#17291e] py-3 text-left text-sm last:border-b-0"
              >
                <span className="text-[#718076]">{k}</span>
                <span className="max-w-[60%] text-right text-[#dbe5de]">{v}</span>
              </button>
            ))}
          </div>
          {metas && (
            <div className="mt-3 rounded-xl border border-[#294633] bg-[#08110c] p-3">
              <div className="text-sm font-semibold text-[#d8e2da]">{r.metas}</div>
              <div className="mt-1 text-sm text-[#9cff45]">
                {r.metasValor(metas.kcal, metas.proteina, volume(idioma, e.unidades, metas.aguaMl))}
              </div>
              <p className="mt-1 text-micro text-[#68776d]">{r.metasNota}</p>
            </div>
          )}
          {rodape(r.botao)}
        </>
      )
      break
    }

    default:
      tela = (
        <>
          <div className="text-center">
            <LifeImagem src="/life/calmo.webp" altura={180} />
            <Eyebrow>{o.confirmar.eyebrow}</Eyebrow>
            <Titulo>{o.confirmar.titulo}</Titulo>
            <Lead>{o.confirmar.lead}</Lead>
          </div>
          <div className="mt-5 grid gap-2">
            {o.confirmar.checklist.map((x) => (
              <div key={x} className="flex items-center gap-2 text-sm text-[#cbd6ce]">
                <i className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#9cff45] text-micro font-black not-italic text-[#071007]">
                  ✓
                </i>
                {x}
              </div>
            ))}
          </div>
          {erroSalvar && (
            <p className="mt-4 text-center text-sm text-accent-danger">
              {erroSalvar === 'internet' ? o.confirmar.erroSalvar : o.confirmar.erroServidor}
            </p>
          )}
          {rodape(o.confirmar.botao, () => void concluir())}
        </>
      )
  }

  return (
    <Casca etapa={e.etapa} m={m}>
      {tela}
    </Casca>
  )
}

/** Topo com marca + contador + barra de progresso, e o fundo da referência. */
function Casca(props: { etapa: number; m: Mensagens; children: React.ReactNode }) {
  const n = props.etapa + 1
  return (
    <main className="min-h-full bg-gradient-to-b from-[#070d09] to-[#07100a] pt-safe-t">
      <div className="mx-auto flex min-h-[100dvh] max-w-[430px] flex-col px-5 pb-6">
        <div className="flex items-center justify-between pb-2 pt-4">
          <div className="text-lg font-extrabold tracking-tight text-content-hi">
            ATHOS<span className="italic text-[#9cff45]">life</span>
          </div>
          <div className="text-micro font-semibold text-[#77877b]">{props.m.onboarding.passo(n, TOTAL_ETAPAS)}</div>
        </div>
        <div className="mb-4 h-1 overflow-hidden rounded-full bg-[#1a2d21]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#72e53d] to-[#b1ff5b] transition-all duration-300"
            style={{ width: `${(n / TOTAL_ETAPAS) * 100}%` }}
          />
        </div>
        <div key={props.etapa} className="flex flex-1 animate-rise flex-col">
          {props.children}
        </div>
      </div>
    </main>
  )
}

function rotuloAgua(a: '<1L' | '1-2L' | '2-3L' | '3L+', unidades: 'metrico' | 'imperial'): string {
  if (unidades === 'imperial') {
    return { '<1L': '< 34 oz', '1-2L': '34 – 68 oz', '2-3L': '68 – 100 oz', '3L+': '100 oz+' }[a]
  }
  return { '<1L': '< 1 L', '1-2L': '1 – 2 L', '2-3L': '2 – 3 L', '3L+': '3 L+' }[a]
}

/** Código neutro -> texto no idioma atual (pro resumo). */
function rotulos(m: Mensagens) {
  const o = m.onboarding
  return {
    objetivos: {
      perder_gordura: o.corpo.perderGordura,
      ganhar_massa: o.corpo.ganharMassa,
      melhorar_habitos: o.corpo.melhorarHabitos,
      outro: o.corpo.outro,
    } as Record<string, string>,
    locais: { academia: o.treino.academia, casa: o.treino.casa, ambos: o.treino.ambos } as Record<string, string>,
    rotina: {
      trabalho_estudo: o.rotina.trabalhoEstudo,
      flexivel: o.rotina.flexivel,
      remoto: o.rotina.remoto,
      outro: o.rotina.outro,
    } as Record<string, string>,
    obstaculos: {
      doces: o.comportamento.doces,
      comer_fora: o.comportamento.comerFora,
      comer_tarde: o.comportamento.comerTarde,
      refrigerante: o.comportamento.refrigerante,
      motivacao: o.comportamento.motivacao,
      rotina: o.comportamento.rotina,
    } as Record<string, string>,
  }
}

/** Primeira etapa com obrigatório faltando (usada se o storage vier incompleto). */
function validarEtapaQueFalta(e: EstadoOnboarding): number {
  for (const etapa of [1, 2]) {
    if (validarEtapa({ ...e, etapa })) return etapa
  }
  return e.etapa
}
