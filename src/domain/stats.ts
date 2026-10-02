import { classify, type Category } from './classify.ts'
import { ALL_PATTERN_IDS, parsePatternId, type PatternId } from './patterns.ts'

export type Mode = 'diagnosis' | 'focus'

export interface Attempt {
  id?: number
  patternId: PatternId
  mode: Mode
  correct: boolean
  ms: number
  sessionId: string
  at: number
}

export interface PatternStats {
  patternId: PatternId
  category: Category
  /** 直近5件の反応時間 */
  recentMs: number[]
  /** 直近5件の正誤 */
  recentCorrect: boolean[]
  /** ライトナー箱 1〜4 */
  box: number
  /** 箱4での基準タイム内連続正解数 */
  streak: number
  graduated: boolean
  /** 累計回答数 */
  count: number
  updatedAt: number
}

export type StatsMap = Partial<Record<PatternId, PatternStats>>

export const RECENT = 5
export const MAX_BOX = 4
export const GRADUATE_STREAK = 3

export function emptyStats(id: PatternId): PatternStats {
  return {
    patternId: id,
    category: classify(parsePatternId(id)),
    recentMs: [],
    recentCorrect: [],
    box: 1,
    streak: 0,
    graduated: false,
    count: 0,
    updatedAt: 0,
  }
}

/** 回答1件を反映した新しい統計を返す（attempts を先頭から流せば再計算できる純粋関数） */
export function applyAttempt(
  prev: PatternStats | undefined,
  attempt: Attempt,
  baseMs: number | null,
): PatternStats {
  const s = prev ?? emptyStats(attempt.patternId)
  const next: PatternStats = {
    ...s,
    recentMs: [...s.recentMs, attempt.ms].slice(-RECENT),
    recentCorrect: [...s.recentCorrect, attempt.correct].slice(-RECENT),
    count: s.count + 1,
    updatedAt: attempt.at,
  }
  const withinBase = baseMs === null || attempt.ms <= baseMs

  if (attempt.mode === 'focus') {
    if (!attempt.correct) {
      next.box = 1
      next.streak = 0
    } else if (s.box >= MAX_BOX) {
      next.streak = withinBase ? s.streak + 1 : 0
      if (next.streak >= GRADUATE_STREAK) next.graduated = true
    } else {
      next.box = s.box + 1
      next.streak = 0
    }
  } else if (!attempt.correct) {
    // 診断で間違えたら、卒業済みでも苦手に戻す
    next.box = 1
    next.streak = 0
    next.graduated = false
  }
  return next
}

export function avgMs(s: PatternStats): number | null {
  if (s.recentMs.length === 0) return null
  return s.recentMs.reduce((a, b) => a + b, 0) / s.recentMs.length
}

export function errorCount(s: PatternStats): number {
  return s.recentCorrect.filter((c) => !c).length
}

export function median(xs: readonly number[]): number | null {
  if (xs.length === 0) return null
  const sorted = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** 基準タイム＝「直接」分類の平均反応時間の中央値 × 倍率。未計測なら null */
export function baseTime(stats: StatsMap, multiplier: number): number | null {
  const avgs: number[] = []
  for (const id of ALL_PATTERN_IDS) {
    const s = stats[id]
    if (!s || s.category !== 'direct') continue
    const m = avgMs(s)
    if (m !== null) avgs.push(m)
  }
  const med = median(avgs)
  return med === null ? null : med * multiplier
}

/** 苦手＝基準タイム超え、または直近5回で誤答あり（卒業済みは除く） */
export function isWeak(s: PatternStats, baseMs: number | null): boolean {
  if (s.graduated || s.recentMs.length === 0) return false
  if (errorCount(s) > 0) return true
  const m = avgMs(s)
  return baseMs !== null && m !== null && m > baseMs
}

export function weakIds(stats: StatsMap, baseMs: number | null): PatternId[] {
  return ALL_PATTERN_IDS.filter((id) => {
    const s = stats[id]
    return s !== undefined && isWeak(s, baseMs)
  })
}

export interface Summary {
  measured: number
  weak: number
  graduated: number
}

export function summarize(stats: StatsMap, baseMs: number | null): Summary {
  let measured = 0
  let weak = 0
  let graduated = 0
  for (const id of ALL_PATTERN_IDS) {
    const s = stats[id]
    if (!s || s.recentMs.length === 0) continue
    measured++
    if (s.graduated) graduated++
    else if (isWeak(s, baseMs)) weak++
  }
  return { measured, weak, graduated }
}
