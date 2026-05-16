import assert from "node:assert/strict";

import type { CreateNoteProposal } from "../src/modals/CreateNoteModal";
import {
  placeCreateNoteProposalInFolder,
  prepareCreateNoteProposal,
  refineCreateNoteProposal,
  refineCurrentNoteProposal
} from "../src/notes/createNoteProposalWorkflow";

{
  const uniquePaths: string[] = [];
  const proposal = await prepareCreateNoteProposal({
    proposalText: JSON.stringify({
      title: "LiveShare",
      path: "Test/LiveShare.md",
      content: "# LiveShare\n\nProject body"
    }),
    fallbackFolder: "Contex Inbox",
    getUniqueNotePath: async (path) => {
      uniquePaths.push(path);
      return `${path}`;
    }
  });

  assert.deepEqual(uniquePaths, ["Test/LiveShare.md"]);
  assert.deepEqual(proposal, {
    path: "Test/LiveShare.md",
    content: "Project body"
  });
}

{
  const proposal = await prepareCreateNoteProposal({
    proposalText: JSON.stringify({
      title: "json",
      path: "```json.md",
      content: "# Better Title\n\nBody"
    }),
    fallbackFolder: "Inbox",
    getUniqueNotePath: async (path) => path
  });

  assert.equal(proposal.path, "Inbox/Better Title.md");
  assert.equal(proposal.content, "Body");
}

{
  const proposal = await placeCreateNoteProposalInFolder({
    proposal: {
      path: "```json.md",
      content: "# Human Title\n\nBody"
    },
    folder: "/Obsidian//Plans/",
    getUniqueNotePath: async (path) => path
  });

  assert.equal(proposal.path, "Obsidian/Plans/Human Title.md");
  assert.equal(proposal.content, "# Human Title\n\nBody");
}

{
  const originalProposal: CreateNoteProposal = {
    path: "Research/Draft.md",
    content: "Draft"
  };
  let called = false;
  const proposal = await refineCreateNoteProposal({
    proposal: originalProposal,
    selectedContext: {
      path: "Source.md",
      text: "Selected text"
    },
    instruction: " ",
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
  const proposal = await refineCreateNoteProposal({
    proposal: {
      path: "Research/Draft.md",
      content: "Draft"
    },
    selectedContext: {
      path: "Source.md",
      text: "Selected text"
    },
    instruction: "make it clearer",
    settings: {
      model: "test"
    },
    createdAt: 456,
    onClearError: () => statuses.push("clear-error"),
    onStatus: (status) => statuses.push(status),
    requestLlmChatCompletion: async (_settings, messages) => {
      assert.ok(messages[0].content.includes("User instruction:\nmake it clearer"));
      return JSON.stringify({
        title: "Clear Draft",
        content: "# Clear Draft\n\nClear body"
      });
    },
    getUniqueNotePath: async (path) => path
  });

  assert.deepEqual(statuses, [
    "clear-error",
    "Status: Updating note draft",
    "Status: Ready"
  ]);
  assert.equal(proposal.path, "Mindo Inbox/Clear Draft.md");
  assert.equal(proposal.content, "Clear body");
}

{
  const proposal = await refineCurrentNoteProposal({
    proposal: {
      path: "Research/Draft.md",
      content: "Draft"
    },
    sourceContext: {
      path: "Source.md",
      text: "Source content"
    },
    instruction: "add risks",
    fallbackFolder: "Project Notes",
    promptLines: ["Create a project note."],
    settings: {},
    createdAt: 789,
    requestLlmChatCompletion: async (_settings, messages) => {
      assert.ok(messages[0].content.includes("Original source note path:\nSource.md"));
      return JSON.stringify({
        title: "Risk Plan",
        content: "# Risk Plan\n\nRisk body"
      });
    },
    getUniqueNotePath: async (path) => path
  });

  assert.equal(proposal.path, "Project Notes/Risk Plan.md");
  assert.equal(proposal.content, "Risk body");
}

console.log("createNoteProposalWorkflow tests passed");
