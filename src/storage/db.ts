import { DEFAULT_SETTINGS, type Settings } from '../domain/settings.ts'
import type { Attempt, PatternStats, StatsMap } from '../domain/stats.ts'

const DB_NAME = 'soroban-trainer'
const DB_VERSION = 1
const SETTINGS_KEY = 'app'

type StoreName = 'attempts' | 'patternStats' | 'settings'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('attempts')) {
        const s = db.createObjectStore('attempts', { keyPath: 'id', autoIncrement: true })
        s.createIndex('patternId', 'patternId')
        s.createIndex('sessionId', 'sessionId')
      }
      if (!db.objectStoreNames.contains('patternStats')) {
        db.createObjectStore('patternStats', { keyPath: 'patternId' })
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

async function store(name: StoreName, mode: IDBTransactionMode) {
  const db = await openDb()
  return db.transaction(name, mode).objectStore(name)
}

export async function loadStats(): Promise<StatsMap> {
  const all = await promisify<PatternStats[]>((await store('patternStats', 'readonly')).getAll())
  const map: StatsMap = {}
  for (const s of all) map[s.patternId] = s
  return map
}

export async function loadSettings(): Promise<Settings> {
  const row = await promisify<{ key: string; value: Partial<Settings> } | undefined>(
    (await store('settings', 'readonly')).get(SETTINGS_KEY),
  )
  return { ...DEFAULT_SETTINGS, ...row?.value }
}

export async function saveSettings(value: Settings): Promise<void> {
  await promisify((await store('settings', 'readwrite')).put({ key: SETTINGS_KEY, value }))
}

/** 回答と更新後の統計を1トランザクションで保存 */
export async function recordAttempt(attempt: Attempt, stats: PatternStats): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['attempts', 'patternStats'], 'readwrite')
  tx.objectStore('attempts').add(attempt)
  tx.objectStore('patternStats').put(stats)
  await done(tx)
}

export interface ExportData {
  app: 'soroban-trainer'
  version: 1
  exportedAt: string
  attempts: Attempt[]
  patternStats: PatternStats[]
  settings: Settings
}

export async function exportAll(): Promise<ExportData> {
  const db = await openDb()
  const tx = db.transaction(['attempts', 'patternStats'], 'readonly')
  const attempts = await promisify<Attempt[]>(tx.objectStore('attempts').getAll())
  const patternStats = await promisify<PatternStats[]>(tx.objectStore('patternStats').getAll())
  return {
    app: 'soroban-trainer',
    version: 1,
    exportedAt: new Date().toISOString(),
    attempts,
    patternStats,
    settings: await loadSettings(),
  }
}

export function parseExport(text: string): ExportData {
  const data = JSON.parse(text) as Partial<ExportData>
  if (
    data.app !== 'soroban-trainer' ||
    data.version !== 1 ||
    !Array.isArray(data.attempts) ||
    !Array.isArray(data.patternStats)
  ) {
    throw new Error('そろばん特訓のエクスポートファイルではありません')
  }
  return data as ExportData
}

/** 既存データを消してから取り込む */
export async function importAll(data: ExportData): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['attempts', 'patternStats', 'settings'], 'readwrite')
  const attempts = tx.objectStore('attempts')
  const stats = tx.objectStore('patternStats')
  attempts.clear()
  stats.clear()
  for (const a of data.attempts) attempts.put(a)
  for (const s of data.patternStats) stats.put(s)
  tx.objectStore('settings').put({ key: SETTINGS_KEY, value: { ...DEFAULT_SETTINGS, ...data.settings } })
  await done(tx)
}

export async function clearRecords(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(['attempts', 'patternStats'], 'readwrite')
  tx.objectStore('attempts').clear()
  tx.objectStore('patternStats').clear()
  await done(tx)
}
