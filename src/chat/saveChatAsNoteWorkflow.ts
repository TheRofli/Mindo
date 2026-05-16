import type {
  ChatMessage,
  ContexSettings,
  SelectedTextContext
} from "../types";
import {
  serializeChatMessagesForNote,
  trimChatTitle
} from "./chatMessages";

export interface ChatNoteProposalLike {
  path: string;
  content: string;
}

export interface PrepareSaveChatAsNoteDraftOptions {
  messages: ChatMessage[];
  settings: ContexSettings;
  requestLlmChatCompletion: (
    settings: ContexSettings,
    messages: ChatMessage[]
  ) => Promise<string>;
  prepareCreateNoteProposal: (
    proposalText: string,
    fallbackFolder: string
  ) => Promise<ChatNoteProposalLike>;
  getFallbackPath: (title: string) => Promise<string>;
}

export interface SaveChatAsNoteDraft {
  proposal: ChatNoteProposalLike;
  sourceContext: SelectedTextContext;
  usedFallback: boolean;
  error?: unknown;
}

export function buildChatNoteSourceContext(chatText: string): SelectedTextContext {
  return {
    path: "Mindo Chat",
    name: "Mindo Chat",
    text: chatText,
    isTruncated: false,
    originalLength: chatText.length,
    includedLength: chatText.length
  };
}

export function buildConversationNotePrompt(chatText: string): string {
  return [
    "Turn this chat conversation into a useful Markdown note.",
    "Return JSON only with this shape:",
    '{"title":"...","path":"Mindo Chats/... .md","content":"..."}',
    "Use a concise title. Put the note under Mindo Chats.",
    "Keep decisions, useful context, tasks, links, file paths, and open questions.",
    "Do not include code fences or hidden TTS comments.",
    "",
    "Conversation:",
    chatText
  ].join("\n");
}

export async function prepareSaveChatAsNoteDraft(
  options: PrepareSaveChatAsNoteDraftOptions
): Promise<SaveChatAsNoteDraft> {
  const chatText = serializeChatMessagesForNote(options.messages);

  if (!chatText.trim()) {
    throw new Error("There is no chat conversation to save yet.");
  }

  const sourceContext = buildChatNoteSourceContext(chatText);

  try {
    const createdAt = Date.now();
    const proposalText = await options.requestLlmChatCompletion(
      options.settings,
      [
        {
          id: `${createdAt}-conversation-note`,
          role: "user",
          content: buildConversationNotePrompt(chatText),
          createdAt
        }
      ]
    );
    const proposal = await options.prepareCreateNoteProposal(
      proposalText,
      "Mindo Chats"
    );

    return {
      proposal,
      sourceContext,
      usedFallback: false
    };
  } catch (error) {
    const title = trimChatTitle(
      options.messages[0]?.content ?? "Mindo chat"
    );
    const proposal = {
      path: await options.getFallbackPath(title),
      content: chatText
    };

    return {
      proposal,
      sourceContext,
      usedFallback: true,
      error
    };
  }
}
