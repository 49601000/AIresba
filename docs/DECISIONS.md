# Decisions

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
