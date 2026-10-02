import { startValue, type Pattern } from './patterns.ts'

/** 珠の動かし方による4分類 */
export type Category = 'direct' | 'five' | 'ten' | 'both'

export const CATEGORIES: readonly Category[] = ['direct', 'five', 'ten', 'both']

export const CATEGORY_LABEL: Record<Category, string> = {
  direct: '直接',
  five: '5の補数',
  ten: '10の補数',
  both: '併用',
}

/** 苦手マップでの呼び方 */
export const CATEGORY_CROSS_LABEL: Record<Category, string> = {
  direct: 'またがない',
  five: '5をまたぐ',
  ten: '10をまたぐ',
  both: '両方またぐ',
}

/** 桁 d に x を補数なしで入れられるか */
function canAddDirect(d: number, x: number): boolean {
  const dh = d >= 5
  const xh = x >= 5
  return !(dh && xh) && (d % 5) + (x % 5) <= 4
}

/** 桁 d から x を補数なしで払えるか */
function canSubDirect(d: number, x: number): boolean {
  const dh = d >= 5
  const xh = x >= 5
  return (!xh || dh) && d % 5 >= x % 5
}

export function classify(p: Pattern): Category {
  const { a, n } = p
  if (p.op === 'add') {
    if (a + n <= 9) return canAddDirect(a, n) ? 'direct' : 'five'
    return canSubDirect(a, 10 - n) ? 'ten' : 'both'
  }
  if (a >= n) return canSubDirect(a, n) ? 'direct' : 'five'
  return canAddDirect(a, 10 - n) ? 'ten' : 'both'
}

/** 十の位・一の位の2桁 */
export type Rods = [tens: number, ones: number]

/**
 * 標準的な珠の動かし方を、2桁のそろばんの状態の列として返す（先頭が出題時の状態、末尾が正解）。
 * 誤答時のアニメーションに使う。
 */
export function solutionSteps(p: Pattern): Rods[] {
  const { a, n } = p
  const c = 10 - n
  const start = startValue(p)
  const s: Rods = [Math.floor(start / 10), start % 10]
  const cat = classify(p)
  if (p.op === 'add') {
    switch (cat) {
      case 'direct':
        return [s, [0, a + n]]
      case 'five': // 五珠を入れて、5−n を払う
        return [s, [0, a + 5], [0, a + n]]
      case 'ten': // 十の位に1入れて、補数 c を払う
        return [s, [1, a], [1, a - c]]
      case 'both': // 十の位に1入れて、c を5の補数で払う（5−c を入れて五珠を払う）
        return [s, [1, a], [1, a + (5 - c)], [1, a - c]]
    }
  }
  switch (cat) {
    case 'direct':
      return [s, [1, a - n]]
    case 'five': // 5−n を入れて、五珠を払う
      return [s, [1, a + (5 - n)], [1, a - n]]
    case 'ten': // 十の位から1払って、補数 c を入れる
      return [s, [0, a], [0, a + c]]
    case 'both': // 十の位から1払って、c を5の補数で入れる（五珠を入れて 5−c を払う）
      return [s, [0, a], [0, a + 5], [0, a + c]]
  }
}
