/** 演算の種類 */
export type Op = 'add' | 'sub'

/** 出題単位。（演算, 今の一の位 a: 0〜9, 足す/引く数 n: 1〜9） */
export interface Pattern {
  op: Op
  a: number
  n: number
}

/** パターンID。`add-3-9` / `sub-2-7` の形式 */
export type PatternId = `${Op}-${number}-${number}`

export function patternId(p: Pattern): PatternId {
  return `${p.op}-${p.a}-${p.n}`
}

export function parsePatternId(id: string): Pattern {
  const m = /^(add|sub)-(\d)-([1-9])$/.exec(id)
  if (!m) throw new Error(`invalid pattern id: ${id}`)
  return { op: m[1] as Op, a: Number(m[2]), n: Number(m[3]) }
}

/** 加算90＋減算90＝180パターン */
export const ALL_PATTERNS: readonly Pattern[] = (['add', 'sub'] as const).flatMap((op) =>
  Array.from({ length: 10 }, (_, a) =>
    Array.from({ length: 9 }, (_, i) => ({ op, a, n: i + 1 })),
  ).flat(),
)

export const ALL_PATTERN_IDS: readonly PatternId[] = ALL_PATTERNS.map(patternId)

/**
 * 出題時にそろばんに置く値。
 * 加算は一の位 a のみ（十の位は繰り上がり先として 0）。
 * 減算は借りに備えて十の位に 1 を置く（10 + a）。
 */
export function startValue(p: Pattern): number {
  return p.op === 'add' ? p.a : 10 + p.a
}

export function answerValue(p: Pattern): number {
  return p.op === 'add' ? p.a + p.n : 10 + p.a - p.n
}

/** 表示用ラベル（例: `8+5` / `12−6`） */
export function patternLabel(p: Pattern): string {
  return p.op === 'add' ? `${p.a}+${p.n}` : `${10 + p.a}−${p.n}`
}
