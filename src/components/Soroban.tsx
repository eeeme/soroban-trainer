import { useRef, useState, type PointerEvent } from 'react'
import { tapEarth, tapHeaven } from '../domain/abacus.ts'
import { digitToPos, dragEarth, dragHeaven, posToDigit, type RodPos } from '../domain/beadPhysics.ts'

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
/** これ以上動いたらタップではなくドラッグ（px） */
const DRAG_THRESHOLD_PX = 6
/** 指を離した瞬間の勢いをどれだけ先まで反映するか（ms） */
const FLING_MS = 90

const BEAD_PATH = `M0 ${BEAD_H / 2} L${BEAD_W * 0.2} 3 L${BEAD_W * 0.8} 3 L${BEAD_W} ${BEAD_H / 2} L${BEAD_W * 0.8} ${BEAD_H - 3} L${BEAD_W * 0.2} ${BEAD_H - 3} Z`

/** 掴んだ珠。'h' は五珠、数字は一珠の番号（0=梁側） */
type BeadRef = 'h' | number

interface Drag {
  pointerId: number
  rod: number
  bead: BeadRef
  startY: number
  /** 掴んだ時点の珠の位置（珠単位） */
  startPos: number
  /** 画面 px → 珠単位 */
  pxPerBead: number
  moved: boolean
  /** 勢いの計算用（直近の位置と時刻） */
  samples: { t: number; y: number }[]
}

interface Props {
  /** 各桁の数字（左が上位桁） */
  values: readonly number[]
  /** 指を離して珠の配置が確定したときだけ呼ばれる */
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
  const svgRef = useRef<SVGSVGElement>(null)
  const drags = useRef(new Map<number, Drag>())
  /** 指で動かしている最中の桁の珠の位置（それ以外の桁は values から決まる） */
  const [live, setLive] = useState<Record<number, RodPos>>({})
  const liveRef = useRef(live)

  const updateLive = (next: Record<number, RodPos>) => {
    liveRef.current = next
    setLive(next)
  }

  const posOf = (rod: number): RodPos => liveRef.current[rod] ?? digitToPos(values[rod])

  const beadY = (p: RodPos, bead: BeadRef) => (bead === 'h' ? p.heaven : p.earth[bead])

  const moveBead = (p: RodPos, bead: BeadRef, target: number) =>
    bead === 'h' ? dragHeaven(p, target) : dragEarth(p, bead, target)

  const commit = (rod: number, digit: number) => {
    if (!onChange || digit === values[rod]) return
    const next = [...values]
    next[rod] = digit
    onChange(next)
  }

  const endDrag = (d: Drag, cancelled: boolean) => {
    drags.current.delete(d.pointerId)
    const { [d.rod]: pos, ...rest } = liveRef.current
    updateLive(rest)
    if (cancelled || !pos) return
    if (!d.moved) {
      // 動かさずに離した＝タップ：従来どおり入れる／払う
      const digit = values[d.rod]
      commit(d.rod, d.bead === 'h' ? tapHeaven(digit) : tapEarth(digit, d.bead))
      return
    }
    // 弾いた勢いを少し先まで延ばしてから、近い方に寄せる
    const s = d.samples
    let final = pos
    if (s.length >= 2) {
      const a = s[0]
      const b = s[s.length - 1]
      const v = (b.y - a.y) / Math.max(1, b.t - a.t) // 珠/ms
      final = moveBead(pos, d.bead, beadY(pos, d.bead) + v * FLING_MS)
    }
    commit(d.rod, posToDigit(final))
  }

  const onBeadDown = (rod: number, bead: BeadRef) => (e: PointerEvent<SVGGElement>) => {
    if (!interactive || !svgRef.current) return
    if ([...drags.current.values()].some((d) => d.rod === rod)) return // 1つの桁は1本の指で
    e.preventDefault()
    svgRef.current.setPointerCapture(e.pointerId)
    const rect = svgRef.current.getBoundingClientRect()
    const p = posOf(rod)
    drags.current.set(e.pointerId, {
      pointerId: e.pointerId,
      rod,
      bead,
      startY: e.clientY,
      startPos: beadY(p, bead),
      pxPerBead: (rect.height / HEIGHT) * BEAD_H,
      moved: false,
      samples: [{ t: e.timeStamp, y: beadY(p, bead) }],
    })
    updateLive({ ...liveRef.current, [rod]: p })
  }

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const d = drags.current.get(e.pointerId)
    if (!d) return
    const dy = e.clientY - d.startY
    if (!d.moved && Math.abs(dy) < DRAG_THRESHOLD_PX) return
    d.moved = true
    const next = moveBead(posOf(d.rod), d.bead, d.startPos + dy / d.pxPerBead)
    const y = beadY(next, d.bead)
    d.samples = [...d.samples, { t: e.timeStamp, y }].filter((s) => e.timeStamp - s.t <= 80)
    updateLive({ ...liveRef.current, [d.rod]: next })
  }

  const onUp = (e: PointerEvent<SVGSVGElement>) => {
    const d = drags.current.get(e.pointerId)
    if (d) endDrag(d, false)
  }

  const onCancel = (e: PointerEvent<SVGSVGElement>) => {
    const d = drags.current.get(e.pointerId)
    if (d) endDrag(d, true)
  }

  const classes = ['soroban', glow && 'glow', faint && 'faint', interactive && 'interactive']
    .filter(Boolean)
    .join(' ')

  return (
    <svg
      ref={svgRef}
      className={classes}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      width={width * SCALE}
      height={HEIGHT * SCALE}
      role="img"
      aria-label={`そろばん ${values.join('')}`}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
    >
      <rect className="frame" x={1} y={1} width={width - 2} height={HEIGHT - 2} rx={10} />
      {values.map((_, i) => {
        const cx = PAD_X + ROD_W * i + ROD_W / 2
        return <line key={i} className="rod" x1={cx} x2={cx} y1={TOP} y2={HEIGHT - 10} />
      })}
      <rect className="beam" x={PAD_X / 2} y={BEAM_Y} width={width - PAD_X} height={BEAM_H} />
      {/* 定位点：一の位 */}
      <circle
        className="unit-dot"
        cx={PAD_X + ROD_W * (values.length - 1) + ROD_W / 2}
        cy={BEAM_Y + BEAM_H / 2}
        r={2.5}
      />
      {values.map((digit, i) => {
        const x = PAD_X + ROD_W * i + (ROD_W - BEAD_W) / 2
        const dragging = live[i] !== undefined
        const p = live[i] ?? digitToPos(digit)
        const ms = dragging ? 0 : transitionMs
        return (
          <g key={i}>
            <Bead
              x={x}
              y={TOP + p.heaven * BEAD_H}
              on={p.heaven >= 0.5}
              ms={ms}
              onDown={onBeadDown(i, 'h')}
            />
            {p.earth.map((y, j) => (
              <Bead
                key={j}
                x={x}
                y={EARTH_Y + y * BEAD_H}
                on={y - j < 0.5}
                ms={ms}
                onDown={onBeadDown(i, j)}
              />
            ))}
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
  onDown: (e: PointerEvent<SVGGElement>) => void
}

function Bead({ x, y, on, ms, onDown }: BeadProps) {
  return (
    <g
      className={on ? 'bead on' : 'bead'}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        transition: ms ? `transform ${ms}ms cubic-bezier(.2,.8,.3,1)` : 'none',
      }}
      onPointerDown={onDown}
    >
      {/* タップ領域は桁の幅いっぱい */}
      <rect className="hit" x={-(ROD_W - BEAD_W) / 2} y={0} width={ROD_W} height={BEAD_H} />
      <path d={BEAD_PATH} />
    </g>
  )
}
