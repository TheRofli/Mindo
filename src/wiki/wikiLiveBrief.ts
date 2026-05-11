import type { VaultSearchResult } from "../types";

export interface WikiLiveBriefOptions {
  maxItems?: number;
  maxSnippetChars?: number;
}

const DEFAULT_MAX_ITEMS = 3;
const DEFAULT_MAX_SNIPPET_CHARS = 220;

export function buildWikiLiveBrief(
  results: VaultSearchResult[],
  options: WikiLiveBriefOptions = {}
): string {
  const maxItems = options.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxSnippetChars = options.maxSnippetChars ?? DEFAULT_MAX_SNIPPET_CHARS;
  const wikiResults = results.filter(isWikiResult).slice(0, maxItems);
  const selected = wikiResults.length
    ? wikiResults
    : results.slice(0, Math.min(2, maxItems));

  if (!selected.length) {
    return "";
  }

  const heading = wikiResults.length
    ? "Contex Wiki live memory"
    : "Relevant live context";

  return [
    heading,
    "Use this as compact background for spoken answers. Speak from this memory, but keep the answer short and conversational.",
    "",
    ...selected.map((result, index) =>
      [
        `${index + 1}. ${result.title}`,
        `Path: ${result.path}`,
        `Note: ${compactWhitespace(result.snippet).slice(0, maxSnippetChars)}`
      ].join("\n")
    )
  ].join("\n\n");
}

function isWikiResult(result: VaultSearchResult): boolean {
  return (
    result.matches?.includes("wiki") === true ||
    /(^|\/)Contex Wiki\/Wiki\//i.test(result.path)
  );
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
