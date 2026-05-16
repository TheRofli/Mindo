import assert from "node:assert/strict";
import {
  WebResearchNoteController,
  type WebResearchNoteControllerDeps
} from "../src/views/controllers/WebResearchNoteController";
import type {
  ChatMessage,
  SelectedTextContext,
  WebSearchResult
} from "../src/types";
import type { CreateNoteProposal } from "../src/modals/CreateNoteModal";

const webResult: WebSearchResult = {
  title: "Local LLM News",
  url: "https://example.com/llm",
  snippet: "Fresh local LLM context"
};

function createMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "assistant-1",
    role: "assistant",
    content: "Summary text",
    createdAt: 1,
    webResearchQuery: "latest local LLM",
    webSearchQuery: "latest local LLM 2026",
    webResearchResults: [webResult],
    ...overrides
  };
}

function createDeps(): {
  controller: WebResearchNoteController;
  errors: Array<string | null>;
  opened: number;
  applied: Array<{
    proposal: CreateNoteProposal;
    sourceContext: SelectedTextContext;
    userPrompt?: string;
  }>;
  capturedProposal: CreateNoteProposal | null;
} {
  const errors: Array<string | null> = [];
  const applied: Array<{
    proposal: CreateNoteProposal;
    sourceContext: SelectedTextContext;
    userPrompt?: string;
  }> = [];
  let opened = 0;
  let capturedProposal: CreateNoteProposal | null = null;

  const deps: WebResearchNoteControllerDeps = {
    projectResearchFolder: "Contex Research",
    setError: (error) => errors.push(error),
    getUniqueNotePath: async (path) => `unique:${path}`,
    formatWebSearchContext: (results) => `sources:${results.length}`,
    applyCreateNoteProposal: async (proposal, sourceContext, userPrompt) => {
      applied.push({ proposal, sourceContext, userPrompt });
    },
    openCreateNoteModal: (options) => {
      opened += 1;
      capturedProposal = options.proposal;
      void options.onApply(options.proposal);
    }
  };

  return {
    controller: new WebResearchNoteController(deps),
    errors,
    get opened() {
      return opened;
    },
    applied,
    get capturedProposal() {
      return capturedProposal;
    }
  };
}

async function testCreatesResearchProposal(): Promise<void> {
  const state = createDeps();

  await state.controller.createWebResearchNote(createMessage());

  assert.equal(state.opened, 1);
  assert.equal(
    state.capturedProposal?.path,
    "unique:Contex Research/latest local LLM.md"
  );
  assert.match(state.capturedProposal?.content ?? "", /latest local LLM/);
  assert.match(state.capturedProposal?.content ?? "", /https:\/\/example.com\/llm/);
  assert.equal(state.applied[0].userPrompt, "Research web: latest local LLM");
  assert.equal(state.applied[0].sourceContext.path, "Web Research");
}

async function testRejectsEmptySources(): Promise<void> {
  const state = createDeps();

  await state.controller.createWebResearchNote(
    createMessage({ webResearchResults: [] })
  );

  assert.equal(state.opened, 0);
  assert.equal(state.errors[0], "There are no web sources to save yet.");
}

await testCreatesResearchProposal();
await testRejectsEmptySources();

console.log("webResearchNoteController tests passed");
