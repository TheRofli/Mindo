import assert from "node:assert/strict";
import {
  getLiveDialogueRootClassNames,
  getLiveDialogueTranscriptRows
} from "../src/views/liveDialogueSurfaceRenderer";
import type { LiveDialogueSurfaceState } from "../src/voice/liveDialogueSurface";

const emptyThinkingState: LiveDialogueSurfaceState = {
  isActive: true,
  phase: "thinking",
  rootClass: "is-live-dialogue-surface-active is-live-dialogue-thinking",
  hideStandardWorkspace: true,
  showVoiceSurface: true,
  transcript: []
};

assert.deepEqual(getLiveDialogueRootClassNames(), [
  "is-live-dialogue-surface-active",
  "is-live-dialogue-idle",
  "is-live-dialogue-listening",
  "is-live-dialogue-thinking",
  "is-live-dialogue-speaking",
  "is-live-dialogue-transcribing"
]);

assert.deepEqual(
  getLiveDialogueTranscriptRows(emptyThinkingState, {
    assistantLabel: "Contex",
    userLabel: "You"
  }),
  [
    {
      role: "assistant",
      label: "Contex",
      text: "Thinking through your request.",
      variant: "status"
    }
  ]
);

const conversationState: LiveDialogueSurfaceState = {
  ...emptyThinkingState,
  phase: "listening",
  transcript: [
    { role: "assistant", text: "I can help with that.", variant: "message" },
    { role: "user", text: "Open the test note.", variant: "message" }
  ]
};

assert.deepEqual(
  getLiveDialogueTranscriptRows(conversationState, {
    assistantLabel: "Assistant",
    userLabel: "User"
  }),
  [
    {
      role: "assistant",
      label: "Assistant",
      text: "I can help with that.",
      variant: "message"
    },
    {
      role: "user",
      label: "User",
      text: "Open the test note.",
      variant: "message"
    }
  ]
);

console.log("liveDialogueSurfaceRenderer tests passed");
