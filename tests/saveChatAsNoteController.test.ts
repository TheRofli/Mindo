import assert from "node:assert/strict";

import { SaveChatAsNoteController } from "../src/views/controllers/SaveChatAsNoteController";
import { DEFAULT_SETTINGS, type ChatMessage } from "../src/types";
import type { CreateNoteProposal } from "../src/modals/CreateNoteModal";

const messages: ChatMessage[] = [
  {
    id: "u1",
    role: "user",
    content: "Create a plan",
    createdAt: 1
  },
  {
    id: "a1",
    role: "assistant",
    content: "Plan content",
    createdAt: 2
  }
];

function createDeps(overrides: Partial<ConstructorParameters<typeof SaveChatAsNoteController>[0]> = {}) {
  const events: string[] = [];
  const openedModals: Array<{
    title: string;
    createButtonText: string;
    proposal: CreateNoteProposal;
    onApply: (proposal: CreateNoteProposal) => Promise<void>;
    onChange?: (
      proposal: CreateNoteProposal,
      instruction: string
    ) => Promise<CreateNoteProposal>;
  }> = [];
  const receipts: Array<{ status: string; label: string; detail?: string }> = [];
  const applied: Array<{
    proposal: CreateNoteProposal;
    reason: string;
    sourceText: string;
  }> = [];

  const deps: ConstructorParameters<typeof SaveChatAsNoteController>[0] = {
    settings: DEFAULT_SETTINGS,
    requestLlmChatCompletion: async () =>
      '{"title":"Project chat","path":"Mindo Chats/project-chat.md","content":"# Project chat"}',
    prepareCreateNoteProposal: async (proposalText, fallbackFolder) => ({
      path: `${fallbackFolder}/project-chat.md`,
      content: proposalText
    }),
    getFallbackPath: async (title) => `Mindo Chats/${title}.md`,
    openCreateNoteModal: (options) => {
      openedModals.push(options);
    },
    applyCreateNoteProposal: async (proposal, sourceContext, reason) => {
      applied.push({
        proposal,
        reason,
        sourceText: sourceContext.text
      });
    },
    refineCreateNoteProposal: async (proposal, _sourceContext, instruction) => ({
      ...proposal,
      content: `${proposal.content}\n${instruction}`
    }),
    appendActionReceipt: (receipt) => {
      receipts.push(receipt);
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
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error),
    ...overrides
  };

  return { deps, events, openedModals, receipts, applied };
}

{
  const { deps, events } = createDeps();
  const controller = new SaveChatAsNoteController(deps);

  await controller.save(messages, { isLoading: true });

  assert.deepEqual(events, []);
}

{
  const { deps, events, openedModals } = createDeps();
  const controller = new SaveChatAsNoteController(deps);

  await controller.save([], { isLoading: false });

  assert.deepEqual(events, [
    "error:There is no chat conversation to save yet.",
    "status:Status: Empty chat"
  ]);
  assert.equal(openedModals.length, 0);
}

{
  const { deps, events, openedModals, receipts, applied } = createDeps();
  const controller = new SaveChatAsNoteController(deps);

  await controller.save(messages, { isLoading: false });

  assert.deepEqual(events, [
    "error:null",
    "loading:true",
    "status:Status: Turning chat into note",
    "status:Status: Ready",
    "loading:false"
  ]);
  assert.equal(openedModals.length, 1);
  assert.equal(openedModals[0].title, "Create Chat Note");
  assert.equal(openedModals[0].createButtonText, "Create");
  assert.equal(openedModals[0].proposal.path, "Mindo Chats/project-chat.md");
  assert.equal(typeof openedModals[0].onChange, "function");
  assert.deepEqual(receipts, [
    {
      status: "preview",
      label: "Drafted chat note",
      detail: "Mindo Chats/project-chat.md"
    }
  ]);

  await openedModals[0].onApply(openedModals[0].proposal);

  assert.equal(applied.length, 1);
  assert.equal(applied[0].reason, "Turn conversation into note");
  assert.equal(applied[0].sourceText.includes("Create a plan"), true);
}

{
  const { deps, events, openedModals } = createDeps({
    requestLlmChatCompletion: async () => {
      throw new Error("offline");
    }
  });
  const controller = new SaveChatAsNoteController(deps);

  await controller.save(messages, { isLoading: false });

  assert.equal(openedModals.length, 1);
  assert.equal(openedModals[0].proposal.path, "Mindo Chats/Create a plan.md");
  assert.equal(openedModals[0].onChange, undefined);
  assert.ok(events.includes("error:offline"));
  assert.ok(events.includes("status:Status: Draft fallback ready"));
}

console.log("saveChatAsNoteController tests passed");
