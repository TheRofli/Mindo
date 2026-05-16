import assert from "node:assert/strict";
import { MessageSendController } from "../src/views/controllers/MessageSendController";
import {
  DEFAULT_SETTINGS,
  type ChatMessage,
  type ContexSettings,
  type LlmRequestContext,
  type VaultSearchResult,
  type WebSearchResult
} from "../src/types";

function createController() {
  const messages: ChatMessage[] = [];
  const renders: string[] = [];
  const statuses: string[] = [];
  const loading: boolean[] = [];
  const errors: Array<string | null> = [];
  const remembered: Array<{ query: string; results: VaultSearchResult[] }> = [];
  const wikiRecords: Array<{
    userText: string;
    assistantText: string;
    sourcePaths?: string[];
    webSources?: WebSearchResult[];
  }> = [];
  const inlineDiffs: string[] = [];
  const streamingIds: Array<string | null> = [];
  const pending: Array<{ id: string | null; prompt: string | null }> = [];
  let inputValue = "hello";
  let activeAbortController: AbortController | null = null;

  const settings: ContexSettings = {
    ...DEFAULT_SETTINGS,
    model: "test-model"
  };
  const vaultResult: VaultSearchResult = {
    path: "Notes/Source.md",
    title: "Source",
    score: 10,
    snippet: "source text"
  };
  const webResult: WebSearchResult = {
    title: "Fresh source",
    url: "https://example.com",
    snippet: "fresh"
  };

  const controller = new MessageSendController({
    settings,
    getMessages: () => messages,
    clearInput: () => {
      inputValue = "";
    },
    setPendingUserMessage: (id, prompt) => {
      pending.push({ id, prompt });
    },
    setStreamingMessageId: (id) => streamingIds.push(id),
    setActiveGenerationAbortController: (controller) => {
      activeAbortController = controller;
    },
    getActiveGenerationAbortController: () => activeAbortController,
    attachProjectMemoryContext: async (context) => ({
      ...(context ?? {}),
      projectMemory: "project memory"
    }),
    buildAutoWebContextForRequest: async () => ({
      reason: "freshness",
      query: "fresh query",
      results: [webResult],
      provider: "DuckDuckGo direct"
    }),
    setLoading: (value) => loading.push(value),
    setStatus: (value) => statuses.push(value),
    setError: (value) => errors.push(value),
    renderMessages: () => renders.push("render"),
    queueRenderMessages: () => renders.push("queue"),
    runAssistantResponse: async ({ assistantMessage, speechQueue }) => {
      assistantMessage.content = "assistant answer";
      speechQueue?.pushToken("assistant answer");
    },
    createLiveStreamingSpeechQueue: () => null,
    playLiveDialogueAcknowledgement: async () => undefined,
    finishSpeaking: () => undefined,
    stopSpeaking: () => undefined,
    removeEmptyAssistantMessages: () => undefined,
    rememberVaultSearch: (query, results) =>
      remembered.push({ query, results }),
    recordWikiAutopilotMemory: async (record) => {
      wikiRecords.push(record);
    },
    getDiffSourceContent: async () => "before before after",
    showInlineDiffForMessage: async (id) => {
      inlineDiffs.push(id);
    },
    cleanReplacement: (text) => text.trim(),
    getUniqueOccurrenceIndex: () => 1,
    isGenerationCanceledError: (error) =>
      error instanceof Error && error.message === "cancel",
    isLiveDialogueSessionActive: () => false,
    startLiveDialogueListening: async () => undefined,
    continueLiveDialogueWithMessage: async () => undefined,
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error)
  });

  return {
    controller,
    messages,
    renders,
    statuses,
    loading,
    errors,
    remembered,
    wikiRecords,
    inlineDiffs,
    streamingIds,
    pending,
    get inputValue() {
      return inputValue;
    },
    vaultResult,
    webResult
  };
}

{
  const state = createController();
  const requestContext: LlmRequestContext = {
    vaultResults: [state.vaultResult]
  };

  await state.controller.send("hello", requestContext, true);

  assert.equal(state.inputValue, "");
  assert.equal(state.messages.length, 2);
  assert.equal(state.messages[0].role, "user");
  assert.equal(state.messages[0].content, "hello");
  assert.equal(state.messages[1].role, "assistant");
  assert.equal(state.messages[1].content, "assistant answer");
  assert.deepEqual(state.messages[1].sources, [state.vaultResult]);
  assert.deepEqual(state.messages[1].webSources, [state.webResult]);
  assert.deepEqual(state.remembered, [
    { query: "hello", results: [state.vaultResult] }
  ]);
  assert.deepEqual(state.wikiRecords, [
    {
      userText: "hello",
      assistantText: "assistant answer",
      sourcePaths: [state.vaultResult.path],
      webSources: [state.webResult]
    }
  ]);
  assert.deepEqual(state.loading, [true, false]);
  assert.equal(state.statuses.at(-1), "Status: Ready");
  assert.equal(state.streamingIds.at(-1), null);
  assert.deepEqual(state.pending.at(-1), { id: null, prompt: null });
}

{
  const state = createController();

  await state.controller.send("improve this", {
    selectedText: {
      path: "Notes/Source.md",
      name: "Source",
      text: "before",
      isTruncated: false,
      originalLength: 6,
      includedLength: 6
    }
  }, true, {
    diffPreviewOriginal: "before",
    diffPreviewTitle: "Improve preview",
    diffOperationType: "improve-selection",
    diffUserPrompt: "make better"
  });

  const assistant = state.messages[1];
  assert.equal(assistant.diffPreview?.title, "Improve preview");
  assert.equal(assistant.diffPreview?.sourcePath, "Notes/Source.md");
  assert.equal(assistant.diffPreview?.originalOccurrenceIndex, 1);
  assert.equal(assistant.diffPreview?.suggested, "assistant answer");
  assert.equal(assistant.diffPreview?.status, "pending");
  assert.deepEqual(state.inlineDiffs, [assistant.id]);
}

console.log("messageSendController tests passed");
