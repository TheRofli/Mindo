import assert from "node:assert/strict";
import {
  CreateNoteCommandController,
  type CreateNoteCommandControllerDeps
} from "../src/views/controllers/CreateNoteCommandController";
import { DEFAULT_SETTINGS, type ActionReceipt } from "../src/types";
import type { WorkflowRoute } from "../src/workflows";

function makeRoute(kind: "create_note" | "research_note"): WorkflowRoute {
  return {
    id: `route-${kind}`,
    intent: kind === "create_note" ? "create_note" : "research",
    confidence: 0.98,
    reason: "test",
    source: "chat",
    userText: "create a useful note",
    effectiveText: "create a useful note",
    uiLanguage: "en",
    actions: [
      {
        kind,
        title: "Useful Note",
        folderHint: "Projects"
      }
    ],
    statusSteps: [],
    needsWeb: kind === "research_note",
    needsModel: true
  };
}

function makeDeps(): {
  deps: CreateNoteCommandControllerDeps;
  created: Array<{
    title: string;
    targetFolder: string;
    prompt: string;
    vaultSources?: unknown[];
    webSources?: unknown[];
  }>;
  receipts: ActionReceipt[];
  statuses: string[];
  clearedAttachments: { value: boolean };
} {
  const created: Array<{
    title: string;
    targetFolder: string;
    prompt: string;
    vaultSources?: unknown[];
    webSources?: unknown[];
  }> = [];
  const receipts: ActionReceipt[] = [];
  const statuses: string[] = [];
  const clearedAttachments = { value: false };
  const deps: CreateNoteCommandControllerDeps = {
    settings: DEFAULT_SETTINGS,
    getAttachedFiles: () => [
      {
        name: "spec.md",
        type: "text/markdown",
        size: 12,
        text: "Attachment text"
      }
    ],
    clearAttachedFiles: () => {
      clearedAttachments.value = true;
    },
    renderAttachedContext: () => undefined,
    setError: () => undefined,
    setLoading: () => undefined,
    setStatus: (status) => {
      statuses.push(status);
    },
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error),
    readActiveMarkdownNote: async () => ({
      file: {
        path: "Projects/Active.md",
        name: "Active.md",
        basename: "Active"
      } as never,
      content: "# Active\nContext"
    }),
    buildWorkflowRouteForCommand: (commandText) =>
      makeRoute(commandText.includes("research") ? "research_note" : "create_note"),
    resolveWorkflowCreateTarget: () => ({
      title: "Useful Note",
      targetFolder: "Projects"
    }),
    buildSelectedContextFromNote: (file, content) => ({
      path: file.path,
      name: file.name,
      text: content,
      isTruncated: false,
      originalLength: content.length,
      includedLength: content.length
    }),
    readProjectMemoryContext: async () => "Project memory",
    buildAutoWebContextForRequest: async () => ({
      reason: "freshness",
      query: "useful note research",
      provider: "DuckDuckGo",
      fallbackReason: null,
      results: [
        {
          title: "Web source",
          url: "https://example.com",
          snippet: "Snippet"
        }
      ]
    }),
    createStreamingGeneratedNoteDeps: () => ({
      app: {} as never,
      settings: DEFAULT_SETTINGS,
      setStatus: () => undefined,
      openVaultPath: async () => undefined,
      appendActionReceipt: () => undefined,
      pushActionTimeline: () => undefined
    }),
    createStreamingGeneratedNote: async (_deps, options) => {
      created.push({
        title: options.title,
        targetFolder: options.targetFolder,
        prompt: options.prompt,
        vaultSources: options.vaultSources,
        webSources: options.webSources
      });
      return `${options.targetFolder}/${options.title}.md`;
    },
    expandSemanticVaultQuery: async () => ["useful", "note"],
    searchSemanticVaultMarkdown: async () => [
      {
        path: "Projects/Source.md",
        title: "Source",
        score: 10,
        snippet: "Vault snippet"
      }
    ],
    buildSemanticVaultSectionContext: async () => ({
      context: "Section context",
      sections: []
    }),
    buildResearchWorkflowWebContext: async () => ({
      reason: "freshness",
      query: "research query",
      provider: "DuckDuckGo",
      fallbackReason: null,
      results: [
        {
          title: "Research web source",
          url: "https://example.org",
          snippet: "Research snippet"
        }
      ]
    }),
    rememberVaultSearch: () => undefined,
    appendWorkflowReceipt: (receipt) => {
      receipts.push(receipt);
    },
    formatAutoWebContextForPrompt: (context) =>
      `WEB:${context.results.length}`,
    formatProjectMemoryForPrompt: (memory) => `MEMORY:${memory}`,
    formatSemanticVaultContext: (results) => `VAULT:${results.length}`,
    formatWebSearchContext: (results) => `WEBCTX:${results.length}`
  };

  return { deps, created, receipts, statuses, clearedAttachments };
}

{
  const { deps, created, statuses, clearedAttachments } = makeDeps();
  const controller = new CreateNoteCommandController(deps);
  await controller.createNoteFromCommandText(
    "create useful note",
    "create useful note"
  );

  assert.equal(created.length, 1);
  assert.equal(created[0].title, "Useful Note");
  assert.equal(created[0].targetFolder, "Projects");
  assert.match(created[0].prompt, /Output Markdown only/);
  assert.match(created[0].prompt, /MEMORY:Project memory/);
  assert.equal(clearedAttachments.value, true);
  assert.equal(statuses.at(-1), "Status: Note created");
}

{
  const { deps, created, receipts, statuses } = makeDeps();
  const controller = new CreateNoteCommandController(deps);
  await controller.createResearchNoteFromCommandText(
    "create research note",
    "create research note"
  );

  assert.equal(created.length, 1);
  assert.equal(created[0].title, "Useful Note");
  assert.equal(created[0].vaultSources?.length, 1);
  assert.equal(created[0].webSources?.length, 1);
  assert.ok(receipts.some((receipt) => receipt.label === "Workflow sources"));
  assert.equal(statuses.at(-1), "Status: Research note created");
}

console.log("createNoteCommandController tests passed");
