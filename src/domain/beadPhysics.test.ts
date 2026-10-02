import { describe, expect, it } from 'vitest'
import { digitToPos, dragEarth, dragHeaven, posToDigit } from './beadPhysics.ts'

describe('beadPhysics', () => {
  it('数字 ⇄ 位置が往復する', () => {
    for (let d = 0; d <= 9; d++) expect(posToDigit(digitToPos(d))).toBe(d)
  })

  it('一番下の珠を押し上げると、上の珠も全部押される', () => {
    const p = dragEarth(digitToPos(0), 3, 3)
    expect(p.earth).toEqual([0, 1, 2, 3])
    expect(posToDigit(p)).toBe(4)
  })

  it('4つ押し上げた後、掴んだまま一番下だけ戻すと3つ残る', () => {
    let p = digitToPos(0)
    p = dragEarth(p, 3, 3) // 押し上げる
    p = dragEarth(p, 3, 4) // 掴んだまま戻す
    expect(p.earth).toEqual([0, 1, 2, 4])
    expect(posToDigit(p)).toBe(3)
  })

  it('上の珠を下げると、下の珠が押し出される', () => {
    const p = dragEarth(digitToPos(4), 0, 1)
    expect(p.earth).toEqual([1, 2, 3, 4])
    expect(posToDigit(p)).toBe(0)
  })

  it('途中で離したら近い方に寄る', () => {
    expect(posToDigit(dragEarth(digitToPos(0), 3, 3.4))).toBe(4)
    expect(posToDigit(dragEarth(digitToPos(0), 3, 3.6))).toBe(0)
    expect(posToDigit(dragEarth(digitToPos(0), 1, 1.3))).toBe(2)
  })

  it('珠は可動域の外に出ない', () => {
    expect(dragEarth(digitToPos(0), 2, -5).earth).toEqual([0, 1, 2, 4])
    expect(dragHeaven(digitToPos(0), 3).heaven).toBe(1)
    expect(posToDigit(dragHeaven(digitToPos(2), 0.7))).toBe(7)
  })
})
