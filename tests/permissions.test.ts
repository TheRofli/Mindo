import assert from "node:assert/strict";
import { classifyActionPermission } from "../src/actions/permissions";
import type { ContexAction } from "../src/actions/actionTypes";

const openAction: ContexAction = {
  id: "a",
  kind: "open_note",
  query: "Test/Test.md"
};

const createAction: ContexAction = {
  id: "b",
  kind: "create_note",
  contentPrompt: "Create note",
  path: "Obsidian/Plan.md"
};

const unsupportedAction: ContexAction = {
  id: "c",
  kind: "none",
  reason: "delete file request"
};

assert.equal(classifyActionPermission(openAction).mode, "immediate");
assert.equal(classifyActionPermission(createAction).mode, "immediate");
assert.equal(classifyActionPermission(unsupportedAction).mode, "unsupported");

console.log("permissions tests passed");
