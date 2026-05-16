import assert from "node:assert/strict";
import { getWorkflowRegistry } from "../src/workflows/workflowRegistry";
import {
  buildWorkflowContext,
  extractEffectiveWorkflowText
} from "../src/workflows/contextBuilder";
import {
  routeWorkflow,
  workflowRouteToActionPlan
} from "../src/workflows/workflowRouter";
import { runWorkflow } from "../src/workflows/workflowRuntime";
import { buildWorkflowMemoryAction } from "../src/workflows/workflowMemory";
import {
  collapseWorkflowSources,
  formatCompactWorkflowReceipts
} from "../src/workflows/workflowReceipts";
import { verifyWorkflowReceipts } from "../src/workflows/workflowVerification";

const registry = getWorkflowRegistry();

assert.equal(registry.length >= 10, true);
assert.equal(registry.some((workflow) => workflow.id === "note_creation"), true);
assert.equal(
  registry.find((workflow) => workflow.id === "delete_or_move")?.requiresConfirmation,
  true
);

assert.equal(
  extractEffectiveWorkflowText(
    "Открой в папке Obsidian, точнее нет, создай в папке Obsidian план для агента Contex."
  ),
  "создай в папке Obsidian план для агента Contex."
);
assert.equal(
  extractEffectiveWorkflowText(
    "Open the old file, actually create a new note about voice flow."
  ),
  "create a new note about voice flow."
);

const paths = [
  "Test/Test.md",
  "lumiq/lumiq.md",
  "lumiq/stat1.md",
  "Proton/LLM Engineering.md",
  "Obsidian/Voice Flow.md"
];

const openContext = buildWorkflowContext({
  userText: "Открой мне LUMIK в папке LUMIK.",
  source: "chat",
  uiLanguage: "ru",
  activeNotePath: "Test/Test.md",
  vaultPaths: paths
});

assert.equal(openContext.activeNote?.folder, "Test");
assert.equal(openContext.noteCandidates[0]?.path, "lumiq/lumiq.md");
assert.equal(openContext.folderCandidates[0]?.path, "lumiq");

const createContext = buildWorkflowContext({
  userText: "Создай файл с анекдотами в папке Test.",
  source: "chat",
  uiLanguage: "ru",
  activeNotePath: "lumiq/lumiq.md",
  vaultPaths: paths
});
const createRoute = routeWorkflow(createContext);
const createPlan = workflowRouteToActionPlan(createRoute, "chat");

assert.equal(createRoute.intent, "note_creation");
assert.equal(createRoute.title, "анекдоты");
assert.equal(createRoute.folderHint, "Test");
assert.equal(createPlan.actions[0].kind, "create_note");
assert.equal(createPlan.actions[0].kind === "create_note" && createPlan.actions[0].title, "анекдоты");
assert.equal(
  createPlan.actions[0].kind === "create_note" && createPlan.actions[0].folderHint,
  "Test"
);

const correctedContext = buildWorkflowContext({
  userText:
    "Открой в папке Obsidian, точнее извиняюсь, создай в папке Obsidian план для агента Contex.",
  source: "voice",
  uiLanguage: "ru",
  activeNotePath: "Test/Test.md",
  vaultPaths: paths
});
const correctedRoute = routeWorkflow(correctedContext);

assert.equal(correctedRoute.intent, "note_creation");
assert.equal(correctedRoute.actions[0].kind, "create_note");
assert.equal(correctedRoute.actions.some((action) => action.kind === "open_note"), false);

const openReplaceContext = buildWorkflowContext({
  userText: "Открой тест в папке Test и поменяй Я-гений на Я-человек.",
  source: "voice",
  uiLanguage: "ru",
  activeNotePath: "lumiq/stat1.md",
  vaultPaths: paths
});
const openReplaceRoute = routeWorkflow(openReplaceContext);
const openReplacePlan = workflowRouteToActionPlan(openReplaceRoute, "voice");

assert.equal(openReplaceRoute.intent, "safe_edit");
assert.equal(openReplacePlan.actions.length, 2);
assert.equal(openReplacePlan.actions[0].kind, "open_note");
assert.equal(
  openReplacePlan.actions[0].kind === "open_note" && openReplacePlan.actions[0].candidatePath,
  "Test/Test.md"
);
assert.deepEqual(
  openReplacePlan.actions[1].kind === "replace_text"
    ? openReplacePlan.actions[1].replacements
    : [],
  [{ original: "Я-гений", suggested: "Я-человек" }]
);

const researchContext = buildWorkflowContext({
  userText: "Проверь актуальность текущей заметки на момент 6 мая 2026 года.",
  source: "chat",
  uiLanguage: "ru",
  activeNotePath: "Obsidian/Voice Flow.md",
  vaultPaths: paths
});
const researchRoute = routeWorkflow(researchContext);

assert.equal(researchRoute.intent, "research_update");
assert.equal(researchRoute.needsWeb, true);
assert.equal(researchRoute.actions.some((action) => action.kind === "search_web"), true);

const runtimeReceipts = await runWorkflow(createRoute, {
  executePlan: async (plan) =>
    plan.actions.map((action) => ({
      actionId: action.id,
      kind: action.kind,
      status: action.kind === "create_note" ? "saved" : "done",
      label: action.kind === "create_note" ? "Created note" : "Done",
      path: action.kind === "create_note" ? "Test/анекдоты.md" : undefined
    }))
});

assert.equal(runtimeReceipts.status, "complete");
assert.equal(runtimeReceipts.receipts[0].status, "saved");
assert.equal(verifyWorkflowReceipts(createRoute, runtimeReceipts.receipts).ok, true);

const failedVerification = verifyWorkflowReceipts(createRoute, [
  {
    actionId: createRoute.actions[0].id,
    kind: "create_note",
    status: "failed",
    label: "Create failed"
  }
]);

assert.equal(failedVerification.ok, false);

const memoryAction = buildWorkflowMemoryAction({
  route: createRoute,
  receipts: runtimeReceipts.receipts,
  assistantText: "Created a durable project note."
});

assert.equal(memoryAction?.kind, "update_wiki");
assert.equal(memoryAction?.automatic, true);

assert.equal(
  formatCompactWorkflowReceipts(runtimeReceipts.receipts),
  "Created · Test/анекдоты.md"
);
assert.deepEqual(
  collapseWorkflowSources([
    { label: "A", locator: "a.md" },
    { label: "B", locator: "b.md" },
    { label: "C", locator: "c.md" }
  ]),
  {
    label: "3 sources",
    visible: [
      { label: "A", locator: "a.md" },
      { label: "B", locator: "b.md" }
    ],
    hiddenCount: 1
  }
);

const voiceContext = buildWorkflowContext({
  userText: "Открою тест, вапки тест.",
  source: "voice",
  uiLanguage: "ru",
  activeNotePath: "lumiq/stat1.md",
  vaultPaths: paths
});
const voiceRoute = routeWorkflow(voiceContext);

assert.equal(voiceRoute.intent, "vault_action");
assert.equal(voiceRoute.actions[0].kind, "open_note");
assert.equal(
  voiceRoute.actions[0].kind === "open_note" && voiceRoute.actions[0].candidatePath,
  "Test/Test.md"
);

console.log("workflowEngine tests passed");
