import assert from "node:assert/strict";
import { planContextWorkflow } from "../src/web/workflowPlanner";

assert.equal(
  planContextWorkflow("Проверь актуальность текущей заметки на 6 мая 2026")
    .requiresWeb,
  true
);
assert.equal(
  planContextWorkflow("Create a modern page about local LLM features this year")
    .requiresWeb,
  true
);
assert.equal(planContextWorkflow("Summarize current note").requiresWeb, false);
assert.equal(
  planContextWorkflow("Update this note using current project context")
    .requiresVault,
  true
);

console.log("workflowPlanner tests passed");
