# soroban-trainer — そろばん特訓アプリ

1桁加減算の180パターンを計測し、詰まるパターンだけを反復して「見たら指が動く」状態を作るアプリ。最終目標はフラッシュ暗算。

**仕様の正本は [`docs/spec.md`](docs/spec.md)。** 実装前に該当セクションを読むこと。仕様と食い違う実装をしたくなったら、先に spec.md の変更を提案する。

## 技術スタック

- React + TypeScript (strict) + Vite。PWA として開発し、サーバーなしの完全クライアント完結
- そろばんは SVG の React コンポーネント、珠のアニメーションは CSS transition
- 永続化は IndexedDB（ストア: `attempts` / `patternStats` / `settings`）
- テスト: Vitest、Lint: oxlint
- ネイティブ化（後で）: Capacitor、Android 先行。**パッケージ名 `com.meisme.soroban`**（`capacitor.config.json` の `appId`。変更しないこと）

## コマンド

```sh
npm install
npm run dev      # 開発サーバー
npm test         # Vitest
npm run lint     # oxlint
npm run build    # tsc -b && vite build → dist/
```

## デプロイ

- `main` への push で `.github/workflows/deploy.yml` が lint → test → build → GitHub Pages へデプロイ
- 公開URL: https://eeeme.github.io/soroban-trainer/
- 本番ビルドの `base` は `/soroban-trainer/`（`vite.config.ts`）。Capacitor 用には `BASE_PATH=/ npm run build`
- アセット参照は絶対パス `/foo.svg` ではなく `import` か `import.meta.env.BASE_URL` 経由にする

## ディレクトリ方針

```
src/
  domain/      純粋ロジック（パターン定義・分類・苦手判定・ライトナー）。React/DOM 非依存、テスト必須
  components/  そろばん SVG など共通 UI
  screens/     ホーム / 苦手マップ / 設定 / 各モード
  storage/     IndexedDB アクセス
docs/spec.md   仕様書
```

## 実装ルール

- パターンID は `add-3-9` / `sub-2-7` 形式（`src/domain/patterns.ts` の `patternId()` を使う）
- 珠の分類（直接 / 5の補数 / 10の補数 / 併用）・苦手判定・箱の昇降は `domain/` に置き、ユニットテストを書く
- `patternStats` は `attempts` から再計算できるキャッシュ。真実の源は `attempts`
- 反応時間は `performance.now()` で計測（出題表示 → 確定）
- UI 文言は日本語。ダークモード前提、数字は等幅（`font-variant-numeric: tabular-nums`）、珠のタップ領域は 44px 以上
- MVP スコープ外（音声、課金、統計グラフ、アカウント同期、運指判定）は実装しない
