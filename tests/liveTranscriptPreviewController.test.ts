import assert from "node:assert/strict";
import { LiveTranscriptPreviewController } from "../src/views/controllers/LiveTranscriptPreviewController";
import type { SpeechRecognitionLike } from "../src/views/sidebarTypes";

class FakeRecognition implements SpeechRecognitionLike {
  static instances: FakeRecognition[] = [];

  continuous = false;
  interimResults = false;
  lang = "";
  onresult: SpeechRecognitionLike["onresult"] = null;
  onerror: SpeechRecognitionLike["onerror"] = null;
  onend: SpeechRecognitionLike["onend"] = null;
  starts = 0;
  stops = 0;
  aborts = 0;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start(): void {
    this.starts += 1;
  }

  stop(): void {
    this.stops += 1;
  }

  abort(): void {
    this.aborts += 1;
  }
}

FakeRecognition.instances = [];
const updates: Array<{ finalText: string; interimText: string }> = [];
const controller = new LiveTranscriptPreviewController();
assert.equal(
  controller.start({
    language: "ru-RU",
    recognitionConstructor: FakeRecognition,
    shouldRestart: () => false,
    onPreview: (update) => updates.push(update)
  }),
  true
);

const recognition = FakeRecognition.instances[0]!;
assert.equal(recognition.continuous, true);
assert.equal(recognition.interimResults, true);
assert.equal(recognition.lang, "ru-RU");
assert.equal(recognition.starts, 1);

recognition.onresult?.({
  resultIndex: 0,
  results: [
    { isFinal: false, 0: { transcript: "  привет " } },
    { isFinal: true, 0: { transcript: "мир" } }
  ]
});
assert.deepEqual(updates.at(-1), {
  finalText: "мир",
  interimText: "привет"
});

controller.stop();
assert.equal(recognition.stops, 1);
assert.equal(controller.isActive(), false);

FakeRecognition.instances = [];
let scheduled: (() => void) | null = null;
const restartController = new LiveTranscriptPreviewController();
restartController.start({
  language: "en-US",
  recognitionConstructor: FakeRecognition,
  shouldRestart: () => true,
  onPreview: () => undefined,
  scheduleRestart: (callback) => {
    scheduled = callback;
  }
});
FakeRecognition.instances[0]!.onend?.();
scheduled?.();
assert.equal(FakeRecognition.instances.length, 2);
assert.equal(FakeRecognition.instances[1]!.starts, 1);

const missingController = new LiveTranscriptPreviewController();
assert.equal(
  missingController.start({
    language: "auto",
    recognitionConstructor: null,
    shouldRestart: () => false,
    onPreview: () => undefined
  }),
  false
);

console.log("liveTranscriptPreviewController tests passed");
