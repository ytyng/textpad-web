# Textpad Web

シンプルなテキスト入力 Web アプリ。スマホでの使用を想定しており、漢字変換の確認などに使える。

PWA として動作し、iPhone のホームスクリーンに追加して簡易的なアプリとして使用可能。

## 機能

- テキスト入力 (全画面テキストエリア)
- ローカルストレージへの自動保存 (1秒後)
- 複数ファイル管理
- QR コード読み取り (カメラ使用)
- QR コード生成

## 技術スタック

- SvelteKit 2 + Svelte 5 (runes)
- Tailwind CSS 4
- TypeScript
- adapter-static (SSG)
- svelte-sonner (トースト通知)
- jsqr / qrcode (QR コード処理)
- Bootstrap Icons

## 開発

```bash
# 依存パッケージのインストール
pnpm install

# 開発サーバー起動
pnpm dev

# 型チェック
pnpm check

# ビルド
pnpm build

# ビルド結果のプレビュー
pnpm preview
```

## デプロイ

Vercel にデプロイする。GitHub にプッシュすると自動でビルドされる。

設定ファイル:
- `svelte.config.js`: adapter-static 設定
- `vercel.json`: ビルドコマンドと出力ディレクトリ
- `src/routes/+layout.ts`: prerender 有効化

## プロジェクト構成

```
src/
  routes/
    +page.svelte       # メインテキスト入力画面
    +layout.svelte     # レイアウト (Toaster)
    +layout.ts         # prerender 設定
    files/+page.svelte # ファイル一覧
    qr-scan/+page.svelte  # QR コード読み取り
    qr-create/+page.svelte # QR コード生成
  lib/
    stores/
      textpad.svelte.ts # ファイル管理ストア (Svelte 5 runes)
  service-worker.ts    # PWA 用サービスワーカー
static/
  manifest.json        # PWA マニフェスト
  icon-192.png         # アプリアイコン
  icon-512.png         # アプリアイコン (大)
```
