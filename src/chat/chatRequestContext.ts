import type { LlmRequestContext } from "../types";
import type { AutoWebContext } from "../views/sidebarTypes";

export function attachAutoWebContextToRequest(
  context: LlmRequestContext | null,
  webContext: AutoWebContext | null
): LlmRequestContext | null {
  if (!webContext) {
    return context;
  }

  return {
    ...(context ?? {}),
    webResults: webContext.results,
    webResearchQuery: webContext.query,
    webSearchQuery: webContext.searchQuery,
    webResearchProvider: webContext.provider,
    webResearchFallbackReason: webContext.fallbackReason,
    webResearchReason: webContext.reason
  };
}

export function attachProjectMemoryToRequest(
  context: LlmRequestContext | null,
  projectMemory: string | null
): LlmRequestContext | null {
  if (!projectMemory || context?.projectMemory?.trim()) {
    return context;
  }

  return {
    ...(context ?? {}),
    projectMemory
  };
}
