import { useEffect } from 'react'
import { useRota } from './router'
import { getCurso } from './data'
import Inicio from './views/Inicio'
import CursoView from './views/CursoView'
import CompararView from './views/CompararView'

export default function App() {
  const rota = useRota()
  const [raiz, id] = rota.segmentos

  // Ao trocar de tela, volta ao topo; trocar só a query (filtros) não rola a página.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [raiz, id])

  let tela
  if (raiz === 'curso') tela = <CursoView key={id} curso={getCurso(id)} />
  else if (raiz === 'comparar') tela = <CompararView rota={rota} />
  else tela = <Inicio />

  return (
    <>
      <header className="cabecalho">
        <div className="cabecalho__interno">
          <a className="cabecalho__marca" href="#/">
            Grade curricular <span>Inteli</span>
          </a>
          <nav aria-label="Principal" className="cabecalho__nav">
            <a href="#/" aria-current={!raiz ? 'page' : undefined}>
              Cursos
            </a>
            <a href="#/comparar" aria-current={raiz === 'comparar' ? 'page' : undefined}>
              Comparar
            </a>
          </nav>
        </div>
      </header>
      <main>{tela}</main>
      <footer className="rodape">
        <div className="conteiner">
          Conteúdo baseado nas páginas dos cursos em{' '}
          <a href="https://www.inteli.edu.br" target="_blank" rel="noreferrer">
            inteli.edu.br
          </a>
          . Projeto independente de visualização.
        </div>
      </footer>
    </>
  )
}
