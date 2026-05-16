import assert from "node:assert/strict";
import { executeContexActionPlan } from "../src/actions/actionExecutor";
import type { ContexActionPlan } from "../src/actions/actionTypes";

const opened: string[] = [];
const created: string[] = [];
const updated: string[] = [];

const plan: ContexActionPlan = {
  id: "p1",
  source: "chat",
  userText: "open and create",
  actions: [
    {
      id: "a1",
      kind: "open_note",
      query: "Test/Test.md"
    },
    {
      id: "a2",
      kind: "create_note",
      path: "Obsidian/Plan.md",
      contentPrompt: "Create plan"
    },
    {
      id: "a3",
      kind: "update_note",
      sourcePath: "Obsidian/Plan.md",
      query: "refresh current note"
    }
  ]
};

const receipts = await executeContexActionPlan(plan, {
  openNote: async (query) => {
    opened.push(query);
    return "Test/Test.md";
  },
  createNote: async (action) => {
    created.push(action.path ?? "");
    return action.path ?? "Untitled.md";
  },
  updateNote: async (action) => {
    updated.push(action.sourcePath ?? "");
    return action.sourcePath ?? null;
  }
});

assert.deepEqual(opened, ["Test/Test.md"]);
assert.deepEqual(created, ["Obsidian/Plan.md"]);
assert.deepEqual(updated, ["Obsidian/Plan.md"]);
assert.equal(receipts[0].status, "opened");
assert.equal(receipts[1].status, "saved");
assert.equal(receipts[2].status, "preview");
assert.equal(receipts[2].path, "Obsidian/Plan.md");

console.log("actionExecutor tests passed");
