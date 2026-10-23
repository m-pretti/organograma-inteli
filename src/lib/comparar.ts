import type { Assunto, Curso, Projeto } from '../data/types'
import { anosComProjetos, assuntosDoCurso } from '../data'
import { normalizar } from './texto'

export type Situacao = 'so-a' | 'comum' | 'so-b'

export interface ItemComparado {
  id: string
  texto: string
  situacao: Situacao
  a?: Assunto
  b?: Assunto
}

export interface ResultadoGeral {
  /** Anos em que os dois cursos têm projetos cadastrados: só estes entram na comparação. */
  anosComparados: number[]
  /** Anos em que apenas um dos cursos tem projetos cadastrados (ainda não dá para comparar). */
  anosPendentes: { ano: number; faltaEm: Curso[] }[]
  itens: ItemComparado[]
}

/** `anos` restringe a comparação a esses anos (dentre os que os dois cursos têm). */
export function compararGeral(a: Curso, b: Curso, anos?: number[]): ResultadoGeral {
  const anosA = anosComProjetos(a)
  const anosB = anosComProjetos(b)
  const comuns = anosA.filter((n) => anosB.includes(n))
  const anosComparados = anos ? comuns.filter((n) => anos.includes(n)) : comuns
  const todos = [...new Set([...anosA, ...anosB])].sort((x, y) => x - y)
  const anosPendentes = todos
    .filter((n) => !comuns.includes(n))
    .map((ano) => ({ ano, faltaEm: [a, b].filter((c) => !anosComProjetos(c).includes(ano)) }))

  const mapaA = assuntosDoCurso(a, anosComparados)
  const mapaB = assuntosDoCurso(b, anosComparados)
  const itens: ItemComparado[] = []
  for (const [id, itemA] of mapaA) {
    const itemB = mapaB.get(id)
    itens.push({ id, texto: itemA.texto, situacao: itemB ? 'comum' : 'so-a', a: itemA, b: itemB })
  }
  for (const [id, itemB] of mapaB) {
    if (!mapaA.has(id)) itens.push({ id, texto: itemB.texto, situacao: 'so-b', b: itemB })
  }
  return { anosComparados, anosPendentes, itens }
}

export interface ResultadoProjeto {
  comuns: Set<string>
  totalA: number
  totalB: number
}

function idsDoProjeto(projeto: Projeto | undefined): Set<string> {
  const ids = new Set<string>()
  for (const area of projeto?.areas ?? []) for (const t of area.assuntos) ids.add(normalizar(t))
  return ids
}

export function compararProjetos(pa: Projeto | undefined, pb: Projeto | undefined): ResultadoProjeto {
  const idsA = idsDoProjeto(pa)
  const idsB = idsDoProjeto(pb)
  const comuns = new Set([...idsA].filter((id) => idsB.has(id)))
  return { comuns, totalA: idsA.size, totalB: idsB.size }
}

export function projetosDoCurso(curso: Curso): { ano: number; projeto: Projeto }[] {
  return curso.anos.flatMap((ano) => ano.projetos.map((projeto) => ({ ano: ano.numero, projeto })))
}
