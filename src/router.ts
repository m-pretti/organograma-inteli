import { useEffect, useState } from 'react'

export interface Rota {
  segmentos: string[]
  query: URLSearchParams
}

function lerHash(): Rota {
  const bruto = window.location.hash.replace(/^#\/?/, '')
  const [caminho, busca = ''] = bruto.split('?')
  return {
    segmentos: caminho.split('/').filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(busca),
  }
}

/** Roteador por hash (#/curso/ec): funciona em hospedagem estática sem configuração. */
export function useRota(): Rota {
  const [rota, setRota] = useState(lerHash)
  useEffect(() => {
    const aoMudar = () => setRota(lerHash())
    window.addEventListener('hashchange', aoMudar)
    return () => window.removeEventListener('hashchange', aoMudar)
  }, [])
  return rota
}

export function hrefComparar(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') q.set(k, String(v))
  return `#/comparar?${q.toString()}`
}

/** Troca só a query da rota atual, sem empilhar histórico a cada clique. */
export function atualizarQuery(rota: Rota, mudancas: Record<string, string | number | undefined>) {
  const q = new URLSearchParams(rota.query)
  for (const [k, v] of Object.entries(mudancas)) {
    if (v === undefined || v === '') q.delete(k)
    else q.set(k, String(v))
  }
  const caminho = rota.segmentos.map(encodeURIComponent).join('/')
  window.history.replaceState(null, '', `#/${caminho}?${q.toString()}`)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
