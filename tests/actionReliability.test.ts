import assert from "node:assert/strict";
import { executeContexActionPlan } from "../src/actions/actionExecutor";
import {
  appendAutomaticWikiFollowUp,
  summarizeActionReliability
} from "../src/actions/actionReliability";
import type { ContexActionPlan } from "../src/actions/actionTypes";

const plan: ContexActionPlan = {
  id: "plan-reliability",
  source: "chat",
  userText: "Open Test and replace old with new",
  actions: [
    {
      id: "open-1",
      kind: "open_note",
      query: "Test/Test.md"
    },
    {
      id: "replace-1",
      kind: "replace_text",
      replacements: [{ original: "old", suggested: "new" }]
    }
  ]
};

const receipts = await executeContexActionPlan(plan, {
  openNote: async () => "Test/Test.md"
});

assert.equal(receipts[0].status, "opened");
assert.equal(receipts[1].status, "failed");
assert.match(receipts[1].error ?? "", /Missing executor/);

const reliability = summarizeActionReliability(plan, receipts);

assert.equal(reliability.isComplete, true);
assert.equal(reliability.failedActionIds.join(","), "replace-1");
assert.equal(reliability.missingReceiptActionIds.length, 0);
assert.equal(reliability.canClaimSuccess, false);

const wikiPlan = appendAutomaticWikiFollowUp(
  {
    id: "plan-create",
    source: "chat",
    userText: "Create a researched note about Contex voice flow",
    actions: [
      {
        id: "create-1",
        kind: "research_note",
        contentPrompt: "Create a researched note about Contex voice flow",
        requireWeb: true
      }
    ]
  },
  [
    {
      actionId: "create-1",
      kind: "research_note",
      status: "saved",
      label: "Created note",
      path: "Obsidian/Voice Flow.md"
    }
  ]
);

assert.equal(wikiPlan.actions.at(-1)?.kind, "update_wiki");
assert.equal(wikiPlan.actions.at(-1)?.reason, "automatic_memory_candidate");

console.log("actionReliability tests passed");
