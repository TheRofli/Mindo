import assert from "node:assert/strict";
import { LiveTranscriptDraftController } from "../src/views/controllers/LiveTranscriptDraftController";

class FakeTextArea {
  value = "";
  scrollTop = 0;
  scrollHeight = 120;
}

let refreshes = 0;
const controller = new LiveTranscriptDraftController({
  refreshLiveDialogueSurface: () => {
    refreshes += 1;
  }
});

const inputEl = new FakeTextArea();
inputEl.value = " existing prompt ";

assert.equal(controller.begin(inputEl as unknown as HTMLTextAreaElement), true);
assert.equal(controller.getBaseText(), "existing prompt");
assert.equal(controller.getLastPreview(), "existing prompt");

assert.equal(
  controller.update(
    inputEl as unknown as HTMLTextAreaElement,
    "final words",
    "interim words"
  ),
  true
);
assert.equal(inputEl.value, "existing prompt final words");
assert.equal(inputEl.scrollTop, 120);
assert.equal(controller.getLastPreview(), "existing prompt final words");
assert.equal(refreshes, 1);

assert.equal(
  controller.update(inputEl as unknown as HTMLTextAreaElement, "", ""),
  true
);
assert.equal(inputEl.value, "existing prompt");

inputEl.value = "changed manually";
controller.restore(inputEl as unknown as HTMLTextAreaElement);
assert.equal(inputEl.value, "existing prompt");

controller.clear();
assert.equal(controller.getBaseText(), "");
assert.equal(controller.getLastPreview(), "");

assert.equal(controller.begin(null), false);

console.log("liveTranscriptDraftController tests passed");
