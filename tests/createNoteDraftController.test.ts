import assert from "node:assert/strict";

import type { TFile } from "obsidian";
import type { CreateNoteProposal } from "../src/modals/CreateNoteModal";
import type { ChatMessage, SelectedTextContext } from "../src/types";
import { DEFAULT_SETTINGS, type ContexSettings } from "../src/types";
import { CreateNoteDraftController } from "../src/views/controllers/CreateNoteDraftController";

function selectedContext(text = "Selected idea"): SelectedTextContext {
  return {
    path: "Notes/Source.md",
    name: "Source",
    text,
    isTruncated: false,
    originalLength: text.length,
    includedLength: text.length
  };
}

function createHarness() {
  const statuses: string[] = [];
  const errors: Array<string | null> = [];
  const loading: boolean[] = [];
  const receipts: Array<{ status: string; label: string; detail?: string }> = [];
  const requests: ChatMessage[][] = [];
  const modalCalls: Array<{
    proposal: CreateNoteProposal;
    onApply: (proposal: CreateNoteProposal) => Promise<void>;
    onChange: (
      proposal: CreateNoteProposal,
      instruction: string
    ) => Promise<CreateNoteProposal>;
  }> = [];
  const applied: Array<{
    proposal: CreateNoteProposal;
    context: SelectedTextContext;
    userPrompt?: string;
    userContent?: string;
  }> = [];
  let hiddenToolbar = false;
  let note: { file: TFile; content: string } | null = null;
  let contextResult: { context: SelectedTextContext | null; warning: string | null } = {
    context: selectedContext(),
    warning: null
  };

  const settings: ContexSettings = {
    ...DEFAULT_SETTINGS,
    model: "test-model"
  };

  const controller = new CreateNoteDraftController({
    settings,
    readSelectedTextContextForRequest: () => contextResult,
    hideSelectionToolbar: () => {
      hiddenToolbar = true;
    },
    setError: (message) => errors.push(message),
    setLoading: (value) => loading.push(value),
    setStatus: (status) => statuses.push(status),
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error),
    requestLlmChatCompletion: async (_settings, messages) => {
      requests.push(messages);
      return JSON.stringify({
        title: "Draft Note",
        path: "Contex Inbox/Draft Note.md",
        content: "# Draft Note\n\nDraft body"
      });
    },
    prepareCreateNoteProposal: async (proposalText, fallbackFolder) => {
      const parsed = JSON.parse(proposalText);
      return {
        path: fallbackFolder
          ? `${fallbackFolder}/${parsed.title}.md`
          : parsed.path,
        content: parsed.content.replace(/^# .+\n\n/, "")
      };
    },
    applyCreateNoteProposal: async (
      proposal,
      context,
      userPrompt,
      userContent
    ) => {
      applied.push({ proposal, context, userPrompt, userContent });
    },
    refineCreateNoteProposal: async (proposal) => proposal,
    refineCurrentNoteProposal: async (proposal) => proposal,
    openCreateNoteModal: (options) => {
      modalCalls.push(options);
    },
    appendActionReceipt: (receipt) => receipts.push(receipt),
    readActiveMarkdownNote: async () => note,
    buildSelectedContextFromNote: (file, content) => ({
      ...selectedContext(content),
      path: file.path,
      name: file.name
    }),
    readProjectMemoryContext: async () => "memory",
    formatProjectMemoryForPrompt: (memory) => `MEMORY: ${memory}`
  });

  return {
    controller,
    statuses,
    errors,
    loading,
    receipts,
    requests,
    modalCalls,
    applied,
    get hiddenToolbar() {
      return hiddenToolbar;
    },
    setContextResult(value: typeof contextResult) {
      contextResult = value;
    },
    setNote(value: typeof note) {
      note = value;
    }
  };
}

{
  const state = createHarness();

  await state.controller.createNoteFromSelection();

  assert.equal(state.hiddenToolbar, true);
  assert.deepEqual(state.loading, [true, false]);
  assert.equal(state.statuses[0], "Status: Drafting note");
  assert.equal(state.statuses.at(-1), "Status: Ready");
  assert.equal(state.requests.length, 1);
  assert.ok(state.requests[0][0].content.includes("Selected idea"));
  assert.equal(state.modalCalls.length, 1);
  assert.deepEqual(state.receipts, [
    {
      status: "preview",
      label: "Drafted note proposal",
      detail: "Contex Inbox/Draft Note.md"
    }
  ]);

  await state.modalCalls[0].onApply({
    path: "Contex Inbox/Draft Note.md",
    content: "Edited"
  });

  assert.equal(state.applied.length, 1);
  assert.equal(state.applied[0].context.text, "Selected idea");
}

{
  const state = createHarness();
  state.setContextResult({
    context: null,
    warning: "Select text first."
  });

  await state.controller.createNoteFromSelection();

  assert.deepEqual(state.errors, ["Select text first."]);
  assert.deepEqual(state.statuses, ["Status: No selected text"]);
  assert.deepEqual(state.loading, []);
}

{
  const state = createHarness();
  state.setNote({
    file: {
      path: "Project/Source.md",
      name: "Source.md"
    } as TFile,
    content: "Current note body"
  });

  await state.controller.createNoteFromCurrentNote({
    fallbackFolder: "Project Plans",
    modalTitle: "Create plan",
    promptLines: ["Create a plan."],
    statusText: "Status: Creating plan",
    userPrompt: "Create plan"
  });

  assert.deepEqual(state.loading, [true, false]);
  assert.equal(state.statuses[0], "Status: Creating plan");
  assert.equal(state.statuses.at(-1), "Status: Note created");
  assert.equal(state.requests.length, 1);
  assert.ok(state.requests[0][0].content.includes("MEMORY: memory"));
  assert.ok(state.requests[0][0].content.includes("Project/Source.md"));
  assert.deepEqual(state.applied, [
    {
      proposal: {
        path: "Project Plans/Draft Note.md",
        content: "Draft body"
      },
      context: {
        path: "Project/Source.md",
        name: "Source.md",
        text: "Current note body",
        isTruncated: false,
        originalLength: 17,
        includedLength: 17
      },
      userPrompt: "Create plan",
      userContent: "Create plan"
    }
  ]);
}

console.log("createNoteDraftController tests passed");
