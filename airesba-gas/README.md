# AIレスバ演出エンジン v1.5.1 GAS版

v1.5 GAS版を基に、プロンプトをLayer 0〜8へ再構成した独立アプリです。内容生成と最終書式校正を分離し、既存の人格・Rule・Style・Patch・Sheets連携を維持します。Google Sheets `退場理由台帳` の未使用候補は任意選択でき、生成済みプロンプトをCopyした時だけ `USED` に更新します。

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
