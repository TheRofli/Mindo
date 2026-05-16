import assert from "node:assert/strict";
import { SpeechPlaybackLifecycleController } from "../src/views/controllers/SpeechPlaybackLifecycleController";

const events: string[] = [];
let speakingMessageId: string | null = "m1";
let queue: { cancel: () => void } | null = {
  cancel: () => events.push("cancel-queue")
};

const controller = new SpeechPlaybackLifecycleController({
  getSpeakingMessageId: () => speakingMessageId,
  setSpeakingMessageId: (messageId) => {
    speakingMessageId = messageId;
    events.push(`set-speaking:${messageId ?? "null"}`);
  },
  getStreamingQueue: () => queue,
  setStreamingQueue: (nextQueue) => {
    queue = nextQueue;
    events.push(`set-queue:${nextQueue ? "queue" : "null"}`);
  },
  stopAcknowledgement: () => events.push("stop-ack"),
  stopBrowserSpeech: () => events.push("stop-browser"),
  stopAudioPlayback: () => events.push("stop-audio"),
  finishAudioPlayback: () => events.push("finish-audio"),
  resolveCompletion: (messageId, completed) =>
    events.push(`resolve:${messageId}:${completed}`),
  setStatus: (status) => events.push(`status:${status}`),
  refreshSurface: () => events.push("refresh"),
  syncBargeInMonitor: () => events.push("sync"),
  renderMessages: () => events.push("render")
});

controller.stopSpeaking();
assert.deepEqual(events, [
  "stop-ack",
  "cancel-queue",
  "set-queue:null",
  "stop-browser",
  "stop-audio",
  "set-speaking:null",
  "status:Status: Ready",
  "resolve:m1:false",
  "refresh",
  "sync"
]);
assert.equal(speakingMessageId, null);
assert.equal(queue, null);

events.length = 0;
speakingMessageId = "m2";
queue = { cancel: () => events.push("cancel-queue") };
controller.finishSpeaking("other");
assert.deepEqual(events, []);
assert.equal(speakingMessageId, "m2");
assert.notEqual(queue, null);

controller.finishSpeaking("m2");
assert.deepEqual(events, [
  "finish-audio",
  "set-queue:null",
  "set-speaking:null",
  "status:Status: Ready",
  "resolve:m2:true",
  "refresh",
  "sync",
  "render"
]);

console.log("speechPlaybackLifecycleController tests passed");
