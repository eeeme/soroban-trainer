import type { PointerEvent } from 'react'
import { beads, tapEarth, tapHeaven } from '../domain/abacus.ts'

const ROD_W = 100
const BEAD_W = 76
const BEAD_H = 44
const PAD_X = 12
const TOP = 10
const BEAM_H = 6
const BEAM_Y = TOP + BEAD_H * 2
const EARTH_Y = BEAM_Y + BEAM_H
const HEIGHT = EARTH_Y + BEAD_H * 5 + 10
/** viewBox → 画面の倍率。珠のタップ領域が44px以上になるように */
const SCALE = 1.1

const BEAD_PATH = `M0 ${BEAD_H / 2} L${BEAD_W * 0.2} 3 L${BEAD_W * 0.8} 3 L${BEAD_W} ${BEAD_H / 2} L${BEAD_W * 0.8} ${BEAD_H - 3} L${BEAD_W * 0.2} ${BEAD_H - 3} Z`

interface Props {
  /** 各桁の数字（左が上位桁） */
  values: readonly number[]
  onChange?: (values: number[]) => void
  /** 正解時に珠を一瞬灯す */
  glow?: boolean
  /** 珠を薄く表示（珠表示オフ） */
  faint?: boolean
  /** 珠の移動アニメーション時間 */
  transitionMs?: number
}

export function Soroban({ values, onChange, glow = false, faint = false, transitionMs = 90 }: Props) {
  const width = PAD_X * 2 + ROD_W * values.length
  const interactive = onChange !== undefined

  const set = (rod: number, digit: number) => {
    if (!onChange) return
    const next = [...values]
    next[rod] = digit
    onChange(next)
  }

  const classes = ['soroban', glow && 'glow', faint && 'faint', interactive && 'interactive']
    .filter(Boolean)
    .join(' ')

  return (
    <svg
      className={classes}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      width={width * SCALE}
      height={HEIGHT * SCALE}
      role="img"
      aria-label={`そろばん ${values.join('')}`}
    >
      <rect className="frame" x={1} y={1} width={width - 2} height={HEIGHT - 2} rx={10} />
      {values.map((_, i) => {
        const cx = PAD_X + ROD_W * i + ROD_W / 2
        return <line key={i} className="rod" x1={cx} x2={cx} y1={TOP} y2={HEIGHT - 10} />
      })}
      <rect className="beam" x={PAD_X / 2} y={BEAM_Y} width={width - PAD_X} height={BEAM_H} />
      {/* 定位点：一の位 */}
      <circle className="unit-dot" cx={PAD_X + ROD_W * (values.length - 1) + ROD_W / 2} cy={BEAM_Y + BEAM_H / 2} r={2.5} />
      {values.map((digit, i) => {
        const x = PAD_X + ROD_W * i + (ROD_W - BEAD_W) / 2
        const b = beads(digit)
        return (
          <g key={i}>
            <Bead
              x={x}
              y={b.heaven ? TOP + BEAD_H : TOP}
              on={b.heaven}
              ms={transitionMs}
              onTap={interactive ? () => set(i, tapHeaven(digit)) : undefined}
            />
            {[0, 1, 2, 3].map((j) => {
              const on = j < b.earth
              return (
                <Bead
                  key={j}
                  x={x}
                  y={EARTH_Y + (on ? j : j + 1) * BEAD_H}
                  on={on}
                  ms={transitionMs}
                  onTap={interactive ? () => set(i, tapEarth(digit, j)) : undefined}
                />
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

interface BeadProps {
  x: number
  y: number
  on: boolean
  ms: number
  onTap?: () => void
}

function Bead({ x, y, on, ms, onTap }: BeadProps) {
  const handle = onTap
    ? (e: PointerEvent<SVGGElement>) => {
        e.preventDefault()
        onTap()
      }
    : undefined
  return (
    <g
      className={on ? 'bead on' : 'bead'}
      style={{ transform: `translate(${x}px, ${y}px)`, transition: `transform ${ms}ms ease-out` }}
      onPointerDown={handle}
    >
      {/* タップ領域は桁の幅いっぱい */}
      <rect className="hit" x={-(ROD_W - BEAD_W) / 2} y={0} width={ROD_W} height={BEAD_H} />
      <path d={BEAD_PATH} />
    </g>
  )
}
