# Decisions

## 2026-10-29 — Tab②はボツだけを選び、REJECTEDを台帳へ反映

- Gemini出力の全候補を採用状態で開始し、利用者は不採用候補だけをチェックする。
- JSONでは不採用候補も削除せず、各itemを `UNUSED` または `REJECTED` として残す。
- 台帳反映は既存IDの `UNUSED` → `REJECTED` だけを許可し、新規行、A〜C列、E列、`USED` は変更しない。
- AIレスバ本体の取得条件と `markCandidateUsed(id)` は変更せず、利用候補は引き続き `UNUSED` のみにする。

理由: Sheetsを唯一の正本に保ったまま、全件採用を前提に人間がボツだけを短時間で選別できるようにするため。

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
