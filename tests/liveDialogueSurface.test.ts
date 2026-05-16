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
    latestAssistantText: "",
    messages: [],
    liveInput: "",
    streamingMessageId: null
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
    latestAssistantText: "Listening",
    messages: [],
    liveInput: "",
    streamingMessageId: null
  }),
  {
    isActive: true,
    phase: "listening",
    rootClass: "is-live-dialogue-surface-active is-live-dialogue-listening",
    hideStandardWorkspace: true,
    showVoiceSurface: true,
    transcript: [
      { role: "assistant", text: "Listening", variant: "message" },
      { role: "user", text: "Open the test note", variant: "message" }
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
    latestAssistantText: "",
    messages: [],
    liveInput: "",
    streamingMessageId: null
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
    latestAssistantText: "Here is the short version.",
    messages: [],
    liveInput: "",
    streamingMessageId: null
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

const duplicatedMessages: ChatMessage[] = [
  {
    id: "assistant-greeting",
    role: "assistant",
    content: "Привет, я слушаю. Чем помочь?",
    createdAt: 1
  },
  {
    id: "user-duplicate-1",
    role: "user",
    content: "Кратко опиши текущий файл",
    createdAt: 2
  },
  {
    id: "user-duplicate-2",
    role: "user",
    content: "Кратко опиши текущий файл",
    createdAt: 3
  },
  {
    id: "assistant-question",
    role: "assistant",
    content: "Я могу описать структуру или смысл. Что важнее?",
    createdAt: 4
  }
];

assert.deepEqual(
  getLiveDialogueSurfaceState({
    isSessionActive: true,
    isRecording: false,
    isLoading: false,
    isTranscribing: false,
    isSpeaking: false,
    latestUserText: "",
    latestAssistantText: "",
    messages: duplicatedMessages,
    liveInput: "",
    streamingMessageId: null
  }).transcript,
  [
    {
      role: "assistant",
      text: "Привет, я слушаю. Чем помочь?",
      variant: "question"
    },
    {
      role: "user",
      text: "Кратко опиши текущий файл",
      variant: "message"
    },
    {
      role: "assistant",
      text: "Я могу описать структуру или смысл. Что важнее?",
      variant: "question"
    }
  ]
);

console.log("liveDialogueSurface tests passed");
