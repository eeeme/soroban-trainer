import { describe, expect, it } from 'vitest'
import { nextFocus, pickDiagnosis } from './scheduler.ts'
import {
  applyAttempt,
  baseTime,
  emptyStats,
  isWeak,
  type Attempt,
  type PatternStats,
  type StatsMap,
} from './stats.ts'
import type { PatternId } from './patterns.ts'

const att = (patternId: PatternId, correct: boolean, ms: number, mode: Attempt['mode']): Attempt => ({
  patternId,
  correct,
  ms,
  mode,
  sessionId: 's',
  at: 1,
})

describe('applyAttempt', () => {
  it('直近5件だけ保持する', () => {
    let s: PatternStats | undefined
    for (let i = 0; i < 7; i++) s = applyAttempt(s, att('add-1-1', true, i * 100, 'diagnosis'), null)
    expect(s!.recentMs).toEqual([200, 300, 400, 500, 600])
    expect(s!.count).toBe(7)
  })

  it('苦手集中：正解で箱が上がり、誤答で箱1に戻る', () => {
    let s = emptyStats('add-3-4')
    s = applyAttempt(s, att('add-3-4', true, 500, 'focus'), 1000)
    s = applyAttempt(s, att('add-3-4', true, 500, 'focus'), 1000)
    expect(s.box).toBe(3)
    s = applyAttempt(s, att('add-3-4', false, 500, 'focus'), 1000)
    expect(s.box).toBe(1)
  })

  it('箱4で基準タイム内に3回連続正解すれば卒業。遅いと連続がリセット', () => {
    let s: PatternStats = { ...emptyStats('add-3-4'), box: 4 }
    s = applyAttempt(s, att('add-3-4', true, 500, 'focus'), 1000)
    s = applyAttempt(s, att('add-3-4', true, 1500, 'focus'), 1000)
    expect(s.streak).toBe(0)
    for (let i = 0; i < 3; i++) s = applyAttempt(s, att('add-3-4', true, 500, 'focus'), 1000)
    expect(s.graduated).toBe(true)
  })

  it('診断で誤答すると卒業が取り消される', () => {
    const s: PatternStats = { ...emptyStats('add-3-4'), box: 4, graduated: true }
    const next = applyAttempt(s, att('add-3-4', false, 500, 'diagnosis'), 1000)
    expect(next.graduated).toBe(false)
    expect(next.box).toBe(1)
  })
})

describe('baseTime / isWeak', () => {
  it('「直接」分類の平均の中央値 × 倍率', () => {
    const stats: StatsMap = {}
    const put = (id: PatternId, ms: number) => {
      stats[id] = applyAttempt(undefined, att(id, true, ms, 'diagnosis'), null)
    }
    put('add-1-1', 1000) // direct
    put('add-1-2', 2000) // direct
    put('add-1-3', 3000) // direct
    put('add-3-4', 9000) // five（基準に含めない）
    expect(baseTime(stats, 1.2)).toBeCloseTo(2400)
  })

  it('基準超え or 誤答ありが苦手', () => {
    const slow = applyAttempt(undefined, att('add-3-4', true, 3000, 'diagnosis'), null)
    const fastWrong = applyAttempt(undefined, att('add-3-4', false, 500, 'diagnosis'), null)
    const ok = applyAttempt(undefined, att('add-3-4', true, 500, 'diagnosis'), null)
    expect(isWeak(slow, 1000)).toBe(true)
    expect(isWeak(fastWrong, 1000)).toBe(true)
    expect(isWeak(ok, 1000)).toBe(false)
  })
})

describe('scheduler', () => {
  it('診断は未計測を優先し、重複しない', () => {
    const stats: StatsMap = { 'add-0-1': { ...emptyStats('add-0-1'), count: 3 } }
    const ids = pickDiagnosis(stats, 179, Math.random)
    expect(new Set(ids).size).toBe(179)
    expect(ids).not.toContain('add-0-1')
  })

  it('苦手集中は卒業済みと直前を避ける', () => {
    const stats: StatsMap = {
      'add-3-4': { ...emptyStats('add-3-4'), graduated: true },
    }
    const pool: PatternId[] = ['add-3-4', 'add-4-4', 'add-2-4']
    for (let i = 0; i < 50; i++) {
      const id = nextFocus(pool, stats, 'add-4-4', Math.random)
      expect(id).toBe('add-2-4')
    }
    expect(nextFocus(['add-3-4'], stats, null, Math.random)).toBeNull()
  })
})
