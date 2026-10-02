import { CATEGORIES, CATEGORY_LABEL, type Category } from '../domain/classify.ts'
import { explain } from '../domain/method.ts'
import { parsePatternId, patternLabel } from '../domain/patterns.ts'

interface Props {
  onBack: () => void
}

const CATEGORY_TEXT: Record<Category, { when: string; examples: string[] }> = {
  direct: {
    when: '珠の空き（足し算）や、置いてある珠（引き算）が足りているとき。そのまま入れる・払う。',
    examples: ['add-1-3', 'sub-7-2'],
  },
  five: {
    when: '一珠だけでは足りないが、五珠を使えば一の位の中で済むとき。「5を入れて相方を払う」「相方を入れて5を払う」。',
    examples: ['add-3-4', 'sub-6-3'],
  },
  ten: {
    when: '一の位で10を超える（足りない）とき。「十に1入れて相方を払う」「十から1払って相方を入れる」。',
    examples: ['add-8-5', 'sub-3-4'],
  },
  both: {
    when: '10の補数の途中の「相方を払う／入れる」が直接できないとき。そこだけ5の補数を使う。',
    examples: ['add-5-6', 'sub-2-6'],
  },
}

export function Guide({ onBack }: Props) {
  return (
    <div className="app">
      <main className="screen guide">
        <header className="session-head">
          <button type="button" className="icon-btn" onClick={onBack} aria-label="戻る">
            ←
          </button>
          <span className="session-title">考え方ガイド</span>
        </header>

        <p className="muted">
          1桁の足し算・引き算は、次の4つの考え方のどれかで必ず弾けます。上から順に「できるか？」を考えます。
        </p>

        <div className="guide-cats">
          {CATEGORIES.map((cat, i) => (
            <section key={cat} className="guide-cat">
              <h2>
                <span className="mono">{i + 1}</span> {CATEGORY_LABEL[cat]}
              </h2>
              <p>{CATEGORY_TEXT[cat].when}</p>
              {CATEGORY_TEXT[cat].examples.map((id) => {
                const p = parsePatternId(id)
                const m = explain(p)
                return (
                  <div key={id} className="guide-example">
                    <span className="mono guide-ex-label">{patternLabel(p)}</span>
                    <span className="mono">{m.rule}</span>
                    <span className="muted small">{m.steps.join(' → ')}</span>
                  </div>
                )
              })}
            </section>
          ))}
        </div>

        <h2>相方（補数）の早見表</h2>
        <table className="cat-table mono">
          <thead>
            <tr>
              <th>数</th>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <th key={n}>{n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="muted">5の相方</td>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <td key={n}>{n < 5 ? 5 - n : ''}</td>
              ))}
            </tr>
            <tr>
              <td className="muted">10の相方</td>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <td key={n}>{10 - n}</td>
              ))}
            </tr>
          </tbody>
        </table>

        <h2>唱え方</h2>
        <table className="cat-table mono">
          <thead>
            <tr>
              <th />
              <th>5の補数</th>
              <th>10の補数</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <tr key={n}>
                <td>+{n}</td>
                <td>{n < 5 ? `+5 −${5 - n}` : <span className="muted">—</span>}</td>
                <td>+10 −{10 - n}</td>
              </tr>
            ))}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <tr key={-n}>
                <td>−{n}</td>
                <td>{n < 5 ? `−5 +${5 - n}` : <span className="muted">—</span>}</td>
                <td>−10 +{10 - n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">出題中は右上の「?」で、その問題の考え方と珠の動きのお手本を見られます。</p>
      </main>
    </div>
  )
}
