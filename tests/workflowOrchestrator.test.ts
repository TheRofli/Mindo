import assert from "node:assert/strict";
import { WorkflowOrchestrator } from "../src/views/workflowOrchestrator";

const orchestrator = new WorkflowOrchestrator({
  getUiLanguage: () => "en",
  getAttachments: () => [
    {
      name: "brief.pdf",
      mime: "application/pdf",
      size: 128,
      textExcerpt: "Project brief"
    }
  ],
  getVaultPaths: () => [
    "Test/Test.md",
    "Projects/LiveCollab.md",
    "Projects/Roadmap.md"
  ]
});

const route = orchestrator.buildRouteForCommand(
  "open Test in folder Test and replace old with new",
  "Projects/LiveCollab.md",
  "old"
);

assert.equal(route.intent, "safe_edit");
assert.equal(route.uiLanguage, "en");
assert.equal(route.actions[0]?.kind, "open_note");
assert.equal(route.actions[1]?.kind, "replace_text");
assert.equal(route.candidatePath, "Test/Test.md");
assert.equal(route.folderHint, "Test");

const createRoute = orchestrator.buildRouteForCommand(
  "create a research note about current local LLM trends in Projects",
  "Projects/LiveCollab.md",
  "Current note content"
);

assert.equal(createRoute.intent, "research_update");
assert.equal(createRoute.needsWeb, true);
assert.equal(createRoute.folderHint, "Projects");

console.log("workflowOrchestrator tests passed");
