import assert from "node:assert/strict";
import { LiveDialogueSessionController } from "../src/views/controllers/LiveDialogueSessionController";
import type { ChatMessage } from "../src/types";

interface HarnessState {
  active: boolean;
  turn: boolean;
  recording: boolean;
  loading: boolean;
  transcribing: boolean;
  speakingMessageId: string | null;
  messages: ChatMessage[];
}

function createHarness(overrides: Partial<HarnessState> = {}) {
  const state: HarnessState = {
    active: false,
    turn: false,
    recording: false,
    loading: false,
    transcribing: false,
    speakingMessageId: null,
    messages: [],
    ...overrides
  };
  const calls: string[] = [];
  let inputStreamAvailable = true;

  const controller = new LiveDialogueSessionController({
    getState: () => ({
      isActive: state.active,
      isRecording: state.recording,
      isLoading: state.loading,
      isTranscribingVoice: state.transcribing,
      speakingMessageId: state.speakingMessageId,
      messages: state.messages
    }),
    setActive: (value) => {
      state.active = value;
      calls.push(`active:${value}`);
    },
    setTurn: (value) => {
      state.turn = value;
      calls.push(`turn:${value}`);
    },
    setError: (message) => calls.push(`error:${message ?? ""}`),
    setStatus: (message) => calls.push(`status:${message}`),
    updateLiveDialogueButton: () => calls.push("update-button"),
    ensureInputStream: async () => (inputStreamAvailable ? ({} as MediaStream) : null),
    warmAcknowledgements: () => calls.push("warm-ack"),
    warmAudioContext: () => calls.push("warm-audio"),
    syncBargeInMonitor: () => calls.push("sync-barge"),
    stopBargeInMonitor: () => calls.push("stop-barge"),
    stopBargeInAudioMonitor: () => calls.push("stop-barge-audio"),
    stopAcknowledgement: () => calls.push("stop-ack"),
    stopInputStream: () => calls.push("stop-input"),
    stopRecording: (mode) => calls.push(`stop-recording:${mode}`),
    cancelGeneration: () => {
      state.loading = false;
      calls.push("cancel-generation");
    },
    stopSpeaking: () => {
      state.speakingMessageId = null;
      calls.push("stop-speaking");
    },
    renderMessages: () => calls.push("render"),
    speakMessageAndWait: async (message) => calls.push(`speak:${message.content}`),
    startRecording: async () => {
      state.recording = true;
      calls.push("start-recording");
    },
    pushMessage: (message) => {
      state.messages.push(message);
      calls.push(`push:${message.role}`);
    },
    shouldInterruptSpeech: (active, speaking) => active && speaking,
    now: () => 1234
  });

  return {
    state,
    calls,
    controller,
    setInputStreamAvailable(value: boolean) {
      inputStreamAvailable = value;
    }
  };
}

async function run() {
  {
    const { controller, calls } = createHarness({
      active: true,
      recording: true
    });
    await controller.toggleTurn();
    assert.deepEqual(calls, ["stop-recording:send"]);
  }

  {
    const { controller, calls } = createHarness({
      active: true,
      speakingMessageId: "assistant-1"
    });
    await controller.toggleTurn();
    assert.ok(calls.includes("stop-speaking"));
    assert.ok(calls.includes("start-recording"));
  }

  {
    const { controller, calls } = createHarness({
      active: true,
      loading: true
    });
    await controller.toggleTurn();
    assert.ok(calls.includes("cancel-generation"));
    assert.ok(calls.includes("start-recording"));
  }

  {
    const { controller, calls, state } = createHarness({
      active: true
    });
    await controller.toggleTurn();
    assert.equal(state.active, false);
    assert.ok(calls.includes("stop-input"));
    assert.ok(calls.includes("status:Status: Live Dialogue stopped"));
  }

  {
    const { controller, calls, state } = createHarness();
    await controller.toggleTurn();
    assert.equal(state.active, true);
    assert.equal(state.messages.length, 1);
    assert.equal(state.messages[0].role, "assistant");
    assert.ok(calls.includes("warm-ack"));
    assert.ok(calls.includes("warm-audio"));
    assert.ok(calls.includes("start-recording"));
  }

  {
    const { controller, calls, state, setInputStreamAvailable } = createHarness();
    setInputStreamAvailable(false);
    await controller.startSession();
    assert.equal(state.active, false);
    assert.ok(calls.includes("status:Status: Voice unavailable"));
  }

  {
    const { controller, calls, state } = createHarness({
      active: true,
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          content: "A long answer",
          createdAt: 1
        }
      ]
    });
    await controller.continueAfterLocalAction();
    assert.equal(state.messages.at(-1)?.role, "assistant");
    assert.ok(calls.includes("render"));
    assert.ok(calls.some((call) => call.startsWith("speak:")));
  }
}

void run()
  .then(() => {
    console.log("liveDialogueSessionController tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
