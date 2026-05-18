import { strict as assert } from "node:assert";

import { buildUserMessageRequestContext } from "../src/chat/userMessageRequestContext";
import type { CurrentNoteContext, LlmFileAttachment, VaultSearchResult } from "../src/types";

const currentNote: CurrentNoteContext = {
  path: "Test/Test.md",
  name: "Test",
  content: "Current note body",
  isTruncated: false,
  originalLength: 17,
  includedLength: 17
};

const vaultResult: VaultSearchResult = {
  path: "Vault/Match.md",
  score: 10,
  snippet: "Match"
};

const attachment: LlmFileAttachment = {
  id: "file-1",
  name: "doc.txt",
  mimeType: "text/plain",
  size: 12,
  text: "hello"
};

async function run() {
  {
    const result = await buildUserMessageRequestContext({
      content: "hello",
      liveDialogue: true,
      useCurrentNote: true,
      useVaultSearch: false,
      outgoingAttachments: null,
      attachedVaultResults: null,
      readCurrentNoteContext: async () => ({ context: currentNote }),
      expandSemanticVaultQuery: async () => {
        throw new Error("search should not run");
      },
      searchSemanticVault: async () => {
        throw new Error("search should not run");
      }
    });

    assert.equal(result.usedAttachedFiles, false);
    assert.equal(result.usedAttachedVaultResults, false);
    assert.equal(result.context?.liveDialogue, true);
    assert.deepEqual(result.context?.currentNote, currentNote);
  }

  {
    let expandedQuery = "";
    const result = await buildUserMessageRequestContext({
      content: "find architecture",
      liveDialogue: false,
      useCurrentNote: false,
      useVaultSearch: true,
      outgoingAttachments: null,
      attachedVaultResults: null,
      readCurrentNoteContext: async () => ({ context: null }),
      expandSemanticVaultQuery: async (query) => {
        expandedQuery = query;
        return ["architecture"];
      },
      searchSemanticVault: async (query, variants, limit) => {
        assert.equal(query, "find architecture");
        assert.deepEqual(variants, ["architecture"]);
        assert.equal(limit, 8);
        return [vaultResult];
      }
    });

    assert.equal(expandedQuery, "find architecture");
    assert.deepEqual(result.context?.vaultResults, [vaultResult]);
  }

  {
    let semanticSearchRan = false;
    const result = await buildUserMessageRequestContext({
      content: "Find qore systems strategy in my vault",
      liveDialogue: false,
      useCurrentNote: true,
      useVaultSearch: true,
      outgoingAttachments: null,
      attachedVaultResults: null,
      readCurrentNoteContext: async () => ({ context: currentNote }),
      expandSemanticVaultQuery: async (query) => {
        assert.equal(query, "Find qore systems strategy in my vault");
        return ["qore systems strategy"];
      },
      searchSemanticVault: async (query, variants, limit) => {
        semanticSearchRan = true;
        assert.equal(query, "Find qore systems strategy in my vault");
        assert.deepEqual(variants, ["qore systems strategy"]);
        assert.equal(limit, 8);
        return [vaultResult];
      }
    });

    assert.equal(semanticSearchRan, true);
    assert.deepEqual(result.context?.currentNote, currentNote);
    assert.deepEqual(result.context?.vaultResults, [vaultResult]);
  }

  {
    const result = await buildUserMessageRequestContext({
      content: "use attached",
      liveDialogue: false,
      useCurrentNote: false,
      useVaultSearch: true,
      outgoingAttachments: [attachment],
      attachedVaultResults: [vaultResult],
      readCurrentNoteContext: async () => ({ context: null }),
      expandSemanticVaultQuery: async () => {
        throw new Error("search should not run");
      },
      searchSemanticVault: async () => {
        throw new Error("search should not run");
      }
    });

    assert.equal(result.usedAttachedFiles, true);
    assert.equal(result.usedAttachedVaultResults, true);
    assert.deepEqual(result.context?.attachments, [attachment]);
    assert.deepEqual(result.context?.vaultResults, [vaultResult]);
  }

  {
    const result = await buildUserMessageRequestContext({
      content: "plain",
      liveDialogue: false,
      useCurrentNote: false,
      useVaultSearch: false,
      outgoingAttachments: null,
      attachedVaultResults: null,
      readCurrentNoteContext: async () => ({ context: null }),
      expandSemanticVaultQuery: async () => [],
      searchSemanticVault: async () => []
    });

    assert.equal(result.context, null);
  }
}

run()
  .then(() => {
    console.log("userMessageRequestContext tests passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
