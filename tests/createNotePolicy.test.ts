import assert from "node:assert/strict";
import { classifyActionPermission } from "../src/actions/permissions";

assert.equal(
  classifyActionPermission({
    id: "create",
    kind: "create_note",
    path: "Obsidian/Plan.md",
    contentPrompt: "Create plan"
  }).mode,
  "immediate"
);

console.log("createNotePolicy tests passed");
