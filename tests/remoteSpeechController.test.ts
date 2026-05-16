import assert from "node:assert/strict";
import { RemoteSpeechController } from "../src/views/controllers/RemoteSpeechController";
import type { ContexSettings } from "../src/types";
import { DEFAULT_SETTINGS } from "../src/types";

function createSettings(
  overrides: Partial<ContexSettings> = {}
): ContexSettings {
  return {
    ...DEFAULT_SETTINGS,
    ttsProvider: "silero",
    sileroVoice: "baya",
    sileroPronunciationDictionary: {
      contex: "контекс"
    },
    ...overrides
  };
}

const calls: string[] = [];
let settings = createSettings();
let speakingMessageId: string | null = "message-1";
let status = "";
let errorMessage: string | null = null;

const controller = new RemoteSpeechController({
  getSettings: () => settings,
  getSpeakingMessageId: () => speakingMessageId,
  requestKokoroSpeechAudio: async (text) => {
    calls.push(`kokoro:${text}`);
    return new Blob([text], { type: "audio/wav" });
  },
  requestSileroSpeechAudio: async (text) => {
    calls.push(`silero:${text}`);
    return new Blob([text], { type: "audio/wav" });
  },
  playSpeechAudio: (audio, messageId) => {
    calls.push(`play:${messageId}:${audio.size}`);
  },
  speakWithBrowser: (text, messageId) => {
    calls.push(`browser:${messageId}:${text}`);
  },
  stopSpeaking: () => {
    speakingMessageId = null;
    calls.push("stop");
  },
  setStatus: (nextStatus) => {
    status = nextStatus;
  },
  setError: (message) => {
    errorMessage = message;
  },
  renderMessages: () => {
    calls.push("render");
  },
  notify: (message) => {
    calls.push(`notice:${message}`);
  },
  warn: (_label, message) => {
    calls.push(`warn:${message}`);
  },
  getErrorMessage: (error) =>
    error instanceof Error ? error.message : String(error)
});

await controller.speakWithRemoteProvider("Contex работает.", "message-1");
assert.deepEqual(calls.splice(0).map((call) => call.replace(/:\d+$/, "")), [
  "silero:контекс работает.",
  "play:message-1"
]);
assert.equal(status, "Status: Reading with Silero");

settings = createSettings();
speakingMessageId = "message-2";
await controller.speakWithRemoteProvider(
  "This answer is mostly English and should use Kokoro.",
  "message-2"
);
assert.deepEqual(calls.splice(0), [
  "kokoro:This answer is mostly English and should use Kokoro.",
  "play:message-2:52"
]);
assert.equal(status, "Status: Reading English with Kokoro");

settings = createSettings({
  fallbackToBrowserTts: true
});
speakingMessageId = "message-3";
const fallbackController = new RemoteSpeechController({
  ...controller.deps,
  requestSileroSpeechAudio: async () => {
    throw new Error("silero unavailable");
  }
});
await fallbackController.speakWithRemoteProvider("Привет.", "message-3");
assert.deepEqual(calls.splice(0), [
  "warn:silero unavailable",
  "notice:Silero TTS is unavailable. Falling back to Browser TTS.",
  "browser:message-3:Привет."
]);
assert.equal(status, "Status: Reading with Browser TTS");
assert.equal(errorMessage, null);

settings = createSettings({
  fallbackToBrowserTts: false
});
speakingMessageId = "message-4";
await fallbackController.speakWithRemoteProvider("Привет.", "message-4");
assert.deepEqual(calls.splice(0), ["warn:silero unavailable", "stop", "render"]);
assert.equal(status, "Status: Silero unavailable");
assert.equal(errorMessage, "silero unavailable");

await assert.rejects(
  () => controller.requestRemoteSpeechAudio("   "),
  /TTS chunk is empty/
);

console.log("remoteSpeechController tests passed");
