import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gitignore = readFileSync(".gitignore", "utf8");
const packageScript = readFileSync("scripts/package-plugin.mjs", "utf8");

for (const unsafeDirectory of [
  ".contex-stt-runtime",
  ".cache",
  ".huggingface",
  ".mindo-stt-runtime",
  "pip-cache",
  "node_modules",
  "target"
]) {
  assert.match(
    packageScript,
    new RegExp(JSON.stringify(unsafeDirectory).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `release package must ignore ${unsafeDirectory}`
  );
}

for (const unsafeFile of ["data.json", ".env", ".env.local"]) {
  assert.match(
    packageScript,
    new RegExp(JSON.stringify(unsafeFile).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `release package must ignore ${unsafeFile}`
  );
}

assert.match(packageScript, /isDesktopOnly=true/);
assert.match(packageScript, /versions\.json must map/);
assert.match(gitignore, /bin\/contex-core\.exe/);
assert.match(packageScript, /optionalDirectories/);
assert.equal(packageScript.includes('"bin/contex-core.exe"'), false);

console.log("releasePackagePolicy tests passed");
