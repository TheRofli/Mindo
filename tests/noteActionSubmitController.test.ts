import assert from "node:assert/strict";

import type {
  CurrentNoteContext,
  LlmRequestContext,
  SelectedTextContext
} from "../src/types";
import { NoteActionSubmitController } from "../src/views/controllers/NoteActionSubmitController";
import type { NoteAction } from "../src/views/noteActions";

function selectedText(text = "rough text"): SelectedTextContext {
  return {
    path: "Notes/Source.md",
    name: "Source",
    text,
    isTruncated: false,
    originalLength: text.length,
    includedLength: text.length
  };
}

function currentNote(): CurrentNoteContext {
  return {
    path: "Notes/Current.md",
    name: "Current",
    content: "# Current",
    isTruncated: false,
    originalLength: 9,
    includedLength: 9
  };
}

function createHarness() {
  const errors: Array<string | null> = [];
  const statuses: string[] = [];
  const sent: Array<{
    prompt: string;
    context: LlmRequestContext | null;
    clearInput: boolean;
    options?: {
      diffPreviewOriginal?: string;
      diffPreviewTitle?: string;
      diffOperationType?: string;
      diffUserPrompt?: string;
    };
  }> = [];
  let loading = false;
  let currentNoteResult: { context: CurrentNoteContext | null } = {
    context: currentNote()
  };
  let selectedTextResult: {
    context: SelectedTextContext | null;
    warning: string | null;
  } = {
    context: selectedText(),
    warning: null
  };
  let useCurrentNote = false;
  let refreshedContext = 0;
  let hiddenToolbar = 0;

  const controller = new NoteActionSubmitController({
    isLoading: () => loading,
    readCurrentNoteContextForRequest: async () => currentNoteResult,
    readSelectedTextContextForRequest: () => selectedTextResult,
    setError: (message) => errors.push(message),
    setStatus: (status) => statuses.push(status),
    setUseCurrentNote: (value) => {
      useCurrentNote = value;
    },
    refreshContextStatus: () => {
      refreshedContext += 1;
    },
    sendMessage: async (prompt, context, clearInput, options) => {
      sent.push({ prompt: prompt ?? "", context, clearInput, options });
    },
    hideSelectionToolbar: () => {
      hiddenToolbar += 1;
    }
  });

  return {
    controller,
    errors,
    statuses,
    sent,
    get useCurrentNote() {
      return useCurrentNote;
    },
    get refreshedContext() {
      return refreshedContext;
    },
    get hiddenToolbar() {
      return hiddenToolbar;
    },
    set loading(value: boolean) {
      loading = value;
    },
    set currentNoteResult(value: { context: CurrentNoteContext | null }) {
      currentNoteResult = value;
    },
    set selectedTextResult(value: {
      context: SelectedTextContext | null;
      warning: string | null;
    }) {
      selectedTextResult = value;
    }
  };
}

{
  const state = createHarness();

  await state.controller.sendNoteAction("Explain note");

  assert.equal(state.useCurrentNote, true);
  assert.equal(state.refreshedContext, 1);
  assert.deepEqual(state.sent, [
    {
      prompt: "Explain note",
      context: { currentNote: currentNote() },
      clearInput: false,
      options: undefined
    }
  ]);
}

{
  const state = createHarness();
  state.currentNoteResult = { context: null };

  await state.controller.sendNoteAction("Explain note");

  assert.deepEqual(state.errors, [
    "Open a Markdown note before using note actions."
  ]);
  assert.deepEqual(state.statuses, ["Status: No current note"]);
  assert.deepEqual(state.sent, []);
}

{
  const state = createHarness();
  const action: NoteAction = {
    kind: "improve-selection",
    label: "Improve selection",
    prompt: "Improve it"
  };

  await state.controller.sendSelectedTextDiffAction(
    action,
    selectedText("old text"),
    "Improve selection preview",
    "improve-selection"
  );

  assert.deepEqual(state.sent, [
    {
      prompt: "Improve it",
      context: { selectedText: selectedText("old text") },
      clearInput: false,
      options: {
        diffPreviewOriginal: "old text",
        diffPreviewTitle: "Improve selection preview",
        diffOperationType: "improve-selection",
        diffUserPrompt: "Improve it"
      }
    }
  ]);
  assert.equal(state.hiddenToolbar, 1);
}

console.log("noteActionSubmitController tests passed");
