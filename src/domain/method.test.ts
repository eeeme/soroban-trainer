import { describe, expect, it } from 'vitest'
import { solutionSteps } from './classify.ts'
import { explain } from './method.ts'
import { ALL_PATTERNS, parsePatternId } from './patterns.ts'

describe('explain', () => {
  it('説明の手順数は珠の動きの手順数と一致する', () => {
    for (const p of ALL_PATTERNS) {
      expect(explain(p).steps).toHaveLength(solutionSteps(p).length - 1)
    }
  })

  it('3+4 は5の補数', () => {
    const m = explain(parsePatternId('add-3-4'))
    expect(m.rule).toBe('+4 = +5 −1')
    expect(m.steps).toEqual(['五珠を入れる', '一珠を1つ払う'])
  })

  it('8+5 は10の補数', () => {
    expect(explain(parsePatternId('add-8-5')).rule).toBe('+5 = +10 −5')
  })

  it('12−6 は併用', () => {
    const m = explain(parsePatternId('sub-2-6'))
    expect(m.rule).toBe('−6 = −10 +4（+4 = +5 −1）')
    expect(m.steps).toEqual(['十の位から1払う', '五珠を入れる', '一珠を1つ払う'])
  })
})
