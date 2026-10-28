# Decisions

## 2026-10-28 — 退場理由IDの正本をGemini登録結果へ変更

- Geminiが新規候補のIDを発行し、同じIDでGoogle Sheets台帳へ登録する。
- メーカーはGemini出力のIDを抽出・編集・検証するだけで、IDを自動生成しない。
- `ce_` 付きUUID v4以外、ID欠落、重複IDは警告し、通常のDB連携用JSONから除外する。

理由: Google SheetsとJSONのIDを確実に一致させ、メーカー側の再発行によるID分岐をなくすため。
