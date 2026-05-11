import assert from "node:assert/strict";
import {
  NOTE_ACTIONS,
  SELECTED_TEXT_ACTIONS,
  getActionDescription,
  getNoteActionId,
  getSuggestionTitle
} from "../src/views/noteActions";

assert.deepEqual(
  NOTE_ACTIONS.map((action) => action.id),
  ["explain-note", "summarize-note", "create-roadmap", "extract-tasks"]
);

const explainAction = NOTE_ACTIONS[0];
assert.ok(explainAction);
assert.equal(getNoteActionId(explainAction), "explain-note");
assert.equal(getSuggestionTitle(explainAction), "Plain Explanation");
assert.equal(
  getActionDescription(explainAction),
  "Explain the active note in plain language."
);

const summarizeAction = NOTE_ACTIONS.find((action) => action.id === "summarize-note");
assert.ok(summarizeAction);
assert.equal(getSuggestionTitle(summarizeAction), "Note Summary");
assert.equal(
  getActionDescription(summarizeAction),
  "Summarize the active note into concise bullets."
);

const improveAction = SELECTED_TEXT_ACTIONS.find(
  (action) => action.kind === "improve-selection"
);
assert.ok(improveAction);
assert.equal(getNoteActionId(improveAction), "improve-selection");

console.log("noteActions tests passed");
