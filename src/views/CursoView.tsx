import { useMemo, useState } from 'react'
import OrganogramaRadial from '../components/OrganogramaRadial'
import { assuntosDoCurso, contagem } from '../data'
import type { Curso } from '../data/types'
import { montarArvore, percorrer, ROTULO_NIVEL, type Modo, type NoArvore } from '../lib/arvore'
import { normalizar } from '../lib/texto'

const LEGENDA: { nivel: keyof typeof ROTULO_NIVEL; texto: string }[] = [
  { nivel: 'curso', texto: 'Curso' },
  { nivel: 'ano', texto: 'Ano' },
  { nivel: 'projeto', texto: 'Projeto' },
  { nivel: 'area', texto: 'Disciplina' },
  { nivel: 'assunto', texto: 'Assunto' },
]

export default function CursoView({ curso }: { curso: Curso | undefined }) {
  if (!curso) {
    return (
      <section className="secao secao--branca">
        <div className="conteiner">
          <h1 className="titulo-pagina">Curso não encontrado</h1>
          <a className="botao botao--escuro" href="#/">
            Voltar aos cursos
          </a>
        </div>
      </section>
    )
  }
  return <CursoConteudo curso={curso} />
}

function CursoConteudo({ curso }: { curso: Curso }) {
  const [modo, setModo] = useState<Modo>('projeto')
  const [busca, setBusca] = useState('')
  const [selecionadoId, setSelecionadoId] = useState<string | null>('curso')
  // Nível em destaque no centro do organograma. Abrir outro fecha o anterior.
  const [focoId, setFocoId] = useState('curso')

  const raiz = useMemo(() => montarArvore(curso, modo), [curso, modo])

  const { projetos, assuntos } = contagem(curso)

  const nos = useMemo(() => {
    const mapa = new Map<string, { no: NoArvore; pai: string | null }>()
    percorrer(raiz, (n, pai) => mapa.set(n.id, { no: n, pai: pai?.id ?? null }))
    return mapa
  }, [raiz])

  // Nós que batem com a busca, mais os ancestrais deles, que ficam marcados para guiar até o resultado.
  const { achados, contemAchado } = useMemo(() => {
    const termo = normalizar(busca)
    const achados = new Set<string>()
    const ancestrais = new Set<string>()
    if (termo.length >= 2) {
      for (const [id, { no, pai }] of nos) {
        if (no.nivel === 'curso' || !normalizar(no.rotulo).includes(termo)) continue
        achados.add(id)
        let atual = pai
        while (atual) {
          ancestrais.add(atual)
          atual = nos.get(atual)?.pai ?? null
        }
      }
    }
    return { achados, contemAchado: ancestrais }
  }, [busca, nos])

  const foco = nos.get(focoId)?.no ?? raiz

  // Caminho da raiz até o nível em foco, para a trilha de navegação.
  const trilha = useMemo(() => {
    const ids: NoArvore[] = []
    let atual: string | null = foco.id
    while (atual) {
      const item = nos.get(atual)
      if (!item) break
      ids.unshift(item.no)
      atual = item.pai
    }
    return ids
  }, [foco, nos])

  const abrir = (id: string) => {
    setFocoId(id)
    setSelecionadoId(id)
  }

  // Volta um nível e deixa selecionado o círculo de onde viemos, para não perder a referência.
  const voltar = () => {
    const pai = nos.get(foco.id)?.pai
    if (!pai) return
    setSelecionadoId(foco.id)
    setFocoId(pai)
  }

  // Leva o resultado da busca para a tela: abre o nível de cima dele e o seleciona.
  const irPara = (id: string) => {
    setFocoId(nos.get(id)?.pai ?? 'curso')
    setSelecionadoId(id)
  }

  const trocarModo = (novo: Modo) => {
    if (novo === modo) return
    setModo(novo)
    setFocoId('curso')
    setSelecionadoId('curso')
  }

  const selecionado = selecionadoId ? nos.get(selecionadoId)?.no : undefined
  const ocorrencias = useMemo(() => {
    if (selecionado?.nivel !== 'assunto') return []
    return assuntosDoCurso(curso).get(normalizar(selecionado.rotulo))?.ocorrencias ?? []
  }, [curso, selecionado])

  return (
    <>
      <section className="secao secao--branca secao--compacta">
        <div className="conteiner">
          <a className="voltar" href="#/">
            ← Todos os cursos
          </a>
          <p className="rotulo">{curso.sigla}</p>
          <h1 className="titulo-pagina titulo-pagina--medio">{curso.nome}</h1>
          <ul className="numeros">
            <li>
              <strong>{curso.anos.length}</strong> anos
            </li>
            <li>
              <strong>{projetos}</strong> projetos
            </li>
            <li>
              <strong>{assuntos}</strong> assuntos
            </li>
            <li>
              <a href={curso.url} target="_blank" rel="noreferrer">
                Página do curso ↗
              </a>
            </li>
          </ul>
          {!curso.temGradeCompleta && (
            <p className="aviso">
              Por enquanto só o Ano 1 (currículo comum a todos os cursos) está cadastrado. Os anos específicos entram
              quando o conteúdo deste curso for adicionado.
            </p>
          )}
        </div>
      </section>

      <section className="secao secao--cinza secao--compacta" aria-label="Organograma do curso">
        <div className="conteiner">
          <div className="barra">
            <div className="abas" role="tablist" aria-label="Agrupar por">
              {(['projeto', 'disciplina'] as const).map((m) => (
                <button
                  key={m}
                  role="tab"
                  aria-selected={modo === m}
                  className="aba"
                  onClick={() => trocarModo(m)}
                >
                  {m === 'projeto' ? 'Por projeto' : 'Por disciplina'}
                  <small>{m === 'projeto' ? 'Ano → Projeto → Disciplina' : 'Disciplina → Projeto'}</small>
                </button>
              ))}
            </div>
            <label className="busca">
              <span className="sr-only">Buscar assunto</span>
              <input
                type="search"
                placeholder="Buscar assunto ou disciplina…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </label>
          </div>

          <div className="palco">
            <div className="palco__tela">
              <nav className="trilha" aria-label="Níveis abertos">
                <button className="trilha__voltar" onClick={voltar} disabled={trilha.length < 2}>
                  ← Voltar
                </button>
                <ol>
                  {trilha.map((no, i) => (
                    <li key={no.id}>
                      {i < trilha.length - 1 ? (
                        <button onClick={() => abrir(no.id)}>{i === 0 ? curso.sigla : no.rotulo}</button>
                      ) : (
                        <span aria-current="location">{i === 0 ? curso.sigla : no.rotulo}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
              <OrganogramaRadial
                foco={foco}
                selecionado={selecionadoId}
                achados={achados}
                contemAchado={contemAchado}
                onAbrir={abrir}
                onSelecionar={setSelecionadoId}
                onVoltar={voltar}
              />
              <p className="palco__dica">
                Clique em um círculo com número para abrir · Esc ou “Voltar” retorna ao nível anterior
              </p>
            </div>

            <aside className="detalhes" aria-live="polite">
              {busca.trim().length >= 2 && (
                <div className="resultados">
                  <p className="rotulo" role="status">
                    {achados.size} {achados.size === 1 ? 'resultado' : 'resultados'}
                  </p>
                  <ul>
                    {[...achados].map((id) => {
                      const no = nos.get(id)!.no
                      return (
                        <li key={id}>
                          <button className={id === selecionadoId ? 'resultados__item--ativo' : undefined} onClick={() => irPara(id)}>
                            <strong>{no.rotulo}</strong>
                            <small>{no.caminho.slice(0, -1).join(' › ')}</small>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              <ul className="legenda">
                {LEGENDA.map((l) => (
                  <li key={l.nivel}>
                    <span className={`legenda__bolinha legenda__bolinha--${l.nivel}`} aria-hidden="true" />
                    {l.texto}
                  </li>
                ))}
              </ul>
              {selecionado ? (
                <div className="detalhes__corpo">
                  <p className="rotulo">{ROTULO_NIVEL[selecionado.nivel]}</p>
                  <h2 className="detalhes__titulo">{selecionado.rotulo}</h2>
                  <p className="detalhes__caminho">{selecionado.caminho.join(' › ')}</p>
                  {selecionado.detalhe && <p>{selecionado.detalhe}</p>}
                  {ocorrencias.length > 1 && (
                    <>
                      <p className="rotulo">Também aparece em</p>
                      <ul className="detalhes__lista">
                        {ocorrencias.map((o, i) => (
                          <li key={i}>
                            Ano {o.ano} · Projeto {o.projeto} · {o.area}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              ) : (
                <p className="detalhes__vazio">Selecione um círculo para ver os detalhes.</p>
              )}
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
