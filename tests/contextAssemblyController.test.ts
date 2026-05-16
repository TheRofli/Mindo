import assert from "node:assert/strict";

import { ContextAssemblyController } from "../src/views/controllers/ContextAssemblyController";
import type {
  LlmRequestContext,
  VaultSearchResult,
  WebSearchResult
} from "../src/types";

interface FakeFile {
  path: string;
  stat: { mtime: number };
  content: string;
}

function createHarness() {
  const files: FakeFile[] = [
    {
      path: "Contex Wiki/Wiki/Projects/Contex.md",
      stat: { mtime: 20 },
      content: "# Contex\nDurable project memory."
    },
    {
      path: "Notes/Other.md",
      stat: { mtime: 10 },
      content: "# Other"
    }
  ];
  const statuses: string[] = [];
  const timeline: Array<{ type: string; label: string; detail?: string }> = [];
  const warnings: string[] = [];
  let response = '{"query":"local LLM model release news 2026"}';
  const llmPrompts: string[] = [];
  const webResults: WebSearchResult[] = [
    {
      title: "Local LLM news",
      url: "https://example.com/local-llm",
      snippet: "Model release news",
      source: "Example",
      score: 1
    }
  ];

  const controller = new ContextAssemblyController<FakeFile>({
    settings: { webSearchEnabled: true },
    requestLlmChatCompletion: async (_settings, messages) => {
      llmPrompts.push(messages.map((message) => message.content).join("\n"));
      return response;
    },
    getMarkdownFiles: () => files,
    getFileByPath: (path) => files.find((file) => file.path === path) ?? null,
    readFile: async (file) => file.content,
    extractRelevantMarkdownSections: (content, _query, result) => [
      {
        heading: result.title,
        excerpt: content,
        score: result.score
      }
    ],
    formatWebSearchContext: (results) =>
      results
        .map((result, index) =>
          [`Source ${index + 1}`, result.title, result.url, result.snippet].join(
            "\n"
          )
        )
        .join("\n\n"),
    isLocalOnlyCommandText: () => false,
    planContextWorkflow: () => ({
      requiresWeb: true,
      requiresVault: true,
      reason: "freshness-sensitive test"
    }),
    decideAutoWebResearch: (userRequest) => ({
      query: userRequest,
      reason: "freshness-sensitive test"
    }),
    buildAutoWebResearchQuery: (userRequest) => userRequest,
    searchWeb: async (_settings, searchQuery) => ({
      provider: "fake",
      results: webResults.map((result) => ({
        ...result,
        snippet: `${result.snippet}: ${searchQuery}`
      }))
    }),
    setStatus: (status) => statuses.push(status),
    pushActionTimeline: (type, label, detail) =>
      timeline.push({ type, label, detail }),
    warn: (label, error) => warnings.push(`${label}: ${String(error)}`),
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error)
  });

  return {
    controller,
    statuses,
    timeline,
    warnings,
    llmPrompts,
    set response(value: string) {
      response = value;
    }
  };
}

{
  const state = createHarness();

  const query = await state.controller.rewriteWebResearchQuery(
    "latest local LLM news"
  );

  assert.equal(query, "local LLM model release news 2026");
  assert.match(state.llmPrompts[0], /Rewrite this user web research request/);
}

{
  const state = createHarness();
  state.response = '{"queries":["voice flow","голосовой режим"]}';

  const queries = await state.controller.expandSemanticVaultQuery(
    "voice flow"
  );

  assert.deepEqual(queries, ["voice flow", "голосовой режим"]);
}

{
  const state = createHarness();
  const context: LlmRequestContext = { currentNote: null };

  const withMemory = await state.controller.attachProjectMemoryContext(context);

  assert.match(withMemory?.projectMemory ?? "", /Durable project memory/);
}

{
  const state = createHarness();
  const results: VaultSearchResult[] = [
    {
      path: "Contex Wiki/Wiki/Projects/Contex.md",
      title: "Contex",
      snippet: "Durable project memory.",
      score: 10
    }
  ];

  state.response = "Vault answer";
  const answer = await state.controller.answerSemanticVaultQuestion(
    "What is Contex?",
    results,
    "Source 1\nContex memory"
  );

  assert.equal(answer, "Vault answer");
  assert.match(state.llmPrompts.at(-1) ?? "", /Contex memory/);
}

{
  const state = createHarness();

  const autoWeb = await state.controller.buildAutoWebContextForRequest(
    "Проверь актуальность локальных LLM в 2026"
  );

  assert.equal(autoWeb?.provider, "fake");
  assert.ok(state.statuses.includes("Status: Checking current web"));
  assert.equal(state.timeline[0].type, "searching");
}

console.log("contextAssemblyController tests passed");
