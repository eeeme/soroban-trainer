import type { Settings } from '../domain/settings.ts'
import { summarize, type Mode, type StatsMap } from '../domain/stats.ts'

interface Props {
  stats: StatsMap
  settings: Settings
  baseMs: number | null
  onStart: (mode: Mode) => void
}

export function Home({ stats, settings, baseMs, onStart }: Props) {
  const { measured, weak, graduated } = summarize(stats, baseMs)

  return (
    <section>
      <h1>そろばん特訓</h1>
      <p className="muted">見たら指が勝手に動く、を目指す。</p>

      <dl className="stat-row">
        <div>
          <dt>計測済み</dt>
          <dd className="mono">
            {measured}
            <small>/180</small>
          </dd>
        </div>
        <div>
          <dt>苦手</dt>
          <dd className="mono">{weak}</dd>
        </div>
        <div>
          <dt>卒業</dt>
          <dd className="mono">{graduated}</dd>
        </div>
        <div>
          <dt>基準タイム</dt>
          <dd className="mono">
            {baseMs === null ? '—' : (baseMs / 1000).toFixed(2)}
            <small>秒</small>
          </dd>
        </div>
      </dl>

      <div className="modes">
        <button type="button" className="mode-card" onClick={() => onStart('diagnosis')}>
          <span className="mode-no mono">01</span>
          <span className="mode-body">
            <span className="mode-name">パターン診断</span>
            <span className="mode-desc">
              {measured < 180
                ? `未計測のパターンを優先して${settings.sessionSize}問`
                : `全パターンから${settings.sessionSize}問。苦手の再計測に`}
            </span>
          </span>
        </button>
        <button type="button" className="mode-card" disabled={weak === 0} onClick={() => onStart('focus')}>
          <span className="mode-no mono">02</span>
          <span className="mode-body">
            <span className="mode-name">苦手集中</span>
            <span className="mode-desc">
              {weak > 0
                ? `苦手 ${weak} パターンを間隔反復で${settings.sessionSize}問`
                : measured === 0
                  ? 'まず 01 で計測してください'
                  : '苦手パターンはありません'}
            </span>
          </span>
        </button>
      </div>

      <p className="muted small">
        出題時のそろばんに置かれた数に、上の数を足す／引くように珠を弾いて「確定」。珠はタップで動きます。
      </p>
    </section>
  )
}
