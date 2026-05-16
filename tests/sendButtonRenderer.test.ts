import assert from "node:assert/strict";
import {
  getSendButtonViewState,
  THINKING_DOT_COUNT
} from "../src/views/sendButtonRenderer";

assert.equal(THINKING_DOT_COUNT, 3);

assert.deepEqual(
  getSendButtonViewState({
    isLoading: false,
    isRecording: false,
    isTranscribingVoice: false
  }),
  {
    disabled: false,
    isLoading: false,
    icon: "arrow-up",
    ariaLabel: "Send"
  }
);

assert.deepEqual(
  getSendButtonViewState({
    isLoading: false,
    isRecording: true,
    isTranscribingVoice: false
  }),
  {
    disabled: false,
    isLoading: false,
    icon: "arrow-up",
    ariaLabel: "Send voice message"
  }
);

assert.deepEqual(
  getSendButtonViewState({
    isLoading: true,
    isRecording: false,
    isTranscribingVoice: false
  }),
  {
    disabled: false,
    isLoading: true,
    icon: null,
    ariaLabel: "Cancel response"
  }
);

assert.deepEqual(
  getSendButtonViewState({
    isLoading: true,
    isRecording: true,
    isTranscribingVoice: true
  }),
  {
    disabled: true,
    isLoading: true,
    icon: null,
    ariaLabel: "Transcribing voice"
  }
);

console.log("sendButtonRenderer tests passed");
