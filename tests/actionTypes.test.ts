import assert from "node:assert/strict";
import type {
  ContexActionPlan,
  ContexActionReceipt
} from "../src/actions/actionTypes";

const plan: ContexActionPlan = {
  id: "plan-1",
  source: "voice",
  userText: "Open Test in folder Test",
  actions: [
    {
      id: "action-1",
      kind: "open_note",
      query: "Test/Test.md"
    }
  ]
};

const receipt: ContexActionReceipt = {
  actionId: "action-1",
  kind: "open_note",
  status: "opened",
  label: "Opened note",
  path: "Test/Test.md"
};

assert.equal(plan.actions[0].kind, receipt.kind);
assert.equal(receipt.status, "opened");

console.log("actionTypes tests passed");
