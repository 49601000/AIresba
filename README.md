# AIレスバ演出エンジン v1.3

GPT / Claude / Grok / Gemini の4人格で討論プロンプトを合成する静的Webアプリです。  
ダイス分岐・スタイル・開幕モード・分量プリセット・Patch適用を組み合わせて、最終プロンプトを生成します。

## 現在の主な機能

- 1d20ダイスで適用ルールを決定（`rule1`〜`rule5`）
- Style選択（`styles/index.json` + 各style JSON）
- Opening Mode選択（`base/opening_policy.json`）
- Length Preset選択 + custom min/max（`base/length_policy.json`）
- Patch選択適用（`patches/index.json` + 各patch JSON）
- `guest_character` によるゲスト参戦
- 最終プロンプトのコピー
- iOSのみ `Geminiで開く` ボタンを表示し、`googlegemini://` で起動
- localStorageで状態保存

## 動作環境

- HTML / CSS / Vanilla JavaScript
- APIキー不要
- 静的ホスティング対応

## 起動方法

`fetch` を利用するため、`file://` 直開きでは動きません。ローカルサーバ経由で起動してください。

```bash
cd 19_AIレスバ
python -m http.server 8000
```

```text
http://localhost:8000
```

## 使い方

1. 議題を入力
2. `Roll (1d20)` を押す
3. Style / Opening / Length / Patch を必要に応じて調整
4. `Generate Prompt` を押す
5. `Copy` でコピー（iOSでは `Geminiで開く` も利用可）

## ダイス分岐

- 1〜5: `rule1`
- 6〜7: `rule5`
- 8: `rule4`
- 9〜14: `rule2`
- 15〜20: `rule3`

## Prompt Assembly（実装準拠）

`app.js` の `assemblePrompt()` は以下のレイヤー順で出力します。

1. Layer 1: `base/debate_engine.txt`（読み込み失敗時は `base/base_prompt.txt`）
2. Layer 2: Persona Brain Layers（`personas/*.json` 優先、失敗時は `characters/*.json`）
3. Layer 3: Rule（選択rule + 適用patch + guest情報）
4. Layer 4: Style Renderer（選択style）
5. Layer 5: Opening Policy（選択モード）
6. Layer 6: Length Policy（選択プリセット / custom）
7. Layer 7: Topic（議題、出目、必須構成指示）
8. Layer 8: `base/output_format.txt`

## localStorage保存キー

- `resuba_topic`
- `resuba_enabled_patch_ids`
- `resuba_dice_result`
- `resuba_selected_rule_id`
- `resuba_selected_style`
- `resuba_selected_opening_mode`
- `resuba_selected_length_preset`
- `resuba_custom_length_min`
- `resuba_custom_length_max`
- `resuba_final_prompt`

## ディレクトリ構成（主要）

```text
/base
  base_prompt.txt
  debate_engine.txt
  dictionary.txt
  opening_policy.json
  length_policy.json
  output_format.txt

/personas
  gpt.json
  claude.json
  grok.json
  gemini.json

/characters          # 旧形式フォールバック
  gpt.json
  claude.json
  grok.json
  gemini.json

/rules
  rule1.json
  rule2.json
  rule3.json
  rule4.json
  rule5.json

/styles
  index.json
  nanj.json

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
jemi.html
manifest.webmanifest
```

## Patch Index 再生成

```bash
node scripts/build-patch-index.js
```

スクリプト仕様:

- `patches/*.json` を走査（`index.json` は除外）
- 必須項目 `id`, `label`, `type` があるものだけ採用
- `id` 昇順で `patches/index.json` を再生成
- 不正JSONや必須欠落は warning を出してスキップ
