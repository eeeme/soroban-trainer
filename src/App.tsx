import { useState } from 'react'
import { ALL_PATTERNS } from './domain/patterns.ts'

type Tab = 'home' | 'weakmap' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'ホーム' },
  { id: 'weakmap', label: '苦手マップ' },
  { id: 'settings', label: '設定' },
]

function App() {
  const [tab, setTab] = useState<Tab>('home')

  return (
    <div className="app">
      <main className="screen">
        {tab === 'home' && (
          <section>
            <h1>そろばん特訓</h1>
            <p className="muted">見たら指が勝手に動く、を目指す。</p>
            <ul className="modes">
              <li>01 パターン診断（準備中）</li>
              <li>02 苦手集中（準備中）</li>
            </ul>
            <p className="muted mono">patterns: {ALL_PATTERNS.length}</p>
          </section>
        )}
        {tab === 'weakmap' && (
          <section>
            <h1>苦手マップ</h1>
            <p className="muted">診断後に表示されます。</p>
          </section>
        )}
        {tab === 'settings' && (
          <section>
            <h1>設定</h1>
            <p className="muted">準備中</p>
          </section>
        )}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
