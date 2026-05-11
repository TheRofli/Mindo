import assert from "node:assert/strict";
import { buildToolRouterPrompt } from "../src/router/toolRouterPrompt";

const prompt = buildToolRouterPrompt({
  userText: "open test in folder Test, actually create a new note about it",
  activeNotePath: "Test/Test.md",
  candidates: [
    {
      path: "Test/Test.md",
      basename: "Test",
      folder: "Test",
      score: 100
    }
  ]
});

assert.ok(prompt.includes("Return JSON only"));
assert.ok(prompt.includes("Test/Test.md"));
assert.ok(prompt.includes("corrected"));
assert.ok(prompt.includes("create_note"));

console.log("toolRouterPrompt tests passed");
