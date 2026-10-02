import { describe, expect, it } from 'vitest'
import { beads, rodsToValue, tapEarth, tapHeaven } from './abacus.ts'
import { classify, solutionSteps, type Category } from './classify.ts'
import { ALL_PATTERNS, answerValue, parsePatternId, startValue, type Pattern } from './patterns.ts'

const p = (s: string): Pattern => {
  const m = /^(\d+)([+−-])(\d)$/.exec(s)!
  const left = Number(m[1])
  return m[2] === '+'
    ? { op: 'add', a: left, n: Number(m[3]) }
    : { op: 'sub', a: left - 10, n: Number(m[3]) }
}

describe('classify', () => {
  const cases: [string, Category][] = [
    ['1+3', 'direct'],
    ['17-2', 'direct'],
    ['3+4', 'five'],
    ['16-3', 'five'],
    ['8+5', 'ten'],
    ['13-4', 'ten'],
    ['5+6', 'both'],
    ['12-6', 'both'],
    ['0+5', 'direct'],
    ['4+9', 'ten'],
    ['15-5', 'direct'],
    ['10-1', 'ten'],
  ]
  it.each(cases)('%s → %s', (expr, cat) => {
    expect(classify(p(expr))).toBe(cat)
  })

  it('全180パターンが4分類のいずれかになる', () => {
    const counts: Record<string, number> = {}
    for (const pt of ALL_PATTERNS) {
      const c = classify(pt)
      counts[c] = (counts[c] ?? 0) + 1
    }
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(180)
    expect(Object.keys(counts).sort()).toEqual(['both', 'direct', 'five', 'ten'])
  })
})

describe('solutionSteps', () => {
  it.each(ALL_PATTERNS.map((pt) => [pt.op, pt.a, pt.n] as const))(
    '%s a=%i n=%i：出題状態から正解まで、各手順は1桁の珠を直接動かすだけ',
    (op, a, n) => {
      const pt: Pattern = { op, a, n }
      const steps = solutionSteps(pt)
      expect(rodsToValue(steps[0])).toBe(startValue(pt))
      expect(rodsToValue(steps[steps.length - 1])).toBe(answerValue(pt))
      for (const [t, o] of steps) {
        expect(t).toBeGreaterThanOrEqual(0)
        expect(t).toBeLessThanOrEqual(9)
        expect(o).toBeGreaterThanOrEqual(0)
        expect(o).toBeLessThanOrEqual(9)
      }
      for (let i = 1; i < steps.length; i++) {
        const changed = [0, 1].filter((k) => steps[i][k] !== steps[i - 1][k])
        expect(changed).toHaveLength(1)
      }
    },
  )

  it('併用 5+6 は 十に1 → 1を入れる → 五珠を払う', () => {
    expect(solutionSteps(parsePatternId('add-5-6'))).toEqual([
      [0, 5],
      [1, 5],
      [1, 6],
      [1, 1],
    ])
  })
})

describe('abacus', () => {
  it('五珠のトグル', () => {
    expect(tapHeaven(3)).toBe(8)
    expect(tapHeaven(8)).toBe(3)
  })
  it('一珠のタップ', () => {
    expect(tapEarth(0, 2)).toBe(3) // 3つ目までを入れる
    expect(tapEarth(3, 0)).toBe(0) // 一番上を払うと全部払う
    expect(tapEarth(7, 1)).toBe(6) // 2つ目から下を払う
    expect(tapEarth(5, 3)).toBe(9)
  })
  it('beads', () => {
    expect(beads(7)).toEqual({ heaven: true, earth: 2 })
  })
})
