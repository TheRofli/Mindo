import assert from "node:assert/strict";
import {
  LiveBargeInCoordinatorController,
  type LiveBargeInCoordinatorSpeechController
} from "../src/views/controllers/LiveBargeInCoordinatorController";
import type { SpeechRecognitionConstructor } from "../src/views/sidebarTypes";

class FakeSpeechController implements LiveBargeInCoordinatorSpeechController {
  active = false;
  startCalls = 0;
  stopCalls = 0;
  lastLanguage = "";
  lastRecognitionConstructor: SpeechRecognitionConstructor | null = null;

  start(options: Parameters<LiveBargeInCoordinatorSpeechController["start"]>[0]): boolean {
    this.startCalls += 1;
    this.active = true;
    this.lastLanguage = options.language;
    this.lastRecognitionConstructor = options.recognitionConstructor;
    return Boolean(options.recognitionConstructor);
  }

  stop(): void {
    this.stopCalls += 1;
    this.active = false;
  }

  isActive(): boolean {
    return this.active;
  }
}

const Recognition = class {} as SpeechRecognitionConstructor;
let now = 1000;
let state = {
  isLiveDialogueSessionActive: true,
  isRecording: false,
  isTranscribingVoice: false,
  isAssistantBusy: true,
  hasLiveAudioTrack: true
};
const speechController = new FakeSpeechController();
const events: string[] = [];
let transcripts: string[] = [];
let unavailableErrors: unknown[] = [];

const controller = new LiveBargeInCoordinatorController({
  getState: () => state,
  now: () => now,
  getLanguage: () => "ru-RU",
  getRecognitionConstructor: () => Recognition,
  speechController,
  startAudioMonitor: () => {
    events.push("start-audio");
  },
  stopAudioMonitor: () => {
    events.push("stop-audio");
  },
  onTranscript: (transcript) => {
    transcripts.push(transcript);
  },
  onUnavailable: (error) => {
    unavailableErrors.push(error);
  }
});

controller.sync();
assert.deepEqual(events, ["start-audio"]);
assert.equal(speechController.startCalls, 1);
assert.equal(speechController.lastLanguage, "ru-RU");
assert.equal(speechController.lastRecognitionConstructor, Recognition);
assert.equal(controller.shouldKeepAudioMonitor(), true);
assert.equal(controller.shouldRunSpeechMonitor(), true);

speechController.active = true;
controller.sync();
assert.equal(speechController.startCalls, 1);

state = {
  ...state,
  isAssistantBusy: false
};
controller.sync();
assert.deepEqual(events, ["start-audio", "start-audio", "start-audio"]);
assert.equal(speechController.stopCalls, 1);
assert.equal(controller.shouldRunSpeechMonitor(), false);

state = {
  ...state,
  isLiveDialogueSessionActive: false,
  hasLiveAudioTrack: false
};
controller.sync();
assert.deepEqual(events, [
  "start-audio",
  "start-audio",
  "start-audio",
  "stop-audio"
]);

speechController.active = false;
state = {
  isLiveDialogueSessionActive: true,
  isRecording: false,
  isTranscribingVoice: false,
  isAssistantBusy: true,
  hasLiveAudioTrack: true
};
controller.disableTemporarily(2000);
now = 3000;
controller.startSpeechMonitor();
assert.equal(speechController.startCalls, 1);
now = 4600;
controller.startSpeechMonitor();
assert.equal(speechController.startCalls, 2);

speechController.active = false;
let recognitionConstructor: SpeechRecognitionConstructor | null = null;
const missingRecognitionController = new LiveBargeInCoordinatorController({
  getState: () => state,
  now: () => now,
  getLanguage: () => "en-US",
  getRecognitionConstructor: () => recognitionConstructor,
  speechController,
  startAudioMonitor: () => undefined,
  stopAudioMonitor: () => undefined,
  onTranscript: (transcript) => {
    transcripts.push(transcript);
  },
  onUnavailable: (error) => {
    unavailableErrors.push(error);
  }
});

missingRecognitionController.startSpeechMonitor();
assert.equal(speechController.startCalls, 3);
assert.equal(missingRecognitionController.getDisabledUntil(), now + 2500);

transcripts = [];
unavailableErrors = [];
const transcriptController = new LiveBargeInCoordinatorController({
  getState: () => state,
  now: () => now,
  getLanguage: () => "en-US",
  getRecognitionConstructor: () => Recognition,
  speechController,
  startAudioMonitor: () => undefined,
  stopAudioMonitor: () => undefined,
  onTranscript: (transcript) => transcripts.push(transcript),
  onUnavailable: (error) => unavailableErrors.push(error)
});
speechController.active = false;
transcriptController.startSpeechMonitor();
const lastOptions = (speechController as FakeSpeechController)
  .lastRecognitionConstructor;
assert.equal(lastOptions, Recognition);

console.log("liveBargeInCoordinatorController tests passed");
