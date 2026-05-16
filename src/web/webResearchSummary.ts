import type { WebSearchResult } from "../types";

export interface WebResearchSummaryMessage {
  id: string;
  role: "user";
  content: string;
  createdAt: number;
}

export interface BuildWebResearchSummaryPromptOptions {
  query: string;
  searchQuery?: string;
  checkedDate: string;
  results: WebSearchResult[];
  formatWebSearchContext: (results: WebSearchResult[]) => string;
}

export interface SummarizeWebResearchOptions<TSettings> {
  query: string;
  searchQuery?: string;
  checkedDate?: string;
  createdAt?: number;
  settings: TSettings;
  results: WebSearchResult[];
  formatWebSearchContext: (results: WebSearchResult[]) => string;
  requestLlmChatCompletion: (
    settings: TSettings,
    messages: WebResearchSummaryMessage[]
  ) => Promise<string>;
}

export function buildWebResearchSummaryPrompt(
  options: BuildWebResearchSummaryPromptOptions
): string {
  return [
    "Use the provided web search results to answer the user's research question.",
    "Be concise, factual, and explicit about uncertainty.",
    "Do not include a Sources section; the UI renders clickable web sources separately.",
    "Do not invent facts that are not supported by the snippets.",
    "Use the source Type and Quality notes to distinguish direct news/releases from guides, SEO roundups, docs, and background references.",
    "If the user asked for latest/news but sources are mostly guides or roundups, say that clearly before summarizing.",
    `Date checked: ${options.checkedDate}`,
    "",
    "Question:",
    options.query,
    options.searchQuery && options.searchQuery !== options.query
      ? `Search query: ${options.searchQuery}`
      : "",
    "",
    "Search results:",
    options.formatWebSearchContext(options.results)
  ].join("\n");
}

export async function summarizeWebResearch<TSettings>(
  options: SummarizeWebResearchOptions<TSettings>
): Promise<string> {
  const createdAt = options.createdAt ?? Date.now();
  const checkedDate =
    options.checkedDate ?? new Date(createdAt).toISOString().slice(0, 10);

  return options.requestLlmChatCompletion(options.settings, [
    {
      id: `${createdAt}-web-research-summary`,
      role: "user",
      content: buildWebResearchSummaryPrompt({
        query: options.query,
        searchQuery: options.searchQuery,
        checkedDate,
        results: options.results,
        formatWebSearchContext: options.formatWebSearchContext
      }),
      createdAt
    }
  ]);
}
