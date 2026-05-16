import assert from "node:assert/strict";
import {
  buildWorkflowContext,
  extractEffectiveWorkflowText
} from "../src/workflows/contextBuilder";
import {
  routeWorkflow,
  workflowRouteToActionPlan
} from "../src/workflows/workflowRouter";

const goldenVaultPaths = [
  "Test/Test.md",
  "Test/анекдоты.md",
  "lumiq/lumiq.md",
  "lumiq/stat1.md",
  "Obsidian/Milanote.md",
  "Obsidian/Фишки obsidian.md",
  "Obsidian/Фишки markdown.md",
  "Obsidian/Voice Flow.md",
  "Proton/LLM Engineering.md",
  "Proton/Qore Systems Cases.md"
];

assert.equal(
  extractEffectiveWorkflowText(
    "Открой в папке Obsidian, точнее извиняюсь, создай в папке Obsidian план для агента Contex."
  ),
  "создай в папке Obsidian план для агента Contex."
);

const openTest = routeWorkflow(
  buildWorkflowContext({
    userText: "Открою тест, вапки тест.",
    source: "voice",
    uiLanguage: "ru",
    activeNotePath: "lumiq/stat1.md",
    vaultPaths: goldenVaultPaths
  })
);

assert.equal(openTest.intent, "vault_action");
assert.equal(openTest.actions[0].kind, "open_note");
assert.equal(
  openTest.actions[0].kind === "open_note" && openTest.actions[0].candidatePath,
  "Test/Test.md"
);

const createJokes = routeWorkflow(
  buildWorkflowContext({
    userText: "Создай файл с анекдотами в папке тест.",
    source: "voice",
    uiLanguage: "ru",
    activeNotePath: "lumiq/lumiq.md",
    vaultPaths: goldenVaultPaths
  })
);

assert.equal(createJokes.intent, "note_creation");
assert.equal(createJokes.title, "анекдоты");
assert.equal(createJokes.folderHint, "Test");
assert.equal(createJokes.actions[0].kind, "create_note");
assert.equal(
  createJokes.actions[0].kind === "create_note" && createJokes.actions[0].path,
  "Test/анекдоты.md"
);

const openAndReplace = workflowRouteToActionPlan(
  routeWorkflow(
    buildWorkflowContext({
      userText: "Открой тест в папке Test и поменяй Я-гений на Я-человек.",
      source: "voice",
      uiLanguage: "ru",
      activeNotePath: "lumiq/stat1.md",
      vaultPaths: goldenVaultPaths
    })
  )
);

assert.deepEqual(
  openAndReplace.actions.map((action) => action.kind),
  ["open_note", "replace_text"]
);
assert.equal(
  openAndReplace.actions[0].kind === "open_note" &&
    openAndReplace.actions[0].candidatePath,
  "Test/Test.md"
);
assert.deepEqual(
  openAndReplace.actions[1].kind === "replace_text"
    ? openAndReplace.actions[1].replacements
    : [],
  [{ original: "Я-гений", suggested: "Я-человек" }]
);

const correctedCreate = routeWorkflow(
  buildWorkflowContext({
    userText:
      "Открой в папке Obsidian, нет, не открывай, лучше создай новую заметку про Voice Flow в папке Obsidian.",
    source: "voice",
    uiLanguage: "ru",
    activeNotePath: "Test/Test.md",
    vaultPaths: goldenVaultPaths
  })
);

assert.equal(correctedCreate.intent, "note_creation");
assert.equal(correctedCreate.actions.some((action) => action.kind === "open_note"), false);
assert.equal(correctedCreate.folderHint, "Obsidian");
assert.equal(correctedCreate.title, "Voice Flow");

const freshness = routeWorkflow(
  buildWorkflowContext({
    userText: "Проверь актуальность текущей заметки на момент 6 мая 2026 года.",
    source: "voice",
    uiLanguage: "ru",
    activeNotePath: "Obsidian/Voice Flow.md",
    vaultPaths: goldenVaultPaths
  })
);

assert.equal(freshness.intent, "research_update");
assert.equal(freshness.needsWeb, true);
assert.equal(freshness.actions.some((action) => action.kind === "search_web"), true);

console.log("goldenVoiceWorkflow tests passed");
