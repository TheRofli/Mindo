import assert from "node:assert/strict";

import { CurrentNoteUpdateController } from "../src/views/controllers/CurrentNoteUpdateController";
import { DEFAULT_SETTINGS, type ChatMessage } from "../src/types";

function createMessage(id: string, content: string): ChatMessage {
  return {
    id,
    role: "assistant",
    content,
    createdAt: 100
  };
}

function createDeps(
  overrides: Partial<ConstructorParameters<typeof CurrentNoteUpdateController>[0]> = {}
) {
  const events: string[] = [];
  const messages: ChatMessage[] = [];
  let attachedFiles = [
    {
      name: "rubric.pdf",
      type: "application/pdf",
      size: 12,
      text: "rubric"
    }
  ];

  const deps: ConstructorParameters<typeof CurrentNoteUpdateController>[0] = {
    settings: DEFAULT_SETTINGS,
    maxWholeNoteUpdateChars: 50,
    isLoading: () => false,
    readActiveMarkdownNote: async () => ({
      file: {
        path: "Test/Test.md",
        basename: "Test"
      },
      content: "Old note"
    }),
    getAttachedFiles: () => attachedFiles,
    clearAttachedFiles: () => {
      attachedFiles = [];
      events.push("clear-attached");
    },
    renderAttachedContext: () => {
      events.push("render-attached");
    },
    prepareCurrentNoteUpdatePreview: async (options) => {
      assert.equal(options.note.path, "Test/Test.md");
      assert.equal(options.attachedFiles?.[0]?.name, "rubric.pdf");
      return {
        userMessage: createMessage("user", options.userPrompt),
        assistantMessage: {
          ...createMessage("assistant", "New note"),
          diffPreview: {
            title: "Update current note preview",
            sourcePath: "Test/Test.md",
            original: "Old note",
            suggested: "New note",
            originalOccurrenceIndex: 0,
            operationType: "update-note",
            userPrompt: options.userPrompt,
            status: "pending"
          }
        },
        autoWebContext: null
      };
    },
    pushMessages: (...nextMessages) => {
      messages.push(...nextMessages);
      events.push(`messages:${nextMessages.length}`);
    },
    showInlineDiffForMessage: async (messageId) => {
      events.push(`inline-diff:${messageId}`);
    },
    setError: (message) => {
      events.push(`error:${message ?? "null"}`);
    },
    setLoading: (loading) => {
      events.push(`loading:${loading}`);
    },
    setStatus: (status) => {
      events.push(`status:${status}`);
    },
    renderMessages: async () => {
      events.push("render-messages");
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error),
    ...overrides
  };

  return {
    deps,
    events,
    messages,
    get attachedFiles() {
      return attachedFiles;
    }
  };
}

{
  const state = createDeps({
    isLoading: () => true
  });
  const controller = new CurrentNoteUpdateController(state.deps);

  await controller.update("Update note");

  assert.deepEqual(state.events, []);
}

{
  const state = createDeps({
    readActiveMarkdownNote: async () => null
  });
  const controller = new CurrentNoteUpdateController(state.deps);

  await controller.update("Update note");

  assert.deepEqual(state.events, [
    "error:Open a Markdown note before updating it.",
    "status:Status: No current note"
  ]);
}

{
  const state = createDeps({
    readActiveMarkdownNote: async () => ({
      file: {
        path: "Test/Test.md",
        basename: "Test"
      },
      content: "x".repeat(51)
    })
  });
  const controller = new CurrentNoteUpdateController(state.deps);

  await controller.update("Update note");

  assert.deepEqual(state.events, [
    "error:Current note is too long for whole-note update (51 characters). Select a section and use Improve selection, or create a roadmap/memory note instead.",
    "status:Status: Note too long"
  ]);
}

{
  const state = createDeps();
  const controller = new CurrentNoteUpdateController(state.deps);

  await controller.update("Update note");

  assert.equal(state.messages.length, 2);
  assert.deepEqual(state.attachedFiles, []);
  assert.deepEqual(state.events, [
    "error:null",
    "loading:true",
    "status:Status: Drafting note update",
    "messages:2",
    "status:Status: Preview ready",
    "inline-diff:assistant",
    "clear-attached",
    "render-attached",
    "loading:false",
    "render-messages"
  ]);
}

console.log("currentNoteUpdateController tests passed");
