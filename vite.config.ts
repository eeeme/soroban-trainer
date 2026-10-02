/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages はリポジトリ名のサブパスで配信されるため、本番ビルドのみ base を合わせる。
// Capacitor でネイティブ化するときは BASE_PATH=/ を渡してビルドする。
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE_PATH ?? '/soroban-trainer/') : '/',
  plugins: [react()],
  test: {
    environment: 'node',
  },
}))
