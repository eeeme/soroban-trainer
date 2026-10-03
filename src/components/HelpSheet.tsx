import { useEffect, useState } from 'react'
import { CATEGORY_LABEL, solutionSteps } from '../domain/classify.ts'
import { explain } from '../domain/method.ts'
import { patternLabel, type Pattern } from '../domain/patterns.ts'
import { Soroban } from './Soroban.tsx'

interface Props {
  pattern: Pattern
  onClose: () => void
}

const STEP_MS = 900
/** 正解の状態で止める時間 */
const HOLD_MS = 1600

/** 今の問題の考え方と、珠の動きのお手本 */
export function HelpSheet({ pattern, onClose }: Props) {
  const m = explain(pattern)
  const steps = solutionSteps(pattern)
  /** -1 = 出題時の状態、0.. = steps[i+1] まで進んだ状態 */
  const [shown, setShown] = useState(-1)
  const stepCount = m.steps.length

  // 出題時の状態 → 1手ずつ → 正解で少し止めて → 最初に戻る、を閉じるまで繰り返す
  useEffect(() => {
    let timer = 0
    const next = (i: number) => {
      setShown(i)
      const wait = i === -1 ? STEP_MS : i === stepCount - 1 ? HOLD_MS : STEP_MS
      timer = window.setTimeout(() => next(i === stepCount - 1 ? -1 : i + 1), wait)
    }
    timer = window.setTimeout(() => next(0), STEP_MS)
    return () => clearTimeout(timer)
  }, [stepCount])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="考え方" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span className="mono sheet-label">{patternLabel(pattern)}</span>
          <span className="badge">{CATEGORY_LABEL[m.category]}</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="閉じる">
            ×
          </button>
        </div>
        <p className="rule mono">{m.rule}</p>
        <p className="muted small reason">{m.reason}</p>
        <div className="help-body">
          <ol className="help-steps">
            {m.steps.map((s, i) => (
              <li key={i} className={i <= shown ? 'done' : ''}>
                {s}
              </li>
            ))}
          </ol>
          <div className="help-board">
            <Soroban values={steps[shown + 1]} transitionMs={shown === -1 ? 0 : 300} />
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn primary" onClick={onClose}>
            自分で弾く
          </button>
        </div>
      </div>
    </div>
  )
}
