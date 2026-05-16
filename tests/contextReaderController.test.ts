import assert from "node:assert/strict";
import { ContextReaderController } from "../src/views/controllers/ContextReaderController";
import type { CurrentNoteContext, SelectedTextContext } from "../src/types";

function createController(options: {
  now?: number;
  activeFile?: { path: string; basename: string; extension: string } | null;
  selected?: SelectedTextContext | null;
  selectedWarning?: string | null;
  current?: CurrentNoteContext | null;
  currentWarning?: string | null;
  lastSelected?: SelectedTextContext | null;
  lastSelectedAt?: number;
  editorValue?: string | null;
  cachedContent?: string;
  hasUsableSelection?: (context: SelectedTextContext | null) => boolean;
} = {}) {
  const details: Array<{ message: string | null; isWarning: boolean }> = [];
  const state = {
    lastSelected: options.lastSelected ?? null,
    lastSelectedAt: options.lastSelectedAt ?? 0
  };

  const controller = new ContextReaderController({
    getCurrentNoteContext: async () => ({
      context: options.current ?? null,
      warning: options.currentWarning ?? null
    }),
    getSelectedTextContext: () => ({
      context: options.selected ?? null,
      warning: options.selectedWarning ?? null
    }),
    getActiveFile: () => options.activeFile ?? null,
    getActiveMarkdownEditorValue: (path) =>
      options.editorValue !== undefined && options.activeFile?.path === path
        ? options.editorValue
        : null,
    cachedRead: async () => options.cachedContent ?? "",
    hasUsableSelection:
      options.hasUsableSelection ??
      ((context) => Boolean(context?.text?.trim())),
    getLastSelectedTextContext: () => state.lastSelected,
    setLastSelectedTextContext: (context) => {
      state.lastSelected = context;
    },
    getLastSelectedTextContextAt: () => state.lastSelectedAt,
    setLastSelectedTextContextAt: (value) => {
      state.lastSelectedAt = value;
    },
    setContextDetail: (message, isWarning) => {
      details.push({ message, isWarning });
    },
    getActiveNoteText: () => "Active note",
    now: () => options.now ?? 1000,
    maxNoteActionContextChars: 12
  });

  return { controller, details, state };
}

{
  const current: CurrentNoteContext = {
    path: "Folder/Note.md",
    name: "Note",
    content: "hello",
    isTruncated: false,
    originalLength: 5,
    includedLength: 5
  };
  const { controller, details } = createController({ current });

  assert.deepEqual(await controller.readCurrentNoteContextForRequest(), {
    context: current
  });
  assert.deepEqual(details.at(-1), {
    message: "Active note: Folder/Note.md",
    isWarning: false
  });
}

{
  const selected = {
    path: "Folder/Note.md",
    name: "Note",
    text: "selected",
    isTruncated: false,
    originalLength: 8,
    includedLength: 8
  };
  const { controller, state } = createController({
    selected,
    activeFile: { path: "Folder/Note.md", basename: "Note", extension: "md" },
    now: 2000
  });

  assert.deepEqual(controller.readSelectedTextContextForVoice(), {
    context: selected,
    warning: null
  });
  assert.equal(state.lastSelected, selected);
  assert.equal(state.lastSelectedAt, 2000);
}

{
  const lastSelected = {
    path: "Folder/Note.md",
    name: "Note",
    text: "previous",
    isTruncated: false,
    originalLength: 8,
    includedLength: 8
  };
  const { controller, details } = createController({
    selected: null,
    selectedWarning: "Select text.",
    lastSelected,
    lastSelectedAt: 1000,
    now: 2000,
    activeFile: { path: "Folder/Note.md", basename: "Note", extension: "md" }
  });

  assert.deepEqual(controller.readSelectedTextContextForVoice(), {
    context: lastSelected,
    warning: null
  });
  assert.deepEqual(details.at(-1), {
    message: "Selected text: 8 characters from Folder/Note.md",
    isWarning: false
  });
}

{
  const { controller } = createController({
    activeFile: { path: "Folder/Note.md", basename: "Note", extension: "md" },
    editorValue: "editor text"
  });

  assert.deepEqual(await controller.readActiveMarkdownNote(), {
    file: { path: "Folder/Note.md", basename: "Note", extension: "md" },
    content: "editor text"
  });
}

{
  const { controller, details } = createController();
  const context = controller.buildSelectedContextFromNote(
    { path: "Folder/Long.md", basename: "Long", extension: "md" },
    "abcdefghijklmnop"
  );

  assert.deepEqual(context, {
    path: "Folder/Long.md",
    name: "Long",
    text: "abcdefghijkl",
    isTruncated: true,
    originalLength: 16,
    includedLength: 12
  });
  assert.deepEqual(details.at(-1), {
    message: "Current note context: first 12 of 16 characters attached for speed.",
    isWarning: false
  });
}

console.log("contextReaderController tests passed");
