import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { quebrar } from '../lib/texto'
import { ROTULO_NIVEL, type NoArvore } from '../lib/arvore'

// Abaixo dessa largura o desenho vira um oval em pé, estreito o bastante para caber no celular sem encolher.
const LARGURA_COMPACTA = 560
// Meia largura do desenho no modo compacto, em unidades do viewBox (≈ px num celular de 360px).
const MEIA_LARGURA_COMPACTA = 168

interface Props {
  foco: NoArvore
  selecionado: string | null
  /** Nós que batem com a busca. */
  achados: Set<string>
  /** Nós que têm algum resultado da busca lá dentro. */
  contemAchado: Set<string>
  onAbrir: (id: string) => void
  onSelecionar: (id: string) => void
  onVoltar: () => void
}

interface Satelite {
  no: NoArvore
  x: number
  y: number
  /** Direção do centro até o satélite (vetor unitário). */
  ux: number
  uy: number
  linhas: string[]
}

/** Raio do círculo central, dos círculos menores e tamanho da fonte, conforme a quantidade e o espaço. */
function medidas(n: number, compacto: boolean) {
  if (compacto) {
    const r = n <= 4 ? 56 : n <= 6 ? 52 : n <= 9 ? 48 : 44
    return { rCentro: 64, r, fonte: 11, fonteCentro: 14, margem: 6, folga: 10 }
  }
  const r = n <= 4 ? 78 : n <= 6 ? 70 : n <= 9 ? 62 : 54
  return { rCentro: 112, r, fonte: r >= 70 ? 14 : r >= 62 ? 13 : 12, fonteCentro: 19, margem: 28, folga: 18 }
}

/** n pontos igualmente espaçados (pelo comprimento) numa elipse, a partir do topo ou meio passo depois dele. */
function pontosNaElipse(n: number, rx: number, ry: number, meioPasso: boolean) {
  const AMOSTRAS = 720
  const amostras: { x: number; y: number; acumulado: number }[] = []
  let total = 0
  for (let i = 0; i <= AMOSTRAS; i++) {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / AMOSTRAS
    const x = Math.cos(t) * rx
    const y = Math.sin(t) * ry
    if (i > 0) total += Math.hypot(x - amostras[i - 1].x, y - amostras[i - 1].y)
    amostras.push({ x, y, acumulado: total })
  }
  const pontos: { x: number; y: number }[] = []
  let j = 0
  for (let k = 0; k < n; k++) {
    const alvo = (total * (k + (meioPasso ? 0.5 : 0))) / n
    while (amostras[j].acumulado < alvo) j++
    pontos.push({ x: amostras[j].x, y: amostras[j].y })
  }
  return pontos
}

function menorDistancia(pontos: { x: number; y: number }[]) {
  let menor = Infinity
  for (let i = 0; i < pontos.length && pontos.length > 1; i++) {
    const a = pontos[i]
    const b = pontos[(i + 1) % pontos.length]
    menor = Math.min(menor, Math.hypot(a.x - b.x, a.y - b.y))
  }
  return menor
}

export default function OrganogramaRadial({ foco, selecionado, achados, contemAchado, onAbrir, onSelecionar, onVoltar }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hover, setHover] = useState<string | null>(null)
  const [compacto, setCompacto] = useState(false)

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const observador = new ResizeObserver(([e]) => setCompacto(e.contentRect.width < LARGURA_COMPACTA))
    observador.observe(svg)
    return () => observador.disconnect()
  }, [])

  // Esc ou Backspace voltam um nível de qualquer lugar da página, menos enquanto se digita (ex.: na busca).
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Backspace') return
      const alvo = e.target as HTMLElement | null
      if (alvo && (alvo.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(alvo.tagName))) return
      e.preventDefault()
      onVoltar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onVoltar])

  // Trocar de nível remonta os círculos e o foco do teclado se perderia; ele passa para o círculo central.
  const centroRef = useRef<SVGGElement>(null)
  const focoAnterior = useRef(foco.id)
  useEffect(() => {
    if (focoAnterior.current === foco.id) return
    focoAnterior.current = foco.id
    if (!document.activeElement || document.activeElement === document.body) centroRef.current?.focus({ preventScroll: true })
  }, [foco.id])

  const layout = useMemo(() => {
    const filhos = foco.filhos ?? []
    const n = filhos.length
    const { rCentro, r, fonte, fonteCentro, margem, folga } = medidas(n, compacto)
    // Na tela larga a órbita é um círculo. Na compacta a largura é fixa e a órbita cresce para cima e para baixo
    // até nenhum círculo encostar no vizinho nem no centro.
    let rx: number
    if (compacto) rx = MEIA_LARGURA_COMPACTA - r - margem
    else {
      rx = rCentro + r + 64
      if (n > 1) rx = Math.max(rx, (2 * r + folga) / (2 * Math.sin(Math.PI / n)))
    }
    const encosta = (pontos: { x: number; y: number }[]) =>
      menorDistancia(pontos) < 2 * r + folga || pontos.some((p) => Math.hypot(p.x, p.y) < rCentro + r + folga)
    const orbita = (meioPasso: boolean) => {
      let ry = Math.max(rx, rCentro + r + folga)
      let pontos = pontosNaElipse(n, rx, ry, meioPasso)
      while (encosta(pontos) && ry < 2000) {
        ry += 6
        pontos = pontosNaElipse(n, rx, ry, meioPasso)
      }
      return { ry, pontos }
    }
    // Começa no topo ou meio passo depois. Na tela larga, meio passo só com quantidade par (fica simétrico);
    // na compacta vale o que deixar o oval mais baixo (evita círculo bem na lateral, colado no centro).
    let escolhida: { ry: number; pontos: { x: number; y: number }[] }
    if (!compacto) escolhida = orbita(n % 2 === 0)
    else {
      const [a, b] = [orbita(false), orbita(true)]
      escolhida = b.ry < a.ry ? b : a
    }
    const { ry, pontos } = escolhida

    const linha = Math.round(fonte * 1.18)
    const chars = Math.floor((r * 1.55) / (fonte * 0.55))
    const maxLinhas = Math.min(6, Math.floor((r * 1.45) / linha))
    const satelites: Satelite[] = filhos.map((no, i) => {
      const { x, y } = pontos[i]
      const d = Math.hypot(x, y) || 1
      return { no, x, y, ux: x / d, uy: y / d, linhas: quebrar(no.rotulo, chars, maxLinhas) }
    })
    const linhaCentro = Math.round(fonteCentro * 1.2)
    const linhasCentro = quebrar(foco.rotulo, Math.floor((rCentro * 1.5) / (fonteCentro * 0.55)), 4)
    const ex = compacto ? MEIA_LARGURA_COMPACTA : n ? rx + r + margem : rCentro + margem
    const ey = n ? ry + r + margem : rCentro + margem
    return { rCentro, r, fonte, fonteCentro, linha, linhaCentro, rx, ry, satelites, ex, ey, linhasCentro }
  }, [foco, compacto])

  const { rCentro, r, fonte, fonteCentro, linha, linhaCentro, rx, ry, satelites, ex, ey, linhasCentro } = layout
  const temBusca = achados.size > 0 || contemAchado.size > 0
  const topoCentro = (-(linhasCentro.length - 1) * linhaCentro) / 2 + fonteCentro * 0.7

  const ativar = (no: NoArvore) => {
    if (no.filhos?.length) onAbrir(no.id)
    else onSelecionar(no.id)
  }

  return (
    <svg
      ref={svgRef}
      className="radial"
      viewBox={`${-ex} ${-ey} ${ex * 2} ${ey * 2}`}
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label={`${ROTULO_NIVEL[foco.nivel]}: ${foco.rotulo}`}
    >
      {/* key no foco: ao trocar de nível o desenho é remontado e a animação de abertura roda de novo */}
      <g key={foco.id}>
        {satelites.length > 0 && <ellipse rx={rx} ry={ry} className="radial__orbita" />}

        <g className="radial__tracos">
          {satelites.map((s, i) => {
            const ativo = hover === s.no.id || selecionado === s.no.id
            return (
              <g key={s.no.id} className={ativo ? 'traco traco--ativo' : 'traco'} style={{ animationDelay: `${i * 30}ms` }}>
                <line
                  x1={s.ux * rCentro}
                  y1={s.uy * rCentro}
                  x2={s.x - s.ux * r}
                  y2={s.y - s.uy * r}
                  pathLength={1}
                />
                <circle cx={s.ux * rCentro} cy={s.uy * rCentro} r={4.5} />
              </g>
            )
          })}
        </g>

        <g
          ref={centroRef}
          className={`bolha bolha--centro bolha--${foco.nivel}${selecionado === foco.id ? ' bolha--selecionada' : ''}`}
          tabIndex={0}
          role="button"
          aria-label={`Ver detalhes de ${foco.rotulo}`}
          onClick={() => onSelecionar(foco.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelecionar(foco.id)
            }
          }}
        >
          <title>{foco.rotulo}</title>
          <g className="bolha__corpo">
            <circle r={rCentro} className="bolha__circulo" />
            <text y={topoCentro - linhaCentro - 6} className="bolha__nivel">
              {ROTULO_NIVEL[foco.nivel].toUpperCase()}
            </text>
            <text className="bolha__texto" fontSize={fonteCentro}>
              {linhasCentro.map((texto, i) => (
                <tspan key={i} x={0} y={topoCentro + i * linhaCentro}>
                  {texto}
                </tspan>
              ))}
            </text>
          </g>
        </g>

        {satelites.map((s, i) => {
          const qtd = s.no.filhos?.length ?? 0
          const achado = achados.has(s.no.id)
          const classes = [
            'bolha',
            `bolha--${s.no.nivel}`,
            qtd ? 'bolha--abre' : '',
            selecionado === s.no.id ? 'bolha--selecionada' : '',
            achado ? 'bolha--achada' : '',
            temBusca && !achado && !contemAchado.has(s.no.id) ? 'bolha--apagada' : '',
          ]
            .filter(Boolean)
            .join(' ')
          const topo = (-(s.linhas.length - 1) * linha) / 2 + fonte * 0.35
          return (
            <g
              key={s.no.id}
              className={classes}
              transform={`translate(${s.x},${s.y})`}
              tabIndex={0}
              role="button"
              aria-label={qtd ? `Abrir ${s.no.rotulo} (${qtd} itens)` : s.no.rotulo}
              onClick={() => ativar(s.no)}
              onMouseEnter={() => setHover(s.no.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.no.id)}
              onBlur={() => setHover(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  ativar(s.no)
                }
              }}
            >
              <title>{s.no.rotulo}</title>
              <g className="bolha__corpo" style={{ animationDelay: `${60 + i * 30}ms` }}>
                {(achado || contemAchado.has(s.no.id)) && (
                  <circle r={r + 7} className={achado ? 'bolha__halo' : 'bolha__halo bolha__halo--dentro'} />
                )}
                <circle r={r} className="bolha__circulo" />
                <text className="bolha__texto" fontSize={fonte}>
                  {s.linhas.map((texto, j) => (
                    <tspan key={j} x={0} y={topo + j * linha}>
                      {texto}
                    </tspan>
                  ))}
                </text>
                {qtd > 0 && (
                  // Marcador na borda de fora: quantos itens abrem ao clicar.
                  <g
                    className="bolha__contador"
                    transform={`translate(${s.ux * r},${s.uy * r})`}
                  >
                    <circle r={12} />
                    <text y={4}>{qtd}</text>
                  </g>
                )}
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
