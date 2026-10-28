const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync(process.argv[2], "utf8");
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
let failed = false;
let userHtml = "";
scripts.forEach((match, index) => {
  if (!match[1].trim()) return;
  try {
    new Function(match[1]);
    console.log(`script ${index + 1}: OK (${match[1].length} chars)`);
    if (match[1].includes("goog.script.init(")) {
      const goog = { script: { init(config) { userHtml = JSON.parse(config).userHtml; } } };
      const frame = {};
      const document = { getElementById() { return frame; } };
      new Function("goog", "document", match[1])(goog, document);
      frame.onload();
    }
  } catch (error) {
    failed = true;
    console.error(`script ${index + 1}: ${error.stack}`);
    const lines = match[1].split(/\r?\n/);
    const line = Number((error.stack.match(/<anonymous>:(\d+):/) || [])[1]);
    if (line) console.error(lines.slice(Math.max(0, line - 4), line + 3).map((text, offset) => `${Math.max(1, line - 3) + offset}: ${text}`).join("\n"));
  }
});
if (userHtml) {
  console.log(`userHtml: ${userHtml.length} chars`);
  const userScripts = [...userHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  userScripts.forEach((match, index) => {
    try {
      new vm.Script(match[1], { filename: `user-script-${index + 1}.js` });
      console.log(`user script ${index + 1}: OK (${match[1].length} chars)`);
    } catch (error) {
      failed = true;
      console.error(`user script ${index + 1}: ${error.stack}`);
      const lines = match[1].split(/\r?\n/);
      const line = Number((error.stack.match(/user-script-\d+\.js:(\d+)/) || [])[1]);
      if (line) console.error(lines.slice(Math.max(0, line - 4), line + 3).map((text, offset) => `${Math.max(1, line - 3) + offset}: ${text}`).join("\n"));
    }
  });
}
if (failed) process.exitCode = 1;
