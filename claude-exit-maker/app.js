"use strict";

const state = { items: [] };
const $ = (selector) => document.querySelector(selector);

function makeId() {
  if (globalThis.crypto?.randomUUID) return `ce_${crypto.randomUUID()}`;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0"));
  return `ce_${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function buildPrompt() {
  const theme = $("#theme").value.trim() || "おまかせ";
  const count = $("#count").value;
  const extra = $("#extra").value.trim() || "なし";
  $("#promptPreview").value = `既存の「Claude退場理由データベース」を、あなたが利用可能な環境で参照し、過去の理由と重複しない新しい案を考えてください。
題材・設定・展開・オチの重複を避け、既存案の単なる言い換えにはしないでください。
DBを参照できない場合はその旨を明示し、参照したふりをしないでください。

テーマ：${theme}
生成件数：${count}件
追加指示：${extra}

「高貴さと不条理さが混ざった、少し不思議でシュールな退場理由」の候補を新しく考えてください。高貴・不条理・具体的・無駄に大げさな発想を歓迎します。
Claudeのセリフは、既存AIレスバのClaudeの人格・話し方に合わせてください。一人称は「僕」とし、普段の柔らかめのなんJ語の会話の延長で、突拍子もない帰宅理由をもっともらしく自然に語らせてください。
高貴さ・上品さ・育ちの良さは、口調ではなく発想、価値観、振る舞い、退場理由の内容から表現してください。高貴であることと、お嬢様口調で話すことは別です。
「わたくし」「〜ですわ」「〜ますの」「ごきげんよう」などの過度なお嬢様口調や、過度に畏まった謝罪は使わないでください。
既存人格に沿う軽い関西弁や親しみやすい言い回しは使って構いませんが、すべてのセリフへ不自然に関西弁を強制しないでください。
各案は、次の組で示してください。
1. 番号付きの具体的な見出し（人間が管理するためのラベル）
2. Claude本人が帰宅の理由を語る、一人称のセリフ（「」で囲む）

セリフは後続の会話の文脈に応じて自然にアレンジできる創作素材です。一字一句を固定する必要はありません。
同じ発想やオチに偏らず、自由に発想してください。必要であれば注釈やイメージ図を添えても構いません。`;
  $("#copyStatus").textContent = "コピー前";
}

async function copyPrompt() {
  buildPrompt();
  try {
    await navigator.clipboard.writeText($("#promptPreview").value);
    $("#copyStatus").textContent = "コピー済み";
  } catch {
    $("#promptPreview").select();
    const copied = document.execCommand("copy");
    $("#copyStatus").textContent = copied ? "コピー済み" : "選択しました（手動コピー）";
  }
}

function switchTab(target) {
  const promptSelected = target === "prompt";
  $("#promptPanel").hidden = !promptSelected;
  $("#extractPanel").hidden = promptSelected;
  $("#tabPrompt").classList.toggle("is-active", promptSelected);
  $("#tabExtract").classList.toggle("is-active", !promptSelected);
  $("#tabPrompt").setAttribute("aria-selected", String(promptSelected));
  $("#tabExtract").setAttribute("aria-selected", String(!promptSelected));
}

function normalizeTitle(value) {
  return value.trim()
    .replace(/^\s*[#*\-・]+\s*/, "")
    .replace(/\s*[「『][\s\S]*$/, "")
    .replace(/[*#：:]+\s*$/, "")
    .replace(/^(?:見出し|タイトル)\s*[：:]\s*/, "")
    .trim();
}

function extractIdeas(text) {
  const headingPattern = /^\s*(?:#{1,6}\s*)?(?:\*{0,2})?(\d{1,3})\s*[\.．:：\)）]\s*(.+?)\s*$/gm;
  const headings = [...text.matchAll(headingPattern)];
  const ideas = [];
  const rejected = [];

  headings.forEach((heading, index) => {
    const start = heading.index + heading[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : text.length;
    const block = `${heading[2]}\n${text.slice(start, end)}`;
    const title = normalizeTitle(heading[2]);
    const quote = block.match(/「([\s\S]*?)」|『([\s\S]*?)』/);
    const dialogue = quote?.[1] ?? quote?.[2];
    if (title && dialogue?.trim()) {
      ideas.push({ title, dialogue: dialogue.trim().replace(/\s*\n\s*/g, " ") });
    } else {
      rejected.push(`${heading[1]}. ${title || "（見出しなし）"}`);
    }
  });
  return { ideas, rejected, headingCount: headings.length };
}

function addItem(title = "", dialogue = "") {
  state.items.push({ id: makeId(), title, dialogue, adopted: true });
  renderItems();
}

function parseSource() {
  if (state.items.length && !window.confirm("現在の編集候補とIDを破棄し、新しい抽出結果に置き換えますか？")) {
    setParseNotice("再抽出をキャンセルしました。編集候補とIDは維持されています。");
    return;
  }
  const source = $("#sourceText").value;
  const result = extractIdeas(source);
  if (result.ideas.length) {
    state.items = result.ideas.map((idea) => ({ ...idea, id: makeId(), adopted: true }));
    const missed = result.rejected.length ? ` ${result.rejected.length}件はセリフを確認できず除外しました。原文を確認し、必要なら手動追加してください。` : "";
    setParseNotice(`${result.ideas.length}件を候補として抽出しました。内容を確認してください。${missed}`, Boolean(result.rejected.length));
  } else {
    state.items = [];
    const detail = result.headingCount ? "番号付き見出しは見つかりましたが、「」内のセリフと組にできませんでした。" : "番号付き見出しと「」内のセリフの組を見つけられませんでした。";
    setParseNotice(`${detail} 原文を残したまま、手動で候補を追加できます。`, true);
  }
  renderItems();
}

function setParseNotice(message, warning = false) {
  const node = $("#parseNotice");
  node.textContent = message;
  node.classList.toggle("warning", warning);
}

function bindCard(card, item) {
  const adopted = card.querySelector(".idea-adopted");
  const title = card.querySelector(".idea-title");
  const dialogue = card.querySelector(".idea-dialogue");
  adopted.checked = item.adopted;
  title.value = item.title;
  dialogue.value = item.dialogue;
  card.classList.toggle("is-excluded", !item.adopted);
  card.querySelector(".id-line").textContent = `ID: ${item.id}`;
  adopted.addEventListener("change", () => { item.adopted = adopted.checked; card.classList.toggle("is-excluded", !item.adopted); updateJson(); });
  title.addEventListener("input", () => { item.title = title.value; updateJson(); });
  dialogue.addEventListener("input", () => { item.dialogue = dialogue.value; updateJson(); });
  card.querySelector(".delete-button").addEventListener("click", () => { state.items = state.items.filter((candidate) => candidate !== item); renderItems(); });
}

function renderItems() {
  const container = $("#items");
  container.replaceChildren();
  state.items.forEach((item, index) => {
    const fragment = $("#itemTemplate").content.cloneNode(true);
    const card = fragment.querySelector(".idea-card");
    card.querySelector(".idea-number").textContent = `候補 ${index + 1}`;
    bindCard(card, item);
    container.append(fragment);
  });
  $("#itemCount").textContent = `${state.items.length}件`;
  updateJson();
}

function exportableItems() {
  return state.items.filter((item) => item.adopted && item.title.trim() && item.dialogue.trim()).map(({ id, title, dialogue }) => ({ id, title: title.trim(), dialogue: dialogue.trim() }));
}

function duplicatePairs(items) {
  const seen = new Set();
  const duplicates = new Set();
  items.forEach((item) => {
    const key = `${item.title}\u0000${item.dialogue}`;
    if (seen.has(key)) duplicates.add(item.title);
    seen.add(key);
  });
  return [...duplicates];
}

function updateJson() {
  const items = exportableItems();
  const payload = { schema_version: 1, type: "claude_exit_ideas", items };
  $("#jsonPreview").textContent = JSON.stringify(payload, null, 2);
  $("#adoptedCount").textContent = `採用 ${items.length}件`;
  $("#downloadJson").disabled = items.length === 0;
  const duplicates = duplicatePairs(items);
  const incomplete = state.items.filter((item) => item.adopted && (!item.title.trim() || !item.dialogue.trim())).length;
  const validation = $("#validationNotice");
  if (duplicates.length) {
    validation.textContent = `完全一致する候補があります：${duplicates.join("、")}。必要なら除外または修正してください。`;
    validation.classList.add("warning");
  } else if (incomplete) {
    validation.textContent = `採用中の${incomplete}件は見出しまたはセリフが空のため、JSONから除外されています。`;
    validation.classList.add("warning");
  } else {
    validation.textContent = `形式確認済み：採用された${items.length}件を出力します。IDはこの画面で編集・再出力しても維持されます。`;
    validation.classList.remove("warning");
  }
}

function downloadJson() {
  const items = exportableItems();
  if (!items.length) return;
  const payload = { schema_version: 1, type: "claude_exit_ideas", items };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
  link.href = url;
  link.download = `claude-exit-ideas_${date}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$("#tabPrompt").addEventListener("click", () => switchTab("prompt"));
$("#tabExtract").addEventListener("click", () => switchTab("extract"));
[$("#theme"), $("#count"), $("#extra")].forEach((node) => node.addEventListener("input", buildPrompt));
$("#copyPrompt").addEventListener("click", copyPrompt);
$("#extractButton").addEventListener("click", parseSource);
$("#clearSource").addEventListener("click", () => { $("#sourceText").value = ""; setParseNotice("原文をクリアしました。編集候補は残っています。"); });
$("#addItem").addEventListener("click", () => addItem());
$("#downloadJson").addEventListener("click", downloadJson);

buildPrompt();
renderItems();
