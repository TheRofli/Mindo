import assert from "node:assert/strict";
import {
  getLiveDialogueFallbackText,
  getLiveDialogueLatestAssistantText,
  getLiveDialogueLatestUserText,
  getLiveDialogueOrbTitle,
  getLiveDialoguePhaseLabel,
  getLiveDialogueSurfaceState
} from "../src/voice/liveDialogueSurface";
import type { ChatMessage } from "../src/types";

assert.deepEqual(
  getLiveDialogueSurfaceState({
    isSessionActive: false,
    isRecording: false,
    isLoading: false,
    isTranscribing: false,
    isSpeaking: false,
    latestUserText: "",
    latestAssistantText: ""
  }),
  {
    isActive: false,
    phase: "idle",
    rootClass: "",
    hideStandardWorkspace: false,
    showVoiceSurface: false,
    transcript: []
  }
);

assert.deepEqual(
  getLiveDialogueSurfaceState({
    isSessionActive: true,
    isRecording: true,
    isLoading: false,
    isTranscribing: false,
    isSpeaking: false,
    latestUserText: "Open the test note",
    latestAssistantText: "Listening"
  }),
  {
    isActive: true,
    phase: "listening",
    rootClass: "is-live-dialogue-surface-active is-live-dialogue-listening",
    hideStandardWorkspace: true,
    showVoiceSurface: true,
    transcript: [
      { role: "assistant", text: "Listening" },
      { role: "user", text: "Open the test note" }
    ]
  }
);

assert.equal(
  getLiveDialogueSurfaceState({
    isSessionActive: true,
    isRecording: false,
    isLoading: true,
    isTranscribing: false,
    isSpeaking: false,
    latestUserText: "Summarize this",
    latestAssistantText: ""
  }).phase,
  "thinking"
);

assert.equal(
  getLiveDialogueSurfaceState({
    isSessionActive: true,
    isRecording: false,
    isLoading: false,
    isTranscribing: false,
    isSpeaking: true,
    latestUserText: "Summarize this",
    latestAssistantText: "Here is the short version."
  }).phase,
  "speaking"
);

const messages: ChatMessage[] = [
  {
    id: "user-1",
    role: "user",
    content: "Please open the roadmap",
    createdAt: 1
  },
  {
    id: "assistant-1",
    role: "assistant",
    content: "Opening it now.",
    createdAt: 2
  }
];

assert.equal(
  getLiveDialogueLatestUserText({
    messages,
    liveInput: "",
    isRecording: false
  }),
  "Please open the roadmap"
);
assert.equal(
  getLiveDialogueLatestAssistantText({
    messages,
    streamingMessageId: null
  }),
  "Opening it now."
);
assert.equal(getLiveDialoguePhaseLabel("thinking"), "Thinking");
assert.equal(getLiveDialogueFallbackText("speaking"), "Answering out loud.");
assert.equal(
  getLiveDialogueOrbTitle({
    phase: "idle",
    isSessionActive: true,
    startLabel: "Start",
    stopLabel: "Stop"
  }),
  "Stop"
);

console.log("liveDialogueSurface tests passed");
