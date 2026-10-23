import type { Curso } from '../data/types'
import { slug } from './texto'

export type Nivel = 'curso' | 'ano' | 'projeto' | 'area' | 'assunto' | 'pendente'
export type Modo = 'projeto' | 'disciplina'

export interface NoArvore {
  id: string
  rotulo: string
  nivel: Nivel
  /** Texto extra mostrado no painel de detalhes. */
  detalhe?: string
  /** Caminho legível até o nó, para o painel de detalhes. */
  caminho: string[]
  filhos?: NoArvore[]
}

export const ROTULO_NIVEL: Record<Nivel, string> = {
  curso: 'Curso',
  ano: 'Ano',
  projeto: 'Projeto',
  area: 'Disciplina',
  assunto: 'Assunto',
  pendente: 'Pendente',
}

/**
 * Monta a árvore de um curso em dois modos:
 *  - projeto:    Curso → Ano → Projeto → Disciplina → Assuntos
 *  - disciplina: Curso → Disciplina → Projeto → Assuntos
 */
export function montarArvore(curso: Curso, modo: Modo): NoArvore {
  const raiz: NoArvore = { id: 'curso', rotulo: curso.nome, nivel: 'curso', caminho: [curso.sigla], filhos: [] }

  if (modo === 'projeto') {
    for (const ano of curso.anos) {
      const idAno = `ano-${ano.numero}`
      const caminhoAno = [curso.sigla, `Ano ${ano.numero}`]
      const noAno: NoArvore = {
        id: idAno,
        rotulo: `Ano ${ano.numero} · ${ano.rotulo}`,
        nivel: 'ano',
        detalhe: `${ano.titulo}. ${ano.descricao}`,
        caminho: caminhoAno,
        filhos: [],
      }
      for (const projeto of ano.projetos) {
        const idProjeto = `${idAno}/p${projeto.numero}`
        const caminhoProjeto = [...caminhoAno, `Projeto ${projeto.numero}`]
        const noProjeto: NoArvore = {
          id: idProjeto,
          rotulo: `Projeto ${projeto.numero} · ${projeto.titulo}`,
          nivel: 'projeto',
          detalhe: projeto.descricao,
          caminho: caminhoProjeto,
          filhos: projeto.areas.map((area) => ({
            id: `${idProjeto}/${slug(area.nome)}`,
            rotulo: area.nome,
            nivel: 'area' as const,
            caminho: [...caminhoProjeto, area.nome],
            filhos: area.assuntos.map((texto) => ({
              id: `${idProjeto}/${slug(area.nome)}/${slug(texto)}`,
              rotulo: texto,
              nivel: 'assunto' as const,
              caminho: [...caminhoProjeto, area.nome, texto],
            })),
          })),
        }
        if (noProjeto.filhos!.length === 0) delete noProjeto.filhos
        noAno.filhos!.push(noProjeto)
      }
      for (const trilha of ano.trilhas ?? []) {
        noAno.filhos!.push({
          id: `${idAno}/${slug(trilha.nome)}`,
          rotulo: trilha.nome,
          nivel: 'area',
          caminho: [...caminhoAno, trilha.nome],
          filhos: trilha.itens.map((texto) => ({
            id: `${idAno}/${slug(trilha.nome)}/${slug(texto)}`,
            rotulo: texto,
            nivel: 'assunto' as const,
            caminho: [...caminhoAno, trilha.nome, texto],
          })),
        })
      }
      if (noAno.filhos!.length === 0) delete noAno.filhos
      raiz.filhos!.push(noAno)
    }
  } else {
    const porArea = new Map<string, NoArvore>()
    for (const ano of curso.anos) {
      for (const projeto of ano.projetos) {
        for (const area of projeto.areas) {
          const idArea = `area-${slug(area.nome)}`
          let noArea = porArea.get(idArea)
          if (!noArea) {
            noArea = { id: idArea, rotulo: area.nome, nivel: 'area', caminho: [curso.sigla, area.nome], filhos: [] }
            porArea.set(idArea, noArea)
            raiz.filhos!.push(noArea)
          }
          const idProjeto = `${idArea}/p${projeto.numero}`
          const caminhoProjeto = [curso.sigla, area.nome, `Projeto ${projeto.numero}`]
          noArea.filhos!.push({
            id: idProjeto,
            rotulo: `Projeto ${projeto.numero} · ${projeto.titulo}`,
            nivel: 'projeto',
            detalhe: `Ano ${ano.numero}. ${projeto.descricao}`,
            caminho: caminhoProjeto,
            filhos: area.assuntos.map((texto) => ({
              id: `${idProjeto}/${slug(texto)}`,
              rotulo: texto,
              nivel: 'assunto' as const,
              caminho: [...caminhoProjeto, texto],
            })),
          })
        }
      }
    }
  }

  if (!curso.temGradeCompleta) {
    raiz.filhos!.push({
      id: 'pendente',
      rotulo: 'Anos 2 a 4 · conteúdo ainda não cadastrado',
      nivel: 'pendente',
      detalhe: `Adicione src/data/cursos/${curso.id}.json para incluir os anos específicos deste curso.`,
      caminho: [curso.sigla, 'Pendente'],
    })
  }
  return raiz
}

export function percorrer(no: NoArvore, fn: (n: NoArvore, pai?: NoArvore) => void, pai?: NoArvore) {
  fn(no, pai)
  for (const f of no.filhos ?? []) percorrer(f, fn, no)
}

/** Ids expandidos por padrão: a raiz e o primeiro nível, para a tela abrir legível. */
export function expandidosIniciais(raiz: NoArvore): Set<string> {
  return new Set([raiz.id])
}
