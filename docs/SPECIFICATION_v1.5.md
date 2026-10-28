# AIレスバ演出エンジン v1.5 GAS版 仕様

- 状態：実装済み（GAS配置対象）
- 更新：2026-10-29
- 対象：`49601000/AIresba`
- v1.4基準：main `c761b15d94792c9a0be0ce191665db481a10850b`
- GASソース：`airesba-gas/`

## 1. 目的と境界

既存AIレスバ v1.4を、GitHub Pages版とは独立したGAS HTML Serviceアプリとして提供する。v1.4の演出・8レイヤーのプロンプト合成・設定データを維持し、Google Sheetsの「Claude退場理由台帳」から任意の未使用候補を選べるようにする。

- GitHub Pages版、`claude-exit-maker/`、`claude-exit-maker-gas/` は変更しない。
- Gemini APIは利用しない。
- Sheetsを候補と使用状態の唯一の正本とし、AIレスバ側にJSONバックアップ機能は設けない。
- Webアプリは所有者が所有者権限で実行し、所有者だけがアクセスする前提とする。

## 2. 既存機能

議題、1D20とルール分岐、Style、Opening Mode、Length Preset、Patch、ゲストキャラクター、プロンプト生成・コピー、iOSのGemini起動補助、localStorage、4人格、Claude退場イベントの発動条件を維持する。

プロンプト合成順は次の8レイヤーを維持する。

1. Debate Engine
2. Persona Brain Layers
3. Rule（Patch・Guestを含む）
4. Style Renderer
5. Opening Policy
6. Length Policy
7. Topic / Mandatory Composition Instructions
8. Output Format

## 3. GASへの設定データ同梱

`airesba-gas/build-gas-assets.js` が既存 `app.js` と `base/`, `personas/`, `characters/`, `rules/`, `styles/`, `patches/` のJSON/TXTをGAS用 `Client.html` に同梱する。GAS実行時の外部HTTP取得は行わず、既存ロジックの `fetchText()` だけを同梱データ参照へ置換する。設定更新後は同期スクリプトを再実行する。

## 4. Sheets連携

- Spreadsheet ID：`1K2eeYit2VC8dsKNJsgvgGNao3Z4vt2mt-rTRduY2Jjc`
- Sheet：`退場理由台帳`
- A：ID、B：タイトル、C：台詞、D：使用状態、E：使用済み反映日時

`getUnusedCandidates()` は台帳順で `UNUSED` のID・タイトル・台詞だけを返す。重複IDがあれば候補取得を失敗させる。取得失敗時も、候補を指定しない従来のプロンプト生成は利用できる。

`markCandidateUsed(id)` はスクリプトロック内でID完全一致を確認し、単一の `UNUSED` 行だけD/E列を `USED` / GAS処理時刻へ更新する。未知ID、重複ID、不正状態は更新せず、既存 `USED` の日時も上書きしない。A〜C列は変更しない。

## 5. Claude退場理由UIとプロンプト

- プルダウンの初期値は「指定しない」。候補タイトルだけを表示する。
- Generate Prompt時の選択候補を生成済みプロンプトへ紐づける。
- 選択時だけLayer 7のMandatory Composition Instructionsへ、台詞を創作素材として使う任意指示を加える。
- 文脈に合わせたアレンジを許可し、一字一句の再現は要求しない。
- 選択だけでClaude退場イベントを強制せず、既存発動条件を維持する。
- Generateや候補選択だけでは使用済みにしない。

## 6. Copy時の更新

コピー成功後、コピー対象の生成済みプロンプトに紐づく候補IDだけを `markCandidateUsed()` へ送る。更新成功時は候補一覧から除外する。同じプロンプトの再Copyでは、クライアント側の紐づけを消し、サーバー側も `ALREADY_USED` を無害に扱う。DB更新失敗は画面に表示するが、完了済みのコピーを妨げない。

## 7. 配置

Script ID：`1PtpaXFgGlgHyi2AAFWJR0EF7C4iajKCXq3RqTE7ISFN_KuO2anCh0Gou`

`.clasp.json` は `airesba-gas/` 内に置く。`clasp push` は通常pushのみとし、`--force` は使用しない。Webアプリのアクセス範囲を拡大する変更は行わない。

## 8. 受入条件

- v1.4と同じ設定から8レイヤーのプロンプトを生成できる。
- GAS画面と同梱設定を読み込める。
- 未使用候補を取得し、選択候補の台詞だけを任意指示として注入できる。
- Copy対象と候補IDが結び付き、安全条件を満たしてUSED更新できる。
- Sheets取得・更新失敗時も従来生成またはコピー操作が利用できる。
- 実データを変更する確認は行わない。
