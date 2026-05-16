import assert from "node:assert/strict";
import { getLiveDialogueAcknowledgementKindForAction } from "../src/voice/liveDialogueActionKind";

assert.equal(
  getLiveDialogueAcknowledgementKindForAction({ kind: "open-file" }),
  "opening"
);

assert.equal(
  getLiveDialogueAcknowledgementKindForAction({ kind: "research-web" }),
  "researching"
);

assert.equal(
  getLiveDialogueAcknowledgementKindForAction({ kind: "replace-text" }),
  "editing"
);

assert.equal(
  getLiveDialogueAcknowledgementKindForAction({ kind: "stop-speaking" }),
  "thinking"
);

assert.equal(
  getLiveDialogueAcknowledgementKindForAction({
    kind: "action-plan",
    actions: [{ kind: "research-note" }, { kind: "open-file" }]
  }),
  "researching"
);

assert.equal(
  getLiveDialogueAcknowledgementKindForAction({
    kind: "action-plan",
    actions: []
  }),
  "thinking"
);

console.log("liveDialogueActionKind tests passed");
