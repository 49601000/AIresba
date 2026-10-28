# Decisions

## 2026-10-29 — GASクライアントをHTMLコンテキストからinclude

- `Client.html` 自身を完全な `<script>` 断片として生成し、`Index.html` はscript要素の外側からincludeする。
- プロンプト生成・Sheets連携ロジックは変更しない。

理由: GAS HTML Serviceでscript要素内に `<?!= include_("Client"); ?>` を置くと、展開後にJavaScriptの比較演算子 `<` が `&lt;` へ変換され、ブラウザで構文エラーになるため。

## 2026-10-29 — AIレスバ本体を独立GAS Webアプリとして追加

- `airesba-gas/` を既存Pages版・退場理由メーカー版とは独立して配置する。
- v1.4の `app.js` と設定素材を同期スクリプトでGAS HTMLへ同梱し、8レイヤーと演出ロジックを維持する。
- Claude退場理由の任意指示は既存レイヤーを増やさず、Layer 7の必須構成指示へ追加する。
- 候補IDはGenerate時の出力へ紐づけ、Copy成功後だけSheetsの `UNUSED` を `USED` へ更新する。
- DB障害は従来の生成・コピーを止めず、UIで状態を通知する。

理由: GitHub Pages版を無変更で保ちつつ、個人利用のGAS権限内でSheetsを唯一の正本として即時に使用済み管理するため。

## 2026-10-29 — Google Sheetsを唯一の正本としてGAS Webアプリ化

- `退場理由台帳` を候補・使用状態の唯一の正本とする。
- GeminiがSheetsを参照し、IDを発行して新規候補を直接登録する。
- GAS WebアプリがSheetsの読取と `UNUSED` → `USED` 更新を担当する。
- JSONは任意バックアップとし、Drive取込や日次バッチを通常運用から外す。
- 既存静的メーカーは復元可能な状態で残し、GAS版を別ディレクトリへ追加する。

理由: IDと状態の分岐をなくし、手動JSON受渡しなしで小規模な個人運用を成立させるため。

## 2026-10-28 — 退場理由IDの正本をGemini登録結果へ変更

- Geminiが新規候補のIDを発行し、同じIDでGoogle Sheets台帳へ登録する。
- メーカーはGemini出力のIDを抽出・編集・検証するだけで、IDを自動生成しない。
- `ce_` 付きUUID v4以外、ID欠落、重複IDは警告し、通常のDB連携用JSONから除外する。

理由: Google SheetsとJSONのIDを確実に一致させ、メーカー側の再発行によるID分岐をなくすため。
