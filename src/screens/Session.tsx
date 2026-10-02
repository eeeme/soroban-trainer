import { useCallback, useEffect, useRef, useState } from 'react'
import { playCorrect, playWrong } from '../audio.ts'
import { Soroban } from '../components/Soroban.tsx'
import { rodsToValue } from '../domain/abacus.ts'
import { CATEGORY_LABEL, classify, solutionSteps } from '../domain/classify.ts'
import {
  answerValue,
  parsePatternId,
  patternId,
  patternLabel,
  startValue,
  type Pattern,
  type PatternId,
} from '../domain/patterns.ts'
import { nextFocus, pickDiagnosis } from '../domain/scheduler.ts'
import type { Settings } from '../domain/settings.ts'
import { weakIds, type Attempt, type Mode, type StatsMap } from '../domain/stats.ts'

interface Props {
  mode: Mode
  stats: StatsMap
  settings: Settings
  baseMs: number | null
  /** 回答を保存し、更新後の統計を返す */
  onRecord: (attempt: Attempt) => Promise<StatsMap>
  onExit: () => void
}

type Phase = 'answer' | 'correct' | 'review' | 'reviewed' | 'done'

interface Result {
  pattern: Pattern
  correct: boolean
  ms: number
  given: number
}

const MODE_TITLE: Record<Mode, string> = {
  diagnosis: '01 パターン診断',
  focus: '02 苦手集中',
}

const toRods = (v: number): number[] => [Math.floor(v / 10), v % 10]

export function Session({ mode, stats, settings, baseMs, onRecord, onExit }: Props) {
  const total = settings.sessionSize
  const [sessionId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const [plan] = useState<PatternId[]>(() =>
    mode === 'diagnosis' ? pickDiagnosis(stats, total, Math.random) : [],
  )
  const [pool] = useState<PatternId[]>(() => (mode === 'focus' ? weakIds(stats, baseMs) : []))
  const statsRef = useRef(stats)

  const choose = useCallback(
    (index: number, last: PatternId | null, current: StatsMap): Pattern | null => {
      if (index >= total) return null
      const id = mode === 'diagnosis' ? plan[index] : nextFocus(pool, current, last, Math.random)
      return id ? parsePatternId(id) : null
    },
    [mode, plan, pool, total],
  )

  const [index, setIndex] = useState(0)
  const [pattern, setPattern] = useState<Pattern | null>(() => choose(0, null, stats))
  const [rods, setRods] = useState<number[]>(() => (pattern ? toRods(startValue(pattern)) : [0, 0]))
  const [phase, setPhase] = useState<Phase>(pattern ? 'answer' : 'done')
  const [results, setResults] = useState<Result[]>([])
  const [questionKey, setQuestionKey] = useState(0)
  const startRef = useRef(0)
  const timers = useRef<number[]>([])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  // 出題が画面に出た瞬間から計測
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      startRef.current = performance.now()
    })
    return () => cancelAnimationFrame(raf)
  }, [questionKey])

  const advance = useCallback(() => {
    const nextIndex = index + 1
    const next = choose(nextIndex, pattern ? patternId(pattern) : null, statsRef.current)
    if (!next) {
      setPhase('done')
      return
    }
    setIndex(nextIndex)
    setPattern(next)
    setRods(toRods(startValue(next)))
    setPhase('answer')
    setQuestionKey((k) => k + 1)
  }, [choose, index, pattern])

  const confirm = useCallback(() => {
    if (!pattern || phase !== 'answer') return
    const ms = Math.round(performance.now() - startRef.current)
    const given = rodsToValue(rods)
    const correct = given === answerValue(pattern)
    setResults((r) => [...r, { pattern, correct, ms, given }])
    void onRecord({ patternId: patternId(pattern), mode, correct, ms, sessionId, at: Date.now() }).then(
      (s) => {
        statsRef.current = s
      },
    )

    if (correct) {
      if (settings.sound) playCorrect()
      setPhase('correct')
      later(advance, 450)
      return
    }
    if (settings.sound) playWrong()
    setPhase('review')
    // 出題時の状態に戻してから、正解の珠の動きを1手ずつ見せる
    const steps = solutionSteps(pattern)
    later(() => setRods([...steps[0]]), 500)
    steps.slice(1).forEach((s, i) => later(() => setRods([...s]), 500 + 750 * (i + 1)))
    later(() => setPhase('reviewed'), 500 + 750 * steps.length)
  }, [advance, mode, onRecord, pattern, phase, rods, sessionId, settings.sound])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      if (phase === 'answer') confirm()
      else if (phase === 'reviewed') advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [advance, confirm, phase])

  if (phase === 'done' || !pattern) {
    return <Summary mode={mode} results={results} onExit={onExit} />
  }

  const last = results[results.length - 1]
  const reviewing = phase === 'review' || phase === 'reviewed'

  return (
    <div className="session">
      <header className="session-head">
        <span className="session-title">{MODE_TITLE[mode]}</span>
        <span className="mono muted">
          {index + 1} / {total}
        </span>
        <button type="button" className="icon-btn" onClick={onExit} aria-label="終了">
          ×
        </button>
      </header>

      <div className="problem">
        <div className="op mono">
          {pattern.op === 'add' ? '+' : '−'}
          {pattern.n}
        </div>
        <div className="feedback">
          {phase === 'correct' && <span className="ok mono">{(last.ms / 1000).toFixed(2)}秒</span>}
          {reviewing && last && (
            <span className="ng">
              <span className="mono">{patternLabel(pattern)} = {answerValue(pattern)}</span>
              <span className="muted">
                {' '}
                （あなた: <span className="mono">{last.given}</span>・{CATEGORY_LABEL[classify(pattern)]}）
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="board">
        <Soroban
          values={rods}
          onChange={phase === 'answer' ? setRods : undefined}
          glow={phase === 'correct'}
          faint={!settings.showBeads && phase === 'answer'}
          transitionMs={reviewing ? 280 : 90}
        />
      </div>

      <div className="actions">
        {phase === 'answer' && (
          <>
            <button type="button" className="btn ghost" onClick={() => setRods(toRods(startValue(pattern)))}>
              戻す
            </button>
            <button type="button" className="btn primary" onClick={confirm}>
              確定
            </button>
          </>
        )}
        {phase === 'reviewed' && (
          <button type="button" className="btn primary" onClick={advance}>
            次へ
          </button>
        )}
      </div>
    </div>
  )
}

function Summary({ mode, results, onExit }: { mode: Mode; results: Result[]; onExit: () => void }) {
  const correct = results.filter((r) => r.correct)
  const avg = correct.length ? correct.reduce((a, r) => a + r.ms, 0) / correct.length : null
  const wrong = results.filter((r) => !r.correct)
  const slowest = [...correct].sort((a, b) => b.ms - a.ms).slice(0, 3)

  return (
    <div className="session summary">
      <header className="session-head">
        <span className="session-title">{MODE_TITLE[mode]}</span>
      </header>
      {results.length === 0 ? (
        <p className="muted">出題できるパターンがありません。</p>
      ) : (
        <>
          <div className="big-stats">
            <div>
              <div className="label">正解</div>
              <div className="value mono">
                {correct.length}
                <small> / {results.length}</small>
              </div>
            </div>
            <div>
              <div className="label">平均（正解のみ）</div>
              <div className="value mono">
                {avg === null ? '—' : (avg / 1000).toFixed(2)}
                <small>秒</small>
              </div>
            </div>
          </div>
          {wrong.length > 0 && (
            <section className="sub-section">
              <h2>間違えた問題</h2>
              <p className="mono chips">
                {wrong.map((r, i) => (
                  <span key={i} className="chip ng">
                    {patternLabel(r.pattern)}
                  </span>
                ))}
              </p>
            </section>
          )}
          {slowest.length > 0 && (
            <section className="sub-section">
              <h2>遅かった問題</h2>
              <p className="mono chips">
                {slowest.map((r, i) => (
                  <span key={i} className="chip">
                    {patternLabel(r.pattern)} {(r.ms / 1000).toFixed(2)}s
                  </span>
                ))}
              </p>
            </section>
          )}
        </>
      )}
      <div className="actions">
        <button type="button" className="btn primary" onClick={onExit}>
          ホームへ
        </button>
      </div>
    </div>
  )
}
