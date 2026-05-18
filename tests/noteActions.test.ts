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
  ["vault-recall", "connect-note", "improve-draft"]
);

const vaultRecallAction = NOTE_ACTIONS[0];
assert.ok(vaultRecallAction);
assert.equal(getNoteActionId(vaultRecallAction), "vault-recall");
assert.equal(getSuggestionTitle(vaultRecallAction), "Vault Recall");
assert.equal(
  getActionDescription(vaultRecallAction),
  "Find what your notes already say about the current idea."
);

const connectNoteAction = NOTE_ACTIONS.find(
  (action) => action.id === "connect-note"
);
assert.ok(connectNoteAction);
assert.equal(getSuggestionTitle(connectNoteAction), "Note Connections");
assert.equal(
  getActionDescription(connectNoteAction),
  "Find notes that connect to the active note."
);

const improveDraftAction = NOTE_ACTIONS.find(
  (action) => action.id === "improve-draft"
);
assert.ok(improveDraftAction);
assert.equal(getSuggestionTitle(improveDraftAction), "Draft Preview");
assert.equal(
  getActionDescription(improveDraftAction),
  "Draft a clearer version through preview/diff."
);

const improveAction = SELECTED_TEXT_ACTIONS.find(
  (action) => action.kind === "improve-selection"
);
assert.ok(improveAction);
assert.equal(getNoteActionId(improveAction), "improve-selection");

console.log("noteActions tests passed");
