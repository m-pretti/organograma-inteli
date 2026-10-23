/** Normaliza um texto para comparação: minúsculas, sem acentos e sem pontuação. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function slug(texto: string): string {
  return normalizar(texto).replace(/ /g, '-')
}

/** Quebra um texto em até `maxLinhas` linhas de ~`largura` caracteres, com reticências no fim. */
export function quebrar(texto: string, largura: number, maxLinhas: number): string[] {
  const palavras = texto.split(/\s+/)
  const linhas: string[] = []
  let atual = ''
  for (const p of palavras) {
    if (atual && (atual + ' ' + p).length > largura) {
      linhas.push(atual)
      atual = p
    } else {
      atual = atual ? atual + ' ' + p : p
    }
  }
  if (atual) linhas.push(atual)
  if (linhas.length <= maxLinhas) return linhas
  const cortadas = linhas.slice(0, maxLinhas)
  cortadas[maxLinhas - 1] = cortadas[maxLinhas - 1].replace(/[\s,.;:]*$/, '') + '…'
  return cortadas
}
