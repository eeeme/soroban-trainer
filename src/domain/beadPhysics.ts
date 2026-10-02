/**
 * 珠を指で掴んで動かすための物理モデル（React/DOM 非依存）。
 *
 * 位置の単位は「珠1個分の高さ」。
 * - 五珠: heaven ∈ [0, 1]。1 で梁に付いている（入っている）
 * - 一珠: earth[j] ∈ [j, j+1]（j=0 が梁に一番近い珠）。j で梁側に寄っている（入っている）
 *   珠は重ならないので earth[j+1] ≥ earth[j] + 1 が常に成り立つ。
 */
export interface RodPos {
  heaven: number
  earth: number[]
}

export const EARTH_COUNT = 4

export function digitToPos(digit: number): RodPos {
  const e = digit % 5
  return {
    heaven: digit >= 5 ? 1 : 0,
    earth: Array.from({ length: EARTH_COUNT }, (_, j) => (j < e ? j : j + 1)),
  }
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** 五珠を target へ動かす */
export function dragHeaven(pos: RodPos, target: number): RodPos {
  return { ...pos, heaven: clamp(target, 0, 1) }
}

/**
 * 一珠 k を target へ動かす。動かした方向にある珠だけを押し出し、反対側の珠はその場に残る
 * （掴んだ珠を戻しても、押し上げた珠は付いてこない）。
 */
export function dragEarth(pos: RodPos, k: number, target: number): RodPos {
  const earth = [...pos.earth]
  earth[k] = clamp(target, k, k + 1)
  for (let i = k - 1; i >= 0; i--) earth[i] = Math.min(earth[i], earth[i + 1] - 1)
  for (let i = k + 1; i < EARTH_COUNT; i++) earth[i] = Math.max(earth[i], earth[i - 1] + 1)
  return { ...pos, earth }
}

/** 指を離したときに、それぞれの珠を近い方へ寄せて数字にする */
export function posToDigit(pos: RodPos): number {
  const h = pos.heaven >= 0.5 ? 5 : 0
  // earth[j] - j は j について単調非減少なので、「入っている珠」は必ず梁側から連続する
  const e = pos.earth.filter((y, j) => y - j < 0.5).length
  return h + e
}
