import { useState } from 'react'
import { CATEGORIES, CATEGORY_CROSS_LABEL, CATEGORY_LABEL, classify } from '../domain/classify.ts'
import {
  ALL_PATTERN_IDS,
  ALL_PATTERNS,
  parsePatternId,
  patternId,
  patternLabel,
  type PatternId,
  type Op,
} from '../domain/patterns.ts'
import { avgMs, errorCount, isWeak, median, type PatternStats, type StatsMap } from '../domain/stats.ts'

interface Props {
  stats: StatsMap
  baseMs: number | null
}

const LEVEL_COLORS = [
  'rgba(217, 199, 160, 0.10)',
  'rgba(217, 199, 160, 0.24)',
  'rgba(214, 160, 110, 0.45)',
  'rgba(205, 115, 80, 0.65)',
  'rgba(200, 80, 60, 0.85)',
]
const LEVEL_LABELS = ['速い', '', '基準', '', '遅い']

function level(ms: number, ref: number): number {
  const r = ms / ref
  if (r < 0.7) return 0
  if (r < 0.9) return 1
  if (r <= 1.0) return 2
  if (r < 1.4) return 3
  return 4
}

export function WeakMap({ stats, baseMs }: Props) {
  const [op, setOp] = useState<Op>('add')
  const [selected, setSelected] = useState<PatternId | null>(null)

  // 基準タイムがまだ無ければ、計測済み全体の中央値を物差しにする
  const allAvgs = ALL_PATTERN_IDS.map((id) => stats[id]).flatMap((s) => {
    const m = s ? avgMs(s) : null
    return m === null ? [] : [m]
  })
  const ref = baseMs ?? median(allAvgs)
  const sel = selected ? stats[selected] : undefined

  return (
    <section>
      <h1>苦手マップ</h1>
      <div className="segmented">
        {(['add', 'sub'] as const).map((o) => (
          <button
            key={o}
            type="button"
            className={o === op ? 'active' : ''}
            onClick={() => {
              setOp(o)
              setSelected(null)
            }}
          >
            {o === 'add' ? '加算' : '減算'}
          </button>
        ))}
      </div>

      <div className="grid-wrap">
        <table className="weak-grid mono">
          <thead>
            <tr>
              <th className="corner">{op === 'add' ? '珠＼+' : '珠＼−'}</th>
              {Array.from({ length: 9 }, (_, i) => (
                <th key={i}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, a) => (
              <tr key={a}>
                <th>{op === 'add' ? a : 10 + a}</th>
                {Array.from({ length: 9 }, (_, i) => {
                  const id = patternId({ op, a, n: i + 1 })
                  const s = stats[id]
                  const m = s ? avgMs(s) : null
                  const errs = s ? errorCount(s) : 0
                  const bg = m !== null && ref !== null ? LEVEL_COLORS[level(m, ref)] : undefined
                  return (
                    <td
                      key={i}
                      className={[m === null && 'empty', selected === id && 'selected'].filter(Boolean).join(' ')}
                      style={bg ? { background: bg } : undefined}
                      onClick={() => setSelected(id)}
                    >
                      {s?.graduated ? <span className="grad">✓</span> : errs > 0 ? <span className="err">{'•'.repeat(Math.min(errs, 3))}</span> : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        {LEVEL_COLORS.map((c, i) => (
          <span key={i} className="legend-item">
            <span className="swatch" style={{ background: c }} />
            {LEVEL_LABELS[i]}
          </span>
        ))}
        <span className="legend-item">
          <span className="err">•</span> 誤答
        </span>
        <span className="legend-item">
          <span className="grad">✓</span> 卒業
        </span>
      </div>

      <div className="detail">
        {selected ? <Detail id={selected} s={sel} baseMs={baseMs} /> : <p className="muted small">マスをタップすると詳細を表示します。</p>}
      </div>

      <h2>分類別</h2>
      <CategoryTable stats={stats} />
    </section>
  )
}

function Detail({ id, s, baseMs }: { id: PatternId; s: PatternStats | undefined; baseMs: number | null }) {
  const label = patternLabel(parsePatternId(id))
  if (!s || s.recentMs.length === 0) {
    return (
      <p>
        <span className="mono">{label}</span> <span className="muted">未計測</span>
      </p>
    )
  }
  const m = avgMs(s)!
  return (
    <p>
      <span className="mono detail-label">{label}</span>
      <span className="muted">{CATEGORY_LABEL[s.category]}</span>
      <br />
      <span className="mono">
        平均 {(m / 1000).toFixed(2)}秒・誤答 {errorCount(s)}/{s.recentCorrect.length}・箱{s.box}
      </span>
      <span className="muted">
        {s.graduated ? '・卒業' : isWeak(s, baseMs) ? '・苦手' : ''}
      </span>
    </p>
  )
}

function CategoryTable({ stats }: { stats: StatsMap }) {
  return (
    <table className="cat-table">
      <thead>
        <tr>
          <th>分類</th>
          <th>平均</th>
          <th>誤答率</th>
          <th>計測</th>
        </tr>
      </thead>
      <tbody>
        {CATEGORIES.map((cat) => {
          const all = ALL_PATTERNS.filter((p) => classify(p) === cat).length
          const measured = ALL_PATTERN_IDS.flatMap((id) => {
            const s = stats[id]
            return s && s.category === cat && s.recentMs.length > 0 ? [s] : []
          })
          const ms = measured.flatMap((s) => s.recentMs)
          const cs = measured.flatMap((s) => s.recentCorrect)
          const avg = ms.length ? ms.reduce((x, y) => x + y, 0) / ms.length : null
          const errRate = cs.length ? cs.filter((c) => !c).length / cs.length : null
          return (
            <tr key={cat}>
              <td>
                {CATEGORY_LABEL[cat]}
                <span className="muted small"> {CATEGORY_CROSS_LABEL[cat]}</span>
              </td>
              <td className="mono">{avg === null ? '—' : `${(avg / 1000).toFixed(2)}s`}</td>
              <td className="mono">{errRate === null ? '—' : `${Math.round(errRate * 100)}%`}</td>
              <td className="mono">
                {measured.length}
                <span className="muted">/{all}</span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
