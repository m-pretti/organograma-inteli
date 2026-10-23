/** Uma disciplina dentro de um projeto (ex.: "Matemática / Física") com os assuntos vistos nela. */
export interface Area {
  nome: string
  assuntos: string[]
}

export interface Projeto {
  numero: number
  titulo: string
  descricao: string
  areas: Area[]
}

export interface Trilha {
  nome: string
  itens: string[]
}

export interface Ano {
  numero: number
  rotulo: string
  titulo: string
  descricao: string
  projetos: Projeto[]
  trilhas?: Trilha[]
}

/** Dados fixos de cada curso. O conteúdo da grade vem de src/data/cursos/<id>.json. */
export interface CursoInfo {
  id: string
  sigla: string
  nome: string
  url: string
}

export interface Curso extends CursoInfo {
  anos: Ano[]
  /** true quando já existe o arquivo com os anos específicos do curso (além da base comum). */
  temGradeCompleta: boolean
}

/** Um assunto de um curso, já deduplicado pelo texto normalizado. */
export interface Assunto {
  id: string
  texto: string
  ocorrencias: Ocorrencia[]
}

export interface Ocorrencia {
  ano: number
  projeto: number
  area: string
}
