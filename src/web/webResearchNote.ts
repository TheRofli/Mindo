import { escapeMarkdownLinkText } from "../chat/chatMessages";
import type {
  SelectedTextContext,
  WebSearchResult
} from "../types";

export interface BuildWebResearchNoteContentOptions {
  query: string;
  searchQuery: string;
  summary: string;
  checkedDate: string;
  results: WebSearchResult[];
}

export interface BuildWebResearchSourceContextOptions {
  query: string;
  contentLength: number;
  results: WebSearchResult[];
  formatWebSearchContext: (results: WebSearchResult[]) => string;
}

export function buildWebResearchNoteContent(
  options: BuildWebResearchNoteContentOptions
): string {
  const { query, searchQuery, summary, checkedDate, results } = options;

  return [
    `# Research: ${query}`,
    "",
    `Checked: ${checkedDate}`,
    searchQuery !== query ? `Search query: ${searchQuery}` : "",
    "",
    "## Summary",
    "",
    summary.trim(),
    "",
    "## Sources",
    "",
    ...results.map((result, index) =>
      [
        `${index + 1}. [${escapeMarkdownLinkText(result.title)}](${result.url})`,
        result.source ? `   - Source: ${result.source}` : "",
        result.sourceType ? `   - Type: ${result.sourceType}` : "",
        result.publishedDate ? `   - Published: ${result.publishedDate}` : "",
        result.freshnessHint ? `   - Date signal: ${result.freshnessHint}` : "",
        result.qualityNotes?.length
          ? `   - Quality: ${result.qualityNotes.join("; ")}`
          : "",
        result.snippet ? `   - Snippet: ${result.snippet}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    )
  ].join("\n");
}

export function buildWebResearchSourceContext(
  options: BuildWebResearchSourceContextOptions
): SelectedTextContext {
  return {
    path: "Web Research",
    name: options.query,
    text: options.formatWebSearchContext(options.results),
    isTruncated: false,
    originalLength: options.contentLength,
    includedLength: options.contentLength
  };
}
