import assert from "node:assert/strict";
import { buildWorkflowContext } from "../src/workflows/contextBuilder";
import { routeWorkflow } from "../src/workflows/workflowRouter";

const goldenVaultPaths = [
  "Test/Test.md",
  "Test/анекдоты.md",
  "lumiq/lumiq.md",
  "lumiq/stat1.md",
  "Obsidian/Milanote.md",
  "Obsidian/Фишки obsidian.md",
  "Obsidian/Фишки markdown.md",
  "Proton/LLM Engineering.md",
  "Proton/proton.md"
];

function route(userText: string) {
  return routeWorkflow(
    buildWorkflowContext({
      userText,
      source: "typed",
      uiLanguage: "ru",
      activeNotePath: "Test/Test.md",
      vaultPaths: goldenVaultPaths
    })
  );
}

const testOpen = route("Открой тест в папке Test.");
assert.equal(testOpen.intent, "vault_action");
assert.equal(testOpen.candidatePath, "Test/Test.md");

const lumiqOpen = route("Открой LUMIK в папке LUMIK.");
assert.equal(lumiqOpen.intent, "vault_action");
assert.equal(lumiqOpen.candidatePath, "lumiq/lumiq.md");

const milanoteOpen = route("Открой мила ноут.");
assert.equal(milanoteOpen.intent, "vault_action");
assert.equal(milanoteOpen.candidatePath, "Obsidian/Milanote.md");

const folderCreate = route("Создай файл с анекдотами в папке тест.");
assert.equal(folderCreate.intent, "note_creation");
assert.equal(folderCreate.folderHint, "Test");
assert.equal(folderCreate.title, "анекдоты");
assert.equal(folderCreate.actions[0]?.kind, "create_note");
assert.equal(folderCreate.actions[0]?.path, "Test/анекдоты.md");

const correction = route(
  "Открой в папке Obsidian фишки markdown, нет, лучше создай новую заметку про Voice Flow в папке Obsidian."
);
assert.equal(correction.intent, "note_creation");
assert.equal(correction.folderHint, "Obsidian");
assert.match(correction.title ?? "", /Voice Flow|голос/i);

console.log("goldenVaultFixture tests passed");
