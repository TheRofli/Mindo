import assert from "node:assert/strict";
import { VoiceUiController } from "../src/views/controllers/VoiceUiController";
import type { ChatMessage } from "../src/types";

const micButton = {} as HTMLButtonElement;
const liveButton = {} as HTMLButtonElement;
const rootEl = {} as HTMLElement;
const surfaceEl = {} as HTMLElement;
const transcriptEl = {} as HTMLElement;
const orbEl = {} as HTMLButtonElement;
const phaseEl = {} as HTMLElement;

const messages: ChatMessage[] = [
  {
    id: "a1",
    role: "assistant",
    content: "Sure, I can help.",
    createdAt: 1
  },
  {
    id: "u1",
    role: "user",
    content: "Open the note.",
    createdAt: 2
  }
];

{
  const calls: string[] = [];
  const controller = new VoiceUiController({
    getElements: () => ({
      micButtonEl: micButton,
      liveDialogueButtonEl: liveButton,
      rootEl,
      surfaceEl,
      transcriptEl,
      orbEl,
      phaseEl
    }),
    getState: () => ({
      isRecording: true,
      isLiveDialogueSessionActive: true,
      isLoading: false,
      isTranscribingVoice: false,
      speakingMessageId: null,
      streamingMessageId: null,
      messages,
      inputValue: "Open the active note"
    }),
    t: (key) =>
      ({
        recordVoice: "Record voice",
        stopRecording: "Stop recording",
        startLiveDialogue: "Start live dialogue",
        stopLiveDialogue: "Stop live dialogue",
        sendLiveDialogueTurn: "Send live turn"
      })[key] ?? key,
    refreshMicButton: (buttonEl, state) => {
      calls.push(`mic:${buttonEl === micButton}:${state.isRecording}`);
    },
    refreshLiveDialogueButton: (buttonEl, state) => {
      calls.push(
        `live:${buttonEl === liveButton}:${state.isLiveDialogueSessionActive}:${state.isRecording}`
      );
    },
    refreshSendButton: () => {
      calls.push("send");
    },
    renderLiveDialogueSurface: ({ elements, state, labels, isSessionActive }) => {
      assert.equal(elements.rootEl, rootEl);
      assert.equal(state.phase, "listening");
      assert.equal(state.showVoiceSurface, true);
      assert.equal(labels.assistantLabel, "Mindo");
      assert.equal(labels.userLabel, "You");
      assert.equal(isSessionActive, true);
      calls.push("surface");
    }
  });

  controller.updateMicButton();

  assert.deepEqual(calls, [
    "mic:true:true",
    "live:true:true:true",
    "surface",
    "send"
  ]);
}

{
  const calls: string[] = [];
  const controller = new VoiceUiController({
    getElements: () => ({
      micButtonEl: null,
      liveDialogueButtonEl: liveButton,
      rootEl: null,
      surfaceEl: null,
      transcriptEl: null,
      orbEl: null,
      phaseEl: null
    }),
    getState: () => ({
      isRecording: false,
      isLiveDialogueSessionActive: true,
      isLoading: true,
      isTranscribingVoice: false,
      speakingMessageId: "a1",
      streamingMessageId: "a1",
      messages,
      inputValue: ""
    }),
    t: (key) => key,
    refreshMicButton: () => calls.push("mic"),
    refreshLiveDialogueButton: (buttonEl, state) => {
      assert.equal(buttonEl, liveButton);
      assert.equal(state.isLiveDialogueSessionActive, true);
      calls.push("live");
    },
    refreshSendButton: () => calls.push("send"),
    renderLiveDialogueSurface: ({ state }) => {
      assert.equal(state.phase, "speaking");
      calls.push("surface");
    }
  });

  controller.updateLiveDialogueButton();

  assert.deepEqual(calls, ["live", "surface"]);
}

console.log("voiceUiController tests passed");
