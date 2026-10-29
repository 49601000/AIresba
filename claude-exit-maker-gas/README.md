# Claudeくん退場理由メーカー — GAS Webアプリ版

既存の静的版を保ったまま、Google Sheetsの `退場理由台帳` を唯一の正本として参照・更新するApps Script版です。Gemini APIは呼び出しません。JSON出力は任意のバックアップです。

## 構成

- `Code.gs`: Sheets読取、ID検索、全件バックアップ、`UNUSED` → `USED` / `REJECTED` 更新
- `Index.html` / `Style.html` / `Client.html`: 既存2タブUIと最小限のDB表示
- `appsscript.json`: Asia/Tokyo、V8設定

対象Apps Scriptはリポジトリルートの `.clasp.json` に固定しています。

## デプロイ

1. `clasp push` の送信対象を `clasp status` で確認する。
2. Apps ScriptでWebアプリとしてデプロイする。
3. 実行ユーザーは所有者、アクセス権は所有者のみにする。

公開範囲はリポジトリからは設定しません。既存デプロイを更新する場合も、所有者限定であることを画面上で確認してください。

## 安全な状態更新

`markCandidateUsed(id)` はIDを完全一致で検索し、対象が1行かつ現在 `UNUSED` の場合だけD列を `USED`、E列を処理時刻に更新します。既に `USED` の行、未知ID、重複ID、不正状態は更新しません。A〜C列には書き込みません。

Tab②の `rejectCandidates(ids)` はスクリプトロック下で既存IDを完全一致検索し、現在 `UNUSED` の行だけD列を `REJECTED` にします。新規行、A〜C列、E列、`USED` は変更せず、候補ごとの成功・失敗理由を返します。
