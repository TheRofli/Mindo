import assert from "node:assert/strict";
import {
  buildStyleInstruction,
  inferPersonalStyleMemory,
  planSmartNoteCreation
} from "../src/views/smartNoteCreation";

const style = inferPersonalStyleMemory([
  "# План\n\n- коротко\n- по делу\n\n## Риски\n\nВажно писать ясно."
]);

assert.equal(style.language, "ru");
assert.equal(style.prefersBullets, true);
assert.ok(buildStyleInstruction(style).includes("Russian"));

const implicitFolder = planSmartNoteCreation({
  userText: "Создай план для Contex Agent",
  activeNotePath: "lumiq/stat1.md",
  style
});

assert.equal(implicitFolder.folder, "lumiq");
assert.equal(implicitFolder.path, "lumiq/План для Contex Agent.md");
assert.ok(implicitFolder.contentInstruction.includes("Do not repeat the title"));
assert.ok(implicitFolder.contentInstruction.includes("Russian"));

const explicitFolder = planSmartNoteCreation({
  userText: "Создай в папке Obsidian план для Contex Agent",
  activeNotePath: "lumiq/stat1.md",
  folderHint: "Obsidian",
  style
});

assert.equal(explicitFolder.folder, "Obsidian");
assert.equal(explicitFolder.path, "Obsidian/План для Contex Agent.md");

const modernNote = planSmartNoteCreation({
  userText: "Создай современную страницу про local LLM в 2026 году",
  activeNotePath: "Test/Test.md",
  style
});

assert.equal(modernNote.requiresWeb, true);

const realRussianStyle = inferPersonalStyleMemory([
  "# План\n\n- коротко\n- по делу\n\n## Риски\n\nВажно писать ясно."
]);

assert.equal(realRussianStyle.language, "ru");
assert.ok(buildStyleInstruction(realRussianStyle).includes("Russian"));

const realExplicitFolder = planSmartNoteCreation({
  userText: "Создай в папке Obsidian план для Contex Agent",
  activeNotePath: "lumiq/stat1.md",
  folderHint: "Obsidian",
  style: realRussianStyle
});

assert.equal(realExplicitFolder.folder, "Obsidian");
assert.equal(realExplicitFolder.path, "Obsidian/План для Contex Agent.md");

const realModernNote = planSmartNoteCreation({
  userText: "Создай современную страницу про local LLM в 2026 году",
  activeNotePath: "Test/Test.md",
  style: realRussianStyle
});

assert.equal(realModernNote.requiresWeb, true);

console.log("smartNoteCreation tests passed");
