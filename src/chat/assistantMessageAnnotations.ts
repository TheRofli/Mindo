import type { ChatMessage, LlmRequestContext, VaultSearchResult } from "../types";

export interface AssistantMessageAnnotationResult {
  rememberVaultSearch: {
    query: string;
    results: VaultSearchResult[];
  } | null;
}

export function annotateAssistantMessageFromContext(
  assistantMessage: ChatMessage,
  requestContext: LlmRequestContext | null | undefined,
  userContent: string
): AssistantMessageAnnotationResult {
  let rememberVaultSearch: AssistantMessageAnnotationResult["rememberVaultSearch"] =
    null;

  if (requestContext?.vaultResults?.length) {
    assistantMessage.sources = requestContext.vaultResults;
    rememberVaultSearch = {
      query: userContent,
      results: requestContext.vaultResults
    };
  }

  if (requestContext?.webResults?.length) {
    assistantMessage.webResearchQuery =
      requestContext.webResearchQuery ?? userContent;
    assistantMessage.webSearchQuery =
      requestContext.webSearchQuery ??
      requestContext.webResearchQuery ??
      userContent;
    assistantMessage.webResearchResults = requestContext.webResults;
    assistantMessage.webResearchProvider =
      requestContext.webResearchProvider ?? undefined;
    assistantMessage.webResearchFallbackReason =
      requestContext.webResearchFallbackReason ?? undefined;
    assistantMessage.webSources = requestContext.webResults;
  }

  return {
    rememberVaultSearch
  };
}
