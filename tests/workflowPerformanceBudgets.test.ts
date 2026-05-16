import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { buildWorkflowContext } from "../src/workflows/contextBuilder";
import { routeWorkflow } from "../src/workflows/workflowRouter";
import { rankVaultCandidatesFromPaths } from "../src/router/vaultCandidates";

function makeVaultPaths(count: number): string[] {
  const paths = [
    "Test/Test.md",
    "lumiq/lumiq.md",
    "lumiq/stat1.md",
    "Obsidian/Milanote.md",
    "Proton/LLM Engineering.md"
  ];

  for (let index = 0; index < count; index += 1) {
    paths.push(`Projects/Area ${index % 25}/Research Note ${index}.md`);
  }

  return paths;
}

const vaultPaths = makeVaultPaths(5000);

let started = performance.now();
const candidates = rankVaultCandidatesFromPaths(vaultPaths, "open LLM Engineering in Proton");
let elapsed = performance.now() - started;

assert.equal(candidates[0]?.path, "Proton/LLM Engineering.md");
assert.ok(elapsed < 450, `vault candidate ranking took ${elapsed.toFixed(1)}ms`);

const prebuiltContexts = [
  buildWorkflowContext({
    userText: "Open test in folder Test and replace old word with new word.",
    source: "voice",
    uiLanguage: "en",
    activeNotePath: "lumiq/stat1.md",
    vaultPaths
  }),
  buildWorkflowContext({
    userText: "Create a note about local LLM workflow in folder Obsidian.",
    source: "voice",
    uiLanguage: "en",
    activeNotePath: "lumiq/stat1.md",
    vaultPaths
  })
];

started = performance.now();
for (let index = 0; index < 1000; index += 1) {
  routeWorkflow(prebuiltContexts[index % prebuiltContexts.length]);
}
elapsed = performance.now() - started;

assert.ok(elapsed < 250, `1000 pure workflow routes took ${elapsed.toFixed(1)}ms`);

started = performance.now();
for (let index = 0; index < 10; index += 1) {
  const context = buildWorkflowContext({
    userText:
      index % 2 === 0
        ? "Open test in folder Test and replace old word with new word."
        : "Create a note about local LLM workflow in folder Obsidian.",
    source: "voice",
    uiLanguage: "en",
    activeNotePath: "lumiq/stat1.md",
    vaultPaths
  });
  routeWorkflow(context);
}
elapsed = performance.now() - started;

assert.ok(elapsed < 6000, `10 context builds plus routes took ${elapsed.toFixed(1)}ms`);

console.log("workflowPerformanceBudgets tests passed");
