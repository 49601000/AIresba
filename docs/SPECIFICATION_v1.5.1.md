# AIレスバ演出エンジン v1.5.1 GAS版 仕様

- 状態：実装済み（GAS配置対象）
- 更新：2026-10-29
- 基準：v1.5 GAS版 `feature/airesba-gas-v1.5` / `fb2e913`
- GASソース：`airesba-gas/`

## 1. 目的と境界

v1.5の人格・演出・1D20・Rule・Patch・Guest・Style・Opening・Length・Sheets連携を維持し、内容生成と完成後の書式校正の責務を分離する。GitHub Pages版、Claude退場理由メーカー、Script ID、公開範囲、台帳の読取／Copy時USED更新は変更しない。

## 2. プロンプト構成

0. Execution Contract
1. Debate Engine
2. Persona Brain Layers
3. Rule / Patches / Guests
4. Style Renderer
5. Opening Policy
6. Length Policy
7. Topic / Claude Exit Reason
8. Output Contract

Layer 0は、人格・Rule・Styleによる展開作成、Length・Openingの調整、Layer 8による書式だけの最終校正という工程を定める。内容制約はRule必須イベント、人格とStyle、Opening、総文字数、発言数・一発言長の順で優先する。Output Contractは内容制約に従属せず、最終書式の担当範囲で必須とする。

## 3. Claude退場

- `claude_walkout.required = true` のRuleでは退場を必須とする。
- Styleの長文化トリガーは別経路であり、必須退場を取り消さない。
- 同じClaudeを一討論で重複退場させない。
- 選択したDB理由は退場発生時の創作素材とし、選択だけでは退場を強制しない。
- 退場後のツッコミと討論継続は既存Ruleに従う。

## 4. Length Policy

既存の数値は変更しない。総文字数を最優先の分量目標、発言数を次の目標、一発言長を目安とする。短文ラリーを維持し、数値達成だけを目的とした不自然な長文化や機械的な発言増加を避ける。完全両立できない場合も自然な会話と必須イベントを破壊しない。

## 5. Output Contract

完成本文に対し、議題1行、議題後の空行2行、発言間の空行1行、各発言原則1行、末尾 `。」` のみ `」` へ修正、話者名統一、末尾の余計な空行・解説・メタコメント除去の順で校正する。台詞内容・語尾・話者・発言順・オチは変更しない。出力は校正済み完成本文だけとする。

## 6. ビルドと配置

`app.js` と設定素材を変更し、`node airesba-gas/build-gas-assets.js` で生成物 `Client.html` / `Style.html` を更新する。HTML Serviceのscript断片include方式を維持する。既存Script IDの新バージョンとして配置し、新規GASプロジェクトやテスト環境は作らない。

## 7. 受入条件

- Generate PromptでLayer 0〜8が順序どおり出力される。
- 既存の人格・Rule・Style・Patchが欠落しない。
- rule3のClaude必須退場と、通常RuleでのDB候補非強制が明示される。
- 分量条件の優先関係と、最終校正の順序・禁止事項が明示される。
- GAS UI、候補読取、Copy時USED更新、REJECTED除外、公開範囲が維持される。
- 実データを変更する検証を行わない。
