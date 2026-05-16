import assert from "node:assert/strict";
import {
  LiveBargeInHandlerController,
  type LiveBargeInDecision,
  type LiveBargeInHandlerControllerDeps
} from "../src/views/controllers/LiveBargeInHandlerController";

function createDeps(
  overrides: Partial<LiveBargeInHandlerControllerDeps> = {}
): LiveBargeInHandlerControllerDeps {
  let handling = false;
  let lastHandledAt = 0;
  const events: string[] = [];

  return {
    getIsHandling: () => handling,
    setIsHandling: (value) => {
      handling = value;
      events.push(`handling:${value}`);
    },
    getLastHandledAt: () => lastHandledAt,
    setLastHandledAt: (value) => {
      lastHandledAt = value;
      events.push(`last:${value}`);
    },
    now: () => 1000,
    shouldRunSpeechMonitor: () => true,
    stopMonitor: () => {
      events.push("stopMonitor");
    },
    syncMonitor: () => {
      events.push("syncMonitor");
    },
    stopAcknowledgement: () => {
      events.push("stopAck");
    },
    setStatus: (status) => {
      events.push(`status:${status}`);
    },
    setContextDetail: (message) => {
      events.push(`detail:${message}`);
    },
    getIsLoading: () => false,
    getSpeakingMessageId: () => null,
    cancelCurrentGeneration: () => {
      events.push("cancelGeneration");
    },
    stopSpeaking: () => {
      events.push("stopSpeaking");
    },
    renderMessages: () => {
      events.push("renderMessages");
    },
    startLiveDialogueListening: async () => {
      events.push("startListening");
    },
    getAssistantText: () => "assistant text",
    getAcknowledgementText: () => "",
    resolveTranscript: (): LiveBargeInDecision => ({
      kind: "prompt",
      prompt: "новый вопрос"
    }),
    clearLiveTranscriptPreviewState: () => {
      events.push("clearPreview");
    },
    setInputValue: (value) => {
      events.push(`input:${value}`);
    },
    sendUserMessage: async () => {
      events.push("sendUserMessage");
    },
    trimPrompt: (value) => value,
    getEvents: () => events,
    ...overrides
  };
}

async function testVoiceDetectedCancelsLoadingAndStartsListening(): Promise<void> {
  const deps = createDeps({ getIsLoading: () => true });
  const controller = new LiveBargeInHandlerController(deps);

  await controller.handleVoiceDetected();

  assert.deepEqual(deps.getEvents?.(), [
    "handling:true",
    "last:1000",
    "stopMonitor",
    "stopAck",
    "status:Status: Interrupted",
    "detail:Live interruption: listening",
    "cancelGeneration",
    "startListening",
    "handling:false",
    "syncMonitor"
  ]);
}

async function testTranscriptPromptStopsSpeechAndSendsMessage(): Promise<void> {
  const deps = createDeps({
    getSpeakingMessageId: () => "assistant-1",
    trimPrompt: (value) => value.slice(0, 5)
  });
  const controller = new LiveBargeInHandlerController(deps);

  await controller.handleTranscript("подожди");

  assert.deepEqual(deps.getEvents?.(), [
    "handling:true",
    "last:1000",
    "stopMonitor",
    "status:Status: Interrupted",
    "detail:Live interruption: новый",
    "stopSpeaking",
    "renderMessages",
    "input:новый вопрос",
    "sendUserMessage",
    "handling:false",
    "syncMonitor"
  ]);
}

async function testTranscriptStopClearsPreviewWithoutSending(): Promise<void> {
  const deps = createDeps({
    resolveTranscript: () => ({ kind: "stop", prompt: "стоп" })
  });
  const controller = new LiveBargeInHandlerController(deps);

  await controller.handleTranscript("стоп");

  assert.deepEqual(deps.getEvents?.(), [
    "handling:true",
    "last:1000",
    "stopMonitor",
    "status:Status: Interrupted",
    "detail:Live interruption: стоп",
    "status:Status: Live Dialogue interrupted",
    "detail:Live interruption: stopped",
    "clearPreview",
    "handling:false",
    "syncMonitor"
  ]);
}

await testVoiceDetectedCancelsLoadingAndStartsListening();
await testTranscriptPromptStopsSpeechAndSendsMessage();
await testTranscriptStopClearsPreviewWithoutSending();

console.log("liveBargeInHandlerController tests passed");
