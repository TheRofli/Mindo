import assert from "node:assert/strict";
import { LiveBargeInSpeechController } from "../src/views/controllers/LiveBargeInSpeechController";
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
const transcripts: string[] = [];
const controller = new LiveBargeInSpeechController();
assert.equal(
  controller.start({
    language: "ru-RU",
    recognitionConstructor: FakeRecognition,
    shouldRestart: () => false,
    onTranscript: (transcript) => transcripts.push(transcript)
  }),
  true
);

const recognition = FakeRecognition.instances[0]!;
assert.equal(recognition.continuous, true);
assert.equal(recognition.interimResults, true);
assert.equal(recognition.lang, "ru-RU");
assert.equal(recognition.starts, 1);
assert.equal(controller.isActive(), true);

recognition.onresult?.({
  resultIndex: 0,
  results: [{ isFinal: false, 0: { transcript: " wait " } }]
});
assert.deepEqual(transcripts, []);

recognition.onresult?.({
  resultIndex: 0,
  results: [
    { isFinal: false, 0: { transcript: " wait " } },
    { isFinal: true, 0: { transcript: " stop please " } },
    { isFinal: true, 0: { transcript: " open note " } }
  ]
});
assert.deepEqual(transcripts, ["stop please open note"]);

controller.stop();
assert.equal(recognition.stops, 1);
assert.equal(controller.isActive(), false);

FakeRecognition.instances = [];
let scheduled: (() => void) | null = null;
const restartController = new LiveBargeInSpeechController();
restartController.start({
  language: "en-US",
  recognitionConstructor: FakeRecognition,
  shouldRestart: () => true,
  onTranscript: () => undefined,
  scheduleRestart: (callback) => {
    scheduled = callback;
  }
});
FakeRecognition.instances[0]!.onend?.();
scheduled?.();
assert.equal(FakeRecognition.instances.length, 2);
assert.equal(FakeRecognition.instances[1]!.starts, 1);

let unavailableError: unknown = null;
const missingController = new LiveBargeInSpeechController();
assert.equal(
  missingController.start({
    language: "auto",
    recognitionConstructor: null,
    shouldRestart: () => false,
    onTranscript: () => undefined,
    onUnavailable: (error) => {
      unavailableError = error;
    }
  }),
  false
);
assert.equal(unavailableError, null);

console.log("liveBargeInSpeechController tests passed");
