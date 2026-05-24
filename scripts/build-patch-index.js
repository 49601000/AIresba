const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const patchesDir = path.join(projectRoot, "patches");
const indexPath = path.join(patchesDir, "index.json");

function main() {
  if (!fs.existsSync(patchesDir)) {
    throw new Error(`patches directory not found: ${patchesDir}`);
  }

  const entries = fs
    .readdirSync(patchesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".json"))
    .filter((name) => name !== "index.json");

  const index = [];

  for (const file of entries) {
    const fullPath = path.join(patchesDir, file);
    const raw = fs.readFileSync(fullPath, "utf8");

    try {
      const parsed = JSON.parse(raw);
      if (!parsed.id || !parsed.label || !parsed.type) {
        console.warn(`[warn] missing required fields: ${file}`);
        continue;
      }

      index.push({
        id: parsed.id,
        label: parsed.label,
        type: parsed.type,
        file
      });
    } catch (error) {
      console.warn(`[warn] invalid json: ${file} (${error.message})`);
    }
  }

  index.sort((a, b) => a.id.localeCompare(b.id));
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
  console.log(`index generated: ${index.length} patch(es)`);
}

main();
