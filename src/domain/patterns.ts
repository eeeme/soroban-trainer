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
