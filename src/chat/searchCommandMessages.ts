import type {
  ChatMessage,
  VaultSearchResult,
  VaultSourceSection,
  WebSearchResult
} from "../types";

export type SlashCommandKind = "search" | "web" | "rag";

export interface SearchCommandMessageOptions {
  messageIndex: number;
  createdAt?: number;
}

function getMessageTimestamp(createdAt?: number): number {
  return createdAt ?? Date.now();
}

function createMessageId(createdAt: number, messageIndex: number): string {
  return `${createdAt}-${messageIndex}`;
}

export function createSlashCommandUserMessage(
  options: {
    command: SlashCommandKind;
    query: string;
  } & SearchCommandMessageOptions
): ChatMessage {
  const createdAt = getMessageTimestamp(options.createdAt);

  return {
    id: createMessageId(createdAt, options.messageIndex),
    role: "user",
    content: `/${options.command} ${options.query}`,
    createdAt
  };
}

export function createVaultSearchAssistantMessage(
  options: {
    content: string;
    query: string;
    results: VaultSearchResult[];
  } & SearchCommandMessageOptions
): ChatMessage {
  const createdAt = getMessageTimestamp(options.createdAt);

  return {
    id: createMessageId(createdAt, options.messageIndex),
    role: "assistant",
    content: options.content,
    createdAt,
    vaultSearchQuery: options.query,
    vaultSearchResults: options.results
  };
}

export function createWebResearchAssistantMessage(
  options: {
    content: string;
    query: string;
    searchQuery: string;
    results: WebSearchResult[];
    provider: string;
    fallbackReason?: string;
  } & SearchCommandMessageOptions
): ChatMessage {
  const createdAt = getMessageTimestamp(options.createdAt);

  return {
    id: createMessageId(createdAt, options.messageIndex),
    role: "assistant",
    content: options.content,
    createdAt,
    webResearchQuery: options.query,
    webSearchQuery: options.searchQuery,
    webResearchResults: options.results,
    webResearchProvider: options.provider,
    webResearchFallbackReason: options.fallbackReason,
    webSources: options.results
  };
}

export function createSemanticVaultAssistantMessage(
  options: {
    content: string;
    query: string;
    results: VaultSearchResult[];
    sections: VaultSourceSection[];
  } & SearchCommandMessageOptions
): ChatMessage {
  const createdAt = getMessageTimestamp(options.createdAt);

  return {
    id: createMessageId(createdAt, options.messageIndex),
    role: "assistant",
    content: options.content,
    createdAt,
    semanticVaultQuery: options.query,
    semanticVaultSections: options.sections,
    sources: options.results
  };
}
