import assert from "node:assert/strict";
import { executeContexActionPlan } from "../src/actions/actionExecutor";
import type { ContexActionPlan } from "../src/actions/actionTypes";

const opened: string[] = [];
const created: string[] = [];

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
  }
});

assert.deepEqual(opened, ["Test/Test.md"]);
assert.deepEqual(created, ["Obsidian/Plan.md"]);
assert.equal(receipts[0].status, "opened");
assert.equal(receipts[1].status, "saved");

console.log("actionExecutor tests passed");
