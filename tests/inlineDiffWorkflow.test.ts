import assert from "node:assert/strict";
import {
  buildInlineDiffWorkflowState,
  getInlineDiffActionButtons
} from "../src/editor/inlineDiffWorkflow";
import type { TextDiffPreview } from "../src/types";

const preview: TextDiffPreview = {
  title: "Improve selection preview",
  sourcePath: "Test/Test.md",
  operationType: "replace-text",
  original: "Old text",
  suggested: "New text",
  status: "pending"
};

assert.deepEqual(
  getInlineDiffActionButtons("pending").map((button) => button.action),
  ["accept", "change", "reject"]
);
assert.deepEqual(
  getInlineDiffActionButtons("applied").map((button) => button.action),
  ["undo"]
);
assert.equal(getInlineDiffActionButtons("rejected").length, 0);

const state = buildInlineDiffWorkflowState(preview);

assert.equal(state.path, "Test/Test.md");
assert.equal(state.canApply, true);
assert.equal(state.canUndo, false);
assert.equal(state.buttons[0].label, "Accept");

const appliedState = buildInlineDiffWorkflowState({
  ...preview,
  status: "applied",
  historyOperationId: "hist-1"
});

assert.equal(appliedState.canApply, false);
assert.equal(appliedState.canUndo, true);
assert.equal(appliedState.buttons[0].label, "Undo");

console.log("inlineDiffWorkflow tests passed");
