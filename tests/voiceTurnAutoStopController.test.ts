import assert from "node:assert/strict";
import { VoiceTurnAutoStopController } from "../src/views/controllers/VoiceTurnAutoStopController";

let now = 1_000;
const stopModes: string[] = [];
const controller = new VoiceTurnAutoStopController({
  now: () => now,
  stopRecording: (mode) => {
    stopModes.push(mode);
  }
});

assert.equal(
  controller.handleLevel(0.1, {
    isRecording: false,
    isLiveDialogueSessionActive: true,
    isLiveDialogueTurn: true,
    recordingStopMode: "insert",
    mediaRecorderState: "recording"
  }),
  false
);
assert.deepEqual(stopModes, []);

const activeState = {
  isRecording: true,
  isLiveDialogueSessionActive: true,
  isLiveDialogueTurn: true,
  recordingStopMode: "insert" as const,
  mediaRecorderState: "recording" as const
};

assert.equal(controller.handleLevel(0.1, activeState), false);
now = 1_240;
assert.equal(controller.handleLevel(0.1, activeState), false);
now = 1_520;
assert.equal(controller.handleLevel(0.1, activeState), false);
now = 1_900;
assert.equal(controller.handleLevel(0.01, activeState), false);
now = 6_200;
assert.equal(controller.handleLevel(0.01, activeState), true);
assert.deepEqual(stopModes, ["send"]);

controller.reset();
now = 10_000;
controller.handleLevel(0.1, { ...activeState, mediaRecorderState: "inactive" });
now = 10_300;
controller.handleLevel(0.1, { ...activeState, mediaRecorderState: "inactive" });
now = 10_700;
controller.handleLevel(0.1, { ...activeState, mediaRecorderState: "inactive" });
now = 15_500;
assert.equal(
  controller.handleLevel(0.01, { ...activeState, mediaRecorderState: "inactive" }),
  false
);
assert.deepEqual(stopModes, ["send"]);

console.log("voiceTurnAutoStopController tests passed");
