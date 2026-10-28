# AIレスバ演出エンジン v1.5 GAS版

既存GitHub Pages版を変更せず、v1.4のプロンプト生成機能をGAS HTML Serviceへ移植した独立アプリです。Google Sheets `退場理由台帳` の未使用候補を任意選択し、生成済みプロンプトをCopyした時だけ `USED` に更新します。

## 同期と配置

```powershell
node airesba-gas/build-gas-assets.js
cd airesba-gas
clasp status
clasp push
```

`build-gas-assets.js` は既存 `app.js` と `base/`, `personas/`, `characters/`, `rules/`, `styles/`, `patches/` のJSON/TXTを `Client.html` に同梱します。`Client.html` はGASテンプレートのHTMLコンテキストから読み込む完全な `<script>` 断片です。`Client.html` と `Style.html` は生成物です。

Script ID: `1PtpaXFgGlgHyi2AAFWJR0EF7C4iajKCXq3RqTE7ISFN_KuO2anCh0Gou`

Webアプリは「次のユーザーとして実行: 自分」「アクセスできるユーザー: 自分のみ」を前提とします。実データを更新する確認は行わず、Copy時だけ更新されます。
