import assert from "node:assert/strict";
import {
  buildPromptImprovementMessages,
  cleanImprovedPrompt
} from "../src/prompt/promptImprover";

const messages = buildPromptImprovementMessages(
  "создай заметку про voice flow"
);

assert.equal(messages.length, 1);
assert.equal(messages[0].role, "user");
assert.ok(messages[0].content.includes("создай заметку про voice flow"));
assert.equal(
  cleanImprovedPrompt("```markdown\nСоздай краткую заметку про Voice Flow.\n```"),
  "Создай краткую заметку про Voice Flow."
);
assert.equal(cleanImprovedPrompt('"Open the Test note."'), "Open the Test note.");

console.log("promptImprover tests passed");
