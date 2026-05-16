import assert from "node:assert/strict";
import { TranscribedTextController } from "../src/views/controllers/TranscribedTextController";

function createInput(value = "") {
  return {
    value,
    focused: false,
    focus() {
      this.focused = true;
    }
  } as unknown as HTMLTextAreaElement & { focused: boolean };
}

{
  const inputEl = createInput("typed");
  let refreshed = 0;
  const controller = new TranscribedTextController({
    getInputEl: () => inputEl,
    getLiveTranscriptBaseText: () => "live base",
    getLiveTranscriptLastPreview: () => "live base final words",
    refreshLiveDialogueSurface: () => {
      refreshed += 1;
    },
    sendUserMessage: async () => undefined,
    setStatus: () => undefined,
    setContextDetail: () => undefined,
    clearLiveTranscriptPreviewState: () => undefined,
    startLiveDialogueListening: async () => undefined
  });

  assert.equal(controller.append("fallback words"), true);
  assert.equal(inputEl.value, "live base fallback words");
  assert.equal(inputEl.focused, true);
  assert.equal(refreshed, 1);
}

{
  const inputEl = createInput("typed");
  const controller = new TranscribedTextController({
    getInputEl: () => inputEl,
    getLiveTranscriptBaseText: () => "live base",
    getLiveTranscriptLastPreview: () => "live base final words",
    refreshLiveDialogueSurface: () => undefined,
    sendUserMessage: async () => undefined,
    setStatus: () => undefined,
    setContextDetail: () => undefined,
    clearLiveTranscriptPreviewState: () => undefined,
    startLiveDialogueListening: async () => undefined
  });

  assert.equal(controller.append(""), true);
  assert.equal(inputEl.value, "live base final words");
}

{
  const inputEl = createInput();
  const sentOptions: Array<{ liveDialogue?: boolean } | undefined> = [];
  const controller = new TranscribedTextController({
    getInputEl: () => inputEl,
    getLiveTranscriptBaseText: () => "start",
    getLiveTranscriptLastPreview: () => "",
    refreshLiveDialogueSurface: () => undefined,
    sendUserMessage: async (options) => {
      sentOptions.push(options);
    },
    setStatus: () => undefined,
    setContextDetail: () => undefined,
    clearLiveTranscriptPreviewState: () => undefined,
    startLiveDialogueListening: async () => undefined
  });

  await controller.send("continue", { liveDialogue: true });

  assert.equal(inputEl.value, "start continue");
  assert.deepEqual(sentOptions, [{ liveDialogue: true }]);
}

{
  const inputEl = createInput("stop");
  let status = "";
  let detail = "";
  let cleared = false;
  let restarted = false;
  let sent = false;
  const controller = new TranscribedTextController({
    getInputEl: () => inputEl,
    getLiveTranscriptBaseText: () => "",
    getLiveTranscriptLastPreview: () => "",
    refreshLiveDialogueSurface: () => undefined,
    sendUserMessage: async () => {
      sent = true;
    },
    setStatus: (value) => {
      status = value;
    },
    setContextDetail: (message) => {
      detail = message ?? "";
    },
    clearLiveTranscriptPreviewState: () => {
      cleared = true;
    },
    startLiveDialogueListening: async () => {
      restarted = true;
    }
  });

  await controller.send("stop", { liveDialogue: true });

  assert.equal(inputEl.value, "");
  assert.equal(status, "Status: Live Dialogue interrupted");
  assert.equal(detail, "Live interruption: stopped");
  assert.equal(cleared, true);
  assert.equal(restarted, true);
  assert.equal(sent, false);
}

console.log("transcribedTextController tests passed");
