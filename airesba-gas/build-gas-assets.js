const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const out = __dirname;
const assetDirs = ["base", "personas", "characters", "rules", "styles", "patches"];
const assets = {};
for (const dir of assetDirs) {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    if (!/\.(json|txt)$/i.test(name)) continue;
    const key = `${dir}/${name}`;
    assets[key] = fs.readFileSync(path.join(root, key), "utf8");
  }
}

let client = fs.readFileSync(path.join(root, "app.js"), "utf8");
function replaceOnce(search, replacement) {
  if (!client.includes(search)) throw new Error(`Source marker not found: ${search.slice(0, 80)}`);
  client = client.replace(search, replacement);
}

replaceOnce('  finalPrompt: "resuba_final_prompt"', '  finalPrompt: "resuba_final_prompt",\n  selectedClaudeExitId: "resuba_selected_claude_exit_id"');
replaceOnce('  finalPrompt: ""\n};', '  finalPrompt: "",\n  claudeExitCandidates: [],\n  selectedClaudeExitId: "",\n  generatedClaudeExitId: ""\n};');
replaceOnce('  await bootstrap();', '  await bootstrap();\n  await refreshClaudeExitCandidates();');
replaceOnce('  el.errorBox = document.getElementById("errorBox");', '  el.errorBox = document.getElementById("errorBox");\n  el.claudeExitSelect = document.getElementById("claudeExitSelect");\n  el.claudeExitStatus = document.getElementById("claudeExitStatus");');
replaceOnce('  el.geminiOpenBtn.addEventListener("click", onOpenGemini);', '  el.geminiOpenBtn.addEventListener("click", onOpenGemini);\n  el.claudeExitSelect.addEventListener("change", () => {\n    state.selectedClaudeExitId = el.claudeExitSelect.value;\n    localStorage.setItem(STORAGE_KEYS.selectedClaudeExitId, state.selectedClaudeExitId);\n  });');
replaceOnce('  const storedPatchIds = localStorage.getItem(STORAGE_KEYS.enabledPatchIds);', '  const storedPatchIds = localStorage.getItem(STORAGE_KEYS.enabledPatchIds);\n  state.selectedClaudeExitId = localStorage.getItem(STORAGE_KEYS.selectedClaudeExitId) || "";');
replaceOnce('      topic\n    });', '      topic,\n      claudeExitCandidate: state.claudeExitCandidates.find((item) => item.id === state.selectedClaudeExitId) || null\n    });');
replaceOnce('    state.finalPrompt = assembledPrompt;', '    state.generatedClaudeExitId = state.claudeExitCandidates.some((item) => item.id === state.selectedClaudeExitId) ? state.selectedClaudeExitId : "";\n    state.finalPrompt = assembledPrompt;');
replaceOnce('    topic\n  } = payload;', '    topic,\n    claudeExitCandidate\n  } = payload;');
replaceOnce('    `総文字数目安: ${lengthPolicyMode.target_total_chars.min}〜${lengthPolicyMode.target_total_chars.max}字`,', '    `総文字数目安: ${lengthPolicyMode.target_total_chars.min}〜${lengthPolicyMode.target_total_chars.max}字`,\n    ...(claudeExitCandidate ? [\n      `Claude退場理由（選択時のみ）: ${claudeExitCandidate.dialogue}`,\n      "退場イベントが発生した場合のみ創作素材として使い、文脈に合わせて調整してよい。一字一句の再現は不要。",\n      "この候補の選択だけでは退場を必須にしない。"\n    ] : []),');
replaceOnce('    await navigator.clipboard.writeText(el.finalPrompt.value);\n    flashButtonStatus(el.copyBtn, "コピーOK");', '    await navigator.clipboard.writeText(el.finalPrompt.value);\n    flashButtonStatus(el.copyBtn, "コピーOK");\n    await markGeneratedClaudeExitUsed();');
replaceOnce('      flashButtonStatus(el.copyBtn, "コピーOK");', '      flashButtonStatus(el.copyBtn, "コピーOK");\n      await markGeneratedClaudeExitUsed();');
replaceOnce('async function fetchText(path, label) {\n  try {\n    const response = await fetch(path, { cache: "no-store" });\n    if (!response.ok) {\n      throw new Error(`HTTP ${response.status}`);\n    }\n    return await response.text();\n  } catch (error) {\n    throw new Error(buildFetchError(label, error));\n  }\n}', 'async function fetchText(path, label) {\n  if (Object.prototype.hasOwnProperty.call(APP_ASSETS, path)) return APP_ASSETS[path];\n  throw new Error(`${label} の同梱データが見つかりません: ${path}`);\n}');

const adapter = `\nfunction runServer(functionName, argument) {\n  return new Promise((resolve, reject) => {\n    let runner = google.script.run.withSuccessHandler(resolve).withFailureHandler((error) => reject(new Error(error && error.message ? error.message : String(error))));\n    if (arguments.length > 1) runner[functionName](argument); else runner[functionName]();\n  });\n}\n\nasync function refreshClaudeExitCandidates() {\n  el.claudeExitStatus.textContent = "未使用候補を読み込んでいます。";\n  try {\n    state.claudeExitCandidates = await runServer("getUnusedCandidates");\n    renderClaudeExitCandidates();\n    el.claudeExitStatus.textContent = "未使用候補 " + state.claudeExitCandidates.length + "件を読み込みました。";\n  } catch (error) {\n    state.claudeExitCandidates = [];\n    renderClaudeExitCandidates();\n    el.claudeExitStatus.textContent = "候補を取得できませんでした。従来どおり生成できます：" + error.message;\n    el.claudeExitStatus.classList.add("warning");\n  }\n}\n\nfunction renderClaudeExitCandidates() {\n  const selected = state.selectedClaudeExitId;\n  el.claudeExitSelect.replaceChildren(new Option("指定しない", ""));\n  state.claudeExitCandidates.forEach((item) => el.claudeExitSelect.add(new Option(item.title || "（タイトルなし）", item.id)));\n  if (state.claudeExitCandidates.some((item) => item.id === selected)) el.claudeExitSelect.value = selected;\n  else { state.selectedClaudeExitId = ""; localStorage.removeItem(STORAGE_KEYS.selectedClaudeExitId); }\n}\n\nasync function markGeneratedClaudeExitUsed() {\n  const id = state.generatedClaudeExitId;\n  if (!id) return;\n  try {\n    const result = await runServer("markCandidateUsed", id);\n    if (result.updated || result.reason === "ALREADY_USED") {\n      state.claudeExitCandidates = state.claudeExitCandidates.filter((item) => item.id !== id);\n      state.generatedClaudeExitId = "";\n      if (state.selectedClaudeExitId === id) state.selectedClaudeExitId = "";\n      renderClaudeExitCandidates();\n      el.claudeExitStatus.textContent = result.updated ? "コピーした候補をUSEDに更新しました。" : "この候補は既にUSEDです。";\n    } else {\n      el.claudeExitStatus.textContent = "コピーは完了しましたが、台帳は更新されませんでした：" + result.reason;\n      el.claudeExitStatus.classList.add("warning");\n    }\n  } catch (error) {\n    el.claudeExitStatus.textContent = "コピーは完了しましたが、台帳更新に失敗しました：" + error.message;\n    el.claudeExitStatus.classList.add("warning");\n  }\n}\n`;

const safeAssets = JSON.stringify(assets).replace(/<\//g, "<\\/");
fs.writeFileSync(path.join(out, "Client.html"), `<script>\nconst APP_ASSETS = ${safeAssets};\n${client}\n${adapter}<\/script>\n`, "utf8");
const css = fs.readFileSync(path.join(root, "style.css"), "utf8") + "\n.db-status{margin:8px 0 0;color:var(--muted);font-size:.9rem}.db-status.warning{color:#ffd4e6}\n";
fs.writeFileSync(path.join(out, "Style.html"), css, "utf8");
console.log(`Generated Client.html with ${Object.keys(assets).length} assets and Style.html`);

