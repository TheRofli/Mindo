import assert from "node:assert/strict";

import { buildAutoWebContext } from "../src/chat/autoWebContextBuilder";
import { buildUserMessageRequestContext } from "../src/chat/userMessageRequestContext";
import { prepareCurrentNoteUpdatePreview } from "../src/notes/currentNoteUpdateWorkflow";
import { resolveOpenFileTarget } from "../src/resolver/openFileResolution";
import { DEFAULT_SETTINGS, type CurrentNoteContext, type VaultSearchResult } from "../src/types";
import { getSuggestionCards } from "../src/views/suggestionCardsRenderer";

const activeNote: CurrentNoteContext = {
  path: "Drafts/Mindo Rough Draft.md",
  name: "Mindo Rough Draft.md",
  content: "# Mindo\n\nrough idea",
  isTruncated: false,
  originalLength: 19,
  includedLength: 19
};

const vaultResult: VaultSearchResult = {
  path: "Proton/Qore Systems Strategy.md",
  title: "Qore Systems Strategy",
  score: 120,
  snippet: "Strategy source"
};

{
  const cards = getSuggestionCards("en");
  assert.deepEqual(
    cards.map((card) => card.id),
    ["vault-recall", "connect-note", "improve-draft"]
  );
}

{
  const resolution = resolveOpenFileTarget({
    paths: [
      "Proton/Qore Systems Cases.md",
      "Proton/Qore Systems Strategy.md"
    ],
    query: "qore systems",
    ambiguityGap: 9999
  });

  assert.equal(resolution.kind, "clarify");
}

{
  let searchedWeb = false;
  const context = await buildAutoWebContext({
    userRequest: "Find qore systems strategy in my vault",
    context: null,
    settings: {
      webSearchEnabled: true
    },
    isLocalOnlyCommandText: () => false,
    planContextWorkflow: () => ({
      requiresWeb: false,
      reason: "not needed"
    }),
    decideAutoWebResearch: () => ({
      query: "qore systems strategy",
      reason: "should be skipped"
    }),
    buildAutoWebResearchQuery: () => "qore systems strategy",
    rewriteWebResearchQuery: async (query) => query,
    searchWeb: async () => {
      searchedWeb = true;
      return {
        provider: "duckduckgo",
        results: []
      };
    }
  });

  assert.equal(context, null);
  assert.equal(searchedWeb, false);
}

{
  const requestContext = await buildUserMessageRequestContext({
    content: "Find qore systems strategy in my vault",
    useCurrentNote: true,
    useVaultSearch: true,
    outgoingAttachments: null,
    attachedVaultResults: null,
    readCurrentNoteContext: async () => ({ context: activeNote }),
    expandSemanticVaultQuery: async () => ["qore systems strategy"],
    searchSemanticVault: async () => [vaultResult]
  });

  assert.equal(requestContext.context?.currentNote?.path, activeNote.path);
  assert.deepEqual(requestContext.context?.vaultResults, [vaultResult]);
}

{
  const result = await prepareCurrentNoteUpdatePreview({
    settings: DEFAULT_SETTINGS,
    note: {
      path: activeNote.path,
      name: activeNote.name,
      content: activeNote.content
    },
    userPrompt: "Make this draft clearer",
    attachedFiles: null,
    messageIndex: 0,
    createdAt: 123,
    readProjectMemoryContext: async () => null,
    buildAutoWebContextForRequest: async () => null,
    formatAutoWebContextForPrompt: () => "",
    formatProjectMemoryForPrompt: () => "",
    cleanReplacement: (text) => text.trim(),
    stripSpeechHints: (text) => text,
    requestLlmChatCompletion: async () => "# Mindo\n\nA clearer idea."
  });

  assert.equal(result.assistantMessage.diffPreview?.status, "pending");
  assert.equal(result.assistantMessage.diffPreview?.sourcePath, activeNote.path);
}

console.log("firstValueFlowScenarios tests passed");
