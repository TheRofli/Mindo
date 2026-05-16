import assert from "node:assert/strict";
import {
  buildLiveDialogueRoutingSystemPrompt,
  fallbackLiveDialogueRoute,
  parseLiveDialogueRouteDecision
} from "../src/voice/liveDialogueRouting";

const systemPrompt = buildLiveDialogueRoutingSystemPrompt();
assert.ok(systemPrompt.includes("Talk to your Vault"));
assert.ok(systemPrompt.includes("small current-note edits"));
assert.ok(systemPrompt.includes("cross-vault synthesis"));

assert.deepEqual(
  parseLiveDialogueRouteDecision(
    '```json\n{"route":"delegate_smart","confidence":0.82,"reason":"Needs cross-vault synthesis"}\n```'
  ),
  {
    route: "smart",
    confidence: 0.82,
    reason: "Needs cross-vault synthesis"
  }
);

assert.equal(parseLiveDialogueRouteDecision("sure, I can help")?.route, undefined);

const smallEdit = fallbackLiveDialogueRoute({
  userText: "Замени в текущей заметке слово Contex на Mindo."
});
assert.equal(smallEdit.route, "fast");
assert.ok(smallEdit.reason.includes("small current-note edit"));

const deepVaultTask = fallbackLiveDialogueRoute({
  userText: "Проанализируй все заметки проекта и собери подробный roadmap с рисками."
});
assert.equal(deepVaultTask.route, "smart");
assert.ok(deepVaultTask.reason.includes("cross-vault"));

console.log("liveDialogueRouting tests passed");
