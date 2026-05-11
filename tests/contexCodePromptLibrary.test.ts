import assert from "node:assert/strict";
import {
  buildContexCodePromptJsonl,
  buildContexCodePromptLibraryMarkdown,
  getBuiltInContexCodePrompts,
} from "../src/contexCode/promptLibrary";

const prompts = getBuiltInContexCodePrompts();
assert.ok(prompts.length >= 8);
assert.ok(prompts.some((prompt) => prompt.id === "contex-code-plan-seed"));
assert.ok(prompts.some((prompt) => prompt.category === "review"));

const jsonl = buildContexCodePromptJsonl();
const lines = jsonl.trim().split("\n");
assert.equal(lines.length, prompts.length);
assert.equal(JSON.parse(lines[0]).kind, "prompt");

const markdown = buildContexCodePromptLibraryMarkdown();
assert.match(markdown, /Contex Code Prompt Library/);
assert.match(markdown, /contex-code-plan-seed/);

console.log("contexCodePromptLibrary tests passed");
