import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_SETTINGS, type Settings } from './domain/settings.ts'
import { applyAttempt, baseTime, type Attempt, type Mode, type StatsMap } from './domain/stats.ts'
import { Guide } from './screens/Guide.tsx'
import { Home } from './screens/Home.tsx'
import { Session } from './screens/Session.tsx'
import { SettingsScreen } from './screens/SettingsScreen.tsx'
import { WeakMap } from './screens/WeakMap.tsx'
import * as db from './storage/db.ts'

type Tab = 'home' | 'weakmap' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'ホーム' },
  { id: 'weakmap', label: '苦手マップ' },
  { id: 'settings', label: '設定' },
]

function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [stats, setStats] = useState<StatsMap>({})
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<{ mode: Mode; key: number } | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  const statsRef = useRef<StatsMap>({})
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS)

  const reload = useCallback(async () => {
    const [s, st] = await Promise.all([db.loadStats(), db.loadSettings()])
    statsRef.current = s
    settingsRef.current = st
    setStats(s)
    setSettings(st)
  }, [])

  useEffect(() => {
    reload()
      .then(() => setLoaded(true))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [reload])

  const baseMs = useMemo(() => baseTime(stats, settings.baseMultiplier), [stats, settings.baseMultiplier])

  const record = useCallback(async (attempt: Attempt): Promise<StatsMap> => {
    const current = statsRef.current
    const base = baseTime(current, settingsRef.current.baseMultiplier)
    const nextStat = applyAttempt(current[attempt.patternId], attempt, base)
    const next = { ...current, [attempt.patternId]: nextStat }
    statsRef.current = next
    setStats(next)
    await db.recordAttempt(attempt, nextStat)
    return next
  }, [])

  const updateSettings = useCallback((s: Settings) => {
    settingsRef.current = s
    setSettings(s)
    void db.saveSettings(s)
  }, [])

  const exportData = useCallback(async () => {
    const data = await db.exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soroban-trainer-${data.exportedAt.slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const importData = useCallback(
    async (file: File) => {
      await db.importAll(db.parseExport(await file.text()))
      await reload()
    },
    [reload],
  )

  const resetData = useCallback(async () => {
    await db.clearRecords()
    await reload()
  }, [reload])

  if (error) {
    return (
      <div className="app">
        <main className="screen">
          <h1>読み込みに失敗しました</h1>
          <p className="muted">{error}</p>
        </main>
      </div>
    )
  }

  if (!loaded) return <div className="app" />

  if (guideOpen) return <Guide onBack={() => setGuideOpen(false)} />

  if (session) {
    return (
      <div className="app">
        <Session
          key={session.key}
          mode={session.mode}
          stats={stats}
          settings={settings}
          baseMs={baseMs}
          onRecord={record}
          onExit={() => setSession(null)}
        />
      </div>
    )
  }

  return (
    <div className="app">
      <main className="screen">
        {tab === 'home' && (
          <Home
            stats={stats}
            settings={settings}
            baseMs={baseMs}
            onStart={(mode) => setSession({ mode, key: Date.now() })}
            onOpenGuide={() => setGuideOpen(true)}
          />
        )}
        {tab === 'weakmap' && <WeakMap stats={stats} baseMs={baseMs} />}
        {tab === 'settings' && (
          <SettingsScreen
            settings={settings}
            onChange={updateSettings}
            onExport={exportData}
            onImport={importData}
            onReset={resetData}
          />
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
