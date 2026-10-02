export type SessionSize = 10 | 20 | 50

export interface Settings {
  sessionSize: SessionSize
  /** 基準タイム倍率（「直接」分類の中央値に掛ける） */
  baseMultiplier: number
  /** 珠の表示（オフにすると珠を薄くしてイメージで弾く） */
  showBeads: boolean
  sound: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  sessionSize: 20,
  baseMultiplier: 1.2,
  showBeads: true,
  sound: true,
}

export const SESSION_SIZES: readonly SessionSize[] = [10, 20, 50]
