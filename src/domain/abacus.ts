/** 1本の桁の珠の状態。heaven=五珠が梁に付いているか、earth=梁に付いている一珠の数（0〜4） */
export interface RodBeads {
  heaven: boolean
  earth: number
}

export function beads(digit: number): RodBeads {
  return { heaven: digit >= 5, earth: digit % 5 }
}

/** 五珠をタップ：入れる／払うをトグル */
export function tapHeaven(digit: number): number {
  return digit >= 5 ? digit - 5 : digit + 5
}

/**
 * 一珠 i（0=梁に一番近い珠）をタップ。
 * 梁に付いている珠なら、その珠から下を払う。付いていない珠なら、その珠まで入れる。
 */
export function tapEarth(digit: number, i: number): number {
  const h = digit >= 5 ? 5 : 0
  const e = digit % 5
  return h + (i < e ? i : i + 1)
}

/** 桁の配列（左が上位桁）を数値に */
export function rodsToValue(rods: readonly number[]): number {
  return rods.reduce((acc, d) => acc * 10 + d, 0)
}
