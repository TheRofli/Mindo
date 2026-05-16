import assert from "node:assert/strict";

import {
  DEFAULT_SETTINGS,
  type ChatMessage,
  type LlmFileAttachment,
  type LlmRequestContext,
  type VaultSearchResult
} from "../src/types";
import { UserMessageSubmitController } from "../src/views/controllers/UserMessageSubmitController";

function createHarness() {
  const messages: ChatMessage[] = [];
  const statuses: string[] = [];
  const loading: boolean[] = [];
  const errors: Array<string | null> = [];
  const renders: string[] = [];
  const optimistic: ChatMessage[] = [];
  const sent: Array<{
    content: string;
    context: LlmRequestContext | null;
    clearInput: boolean;
    options?: { userMessageAlreadyAdded?: boolean; liveDialogue?: boolean };
  }> = [];
  const vaultSearches: string[] = [];
  const webSearches: string[] = [];
  const semanticQuestions: string[] = [];
  let inputValue = "hello";
  let loadingState = false;
  let pendingInterview = false;
  let attachedFiles: LlmFileAttachment[] = [];
  let attachedVaultResults: VaultSearchResult[] | null = null;
  let pendingUserMessage: { id: string | null; prompt: string | null } = {
    id: null,
    prompt: null
  };

  const controller = new UserMessageSubmitController({
    settings: {
      ...DEFAULT_SETTINGS,
      model: "test-model"
    },
    isLoading: () => loadingState,
    getInputValue: () => inputValue,
    clearInput: () => {
      inputValue = "";
    },
    hasPendingContexCodeInterview: () => pendingInterview,
    sendVaultSearch: async (query) => {
      vaultSearches.push(query);
    },
    sendWebResearch: async (query) => {
      webSearches.push(query);
    },
    sendSemanticVaultQuestion: async (query) => {
      semanticQuestions.push(query);
    },
    getAttachedFiles: () => attachedFiles,
    setAttachedFiles: (files) => {
      attachedFiles = files;
    },
    getAttachedVaultResults: () => attachedVaultResults,
    setAttachedVaultResults: (results) => {
      attachedVaultResults = results;
    },
    renderAttachedContext: () => {
      renders.push("attached");
    },
    getMessages: () => messages,
    createUserMessage: (content, index, attachments) => ({
      id: `user-${index}`,
      role: "user",
      content,
      createdAt: index,
      attachments
    }),
    pushMessage: (message) => {
      messages.push(message);
    },
    setPendingUserMessage: (id, prompt) => {
      pendingUserMessage = { id, prompt };
    },
    setError: (message) => errors.push(message),
    setStatus: (status) => statuses.push(status),
    setLoading: (value) => {
      loadingState = value;
      loading.push(value);
    },
    renderOptimisticUserMessage: (message) => {
      optimistic.push(message);
    },
    renderMessages: async () => {
      renders.push("messages");
    },
    handlePendingContexCodeInterviewAnswer: async () => false,
    handleLocalCommandText: async () => false,
    continueLiveDialogueAfterLocalAction: async () => undefined,
    hasActiveGenerationAbortController: () => false,
    setSuppressActionReceiptUserContent: () => undefined,
    useCurrentNote: () => false,
    useVaultSearch: () => false,
    readCurrentNoteContext: async () => ({ context: null }),
    expandSemanticVaultQuery: async () => [],
    searchSemanticVault: async () => [],
    sendMessage: async (content, context, clearInput, options) => {
      sent.push({ content, context, clearInput, options });
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error)
  });

  return {
    controller,
    messages,
    statuses,
    loading,
    errors,
    renders,
    optimistic,
    sent,
    vaultSearches,
    webSearches,
    semanticQuestions,
    get inputValue() {
      return inputValue;
    },
    set inputValue(value: string) {
      inputValue = value;
    },
    set pendingInterview(value: boolean) {
      pendingInterview = value;
    },
    get pendingUserMessage() {
      return pendingUserMessage;
    },
    set attachedFiles(value: LlmFileAttachment[]) {
      attachedFiles = value;
    },
    get attachedFiles() {
      return attachedFiles;
    },
    set attachedVaultResults(value: VaultSearchResult[] | null) {
      attachedVaultResults = value;
    },
    get attachedVaultResults() {
      return attachedVaultResults;
    }
  };
}

{
  const state = createHarness();

  await state.controller.sendUserMessage();

  assert.equal(state.inputValue, "");
  assert.equal(state.messages.length, 1);
  assert.equal(state.messages[0].content, "hello");
  assert.deepEqual(state.pendingUserMessage, {
    id: "user-0",
    prompt: "hello"
  });
  assert.deepEqual(state.errors, [null]);
  assert.equal(state.statuses[0], "Status: Preparing context");
  assert.deepEqual(state.loading, [true]);
  assert.deepEqual(state.optimistic.map((message) => message.id), ["user-0"]);
  assert.deepEqual(state.sent, [
    {
      content: "hello",
      context: null,
      clearInput: false,
      options: {
        userMessageAlreadyAdded: true,
        liveDialogue: undefined
      }
    }
  ]);
}

{
  const state = createHarness();
  state.inputValue = "/web latest local llm news";

  await state.controller.sendUserMessage();

  assert.deepEqual(state.webSearches, ["latest local llm news"]);
  assert.equal(state.messages.length, 0);
  assert.deepEqual(state.loading, []);
}

{
  const state = createHarness();
  state.attachedFiles = [
    {
      name: "brief.pdf",
      type: "application/pdf",
      size: 42,
      text: "brief"
    }
  ];

  await state.controller.sendUserMessage({ liveDialogue: true });

  assert.equal(state.messages[0].attachments?.[0]?.name, "brief.pdf");
  assert.deepEqual(state.sent[0], {
    content: "hello",
    context: {
      attachments: [
        {
          name: "brief.pdf",
          type: "application/pdf",
          size: 42,
          text: "brief"
        }
      ],
      liveDialogue: true
    },
    clearInput: false,
    options: {
      userMessageAlreadyAdded: true,
      liveDialogue: true
    }
  });
  assert.deepEqual(state.attachedFiles, []);
  assert.deepEqual(state.renders, ["messages", "attached"]);
}

console.log("userMessageSubmitController tests passed");
