import { normalizar } from './texto'

// Cores das disciplinas, tiradas da paleta do site do Inteli.
const CORES: Record<string, string> = {
  matematica: '#402A78',
  computacao: '#855EDE',
  design: '#C39EFF',
  ux: '#C39EFF',
  negocios: '#89CEA5',
  lideranca: '#FFBC7D',
}

const PADRAO = '#999B9D'

export function corDaArea(nome: string): string {
  const chave = normalizar(nome).split(' ')[0]
  return CORES[chave] ?? PADRAO
}

export const LEGENDA_AREAS: { nome: string; cor: string }[] = [
  { nome: 'Matemática / Física', cor: CORES.matematica },
  { nome: 'Computação', cor: CORES.computacao },
  { nome: 'Design / UX', cor: CORES.design },
  { nome: 'Negócios', cor: CORES.negocios },
  { nome: 'Liderança', cor: CORES.lideranca },
]
