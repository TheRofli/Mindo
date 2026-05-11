import assert from "node:assert/strict";
import { rankVaultCandidatesFromPaths } from "../src/router/vaultCandidates";

const candidates = rankVaultCandidatesFromPaths(
  [
    "Test/Test.md",
    "lumiq/stat1.md",
    "Proton/LLM Engineering.md",
    "Obsidian/Contex Agent.md"
  ],
  "open test in folder test"
);

assert.equal(candidates[0].path, "Test/Test.md");
assert.equal(candidates[0].folder, "Test");

const proton = rankVaultCandidatesFromPaths(
  ["Test/Test.md", "Proton/LLM Engineering.md"],
  "open LLM Engineering in folder Proton"
);

assert.equal(proton[0].path, "Proton/LLM Engineering.md");

console.log("vaultCandidates tests passed");
