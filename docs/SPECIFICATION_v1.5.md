# AIレスバ v1.5 仕様書 — Claude退場理由メーカー / Sheets正本化

- 状態：**GAS Webアプリ実装仕様**
- 更新：2026-10-29
- 対象：`49601000/AIresba`
- 関連：[`CLAUDE_EXIT_MAKER_v1.0.md`](./CLAUDE_EXIT_MAKER_v1.0.md)
- 共通規約：https://github.com/49601000/development-standard/blob/main/AGENTS.md

## 1. 目的

Claudeの退場理由候補を、既存の2タブメーカーで生成支援・確認しながらGoogle Sheetsで一元管理する。既存AIレスバ本体、GitHub Pages公開版、Claudeの人格・口調・退場演出は今回変更しない。

## 2. 正本と責務

| 要素 | 責務 |
|---|---|
| Google Sheets | 候補の唯一の正本。ID、タイトル、セリフ、使用状態、使用済み反映日時を保持 |
| Gemini | Sheetsを参照して重複を避け、新規IDを発行し、同じID・タイトル・セリフをSheetsへ直接登録 |
| GAS Webアプリ | 既存メーカーUIの提供、Sheetsの読取、ID検索、`UNUSED` → `USED` 更新 |
| JSON | 任意のバックアップ。通常運用やSheets更新の必須工程ではない |
| AIレスバ本体 | 今回は変更しない。将来、GASの状態更新処理を接続可能 |

Drive上のJSONを原本にしない。JSONとSheetsの双方向同期、新規ネタJSONの日次取込バッチ、使用履歴JSONの日次取込バッチは作らない。

## 3. Sheets台帳

- Spreadsheet ID：`1K2eeYit2VC8dsKNJsgvgGNao3Z4vt2mt-rTRduY2Jjc`
- シート名：`退場理由台帳`
- A列：ID（`ce_` 付きUUID v4、一意キー）
- B列：タイトル
- C列：台詞（セリフ）
- D列：使用状態（`UNUSED` / `USED`）
- E列：使用済み反映日時
- タイムゾーン：`Asia/Tokyo`

既存データは保全する。GASはシート装飾、列構成、A〜C列を補修・変更しない。

## 4. 通常運用

1. メーカーのTab①でGemini向けプロンプトを作り、手動でGeminiへ投入する。
2. GeminiはSheetsの既存候補を参照して重複を避ける。
3. Geminiは候補ごとにIDを発行し、ID・タイトル・セリフ・`UNUSED` をSheetsへ直接追加する。
4. Geminiの登録結果をTab②へ貼り付け、ID・タイトル・セリフを抽出・確認する。
5. GAS WebアプリはSheetsの件数・未使用候補を参照する。
6. 候補の利用時はサーバー関数で `UNUSED` → `USED` を反映する。

JSONを作成・保存しなくてもこの運用は成立する。

## 5. Tab① — プロンプト作成

既存のテーマ自由入力、生成件数、追加指示、プレビュー、コピーを維持する。Gemini APIは呼ばない。

プロンプトは次を要求する。

- 指定Sheetsとシートを参照し、題材・設定・展開・オチの重複や単なる言い換えを避ける。
- DB参照・書込みに失敗した場合は、登録済みと偽らず明示する。
- Geminiが新しい `ce_` 付きUUID v4を発行する。
- 同じID・タイトル・セリフをSheetsへ追加し、D列を `UNUSED`、E列を空欄にする。
- 既存行、既存ID、既存状態を変更しない。
- 登録後、台帳と同じID・タイトル・セリフを明確な形式で出力する。

Claudeの人格・口調・長さ・発想に関する既存制約は維持する。創作テーマを新たに固定・限定しない。

## 6. Tab② — 抽出・編集・JSON化

- Geminiの回答全文から番号付きタイトル、ID、かぎ括弧内のセリフを抽出する。
- 各項目を編集、追加、削除、採用・除外できる。
- Geminiが発行したIDを保持し、メーカー側で再発行しない。
- ID欠落、不正なUUID v4、採用候補内の重複IDを警告し、該当候補をJSONから除外する。
- 貼付け内容はテキストとして扱い、HTMLとして実行しない。
- JSONプレビューとダウンロードを任意バックアップとして残す。

```json
{
  "schema_version": 1,
  "type": "claude_exit_ideas",
  "items": [
    {
      "id": "ce_550e8400-e29b-41d4-a716-446655440000",
      "title": "ペルシャ猫のドライヤー待ち",
      "dialogue": "あ、すまん。実家のネコが待っとるから、今日はここまでにするよ"
    }
  ]
}
```

## 7. GASのSheets連携

### 読み取り

サーバー側に次の機能を置く。

- 全候補数、`UNUSED` 件数、`USED` 件数の取得
- `UNUSED` 候補一覧の取得
- ID完全一致による候補検索
- 全件を `claude_exit_ideas` 形式で取得する任意バックアップ

画面には登録・未使用・使用済み件数を表示する。詳細管理UIは未使用一覧とID検索に留める。

### 使用状態更新

`markCandidateUsed(id)` はUI描画から独立したサーバー関数とする。

- A列を完全一致で検索する。
- IDが一意で、D列が `UNUSED` の場合だけD列を `USED`、E列を処理時刻に更新する。
- 時刻は `Asia/Tokyo` で扱う。
- 既に `USED` の場合はD・E列を変更せず、日時を上書きしない。
- ID不在、重複ID、不正ID、不正状態では更新しない。
- A〜C列は変更しない。
- 同時更新はスクリプトロックで直列化する。

現段階では外部公開の書込みAPIを作らない。

## 8. GAS Webアプリと公開範囲

- Script ID：`1OXuLlg2T6ax8Lpq7P95TrsC0eBnqfo5Maca9MVsB44SSG36WRBdUILfY`
- 新規Apps Scriptプロジェクトは作らない。
- HTML Serviceと `google.script.run` を使う。
- デプロイは所有者として実行し、アクセスできるユーザーを所有者のみにする。
- Sheetsの共有範囲を広げない。
- Spreadsheet IDとScript ID以外の認証情報をコードへ埋め込まない。
- 公開範囲・権限の拡大は別途所有者の承認を要する。

## 9. 対象外

- AIレスバ本体やGitHub Pages版の改修・デプロイ
- JSONとSheetsの同期、Drive取込、日次バッチ
- Gemini API呼出し
- 外部公開書込みAPI
- Sheetsの装飾・書式補修
- mainへのマージ

## 10. 受入条件

1. GAS Webアプリで既存2タブが動作する。
2. Gemini向けプロンプトを生成・コピーできる。
3. Gemini出力からID・タイトル・セリフを抽出・編集できる。
4. GeminiのIDを保持したJSONを任意でダウンロードできる。
5. Sheetsから登録件数、`UNUSED`、`USED` 件数を取得できる。
6. `UNUSED` 一覧とID検索を利用できる。
7. ID指定の状態更新が第7節の条件を守る。
8. JSONなしで通常運用が成立する。
9. 既存台帳データを破壊しない。
10. AIレスバ本体・GitHub Pages版に変更がない。

確認時は既存候補を実際に `USED` へ変更しない。更新関数はコード・非更新経路で確認し、実データ更新は利用時の明示操作に限る。
