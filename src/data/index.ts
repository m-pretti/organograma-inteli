import baseComum from './base-comum.json'
import type { Ano, Assunto, Curso, CursoInfo } from './types'
import { normalizar } from '../lib/texto'

export const CURSOS_INFO: CursoInfo[] = [
  { id: 'ciencia-da-computacao', sigla: 'CC', nome: 'Ciência da Computação', url: 'https://www.inteli.edu.br/ciencia-da-computacao/' },
  { id: 'engenharia-de-computacao', sigla: 'EC', nome: 'Engenharia de Computação', url: 'https://www.inteli.edu.br/engenharia-de-computacao/' },
  { id: 'engenharia-de-software', sigla: 'ES', nome: 'Engenharia de Software', url: 'https://www.inteli.edu.br/engenharia-de-software/' },
  { id: 'sistemas-de-informacao', sigla: 'SI', nome: 'Sistemas de Informação', url: 'https://www.inteli.edu.br/sistemas-de-informacao/' },
  { id: 'adm-tech', sigla: 'ADM', nome: 'Adm Tech', url: 'https://www.inteli.edu.br/adm-tech/' },
]

// Cada arquivo em src/data/cursos/<id>.json traz os anos específicos do curso (Ano 2 em diante).
// Para cadastrar um curso novo basta criar o arquivo com o mesmo id de CURSOS_INFO.
const arquivos = import.meta.glob<{ anos: Ano[] }>('./cursos/*.json', { eager: true, import: 'default' })

export const cursos: Curso[] = CURSOS_INFO.map((info) => {
  const especifico = arquivos[`./cursos/${info.id}.json`]
  return {
    ...info,
    // O Ano 1 é o currículo comum a todos os cursos.
    anos: [baseComum as Ano, ...(especifico?.anos ?? [])],
    temGradeCompleta: Boolean(especifico),
  }
})

export function getCurso(id: string | undefined): Curso | undefined {
  return cursos.find((c) => c.id === id)
}

/** Anos que têm projetos cadastrados (o Ano 4 só traz trilhas, não projetos). */
export function anosComProjetos(curso: Curso): number[] {
  return curso.anos.filter((a) => a.projetos.length > 0).map((a) => a.numero)
}

/** Todos os assuntos do curso, deduplicados pelo texto normalizado. */
export function assuntosDoCurso(curso: Curso, anos?: number[]): Map<string, Assunto> {
  const mapa = new Map<string, Assunto>()
  for (const ano of curso.anos) {
    if (anos && !anos.includes(ano.numero)) continue
    for (const projeto of ano.projetos) {
      for (const area of projeto.areas) {
        for (const texto of area.assuntos) {
          const id = normalizar(texto)
          let item = mapa.get(id)
          if (!item) {
            item = { id, texto, ocorrencias: [] }
            mapa.set(id, item)
          }
          item.ocorrencias.push({ ano: ano.numero, projeto: projeto.numero, area: area.nome })
        }
      }
    }
  }
  return mapa
}

export function contagem(curso: Curso) {
  const projetos = curso.anos.reduce((n, a) => n + a.projetos.length, 0)
  return { projetos, assuntos: assuntosDoCurso(curso).size }
}
