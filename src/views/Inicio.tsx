import { contagem, cursos } from '../data'

export default function Inicio() {
  return (
    <>
      <section className="secao secao--branca">
        <div className="conteiner">
          <p className="rotulo">Organograma curricular</p>
          <h1 className="titulo-pagina">Grade curricular dos cursos do Inteli</h1>
          <p className="lead">
            Escolha um curso para ver o caminho de cada projeto, disciplina e assunto, ou compare dois cursos para
            descobrir o que eles têm em comum.
          </p>
        </div>
      </section>

      <section className="secao secao--cinza" aria-labelledby="cursos-titulo">
        <div className="conteiner">
          <h2 id="cursos-titulo" className="titulo-secao">
            Cursos
          </h2>
          <ul className="circulos">
            {cursos.map((curso) => {
              const { projetos, assuntos } = contagem(curso)
              return (
                <li key={curso.id}>
                  <a
                    className={`circulo ${curso.temGradeCompleta ? 'circulo--completo' : ''}`}
                    href={`#/curso/${curso.id}`}
                  >
                    <span className="circulo__sigla">{curso.sigla}</span>
                    <span className="circulo__nome">{curso.nome}</span>
                    <span className="circulo__meta">
                      {projetos} projetos · {assuntos} assuntos
                    </span>
                    {!curso.temGradeCompleta && <span className="circulo__aviso">Só o Ano 1 por enquanto</span>}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <section className="secao secao--escura" aria-labelledby="comparar-titulo">
        <div className="conteiner">
          <h2 id="comparar-titulo" className="titulo-secao titulo-secao--clara">
            Compare dois cursos
          </h2>
          <div className="cartoes">
            <article className="cartao">
              <h3>Visão geral</h3>
              <p>
                Todos os assuntos dos dois cursos lado a lado. Os que aparecem nos dois ficam no centro, em destaque.
              </p>
              <a className="botao" href="#/comparar?vista=geral">
                Comparar visão geral
              </a>
            </article>
            <article className="cartao">
              <h3>Projeto a projeto</h3>
              <p>
                Escolha um projeto de cada curso e veja quais disciplinas e assuntos se repetem, com um mapa de
                sobreposição entre todos os projetos.
              </p>
              <a className="botao" href="#/comparar?vista=projetos">
                Comparar projetos
              </a>
            </article>
          </div>
        </div>
      </section>
    </>
  )
}
