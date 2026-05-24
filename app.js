const STORAGE_KEYS = {
  topic: "resuba_topic",
  enabledPatchIds: "resuba_enabled_patch_ids",
  diceResult: "resuba_dice_result",
  selectedRuleId: "resuba_selected_rule_id",
  finalPrompt: "resuba_final_prompt"
};

const FIXED_CHARACTERS = ["gpt", "claude", "grok", "gemini"];

const PATCH_TYPE_LABELS = {
  character_tuning: "Character",
  context_memory: "Context",
  event_patch: "Event",
  guest_character: "Guest"
};

const state = {
  diceResult: null,
  selectedRuleId: "",
  patchIndex: [],
  enabledPatchIds: new Set(),
  finalPrompt: ""
};

const el = {};

window.addEventListener("DOMContentLoaded", () => {
  bootstrap().catch((error) => {
    showError(error.message);
  });
});

async function bootstrap() {
  bindElements();
  loadFromStorage();
  bindEvents();
  renderStatus();
  renderFinalPrompt();
  await loadPatchIndex();
}

function bindElements() {
  el.topicInput = document.getElementById("topicInput");
  el.rollBtn = document.getElementById("rollBtn");
  el.generateBtn = document.getElementById("generateBtn");
  el.copyBtn = document.getElementById("copyBtn");
  el.diceResult = document.getElementById("diceResult");
  el.selectedRule = document.getElementById("selectedRule");
  el.patchContainer = document.getElementById("patchContainer");
  el.finalPrompt = document.getElementById("finalPrompt");
  el.errorBox = document.getElementById("errorBox");
}

function bindEvents() {
  el.rollBtn.addEventListener("click", onRollDice);
  el.generateBtn.addEventListener("click", onGeneratePrompt);
  el.copyBtn.addEventListener("click", onCopyPrompt);
  el.topicInput.addEventListener("input", () => {
    localStorage.setItem(STORAGE_KEYS.topic, el.topicInput.value);
  });
}

function loadFromStorage() {
  const storedTopic = localStorage.getItem(STORAGE_KEYS.topic);
  const storedDice = localStorage.getItem(STORAGE_KEYS.diceResult);
  const storedRule = localStorage.getItem(STORAGE_KEYS.selectedRuleId);
  const storedFinalPrompt = localStorage.getItem(STORAGE_KEYS.finalPrompt);
  const storedPatchIds = localStorage.getItem(STORAGE_KEYS.enabledPatchIds);

  if (storedTopic) {
    el.topicInput.value = storedTopic;
  }

  if (storedDice) {
    const parsed = Number.parseInt(storedDice, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 20) {
      state.diceResult = parsed;
    }
  }

  if (storedRule) {
    state.selectedRuleId = storedRule;
  }

  if (storedFinalPrompt) {
    state.finalPrompt = storedFinalPrompt;
  }

  if (storedPatchIds) {
    try {
      const parsed = JSON.parse(storedPatchIds);
      if (Array.isArray(parsed)) {
        state.enabledPatchIds = new Set(parsed.filter((value) => typeof value === "string"));
      }
    } catch (_error) {
      state.enabledPatchIds = new Set();
    }
  }
}

function renderStatus() {
  el.diceResult.textContent = state.diceResult ?? "未ロール";
  el.selectedRule.textContent = state.selectedRuleId || "未選択";
  el.generateBtn.disabled = !state.diceResult;
}

function renderFinalPrompt() {
  el.finalPrompt.value = state.finalPrompt;
}

async function loadPatchIndex() {
  const patchIndex = await fetchJson("patches/index.json", "Patch index");
  if (!Array.isArray(patchIndex)) {
    throw new Error("Patch index の形式が不正です。配列である必要があります。");
  }

  state.patchIndex = patchIndex;

  const validIds = new Set(patchIndex.map((patch) => patch.id));
  state.enabledPatchIds = new Set(
    [...state.enabledPatchIds].filter((patchId) => validIds.has(patchId))
  );
  saveEnabledPatchIds();
  renderPatchSelector();
}

function renderPatchSelector() {
  el.patchContainer.innerHTML = "";

  if (state.patchIndex.length === 0) {
    const p = document.createElement("p");
    p.textContent = "利用可能な patch はまだありません。";
    el.patchContainer.appendChild(p);
    return;
  }

  const grouped = groupPatchesByType(state.patchIndex);
  Object.entries(grouped).forEach(([type, patches]) => {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = PATCH_TYPE_LABELS[type] || type;
    fieldset.appendChild(legend);

    patches.forEach((patch) => {
      const label = document.createElement("label");
      label.className = "patch-option";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = patch.id;
      checkbox.checked = state.enabledPatchIds.has(patch.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          state.enabledPatchIds.add(patch.id);
        } else {
          state.enabledPatchIds.delete(patch.id);
        }
        saveEnabledPatchIds();
      });

      const info = document.createElement("small");
      info.textContent = ` (${patch.id})`;

      label.appendChild(checkbox);
      label.append(` ${patch.label}`);
      label.appendChild(info);
      fieldset.appendChild(label);
    });

    el.patchContainer.appendChild(fieldset);
  });
}

function groupPatchesByType(patches) {
  const grouped = {};
  patches.forEach((patch) => {
    const type = patch.type || "others";
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(patch);
  });
  return grouped;
}

function saveEnabledPatchIds() {
  localStorage.setItem(
    STORAGE_KEYS.enabledPatchIds,
    JSON.stringify([...state.enabledPatchIds])
  );
}

function onRollDice() {
  clearError();
  const dice = Math.floor(Math.random() * 20) + 1;
  const selectedRuleId = mapDiceToRuleId(dice);

  state.diceResult = dice;
  state.selectedRuleId = selectedRuleId;

  localStorage.setItem(STORAGE_KEYS.diceResult, String(dice));
  localStorage.setItem(STORAGE_KEYS.selectedRuleId, selectedRuleId);

  renderStatus();
}

function mapDiceToRuleId(dice) {
  if (dice <= 5) {
    return "rule1";
  }
  if (dice <= 7) {
    return "rule5";
  }
  if (dice === 8) {
    return "rule4";
  }
  if (dice <= 14) {
    return "rule2";
  }
  return "rule3";
}

async function onGeneratePrompt() {
  clearError();
  const topic = el.topicInput.value.trim();

  if (!topic) {
    showError("議題を入力してください。");
    return;
  }

  if (!state.diceResult || !state.selectedRuleId) {
    showError("未Roll状態では Generate できません。先に Roll してください。");
    return;
  }

  try {
    const [basePrompt, outputFormat, dictionary, rule, characters] = await Promise.all([
      fetchText("base/base_prompt.txt", "base_prompt"),
      fetchText("base/output_format.txt", "output_format"),
      fetchText("base/dictionary.txt", "dictionary"),
      fetchJson(`rules/${state.selectedRuleId}.json`, state.selectedRuleId),
      Promise.all(
        FIXED_CHARACTERS.map((id) => fetchJson(`characters/${id}.json`, `character:${id}`))
      )
    ]);

    const selectedPatchEntries = state.patchIndex.filter((patch) =>
      state.enabledPatchIds.has(patch.id)
    );

    const patchPayloads = await Promise.all(
      selectedPatchEntries.map((patch) =>
        fetchJson(`patches/${patch.file}`, `patch:${patch.id}`)
      )
    );

    const guestCharacters = patchPayloads
      .map((patch) => patch.guest_character)
      .filter((guest) => guest && guest.display_name && guest.prompt_fragment);

    const speakerOrder = shuffle([
      ...characters.map((character) => character.display_name),
      ...guestCharacters.map((guest) => guest.display_name)
    ]).join(" -> ");

    const assembledPrompt = assemblePrompt({
      basePrompt,
      outputFormat,
      dictionary,
      characters,
      rule,
      patchPayloads,
      guestCharacters,
      topic,
      speakerOrder
    });

    state.finalPrompt = assembledPrompt;
    localStorage.setItem(STORAGE_KEYS.finalPrompt, assembledPrompt);
    el.finalPrompt.value = assembledPrompt;
  } catch (error) {
    showError(error.message);
  }
}

function assemblePrompt(payload) {
  const {
    basePrompt,
    outputFormat,
    dictionary,
    characters,
    rule,
    patchPayloads,
    guestCharacters,
    topic,
    speakerOrder
  } = payload;

  const characterBlock = characters.map(formatCharacter).join("\n\n");
  const patchBlock = patchPayloads.length > 0
    ? patchPayloads.map(formatPatch).join("\n\n")
    : "なし";
  const guestBlock = guestCharacters.length > 0
    ? guestCharacters.map(formatGuest).join("\n\n")
    : "なし";

  return [
    "# 世界設定",
    basePrompt.trim(),
    "",
    "# 出力形式",
    outputFormat.trim(),
    "",
    "# 用語辞書",
    dictionary.trim(),
    "",
    "# キャラクター",
    characterBlock,
    "",
    "# 進行ルール",
    formatRule(rule),
    "",
    "# 適用パッチ",
    patchBlock,
    "",
    "# ゲストキャラクター",
    guestBlock,
    "",
    "# 今回の入力",
    `議題: ${topic}`,
    `ダイスロール結果: ${state.diceResult}`,
    `適用ルール: ${state.selectedRuleId}`,
    `今回の発言順(固定ではない): ${speakerOrder}`
  ].join("\n");
}

function formatCharacter(character) {
  return [
    `[${character.display_name}]`,
    `id: ${character.id}`,
    `role_in_debate: ${character.role_in_debate}`,
    `core_concept: ${character.core_concept}`,
    `prompt_fragment: ${character.prompt_fragment}`
  ].join("\n");
}

function formatRule(rule) {
  const modifiers = Array.isArray(rule.debate_modifiers)
    ? rule.debate_modifiers.map((item) => `- ${item}`).join("\n")
    : "- なし";

  return [
    `id: ${rule.id}`,
    `display_name: ${rule.display_name}`,
    `scenario_type: ${rule.scenario_type}`,
    `energy_level: ${rule.energy_level}`,
    "debate_modifiers:",
    modifiers,
    `prompt_fragment: ${rule.prompt_fragment}`
  ].join("\n");
}

function formatPatch(patch) {
  return [
    `[${patch.label}]`,
    `id: ${patch.id}`,
    `type: ${patch.type}`,
    `target: ${patch.target ?? ""}`,
    `mode: ${patch.mode ?? ""}`,
    `content: ${patch.content ?? ""}`
  ].join("\n");
}

function formatGuest(guest) {
  return [
    `[${guest.display_name}]`,
    `id: ${guest.id}`,
    `prompt_fragment: ${guest.prompt_fragment}`
  ].join("\n");
}

function shuffle(list) {
  const copied = [...list];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

async function onCopyPrompt() {
  clearError();
  if (!el.finalPrompt.value.trim()) {
    showError("コピー対象がありません。先に Generate してください。");
    return;
  }

  try {
    await navigator.clipboard.writeText(el.finalPrompt.value);
  } catch (_error) {
    el.finalPrompt.select();
    document.execCommand("copy");
  }
}

async function fetchJson(path, label) {
  const text = await fetchText(path, label);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} のJSON解析に失敗しました。\n${error.message}`);
  }
}

async function fetchText(path, label) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    throw new Error(buildFetchError(label, error));
  }
}

function buildFetchError(label, error) {
  const header = `${label} の読み込みに失敗しました。`;
  if (location.protocol === "file:") {
    return [
      header,
      "ローカル直開きでは fetch は使えません",
      "python -m http.server 等で起動してください"
    ].join("\n");
  }

  return `${header}\n${error.message}`;
}

function showError(message) {
  el.errorBox.hidden = false;
  el.errorBox.textContent = message;
}

function clearError() {
  el.errorBox.hidden = true;
  el.errorBox.textContent = "";
}
