import assert from "node:assert/strict";
import { runContexScenario } from "../src/testing/scenarioHarness";

const openResult = await runContexScenario({
  userText: "Open test in folder Test",
  vaultPaths: ["Test/Test.md", "lumiq/stat1.md"],
  routerResponse: {
    action: "open_file",
    query: "Test/Test.md"
  }
});

assert.equal(openResult.receipts[0].status, "opened");
assert.equal(openResult.receipts[0].path, "Test/Test.md");

const corrected = await runContexScenario({
  userText:
    "Open Obsidian, actually create a plan for Contex Agent in folder Obsidian",
  vaultPaths: ["Obsidian/Existing.md"],
  routerResponse: {
    action: "create_note",
    query: "create a plan for Contex Agent in folder Obsidian"
  }
});

assert.equal(corrected.plan.actions[0].kind, "create_note");

console.log("scenarioHarness tests passed");
