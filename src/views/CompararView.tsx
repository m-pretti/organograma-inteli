import { useMemo, useState, type CSSProperties } from 'react'
import { cursos, getCurso } from '../data'
import type { Curso } from '../data/types'
import { corDaArea, LEGENDA_AREAS } from '../lib/areas'
import { compararGeral, compararProjetos, projetosDoCurso, type ItemComparado, type Situacao } from '../lib/comparar'
import { corDoTema, nomeQuebravel, temaDoAssunto, tintaDoTema, type Tema } from '../lib/temas'
import { normalizar } from '../lib/texto'
import { atualizarQuery, type Rota } from '../router'

type Vista = 'geral' | 'projetos'

export default function CompararView({ rota }: { rota: Rota }) {
  const padraoA = cursos.find((c) => c.temGradeCompleta) ?? cursos[0]
  const a = getCurso(rota.query.get('a') ?? undefined) ?? padraoA
  const b = getCurso(rota.query.get('b') ?? undefined) ?? cursos.find((c) => c.id !== a.id) ?? cursos[1]
  const vista: Vista = rota.query.get('vista') === 'projetos' ? 'projetos' : 'geral'

  const escolher = (lado: 'a' | 'b', id: string) => atualizarQuery(rota, { [lado]: id, pa: undefined, pb: undefined })

  return (
    <>
      <section className="secao secao--branca secao--compacta">
        <div className="conteiner">
          <a className="voltar" href="#/">
            ← Todos os cursos
          </a>
          <p className="rotulo">Comparação</p>
          <h1 className="titulo-pagina titulo-pagina--medio">Compare dois cursos</h1>
          <div className="seletores">
            <label>
              <span className="rotulo">Curso A</span>
              <select value={a.id} onChange={(e) => escolher('a', e.target.value)}>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
            <span className="seletores__vs" aria-hidden="true">
              ×
            </span>
            <label>
              <span className="rotulo">Curso B</span>
              <select value={b.id} onChange={(e) => escolher('b', e.target.value)}>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="secao secao--cinza secao--compacta">
        <div className="conteiner">
          <div className="abas" role="tablist" aria-label="Tipo de comparação">
            {(['geral', 'projetos'] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={vista === v}
                className="aba"
                onClick={() => atualizarQuery(rota, { vista: v })}
              >
                {v === 'geral' ? 'Visão geral' : 'Projeto a projeto'}
                <small>{v === 'geral' ? 'Todos os assuntos' : 'Projeto × projeto'}</small>
              </button>
            ))}
          </div>

          {a.id === b.id ? (
            <p className="aviso">Escolha dois cursos diferentes para comparar.</p>
          ) : vista === 'geral' ? (
            <Geral a={a} b={b} />
          ) : (
            <Projetos a={a} b={b} rota={rota} />
          )}
        </div>
      </section>
    </>
  )
}

/* ------------------------------------------------------------------ visão geral */

const ROTULO_SITUACAO: Record<Situacao, string> = {
  'so-a': 'só no curso A',
  comum: 'em comum',
  'so-b': 'só no curso B',
}

const SITUACOES: Situacao[] = ['so-a', 'comum', 'so-b']

type FiltroAno = 'especificos' | 'todos' | number

/**
 * Um tema geral e os assuntos dos dois cursos que caem nele. A situação é do tema, não do
 * assunto: basta cada curso ter algum assunto do tema para ele ficar "em comum".
 */
interface GrupoTema {
  tema: Tema
  situacao: Situacao
  itens: ItemComparado[]
}

// Ordem das disciplinas nas zonas, a mesma da legenda.
const ORDEM_AREAS = ['matematica', 'computacao', 'design', 'negocios', 'lideranca']
const ordemDaArea = (tema: Tema) => ORDEM_AREAS.indexOf(normalizar(tema.area).split(' ')[0])

function agruparPorTema(itens: ItemComparado[]): Map<Situacao, GrupoTema[]> {
  const porTema = new Map<string, { tema: Tema; itens: ItemComparado[] }>()
  for (const item of itens) {
    const tema = temaDoAssunto(item.texto, (item.a ?? item.b)!.ocorrencias[0].area)
    const grupo = porTema.get(tema.id) ?? { tema, itens: [] }
    grupo.itens.push(item)
    porTema.set(tema.id, grupo)
  }
  const porZona = new Map<Situacao, GrupoTema[]>(SITUACOES.map((s) => [s, []]))
  for (const { tema, itens } of porTema.values()) {
    const temA = itens.some((i) => i.a)
    const temB = itens.some((i) => i.b)
    const situacao: Situacao = temA && temB ? 'comum' : temA ? 'so-a' : 'so-b'
    porZona.get(situacao)!.push({ tema, situacao, itens })
  }
  for (const lista of porZona.values()) {
    lista.sort((x, y) => ordemDaArea(x.tema) - ordemDaArea(y.tema) || x.tema.nome.localeCompare(y.tema.nome, 'pt-BR'))
  }
  return porZona
}

function Geral({ a, b }: { a: Curso; b: Curso }) {
  // O Ano 1 é igual para todos os cursos, então por padrão a comparação olha só os anos específicos.
  const [filtro, setFiltro] = useState<FiltroAno>('especificos')
  const [busca, setBusca] = useState('')
  const [selecionado, setSelecionado] = useState<string | null>(null)

  const todosAnos = useMemo(() => compararGeral(a, b), [a, b])
  const resultado = useMemo(() => {
    const comuns = todosAnos.anosComparados
    const anos = filtro === 'todos' ? undefined : filtro === 'especificos' ? comuns.filter((n) => n > 1) : [filtro]
    return compararGeral(a, b, anos)
  }, [a, b, filtro, todosAnos])

  const termo = normalizar(busca)
  const porZona = useMemo(() => agruparPorTema(resultado.itens), [resultado])

  const comuns = porZona.get('comum')!.length
  const temasA = comuns + porZona.get('so-a')!.length
  const temasB = comuns + porZona.get('so-b')!.length
  const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

  const nomeDaZona: Record<Situacao, string> = { 'so-a': `Só em ${a.sigla}`, comum: 'Em comum', 'so-b': `Só em ${b.sigla}` }
  const grupo = selecionado ? [...porZona.values()].flat().find((g) => g.tema.id === selecionado) : undefined

  return (
    <div className="comparacao">
      {resultado.anosPendentes.length > 0 && (
        <p className="aviso">
          {resultado.anosPendentes
            .map(({ ano: n, faltaEm }) => `Ano ${n} (falta cadastrar ${faltaEm.map((c) => c.sigla).join(' e ')})`)
            .join(' · ')}
          . Esses anos ainda não entram na comparação.
        </p>
      )}

      <div className="resumo">
        <div>
          <strong>{comuns}</strong>
          <span>temas em comum</span>
        </div>
        <div>
          <strong>{pct(comuns, temasA)}%</strong>
          <span>
            dos temas de {a.sigla} ({temasA})
          </span>
        </div>
        <div>
          <strong>{pct(comuns, temasB)}%</strong>
          <span>
            dos temas de {b.sigla} ({temasB})
          </span>
        </div>
      </div>

      <div className="filtros">
        <label>
          <span className="rotulo">Anos comparados</span>
          <select
            value={String(filtro)}
            onChange={(e) => {
              const v = e.target.value
              setFiltro(v === 'especificos' || v === 'todos' ? v : Number(v))
            }}
          >
            <option value="especificos">Anos específicos de cada curso (2 e 3)</option>
            <option value="todos">Todos, incluindo a base comum (Ano 1)</option>
            {todosAnos.anosComparados.map((n) => (
              <option key={n} value={n}>
                Só o Ano {n}
              </option>
            ))}
          </select>
        </label>
        <label className="busca">
          <span className="rotulo">Buscar</span>
          <input type="search" placeholder="Buscar assunto…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        <ul className="legenda legenda--areas" aria-label="Cores das disciplinas">
          {LEGENDA_AREAS.map((l) => (
            <li key={l.nome}>
              <span className="legenda__bolinha" style={{ background: l.cor }} aria-hidden="true" />
              {l.nome}
            </li>
          ))}
          <li>
            <span className="legenda__bolinha legenda__bolinha--comum" aria-hidden="true" />
            Em comum (anel)
          </li>
        </ul>
      </div>

      <div className="zonas">
        {SITUACOES.map((s) => (
          <Zona
            key={s}
            titulo={nomeDaZona[s]}
            subtitulo={s === 'so-a' ? a.nome : s === 'so-b' ? b.nome : `${a.sigla} e ${b.sigla}`}
            grupos={porZona.get(s)!}
            termo={termo}
            selecionado={selecionado}
            onSelecionar={setSelecionado}
            destaque={s === 'comum'}
          />
        ))}
      </div>

      <div className="detalhes detalhes--base" aria-live="polite">
        {grupo ? (
          <>
            <p className="rotulo">Tema · {nomeDaZona[grupo.situacao]}</p>
            <h2 className="detalhes__titulo">{grupo.tema.nome}</h2>
            <div className="detalhes__colunas">
              <AssuntosDoTema curso={a} itens={grupo.itens.filter((i) => i.a)} lado="a" termo={termo} />
              <AssuntosDoTema curso={b} itens={grupo.itens.filter((i) => i.b)} lado="b" termo={termo} />
            </div>
          </>
        ) : (
          <p className="detalhes__vazio">Clique em um tema para ver quais assuntos dele cada curso estuda.</p>
        )}
      </div>
    </div>
  )
}

function AssuntosDoTema({ curso, itens, lado, termo }: { curso: Curso; itens: ItemComparado[]; lado: 'a' | 'b'; termo: string }) {
  return (
    <div>
      <p className="rotulo">{curso.nome}</p>
      {itens.length === 0 ? (
        <p className="detalhes__vazio">Nenhum assunto deste tema.</p>
      ) : (
        <ul className="assuntos-tema">
          {itens.map((item) => {
            const comum = item.situacao === 'comum'
            const achado = termo.length >= 2 && normalizar(item.texto).includes(termo)
            const classes = [comum ? 'assuntos-tema__comum' : '', achado ? 'assuntos-tema__achado' : ''].filter(Boolean).join(' ')
            return (
              <li key={item.id} className={classes || undefined}>
                <strong>
                  {comum && <span aria-hidden="true">✓ </span>}
                  {item.texto}
                  {comum && <span className="sr-only"> (nos dois cursos)</span>}
                </strong>
                <span className="assuntos-tema__onde">
                  {item[lado]!.ocorrencias.map((o) => `Ano ${o.ano}, Projeto ${o.projeto}`).join(' · ')}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Zona({
  titulo,
  subtitulo,
  grupos,
  termo,
  selecionado,
  onSelecionar,
  destaque,
}: {
  titulo: string
  subtitulo: string
  grupos: GrupoTema[]
  termo: string
  selecionado: string | null
  onSelecionar: (id: string) => void
  destaque?: boolean
}) {
  return (
    <section className={`zona ${destaque ? 'zona--comum' : ''}`}>
      <header className="zona__topo">
        <h2>{titulo}</h2>
        <p>
          {subtitulo} · <strong>{grupos.length}</strong> {grupos.length === 1 ? 'tema' : 'temas'}
        </p>
      </header>
      {grupos.length === 0 && <p className="detalhes__vazio">Nenhum tema aqui.</p>}
      {LEGENDA_AREAS.map((area, i) => {
        // `grupos` já vem ordenado por disciplina; aqui só separa cada uma sob o seu título.
        const daArea = grupos.filter((g) => ordemDaArea(g.tema) === i)
        if (daArea.length === 0) return null
        return (
          <div key={area.nome} className="zona__grupo">
            <h3>{area.nome}</h3>
            <div className="temas">
              {daArea.map((g) => {
                const apagado = termo.length >= 2 && !g.itens.some((i) => normalizar(i.texto).includes(termo))
                const classes = [
                  'tema',
                  g.situacao === 'comum' ? 'tema--comum' : '',
                  selecionado === g.tema.id ? 'tema--sel' : '',
                  apagado ? 'tema--apagado' : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <button
                    key={g.tema.id}
                    type="button"
                    className={classes}
                    style={{ '--cor': corDoTema(g.tema), '--tinta': tintaDoTema(g.tema) } as CSSProperties}
                    aria-label={`${g.tema.nome} (${ROTULO_SITUACAO[g.situacao]})`}
                    aria-pressed={selecionado === g.tema.id}
                    onClick={() => onSelecionar(g.tema.id)}
                  >
                    {nomeQuebravel(g.tema)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </section>
  )
}

/* ------------------------------------------------------------- projeto a projeto */

function Projetos({ a, b, rota }: { a: Curso; b: Curso; rota: Rota }) {
  const listaA = useMemo(() => projetosDoCurso(a).filter((p) => p.projeto.areas.length > 0), [a])
  const listaB = useMemo(() => projetosDoCurso(b).filter((p) => p.projeto.areas.length > 0), [b])

  const numeroA = Number(rota.query.get('pa'))
  const entradaA = listaA.find((p) => p.projeto.numero === numeroA) ?? listaA[0]
  const numeroB = Number(rota.query.get('pb'))
  const entradaB =
    listaB.find((p) => p.projeto.numero === numeroB) ??
    listaB.find((p) => p.projeto.numero === entradaA?.projeto.numero) ??
    listaB[0]

  const matriz = useMemo(
    () => listaA.map((pa) => listaB.map((pb) => compararProjetos(pa.projeto, pb.projeto).comuns.size)),
    [listaA, listaB],
  )
  const maximo = Math.max(1, ...matriz.flat())

  if (!entradaA || !entradaB) return <p className="aviso">Não há projetos cadastrados para comparar.</p>

  const par = compararProjetos(entradaA.projeto, entradaB.projeto)
  const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)

  return (
    <div className="comparacao">
      <div className="seletores seletores--projetos">
        <SeletorProjeto rotulo={`Projeto de ${a.sigla}`} lista={listaA} valor={entradaA.projeto.numero} onChange={(n) => atualizarQuery(rota, { pa: n })} />
        <span className="seletores__vs" aria-hidden="true">
          ×
        </span>
        <SeletorProjeto rotulo={`Projeto de ${b.sigla}`} lista={listaB} valor={entradaB.projeto.numero} onChange={(n) => atualizarQuery(rota, { pb: n })} />
      </div>

      <div className="resumo">
        <div>
          <strong>{par.comuns.size}</strong>
          <span>assuntos em comum</span>
        </div>
        <div>
          <strong>{pct(par.comuns.size, par.totalA)}%</strong>
          <span>
            do Projeto {entradaA.projeto.numero} ({par.totalA})
          </span>
        </div>
        <div>
          <strong>{pct(par.comuns.size, par.totalB)}%</strong>
          <span>
            do Projeto {entradaB.projeto.numero} ({par.totalB})
          </span>
        </div>
      </div>

      <div className="lado-a-lado">
        <PainelProjeto curso={a} entrada={entradaA} comuns={par.comuns} />
        <PainelProjeto curso={b} entrada={entradaB} comuns={par.comuns} />
      </div>

      <section className="mapa" aria-labelledby="mapa-titulo">
        <h2 id="mapa-titulo" className="titulo-secao titulo-secao--pequeno">
          Mapa de sobreposição
        </h2>
        <p className="mapa__nota">Número de assuntos em comum entre cada par de projetos. Clique em uma célula para comparar o par.</p>
        <div className="mapa__rolagem">
          <table>
            <thead>
              <tr>
                <th scope="col">
                  {a.sigla} ↓ · {b.sigla} →
                </th>
                {listaB.map((pb) => (
                  <th key={pb.projeto.numero} scope="col" title={pb.projeto.titulo}>
                    P{pb.projeto.numero}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listaA.map((pa, i) => (
                <tr key={pa.projeto.numero}>
                  <th scope="row" title={pa.projeto.titulo}>
                    P{pa.projeto.numero}
                  </th>
                  {listaB.map((pb, j) => {
                    const n = matriz[i][j]
                    const ativa = pa === entradaA && pb === entradaB
                    return (
                      <td key={pb.projeto.numero}>
                        <button
                          type="button"
                          className={`celula ${ativa ? 'celula--ativa' : ''}`}
                          style={{ '--forca': n / maximo } as CSSProperties}
                          aria-label={`${a.sigla} projeto ${pa.projeto.numero} e ${b.sigla} projeto ${pb.projeto.numero}: ${n} assuntos em comum`}
                          aria-pressed={ativa}
                          onClick={() => atualizarQuery(rota, { pa: pa.projeto.numero, pb: pb.projeto.numero })}
                        >
                          {n || '–'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function SeletorProjeto({
  rotulo,
  lista,
  valor,
  onChange,
}: {
  rotulo: string
  lista: ReturnType<typeof projetosDoCurso>
  valor: number
  onChange: (numero: number) => void
}) {
  return (
    <label>
      <span className="rotulo">{rotulo}</span>
      <select value={valor} onChange={(e) => onChange(Number(e.target.value))}>
        {lista.map(({ ano, projeto }) => (
          <option key={projeto.numero} value={projeto.numero}>
            Ano {ano} · Projeto {projeto.numero} · {projeto.titulo}
          </option>
        ))}
      </select>
    </label>
  )
}

function PainelProjeto({
  curso,
  entrada,
  comuns,
}: {
  curso: Curso
  entrada: ReturnType<typeof projetosDoCurso>[number]
  comuns: Set<string>
}) {
  const { ano, projeto } = entrada
  return (
    <article className="painel">
      <p className="rotulo">
        {curso.sigla} · Ano {ano}
      </p>
      <h2 className="painel__titulo">
        Projeto {projeto.numero} · {projeto.titulo}
      </h2>
      <p>{projeto.descricao}</p>
      {projeto.areas.map((area) => (
        <div key={area.nome} className="painel__area">
          <h3>
            <span className="legenda__bolinha" style={{ background: corDaArea(area.nome) }} aria-hidden="true" />
            {area.nome}
          </h3>
          <ul className="chips">
            {area.assuntos.map((texto) => {
              const comum = comuns.has(normalizar(texto))
              return (
                <li key={texto} className={comum ? 'chip chip--comum' : 'chip'}>
                  {comum && <span aria-hidden="true">✓ </span>}
                  {texto}
                  {comum && <span className="sr-only"> (em comum)</span>}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </article>
  )
}
