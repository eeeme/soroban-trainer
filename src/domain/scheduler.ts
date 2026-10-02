import { ALL_PATTERN_IDS, type PatternId } from './patterns.ts'
import type { StatsMap } from './stats.ts'

export type Rng = () => number

export function shuffle<T>(xs: readonly T[], rng: Rng): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 診断の出題列：回答数の少ないパターンを優先し、同数はランダム */
export function pickDiagnosis(stats: StatsMap, n: number, rng: Rng): PatternId[] {
  const keyed = shuffle(ALL_PATTERN_IDS, rng).map((id) => ({ id, count: stats[id]?.count ?? 0 }))
  keyed.sort((x, y) => x.count - y.count)
  return shuffle(
    keyed.slice(0, n).map((k) => k.id),
    rng,
  )
}

/** 箱が低いほど多く出す */
const BOX_WEIGHT: Record<number, number> = { 1: 8, 2: 4, 3: 2, 4: 1 }

/** 苦手集中の次の1問。卒業済みを除き、箱で重み付け、直前と同じものは避ける。出せるものがなければ null */
export function nextFocus(
  pool: readonly PatternId[],
  stats: StatsMap,
  lastId: PatternId | null,
  rng: Rng,
): PatternId | null {
  const live = pool.filter((id) => !stats[id]?.graduated)
  if (live.length === 0) return null
  const candidates = live.length > 1 ? live.filter((id) => id !== lastId) : live
  const weights = candidates.map((id) => BOX_WEIGHT[stats[id]?.box ?? 1] ?? 1)
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i]
    if (r < 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}
