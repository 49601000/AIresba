const STORAGE_KEYS = {
  topic: "resuba_topic",
  enabledPatchIds: "resuba_enabled_patch_ids",
  diceResult: "resuba_dice_result",
  selectedRuleId: "resuba_selected_rule_id",
  selectedStyle: "resuba_selected_style",
  finalPrompt: "resuba_final_prompt"
};

const PERSONA_IDS = ["gpt", "claude", "grok", "gemini"];
const DEFAULT_STYLE_ID = "nanj";

const PATCH_TYPE_LABELS = {
  character_tuning: "Character",
  context_memory: "Context",
  event_patch: "Event",
  guest_character: "Guest"
};

const BUILTIN_FALLBACK_STYLE = {
  id: DEFAULT_STYLE_ID,
  display_name: "なんJレスバ (builtin fallback)",
  style_renderer: {
    description: "読み込み失敗時の最小フォールバック。なんJ風の短文ラリーを維持する。",
    voice_rules: {
      shared: [
        "全員、なんJ風で短く会話する",
        "キャラクター設定説明の読み上げをしない",
        "論文調・司会調の説明文を避ける"
      ]
    },
    tempo_rules: {
      default_utterance_length: "1〜4文",
      principles: [
        "短く反応する",
        "割り込みや相槌を混ぜる",
        "独立した長文モノローグを避ける"
      ]
    },
    interaction_rules: {
      required: [
        "各発言は直近の発言に反応する",
        "論点を拾って少しずらす"
      ],
      forbidden: [
        "読者への解説",
        "キャラ設定の読み上げ"
      ]
    },
    ending_rules: {
      required: [
        "最後はまとめず、1論点だけ拾って切る"
      ]
    }
  }
};

const state = {
  diceResult: null,
  selectedRuleId: "",
  selectedStyle: DEFAULT_STYLE_ID,
  styleIndex: [{ id: DEFAULT_STYLE_ID, display_name: "なんJレスバ", file: "nanj.json" }],
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
  await Promise.all([loadPatchIndex(), loadStyleIndex()]);
}

function bindElements() {
  el.topicInput = document.getElementById("topicInput");
  el.styleSelect = document.getElementById("styleSelect");
  el.rollBtn = document.getElementById("rollBtn");
  el.generateBtn = document.getElementById("generateBtn");
  el.copyBtn = document.getElementById("copyBtn");
  el.diceResult = document.getElementById("diceResult");
  el.selectedRule = document.getElementById("selectedRule");
  el.selectedStyle = document.getElementById("selectedStyle");
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
  el.styleSelect.addEventListener("change", () => {
    state.selectedStyle = el.styleSelect.value || DEFAULT_STYLE_ID;
    localStorage.setItem(STORAGE_KEYS.selectedStyle, state.selectedStyle);
    renderStatus();
  });
}

function loadFromStorage() {
  const storedTopic = localStorage.getItem(STORAGE_KEYS.topic);
  const storedDice = localStorage.getItem(STORAGE_KEYS.diceResult);
  const storedRule = localStorage.getItem(STORAGE_KEYS.selectedRuleId);
  const storedStyle = localStorage.getItem(STORAGE_KEYS.selectedStyle);
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

  if (storedStyle) {
    state.selectedStyle = storedStyle;
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
  el.selectedStyle.textContent = state.selectedStyle || DEFAULT_STYLE_ID;
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

async function loadStyleIndex() {
  try {
    const styleIndex = await fetchJson("styles/index.json", "Style index");
    if (!Array.isArray(styleIndex) || styleIndex.length === 0) {
      throw new Error("配列形式の style index が必要です。");
    }

    state.styleIndex = styleIndex
      .filter((entry) => entry && typeof entry.id === "string")
      .map((entry) => ({
        id: entry.id.trim(),
        display_name: typeof entry.display_name === "string" ? entry.display_name : entry.id,
        file: typeof entry.file === "string" ? entry.file : `${entry.id}.json`
      }))
      .filter((entry) => entry.id.length > 0);
  } catch (_error) {
    state.styleIndex = [{ id: DEFAULT_STYLE_ID, display_name: "なんJレスバ", file: "nanj.json" }];
  }

  const selectable = new Set(state.styleIndex.map((style) => style.id));
  if (!selectable.has(state.selectedStyle)) {
    state.selectedStyle = DEFAULT_STYLE_ID;
    localStorage.setItem(STORAGE_KEYS.selectedStyle, state.selectedStyle);
  }

  renderStyleSelector();
  renderStatus();
}

function renderStyleSelector() {
  el.styleSelect.innerHTML = "";
  state.styleIndex.forEach((style) => {
    const option = document.createElement("option");
    option.value = style.id;
    option.textContent = `${style.display_name} (${style.id})`;
    if (style.id === state.selectedStyle) {
      option.selected = true;
    }
    el.styleSelect.appendChild(option);
  });
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
    const [debateEngine, outputFormat, rule, personas, style] = await Promise.all([
      fetchTextWithFallback(
        "base/debate_engine.txt",
        "base/debate_engine",
        "base/base_prompt.txt",
        "base/base_prompt"
      ),
      fetchText("base/output_format.txt", "output_format"),
      fetchRule(state.selectedRuleId),
      Promise.all(PERSONA_IDS.map((id) => loadPersona(id))),
      loadStyle(state.selectedStyle)
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
      ...personas.map((persona) => persona.display_name),
      ...guestCharacters.map((guest) => guest.display_name)
    ]).join(" -> ");

    const assembledPrompt = assemblePrompt({
      debateEngine,
      outputFormat,
      personas,
      rule,
      style,
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

async function fetchRule(ruleId) {
  try {
    return await fetchJson(`rules/${ruleId}.json`, ruleId);
  } catch (error) {
    const fallbackRuleId = fallbackRuleFor(ruleId);
    if (fallbackRuleId !== ruleId) {
      const fallbackRule = await fetchJson(`rules/${fallbackRuleId}.json`, fallbackRuleId);
      return {
        ...fallbackRule,
        id: ruleId,
        display_name: `${fallbackRule.display_name} (fallback from ${fallbackRuleId})`
      };
    }
    throw error;
  }
}

function fallbackRuleFor(ruleId) {
  if (ruleId === "rule4") {
    return "rule2";
  }
  if (ruleId === "rule5") {
    return "rule1";
  }
  return ruleId;
}

async function loadPersona(id) {
  try {
    const rawPersona = await fetchJson(`personas/${id}.json`, `persona:${id}`);
    return normalizePersona(rawPersona, id);
  } catch (_error) {
    const legacyPersona = await fetchJson(`characters/${id}.json`, `character:${id}`);
    return normalizePersona(legacyPersona, id);
  }
}

function normalizePersona(rawPersona, fallbackId) {
  const id = typeof rawPersona.id === "string" ? rawPersona.id : fallbackId;
  const displayName = typeof rawPersona.display_name === "string"
    ? rawPersona.display_name
    : id.toUpperCase();

  const brainLayer = rawPersona && typeof rawPersona.brain_layer === "object"
    ? normalizeBrainLayer(rawPersona.brain_layer)
    : extractBrainLayerFromLegacy(rawPersona);

  return {
    id,
    display_name: displayName,
    brain_layer: brainLayer
  };
}

function normalizeBrainLayer(rawLayer) {
  return {
    cognitive_style: sanitizeStringList(rawLayer.cognitive_style, 6),
    core_drive: firstNonEmptyString([rawLayer.core_drive]) || "議題に対して独自の推論軸を作る",
    debate_behavior: sanitizeStringList(rawLayer.debate_behavior, 6),
    weaknesses: sanitizeStringList(rawLayer.weaknesses, 6),
    reaction_pattern: sanitizeStringList(rawLayer.reaction_pattern, 6)
  };
}

function extractBrainLayerFromLegacy(rawPersona) {
  const cognitiveStyle = pickFromLegacy(
    [rawPersona.thinking_traits, rawPersona.design_principles, rawPersona.debate_style],
    4
  );
  const coreDrive = firstNonEmptyString([
    rawPersona.core_concept,
    rawPersona.role_in_debate,
    rawPersona.prompt_fragment
  ]) || "議題に対して独自の主張を組み立てる";
  const debateBehavior = pickFromLegacy(
    [rawPersona.debate_style, rawPersona.do, rawPersona.design_principles],
    4
  );
  const weaknesses = pickFromLegacy(
    [rawPersona.dont, rawPersona.interaction_rules?.triggers],
    4,
    ["旧形式データのため弱点情報は限定的"]
  );
  const reactionPattern = pickFromLegacy(
    [rawPersona.interaction_rules?.responses_to_triggers, rawPersona.sample_lines],
    4,
    ["相手の発言に反応して論点をずらす"]
  );

  return {
    cognitive_style: cognitiveStyle,
    core_drive: coreDrive,
    debate_behavior: debateBehavior,
    weaknesses,
    reaction_pattern: reactionPattern
  };
}

function pickFromLegacy(sources, limit, fallback = []) {
  const merged = [];
  sources.forEach((source) => {
    if (typeof source === "string") {
      merged.push(source);
      return;
    }
    if (Array.isArray(source)) {
      source.forEach((value) => merged.push(value));
    }
  });
  return sanitizeStringList(merged, limit, fallback);
}

function sanitizeStringList(values, limit, fallback = []) {
  const source = Array.isArray(values) ? values : [];
  const result = [];
  for (const value of source) {
    if (typeof value !== "string") {
      continue;
    }
    const trimmed = value.trim();
    if (!trimmed || result.includes(trimmed)) {
      continue;
    }
    result.push(trimmed);
    if (result.length >= limit) {
      break;
    }
  }

  if (result.length > 0) {
    return result;
  }
  return [...fallback];
}

function firstNonEmptyString(candidates) {
  for (const value of candidates) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

async function loadStyle(styleId) {
  try {
    const style = await fetchJson(`styles/${styleId}.json`, `style:${styleId}`);
    return normalizeStyle(style, styleId);
  } catch (_error) {
    try {
      const fallbackStyle = await fetchJson(
        `styles/${DEFAULT_STYLE_ID}.json`,
        `style:${DEFAULT_STYLE_ID}`
      );
      return normalizeStyle(fallbackStyle, DEFAULT_STYLE_ID);
    } catch (_fallbackError) {
      return BUILTIN_FALLBACK_STYLE;
    }
  }
}

function normalizeStyle(rawStyle, fallbackId) {
  if (!rawStyle || typeof rawStyle !== "object") {
    return BUILTIN_FALLBACK_STYLE;
  }
  if (!rawStyle.style_renderer || typeof rawStyle.style_renderer !== "object") {
    return BUILTIN_FALLBACK_STYLE;
  }
  return {
    id: typeof rawStyle.id === "string" ? rawStyle.id : fallbackId,
    display_name: typeof rawStyle.display_name === "string"
      ? rawStyle.display_name
      : fallbackId,
    style_renderer: rawStyle.style_renderer
  };
}

function assemblePrompt(payload) {
  const {
    debateEngine,
    outputFormat,
    personas,
    rule,
    style,
    patchPayloads,
    guestCharacters,
    topic,
    speakerOrder
  } = payload;

  const brainLayerBlock = personas.map(formatBrainLayer).join("\n\n");
  const ruleLayerBlock = formatRuleLayer(rule, patchPayloads, guestCharacters);

  return [
    "# Layer 1: Debate Engine",
    debateEngine.trim(),
    "",
    "# Layer 2: Persona Brain Layers",
    brainLayerBlock,
    "",
    "# Layer 3: Rule",
    ruleLayerBlock,
    "",
    "# Layer 4: Style Renderer",
    formatStyle(style),
    "",
    "# Layer 5: Topic",
    `議題: ${topic}`,
    `ダイスロール結果: ${state.diceResult}`,
    `適用ルール: ${state.selectedRuleId}`,
    `選択スタイル: ${style.id}`,
    `今回の発言順(固定ではない): ${speakerOrder}`,
    "",
    "# Mandatory Composition Instructions",
    "- まず各キャラクターは brain_layer に従って「何を主張するか」を決める",
    "- 次に style_renderer に従って、その主張を自然な会話台詞へ変換する",
    "- brain_layer の語彙や説明文を、そのまま台詞に出してはいけない",
    "- 設計思想を説明するのではなく、発話の反応、ツッコミ、比喩、論点の選び方に滲ませる",
    "- 各発言は、直前または直近の発言に反応する",
    "- 独立した作文モノローグは禁止",
    "- style_renderer は語尾だけでなく、会話テンポ、割り込み、長文例外、特殊イベント、用語辞書、終幕処理まで制御する",
    "",
    "# Layer 6: Output Format",
    outputFormat.trim()
  ].join("\n");
}

function formatBrainLayer(persona) {
  return [
    `[${persona.display_name}]`,
    `id: ${persona.id}`,
    `brain_layer:`,
    JSON.stringify(persona.brain_layer, null, 2)
  ].join("\n");
}

function formatRuleLayer(rule, patchPayloads, guestCharacters) {
  const modifiers = Array.isArray(rule.debate_modifiers)
    ? rule.debate_modifiers.map((item) => `- ${item}`).join("\n")
    : "- なし";

  const patchBlock = patchPayloads.length > 0
    ? patchPayloads.map(formatPatch).join("\n\n")
    : "なし";
  const guestBlock = guestCharacters.length > 0
    ? guestCharacters.map(formatGuest).join("\n\n")
    : "なし";

  return [
    `id: ${rule.id}`,
    `display_name: ${rule.display_name}`,
    `scenario_type: ${rule.scenario_type ?? ""}`,
    `energy_level: ${rule.energy_level ?? ""}`,
    "debate_modifiers:",
    modifiers,
    `prompt_fragment: ${rule.prompt_fragment ?? ""}`,
    "",
    "applied_patches:",
    patchBlock,
    "",
    "guest_characters:",
    guestBlock
  ].join("\n");
}

function formatStyle(style) {
  return [
    `id: ${style.id}`,
    `display_name: ${style.display_name}`,
    "style_renderer:",
    JSON.stringify(style.style_renderer, null, 2)
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

async function fetchTextWithFallback(primaryPath, primaryLabel, fallbackPath, fallbackLabel) {
  try {
    return await fetchText(primaryPath, primaryLabel);
  } catch (_primaryError) {
    return await fetchText(fallbackPath, fallbackLabel);
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
