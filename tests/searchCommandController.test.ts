import assert from "node:assert/strict";
import { SearchCommandController } from "../src/views/controllers/SearchCommandController";
import type {
  ChatMessage,
  ContexSettings,
  VaultSearchResult,
  VaultSourceSection,
  WebSearchResult
} from "../src/types";

function createSettings(): ContexSettings {
  return {
    webSearchEnabled: true,
    webSearchProvider: "duckduckgo",
    webSearchEndpoint: "",
    webSearchMaxResults: 2
  } as ContexSettings;
}

function createController(overrides: Partial<ConstructorParameters<typeof SearchCommandController>[0]> = {}) {
  const messages: ChatMessage[] = [];
  const loadingStates: boolean[] = [];
  const statuses: string[] = [];
  const errors: Array<string | null> = [];
  const remembered: Array<{ query: string; results: VaultSearchResult[] }> = [];
  let inputValue = "stale";
  let renders = 0;

  const vaultResult: VaultSearchResult = {
    path: "Obsidian/BitNet.md",
    title: "BitNet",
    score: 42,
    snippet: "BitNet note"
  };
  const webResult: WebSearchResult = {
    title: "Local LLM News",
    url: "https://example.com/news",
    snippet: "Fresh local LLM release"
  };
  const section: VaultSourceSection = {
    path: vaultResult.path,
    title: vaultResult.title,
    heading: "Architecture",
    excerpt: "Voice flow",
    score: 11
  };

  const controller = new SearchCommandController({
    app: {} as never,
    settings: createSettings(),
    getMessages: () => messages,
    clearInput: () => {
      inputValue = "";
    },
    setError: (error) => errors.push(error),
    setLoading: (loading) => loadingStates.push(loading),
    setStatus: (status) => statuses.push(status),
    renderMessages: async () => {
      renders += 1;
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error),
    rememberVaultSearch: (query, results) => remembered.push({ query, results }),
    searchVaultMarkdown: async () => [vaultResult],
    formatVaultSearchResults: (results) => `vault:${results.length}`,
    searchWeb: async () => ({
      provider: "DuckDuckGo direct",
      results: [webResult]
    }),
    formatWebSearchResults: (query, results) => `web:${query}:${results.length}`,
    rewriteWebResearchQuery: async (query) => `${query} rewritten`,
    summarizeWebResearch: async (query, results, searchQuery) =>
      `summary:${query}:${searchQuery}:${results.length}`,
    expandSemanticVaultQuery: async () => ["voice flow", "архитектура"],
    searchSemanticVaultMarkdown: async (_app, query, variants, limit, settings) => {
      assert.equal(query, "voice flow");
      assert.deepEqual(variants, ["voice flow", "архитектура"]);
      assert.equal(limit, 8);
      assert.equal(settings.webSearchProvider, "duckduckgo");
      return [vaultResult];
    },
    buildSemanticVaultSectionContext: async () => ({
      context: "section context",
      sections: [section]
    }),
    answerSemanticVaultQuestion: async (query, results, sourceContext) =>
      `answer:${query}:${results.length}:${sourceContext}`,
    ...overrides
  });

  return {
    controller,
    messages,
    loadingStates,
    statuses,
    errors,
    remembered,
    get inputValue() {
      return inputValue;
    },
    get renders() {
      return renders;
    },
    vaultResult,
    webResult,
    section
  };
}

{
  const state = createController();

  await state.controller.sendVaultSearch("bitnet");

  assert.equal(state.inputValue, "");
  assert.deepEqual(state.loadingStates, [true, false]);
  assert.deepEqual(state.errors, [null]);
  assert.equal(state.statuses.at(-1), "Status: Ready");
  assert.equal(state.renders, 1);
  assert.deepEqual(state.remembered, [
    { query: "bitnet", results: [state.vaultResult] }
  ]);
  assert.equal(state.messages[0].role, "user");
  assert.equal(state.messages[0].content, "/search bitnet");
  assert.equal(state.messages[1].role, "assistant");
  assert.equal(state.messages[1].content, "vault:1");
  assert.deepEqual(state.messages[1].vaultSearchResults, [state.vaultResult]);
}

{
  const state = createController();

  await state.controller.sendWebResearch("latest local LLM news");

  assert.deepEqual(state.loadingStates, [true, false]);
  assert.deepEqual(state.errors, [null]);
  assert.equal(state.statuses[0], "Status: Searching web");
  assert.equal(state.statuses.at(-1), "Status: Ready");
  assert.equal(state.messages[0].content, "/web latest local LLM news");
  assert.equal(
    state.messages[1].content,
    "summary:latest local LLM news:latest local LLM news rewritten:1"
  );
  assert.equal(state.messages[1].webSearchQuery, "latest local LLM news rewritten");
  assert.equal(state.messages[1].webResearchProvider, "DuckDuckGo direct");
  assert.deepEqual(state.messages[1].webSources, [state.webResult]);
}

{
  const state = createController();

  await state.controller.sendSemanticVaultQuestion("voice flow");

  assert.deepEqual(state.loadingStates, [true, false]);
  assert.equal(state.statuses[0], "Status: Semantic vault search");
  assert.equal(state.statuses.at(-1), "Status: Ready");
  assert.deepEqual(state.remembered, [
    { query: "voice flow", results: [state.vaultResult] }
  ]);
  assert.equal(state.messages[0].content, "/rag voice flow");
  assert.equal(state.messages[1].content, "answer:voice flow:1:section context");
  assert.deepEqual(state.messages[1].semanticVaultSections, [state.section]);
  assert.deepEqual(state.messages[1].sources, [state.vaultResult]);
}

{
  const state = createController({
    searchVaultMarkdown: async () => {
      throw new Error("boom");
    }
  });

  await state.controller.sendVaultSearch("bitnet");

  assert.deepEqual(state.errors, [null, "boom"]);
  assert.equal(state.statuses.at(-1), "Status: Search failed");
  assert.deepEqual(state.loadingStates, [true, false]);
  assert.equal(state.renders, 1);
}

console.log("searchCommandController tests passed");
