import { classify, type Category } from './classify.ts'
import type { Pattern } from './patterns.ts'

/** パターンごとの「考え方」 */
export interface Method {
  category: Category
  /** 分解の式（例: `+4 = +5 −1`） */
  rule: string
  /** なぜその方法になるか */
  reason: string
  /** 珠の動かし方（solutionSteps の各手順に対応） */
  steps: string[]
}

/** x を入れる珠の言い方 */
function putIn(x: number): string {
  if (x < 5) return `一珠を${x}つ入れる`
  if (x === 5) return '五珠を入れる'
  return `五珠と一珠${x - 5}つを入れる`
}

/** x を払う珠の言い方 */
function takeOut(x: number): string {
  if (x < 5) return `一珠を${x}つ払う`
  if (x === 5) return '五珠を払う'
  return `五珠と一珠${x - 5}つを払う`
}

export function explain(p: Pattern): Method {
  const { a, n } = p
  const c = 10 - n
  const category = classify(p)
  const e = a % 5 // 一の位で梁に付いている一珠の数

  if (p.op === 'add') {
    switch (category) {
      case 'direct':
        return { category, rule: `+${n} はそのまま`, reason: `珠に空きがあるので、そのまま${n}を入れられる`, steps: [putIn(n)] }
      case 'five':
        return {
          category,
          rule: `+${n} = +5 −${5 - n}`,
          reason: `一珠の空きが${4 - e}つしかなく${n}つ入れられない。${n}の相方（足して5）は${5 - n}`,
          steps: ['五珠を入れる', takeOut(5 - n)],
        }
      case 'ten':
        return {
          category,
          rule: `+${n} = +10 −${c}`,
          reason: `${a}+${n}で10を超える。${n}の相方（足して10）は${c}`,
          steps: ['十の位に1入れる', `一の位から${c}を払う：${takeOut(c)}`],
        }
      case 'both':
        return {
          category,
          rule: `+${n} = +10 −${c}（−${c} = +${5 - c} −5）`,
          reason: `10を超えるので「十に1入れて${c}を払う」。でも一珠が${e}つしかなく${c}を直接払えないので、−${c}を5の補数でする`,
          steps: ['十の位に1入れる', `一珠を${5 - c}つ入れる`, '五珠を払う'],
        }
    }
  }

  switch (category) {
    case 'direct':
      return { category, rule: `−${n} はそのまま`, reason: `珠が足りているので、そのまま${n}を払える`, steps: [takeOut(n)] }
    case 'five':
      return {
        category,
        rule: `−${n} = −5 +${5 - n}`,
        reason: `一珠が${e}つしかなく${n}つ払えない。${n}の相方（足して5）は${5 - n}`,
        steps: [putIn(5 - n), '五珠を払う'],
      }
    case 'ten':
      return {
        category,
        rule: `−${n} = −10 +${c}`,
        reason: `一の位の${a}から${n}は引けない。${n}の相方（足して10）は${c}`,
        steps: ['十の位から1払う', `一の位に${c}を入れる：${putIn(c)}`],
      }
    case 'both':
      return {
        category,
        rule: `−${n} = −10 +${c}（+${c} = +5 −${5 - c}）`,
        reason: `引けないので「十から1払って${c}を入れる」。でも一珠の空きが${4 - e}つしかなく${c}を直接入れられないので、+${c}を5の補数でする`,
        steps: ['十の位から1払う', '五珠を入れる', `一珠を${5 - c}つ払う`],
      }
  }
}
