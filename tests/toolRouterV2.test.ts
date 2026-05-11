import assert from "node:assert/strict";
import {
  parseToolRouterResponse,
  routerCommandsToActionPlan
} from "../src/router/toolRouterV2";

const parsed = parseToolRouterResponse(
  JSON.stringify({
    actions: [
      {
        action: "open_file",
        query: "Test/Test.md"
      },
      {
        action: "replace_text",
        replacements: [
          {
            original: "old",
            suggested: "new"
          }
        ]
      }
    ]
  })
);

assert.equal(parsed.length, 2);

const plan = routerCommandsToActionPlan({
  source: "voice",
  userText: "open and replace",
  commands: parsed
});

assert.equal(plan.actions[0].kind, "open_note");
assert.equal(plan.actions[1].kind, "replace_text");

const corrected = parseToolRouterResponse(
  JSON.stringify({
    action: "create_note",
    query: "create a note in Obsidian about Contex"
  })
);

assert.equal(corrected[0].action, "create_note");

console.log("toolRouterV2 tests passed");
