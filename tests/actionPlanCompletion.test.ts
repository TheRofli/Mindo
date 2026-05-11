import assert from "node:assert/strict";
import {
  completeOpenThenReplacePlan,
  extractReplacementFromCompoundText,
  normalizeSemanticLocalCommandsForUserText
} from "../src/tools/actionPlanCompletion";

const replacement = extractReplacementFromCompoundText(
  "Open Test/Test.md and replace old text with new text."
);

assert.deepEqual(replacement, {
  original: "old text",
  suggested: "new text"
});

const russianReplacement = extractReplacementFromCompoundText(
  "\u041e\u0442\u043a\u0440\u043e\u0439 \u0442\u0435\u0441\u0442 \u0432 \u043f\u0430\u043f\u043a\u0435 \u0442\u0435\u0441\u0442 \u0438 \u043f\u043e\u043c\u0435\u043d\u044f\u0439 \u042f-\u0433\u0435\u043d\u0438\u0439 \u043d\u0430 \u042f-\u0447\u0435\u043b\u043e\u0432\u0435\u043a."
);

assert.deepEqual(russianReplacement, {
  original: "\u042f \u0433\u0435\u043d\u0438\u0439",
  suggested: "\u042f \u0447\u0435\u043b\u043e\u0432\u0435\u043a"
});

const completed = completeOpenThenReplacePlan(
  [
    {
      action: "open_file",
      query: "Test/Test.md"
    }
  ],
  "\u041e\u0442\u043a\u0440\u043e\u0439 \u0442\u0435\u0441\u0442 \u0432 \u043f\u0430\u043f\u043a\u0435 \u0442\u0435\u0441\u0442 \u0438 \u043f\u043e\u043c\u0435\u043d\u044f\u0439 \u042f-\u0433\u0435\u043d\u0438\u0439 \u043d\u0430 \u042f-\u0447\u0435\u043b\u043e\u0432\u0435\u043a."
);

assert.equal(completed.length, 2);
assert.equal(completed[1].action, "replace_text");

const correctedIntent = normalizeSemanticLocalCommandsForUserText(
  [
    { action: "open_file", query: "Obsidian/Old.md" },
    {
      action: "create_note",
      query: "\u0441\u043e\u0437\u0434\u0430\u0439 \u043d\u043e\u0432\u0443\u044e \u0437\u0430\u043c\u0435\u0442\u043a\u0443 \u043f\u0440\u043e Voice Flow"
    }
  ],
  "\u041d\u0435 \u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0439, \u043b\u0443\u0447\u0448\u0435 \u0441\u043e\u0437\u0434\u0430\u0439 \u043d\u043e\u0432\u0443\u044e \u0437\u0430\u043c\u0435\u0442\u043a\u0443 \u043f\u0440\u043e Voice Flow"
);

assert.equal(correctedIntent.length, 1);
assert.equal(correctedIntent[0].action, "create_note");

const webPromoted = normalizeSemanticLocalCommandsForUserText(
  [
    {
      action: "create_note",
      query: "Create a note about modern local LLM features"
    }
  ],
  "Create a note about modern local LLM features and use internet sources"
);

assert.equal(webPromoted[0].action, "research_note");

console.log("actionPlanCompletion tests passed");
