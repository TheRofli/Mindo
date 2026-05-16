import assert from "node:assert/strict";
import { GenerationCancelController } from "../src/views/controllers/GenerationCancelController";

const calls: string[] = [];
let isLoading = true;
let activeController: { abort: () => void } | null = {
  abort: () => calls.push("abort")
};
let streamingMessageId: string | null = "assistant-stream";
let pendingUserMessageId: string | null = "user-pending";
let pendingUserPrompt: string | null = "restore this prompt";
const inputEl = {
  disabled: true,
  value: "",
  focus: () => calls.push("focus")
};

const controller = new GenerationCancelController({
  isLoading: () => isLoading,
  getActiveGenerationAbortController: () => activeController,
  setActiveGenerationAbortController: (controller) => {
    activeController = controller;
    calls.push(`set-abort:${controller ? "controller" : "null"}`);
  },
  getStreamingMessageId: () => streamingMessageId,
  setStreamingMessageId: (messageId) => {
    streamingMessageId = messageId;
    calls.push(`set-stream:${messageId ?? "null"}`);
  },
  getPendingUserMessageId: () => pendingUserMessageId,
  setPendingUserMessageId: (messageId) => {
    pendingUserMessageId = messageId;
    calls.push(`set-pending-id:${messageId ?? "null"}`);
  },
  getPendingUserPrompt: () => pendingUserPrompt,
  setPendingUserPrompt: (prompt) => {
    pendingUserPrompt = prompt;
    calls.push(`set-pending-prompt:${prompt ?? "null"}`);
  },
  getInputEl: () => inputEl,
  stopSpeaking: () => calls.push("stop-speaking"),
  removeMessageById: (messageId) => calls.push(`remove:${messageId}`),
  setError: (message) => calls.push(`error:${message ?? "null"}`),
  setStatus: (status) => calls.push(`status:${status}`),
  setLoading: (value) => {
    isLoading = value;
    calls.push(`loading:${value}`);
  },
  renderMessages: () => calls.push("render")
});

assert.equal(controller.cancelCurrentGeneration(), true);
assert.equal(activeController, null);
assert.equal(streamingMessageId, null);
assert.equal(pendingUserMessageId, null);
assert.equal(pendingUserPrompt, null);
assert.equal(inputEl.disabled, false);
assert.equal(inputEl.value, "restore this prompt");
assert.deepEqual(calls, [
  "abort",
  "set-abort:null",
  "stop-speaking",
  "remove:assistant-stream",
  "set-stream:null",
  "remove:user-pending",
  "focus",
  "set-pending-id:null",
  "set-pending-prompt:null",
  "error:null",
  "status:Status: Canceled",
  "loading:false",
  "render"
]);

calls.length = 0;
inputEl.value = "";
isLoading = true;
activeController = null;
streamingMessageId = null;
pendingUserMessageId = "user-pending-2";
pendingUserPrompt = "do not restore";

assert.equal(
  controller.cancelCurrentGeneration({ restorePendingUser: false }),
  true
);
assert.equal(inputEl.value, "");
assert.deepEqual(calls, [
  "set-abort:null",
  "stop-speaking",
  "set-pending-id:null",
  "set-pending-prompt:null",
  "error:null",
  "status:Status: Canceled",
  "loading:false",
  "render"
]);

calls.length = 0;
isLoading = false;
activeController = null;
assert.equal(controller.cancelCurrentGeneration(), false);
assert.deepEqual(calls, []);

console.log("generationCancelController tests passed");
