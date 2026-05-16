import assert from "node:assert/strict";
import {
  getLiveDialogueButtonViewState,
  getMicButtonViewState
} from "../src/views/voiceButtonsRenderer";

assert.deepEqual(
  getMicButtonViewState({
    isRecording: false,
    recordVoiceLabel: "Record voice",
    stopRecordingLabel: "Stop recording"
  }),
  {
    icon: "mic",
    className: "is-recording",
    isClassActive: false,
    ariaLabel: "Record voice"
  }
);

assert.deepEqual(
  getMicButtonViewState({
    isRecording: true,
    recordVoiceLabel: "Record voice",
    stopRecordingLabel: "Stop recording"
  }),
  {
    icon: "square",
    className: "is-recording",
    isClassActive: true,
    ariaLabel: "Stop recording"
  }
);

assert.deepEqual(
  getLiveDialogueButtonViewState({
    isLiveDialogueSessionActive: false,
    isRecording: false,
    startLiveDialogueLabel: "Start live dialogue",
    stopLiveDialogueLabel: "Stop live dialogue",
    sendLiveDialogueTurnLabel: "Send live dialogue turn"
  }),
  {
    icon: "mindo",
    className: "is-live-dialogue-active",
    isClassActive: false,
    ariaLabel: "Start live dialogue"
  }
);

assert.deepEqual(
  getLiveDialogueButtonViewState({
    isLiveDialogueSessionActive: true,
    isRecording: true,
    startLiveDialogueLabel: "Start live dialogue",
    stopLiveDialogueLabel: "Stop live dialogue",
    sendLiveDialogueTurnLabel: "Send live dialogue turn"
  }),
  {
    icon: "mindo",
    className: "is-live-dialogue-active",
    isClassActive: true,
    ariaLabel: "Send live dialogue turn"
  }
);

console.log("voiceButtonsRenderer tests passed");
