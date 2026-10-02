import { useRef, useState } from 'react'
import { SESSION_SIZES, type Settings } from '../domain/settings.ts'

interface Props {
  settings: Settings
  onChange: (s: Settings) => void
  onExport: () => Promise<void>
  onImport: (file: File) => Promise<void>
  onReset: () => Promise<void>
}

export function SettingsScreen({ settings, onChange, onExport, onImport, onReset }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (fn: () => Promise<void>, ok: string) => {
    try {
      await fn()
      setMessage(ok)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e))
    }
  }

  const mult = Math.round(settings.baseMultiplier * 10) / 10

  return (
    <section>
      <h1>設定</h1>

      <div className="setting">
        <div className="setting-label">1セッションの問題数</div>
        <div className="segmented">
          {SESSION_SIZES.map((n) => (
            <button
              key={n}
              type="button"
              className={settings.sessionSize === n ? 'active' : ''}
              onClick={() => onChange({ ...settings, sessionSize: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="setting">
        <div className="setting-label">
          基準タイム倍率
          <span className="muted small">「直接」分類の中央値 × この倍率を超えると苦手</span>
        </div>
        <div className="stepper">
          <button
            type="button"
            disabled={mult <= 1.0}
            onClick={() => onChange({ ...settings, baseMultiplier: Math.round((mult - 0.1) * 10) / 10 })}
          >
            −
          </button>
          <span className="mono">×{mult.toFixed(1)}</span>
          <button
            type="button"
            disabled={mult >= 2.0}
            onClick={() => onChange({ ...settings, baseMultiplier: Math.round((mult + 0.1) * 10) / 10 })}
          >
            +
          </button>
        </div>
      </div>

      <label className="setting toggle">
        <span className="setting-label">
          珠を表示
          <span className="muted small">オフにすると回答中の珠が薄くなります</span>
        </span>
        <input
          type="checkbox"
          checked={settings.showBeads}
          onChange={(e) => onChange({ ...settings, showBeads: e.target.checked })}
        />
      </label>

      <label className="setting toggle">
        <span className="setting-label">効果音</span>
        <input
          type="checkbox"
          checked={settings.sound}
          onChange={(e) => onChange({ ...settings, sound: e.target.checked })}
        />
      </label>

      <h2>データ</h2>
      <div className="data-actions">
        <button type="button" className="btn ghost" onClick={() => void run(onExport, 'エクスポートしました')}>
          JSON エクスポート
        </button>
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
          JSON インポート
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            if (!confirm('現在の記録をすべて置き換えます。よろしいですか？')) return
            void run(() => onImport(file), 'インポートしました')
          }}
        />
        <button
          type="button"
          className="btn danger"
          onClick={() => {
            if (!confirm('すべての記録を削除します。よろしいですか？')) return
            void run(onReset, '記録を削除しました')
          }}
        >
          記録をリセット
        </button>
      </div>
      {message && <p className="muted small">{message}</p>}
    </section>
  )
}
