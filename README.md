# AIレスバ演出エンジン v1.3

GPT / Claude / Grok / Gemini の4人格による仮想討論を生成する、静的Webアプリです。  
`patch` を選択適用して、イベント演出やゲスト乱入を加えた最終プロンプトを runtime で合成します。

## 特徴

- 固定レギュラー4人格（`characters/*.json`）
- 1d20ダイスで進行ルール分岐（`rules/rule1-5.json`）
- patch選択適用（`patches/index.json` + 各patch JSON）
- guest_character の追加参加
- strict prompt assembly order
- localStorage保存（topic / patch選択 / dice / rule / final prompt）

## 動作環境

- HTML / CSS / Vanilla JavaScript
- API不要
- 静的ホスティング対応

## 起動方法（重要）

`fetch` を使うため、`file://` 直開きでは動作しません。  
ローカルサーバを起動してアクセスしてください。

```bash
cd 19_AIレスバ
python -m http.server 8000
```

ブラウザで以下を開く:

```text
http://localhost:8000
```

## 使い方

1. 議題を入力
2. `Roll (1d20)` を押して出目を確定
3. 必要な patch をチェック
4. `Generate Prompt` で最終プロンプトを合成
5. `Copy` でコピー

## ダイス分岐

- 1–5: `rule1`
- 6–7: `rule5`
- 8: `rule4`
- 9–14: `rule2`
- 15–20: `rule3`

## Prompt Assembly Order

1. `base/base_prompt.txt`
2. `base/output_format.txt`
3. `base/dictionary.txt`
4. `characters/*.json`（固定4人格）
5. `rules/selected_rule.json`
6. `patches/enabled`
7. `guest_character.prompt_fragment`
8. runtime input（議題・出目・選択ルール等）

## ディレクトリ構成

```text
/base
  base_prompt.txt
  output_format.txt
  dictionary.txt

/rules
  rule1.json
  rule2.json
  rule3.json
  rule4.json
  rule5.json

/characters
  gpt.json
  claude.json
  grok.json
  gemini.json

/patches
  index.json
  *.json

/scripts
  build-patch-index.js

/.github/workflows
  patch-index.yml

index.html
style.css
app.js
```

## Patch Index 自動生成

`patches/index.json` は以下で再生成できます。

```bash
node scripts/build-patch-index.js
```

仕様:

- `patches/*.json` を読み込み
- `index.json` は除外
- `id` 昇順でソート
- 不正JSONは warning 出力

## 補足

- `characters` は人格データ層、`patches` は演出レイヤーです。
- 発言順は固定ではなく、討論の流れに応じて扱います。
