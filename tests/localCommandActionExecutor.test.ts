import assert from "node:assert/strict";

import {
  LocalCommandActionExecutor,
  type LocalCommandActionExecutorHandlers
} from "../src/views/controllers/LocalCommandActionExecutor";
import type { LocalCommandAction } from "../src/views/sidebarTypes";
import type { SelectedTextContext } from "../src/types";

function createHandlers(
  overrides: Partial<LocalCommandActionExecutorHandlers> = {}
) {
  const events: string[] = [];
  let errorMessage = "";
  const selectedContext: SelectedTextContext = {
    path: "Test/Test.md",
    text: "Old text",
    isTruncated: false
  };

  const handlers: LocalCommandActionExecutorHandlers = {
    previewTextReplacement: async (commandText, replacement) => {
      events.push(
        `replace:${commandText}:${replacement.original}->${replacement.suggested}`
      );
    },
    previewMultiTextReplacement: async (commandText, replacements) => {
      events.push(`replace-multi:${commandText}:${replacements.length}`);
    },
    previewSelectionOrLineReplacement: async (commandText, suggested) => {
      events.push(`replace-selection:${commandText}:${suggested}`);
    },
    applyDiffPreview: async (messageId) => {
      events.push(`apply:${messageId}`);
    },
    rejectDiffPreview: (messageId) => {
      events.push(`reject:${messageId}`);
    },
    refineDiffPreview: async (messageId, instruction) => {
      events.push(`refine:${messageId}:${instruction}`);
    },
    undoDiffPreview: async (messageId) => {
      events.push(`undo:${messageId}`);
    },
    readSelectedTextContextForVoice: () => ({
      context: selectedContext,
      warning: "No selection"
    }),
    sendSelectedTextImprovement: async (context) => {
      events.push(`improve:${context.text}`);
    },
    openLastFoundFile: async (commandText) => {
      events.push(`open-last:${commandText ?? ""}`);
    },
    openFileByVaultQuery: async (query, commandText) => {
      events.push(`open:${query}:${commandText}`);
    },
    sendVaultSearch: async (query) => {
      events.push(`search:${query}`);
    },
    sendSemanticVaultQuestion: async (query) => {
      events.push(`semantic:${query}`);
    },
    sendWebResearch: async (query) => {
      events.push(`web:${query}`);
    },
    createResearchNote: async (commandText, displayText) => {
      events.push(`research-note:${commandText}:${displayText}`);
    },
    answerFromLastFoundFile: async (commandText) => {
      events.push(`summarize-last:${commandText}`);
    },
    attachLastFoundFiles: () => {
      events.push("attach-last");
    },
    createNote: async (commandText, displayText) => {
      events.push(`create-note:${commandText}:${displayText}`);
    },
    speakLatestAssistantMessage: async () => {
      events.push("speak-latest");
    },
    stopSpeaking: () => {
      events.push("stop-speaking");
    },
    rememberCurrentNote: async () => {
      events.push("remember-note");
    },
    createRoadmapFromCurrentNote: async () => {
      events.push("roadmap-note");
    },
    saveCurrentChatAsNote: async () => {
      events.push("chat-note");
    },
    updateCurrentNote: async (commandText) => {
      events.push(`update-note:${commandText}`);
    },
    setError: (message) => {
      errorMessage = message ?? "";
      events.push(`error:${message ?? "null"}`);
    },
    getErrorMessage: () => errorMessage,
    setStatus: (status) => {
      events.push(`status:${status}`);
    },
    renderMessages: async () => {
      events.push("render-messages");
    },
    ...overrides
  };

  return {
    handlers,
    events,
    setErrorMessage(message: string) {
      errorMessage = message;
    }
  };
}

{
  const state = createHandlers();
  const executor = new LocalCommandActionExecutor(state.handlers);

  await executor.execute({
    kind: "replace-text",
    commandText: "replace old",
    replacement: {
      original: "old",
      suggested: "new"
    }
  });

  assert.deepEqual(state.events, ["replace:replace old:old->new"]);
}

{
  const state = createHandlers({
    readSelectedTextContextForVoice: () => ({
      context: null,
      warning: "Select text first"
    })
  });
  const executor = new LocalCommandActionExecutor(state.handlers);

  await executor.execute({
    kind: "improve-selection"
  });

  assert.deepEqual(state.events, [
    "error:Select text first",
    "status:Status: No selected text"
  ]);
}

{
  const state = createHandlers();
  const executor = new LocalCommandActionExecutor(state.handlers);

  await executor.execute({
    kind: "note-action",
    action: "chat-note",
    commandText: "save chat"
  });

  assert.deepEqual(state.events, ["chat-note"]);
}

{
  const state = createHandlers({
    openFileByVaultQuery: async (query) => {
      state.events.push(`open:${query}`);
      state.setErrorMessage("Could not open file");
    }
  });
  const executor = new LocalCommandActionExecutor(state.handlers);
  const actionPlan: LocalCommandAction = {
    kind: "action-plan",
    commandText: "open then replace",
    actions: [
      {
        kind: "open-file",
        commandText: "open then replace",
        query: "Missing.md"
      },
      {
        kind: "replace-selection-or-line",
        commandText: "open then replace",
        suggested: "new"
      }
    ]
  };

  await executor.execute(actionPlan);

  assert.deepEqual(state.events, [
    "status:Status: Running step 1/2",
    "open:Missing.md"
  ]);
}

console.log("localCommandActionExecutor tests passed");
