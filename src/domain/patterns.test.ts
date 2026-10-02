import { describe, expect, it } from 'vitest'
import { ALL_PATTERNS, parsePatternId, patternId } from './patterns.ts'

describe('patterns', () => {
  it('加算90＋減算90の計180パターン', () => {
    expect(ALL_PATTERNS).toHaveLength(180)
    expect(new Set(ALL_PATTERNS.map(patternId)).size).toBe(180)
  })

  it('IDは往復変換できる', () => {
    for (const p of ALL_PATTERNS) {
      expect(parsePatternId(patternId(p))).toEqual(p)
    }
  })

  it('不正なIDは例外', () => {
    expect(() => parsePatternId('add-3-0')).toThrow()
    expect(() => parsePatternId('mul-1-1')).toThrow()
  })
})
