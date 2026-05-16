import assert from "node:assert/strict";

import {
  prepareResearchNoteProposal,
  refineResearchNoteProposal
} from "../src/research/researchNoteProposal";

{
  const uniquePathCalls: string[] = [];

  const proposal = await prepareResearchNoteProposal({
    proposalText: JSON.stringify({
      title: "Modern Local LLMs",
      content: "# Modern Local LLMs\n\nBody"
    }),
    targetFolder: "/Obsidian//Research",
    commandText: "создай заметку про современные локальные LLM",
    getUniqueNotePath: async (path) => {
      uniquePathCalls.push(path);
      return path;
    }
  });

  assert.deepEqual(uniquePathCalls, ["Obsidian/Research/Modern Local LLMs.md"]);
  assert.equal(proposal.path, "Obsidian/Research/Modern Local LLMs.md");
  assert.equal(proposal.content, "Body");
}

{
  const proposal = await prepareResearchNoteProposal({
    proposalText: "```json\n{\"title\":\"json\",\"content\":\"# Fallback Title\\n\\nBody\"}\n```",
    targetFolder: "Inbox",
    commandText: "create a research note about local TTS in 2026",
    getUniqueNotePath: async (path) => path
  });

  assert.equal(proposal.path, "Inbox/about local TTS in 2026.md");
  assert.equal(proposal.content, "# Fallback Title\n\nBody");
}

{
  const originalProposal = {
    path: "Research/Old.md",
    content: "Old content"
  };
  let called = false;

  const proposal = await refineResearchNoteProposal({
    proposal: originalProposal,
    commandText: "create research note",
    sourceText: "Source",
    targetFolder: "Research",
    instruction: "   ",
    settings: {},
    requestLlmChatCompletion: async () => {
      called = true;
      return "";
    },
    getUniqueNotePath: async (path) => path
  });

  assert.equal(proposal, originalProposal);
  assert.equal(called, false);
}

{
  const statuses: string[] = [];
  const contents: string[] = [];

  const proposal = await refineResearchNoteProposal({
    proposal: {
      path: "Research/Old.md",
      content: "Old content"
    },
    commandText: "create research note",
    sourceText: "Source A",
    targetFolder: "Research",
    instruction: "add risks",
    settings: {
      model: "test"
    },
    createdAt: 123,
    onClearError: () => statuses.push("clear-error"),
    onStatus: (status) => statuses.push(status),
    requestLlmChatCompletion: async (_settings, messages) => {
      contents.push(messages[0].content);
      return JSON.stringify({
        title: "Updated Research",
        content: "# Updated Research\n\nUpdated content"
      });
    },
    getUniqueNotePath: async (path) => path
  });

  assert.deepEqual(statuses, [
    "clear-error",
    "Status: Refining research note",
    "Status: Ready"
  ]);
  assert.ok(contents[0].includes("User instruction:\nadd risks"));
  assert.equal(proposal.path, "Research/Updated Research.md");
  assert.equal(proposal.content, "Updated content");
}

console.log("researchNoteProposal tests passed");
