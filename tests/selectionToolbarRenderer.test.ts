import assert from "node:assert/strict";
import { getSelectionToolbarActionRoute } from "../src/views/selectionToolbarRenderer";
import type { NoteAction } from "../src/views/noteActions";

const improveAction: NoteAction = {
  label: "Improve selection",
  prompt: "Improve it",
  kind: "improve-selection"
};

assert.deepEqual(getSelectionToolbarActionRoute(improveAction), {
  kind: "diff",
  action: improveAction,
  title: "Improve selection preview",
  operationType: "improve-selection"
});

const expandAction: NoteAction = {
  label: "Expand selection",
  prompt: "Expand it",
  kind: "expand-selection"
};

assert.deepEqual(getSelectionToolbarActionRoute(expandAction), {
  kind: "diff",
  action: expandAction,
  title: "Expand selection preview",
  operationType: "expand-selection"
});

const createNoteAction: NoteAction = {
  label: "Create note from selection",
  prompt: "Create note",
  kind: "create-note"
};

assert.deepEqual(getSelectionToolbarActionRoute(createNoteAction), {
  kind: "create-note",
  action: createNoteAction
});

const explainAction: NoteAction = {
  label: "Explain selection",
  prompt: "Explain it"
};

assert.deepEqual(getSelectionToolbarActionRoute(explainAction), {
  kind: "prompt",
  prompt: "Explain it"
});

console.log("selectionToolbarRenderer tests passed");
