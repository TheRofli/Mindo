import assert from "node:assert/strict";

import {
  buildChatNoteSourceContext,
  buildConversationNotePrompt,
  prepareSaveChatAsNoteDraft
} from "../src/chat/saveChatAsNoteWorkflow";
import { DEFAULT_SETTINGS, type ChatMessage } from "../src/types";

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

{
  const sourceContext = buildChatNoteSourceContext("Chat text");

  assert.equal(sourceContext.path, "Mindo Chat");
  assert.equal(sourceContext.text, "Chat text");
  assert.equal(sourceContext.originalLength, 9);
}

{
  const prompt = buildConversationNotePrompt("User: hello");

  assert.ok(prompt.includes("Turn this chat conversation into a useful Markdown note."));
  assert.ok(prompt.includes('"path":"Mindo Chats/... .md"'));
  assert.ok(prompt.includes("Conversation:\nUser: hello"));
}

{
  const draft = await prepareSaveChatAsNoteDraft({
    messages,
    settings: DEFAULT_SETTINGS,
    requestLlmChatCompletion: async () =>
      '{"title":"Project chat","path":"Mindo Chats/project-chat.md","content":"# Project chat"}',
    prepareCreateNoteProposal: async (text, fallbackFolder) => ({
      path: `${fallbackFolder}/project-chat.md`,
      content: text
    }),
    getFallbackPath: async () => "Mindo Chats/fallback.md"
  });

  assert.equal(draft.usedFallback, false);
  assert.equal(draft.proposal.path, "Mindo Chats/project-chat.md");
  assert.equal(draft.sourceContext.text.includes("Create a plan"), true);
  assert.equal(draft.error, undefined);
}

{
  const draft = await prepareSaveChatAsNoteDraft({
    messages,
    settings: DEFAULT_SETTINGS,
    requestLlmChatCompletion: async () => {
      throw new Error("offline");
    },
    prepareCreateNoteProposal: async () => {
      throw new Error("should not be called");
    },
    getFallbackPath: async (title) => `Mindo Chats/${title}.md`
  });

  assert.equal(draft.usedFallback, true);
  assert.equal(draft.proposal.path, "Mindo Chats/Create a plan.md");
  assert.equal(draft.proposal.content.includes("Plan content"), true);
  assert.equal((draft.error as Error).message, "offline");
}

console.log("saveChatAsNoteWorkflow tests passed");
