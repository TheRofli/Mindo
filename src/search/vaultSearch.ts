import type { App, TFile } from "obsidian";
import type { VaultSearchResult } from "../types";

const MAX_SEARCH_RESULTS = 6;
const MAX_SNIPPET_CHARS = 520;
const MAX_HEADING_CHARS = 140;

interface IndexedMarkdownFile {
  path: string;
  basename: string;
  mtime: number;
  size: number;
  content: string;
  lowerContent: string;
  lowerPath: string;
  lowerBasename: string;
  headings: string[];
  lowerHeadings: string[];
  tags: string[];
  lowerTags: string[];
  searchableText: string;
}

const markdownIndex = new Map<string, IndexedMarkdownFile>();

export async function searchVaultMarkdown(
  app: App,
  query: string,
  limit = MAX_SEARCH_RESULTS
): Promise<VaultSearchResult[]> {
  const terms = tokenizeQuery(query);

  if (!terms.length) {
    return [];
  }

  const indexedFiles = await getSearchableIndexedMarkdownFiles(app);

  return searchIndexedMarkdownFiles(indexedFiles, terms, limit);
}

export async function searchVaultMarkdownMany(
  app: App,
  queries: string[],
  limit = MAX_SEARCH_RESULTS
): Promise<VaultSearchResult[][]> {
  const termsByQuery = queries.map((query) => tokenizeQuery(query));
  const indexedFiles = await getSearchableIndexedMarkdownFiles(app);

  return termsByQuery.map((terms) =>
    terms.length ? searchIndexedMarkdownFiles(indexedFiles, terms, limit) : []
  );
}

function searchIndexedMarkdownFiles(
  indexedFiles: IndexedMarkdownFile[],
  terms: string[],
  limit: number
): VaultSearchResult[] {
  return indexedFiles
    .map((indexedFile) => scoreIndexedFile(indexedFile, terms))
    .filter((result): result is VaultSearchResult => Boolean(result))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

async function getSearchableIndexedMarkdownFiles(
  app: App
): Promise<IndexedMarkdownFile[]> {
  const scoredResults = await Promise.all(
    app.vault
      .getMarkdownFiles()
      .filter((file) => !isIgnoredPath(file.path))
      .map((file) => getIndexedMarkdownFile(app, file))
  );

  return scoredResults;
}

export function formatVaultSearchResults(results: VaultSearchResult[]): string {
  if (!results.length) {
    return "No matching Markdown notes found.";
  }

  return results
    .map((result, index) =>
      [
        `${index + 1}. [[${result.path}]]`,
        `Score: ${result.score}${result.matches?.length ? ` (${result.matches.join(", ")})` : ""}`,
        result.heading ? `Heading: ${result.heading}` : "",
        result.snippet
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function scoreIndexedFile(
  indexedFile: IndexedMarkdownFile,
  terms: string[]
): VaultSearchResult | null {
  const phrase = terms.join(" ");
  const matchedIn = new Set<string>();
  let score = 0;

  if (phrase && indexedFile.lowerBasename.includes(phrase)) {
    score += 90;
    matchedIn.add("filename");
  }

  if (phrase && indexedFile.lowerPath.includes(phrase)) {
    score += 70;
    matchedIn.add("path");
  }

  if (
    phrase &&
    indexedFile.lowerHeadings.some((heading) => heading.includes(phrase))
  ) {
    score += 65;
    matchedIn.add("heading");
  }

  terms.forEach((term) => {
    const escapedTerm = escapeRegExp(term);
    const contentMatches = indexedFile.lowerContent.match(
      new RegExp(escapedTerm, "g")
    );
    const contentCount = contentMatches?.length ?? 0;

    if (indexedFile.lowerBasename.includes(term)) {
      score += 24;
      matchedIn.add("filename");
    } else if (isFuzzyMatch(indexedFile.lowerBasename, term)) {
      score += 8;
      matchedIn.add("filename");
    }

    if (indexedFile.lowerPath.includes(term)) {
      score += 12;
      matchedIn.add("path");
    }

    if (indexedFile.lowerHeadings.some((heading) => heading.includes(term))) {
      score += 18;
      matchedIn.add("heading");
    }

    if (indexedFile.lowerTags.some((tag) => tag.includes(term))) {
      score += 20;
      matchedIn.add("tag");
    }

    if (contentCount) {
      score += Math.min(18, contentCount);
      matchedIn.add("content");
    }
  });

  const coveredTerms = terms.filter((term) =>
    indexedFile.searchableText.includes(term)
  ).length;
  score += coveredTerms * 3;

  if (score === 0) {
    return null;
  }

  return {
    path: indexedFile.path,
    title: indexedFile.basename,
    score,
    snippet: createSnippet(indexedFile.content, terms, indexedFile.headings),
    heading: findBestHeading(indexedFile.headings, terms),
    matches: Array.from(matchedIn)
  };
}

async function getIndexedMarkdownFile(
  app: App,
  file: TFile
): Promise<IndexedMarkdownFile> {
  const cached = markdownIndex.get(file.path);

  if (
    cached &&
    cached.mtime === file.stat.mtime &&
    cached.size === file.stat.size &&
    cached.basename === file.basename
  ) {
    return cached;
  }

  const content = await app.vault.cachedRead(file);
  const lowerContent = content.toLowerCase();
  const lowerPath = file.path.toLowerCase();
  const lowerBasename = file.basename.toLowerCase();
  const headings = extractHeadings(content);
  const lowerHeadings = headings.map((heading) => heading.toLowerCase());
  const tags = extractTags(content);
  const lowerTags = tags.map((tag) => tag.toLowerCase());
  const indexedFile: IndexedMarkdownFile = {
    path: file.path,
    basename: file.basename,
    mtime: file.stat.mtime,
    size: file.stat.size,
    content,
    lowerContent,
    lowerPath,
    lowerBasename,
    headings,
    lowerHeadings,
    tags,
    lowerTags,
    searchableText: [
      lowerPath,
      lowerHeadings.join("\n"),
      lowerTags.join("\n"),
      lowerContent
    ].join("\n")
  };

  markdownIndex.set(file.path, indexedFile);
  pruneDeletedIndexEntries(app);

  return indexedFile;
}

function pruneDeletedIndexEntries(app: App): void {
  const existingPaths = new Set(app.vault.getMarkdownFiles().map((file) => file.path));

  for (const path of markdownIndex.keys()) {
    if (!existingPaths.has(path)) {
      markdownIndex.delete(path);
    }
  }
}

function createSnippet(
  content: string,
  terms: string[],
  headings: string[]
): string {
  const lowerContent = content.toLowerCase();
  const firstIndex = terms
    .map((term) => lowerContent.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];
  const start = Math.max(0, (firstIndex ?? 0) - 180);
  const snippet = content.slice(start, start + MAX_SNIPPET_CHARS).trim();

  if (firstIndex === undefined) {
    const bestHeading = findBestHeading(headings, terms);

    if (bestHeading) {
      return `Heading: ${bestHeading}`;
    }
  }

  return `${start > 0 ? "... " : ""}${snippet || content.slice(0, MAX_SNIPPET_CHARS).trim()}${
    start + MAX_SNIPPET_CHARS < content.length ? " ..." : ""
  }`;
}

function tokenizeQuery(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}_-]+/u)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2)
    )
  ).slice(0, 12);
}

function extractHeadings(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.match(/^#{1,6}\s+(.+)$/)?.[1]?.trim() ?? "")
    .filter(Boolean)
    .map((heading) =>
      heading.length > MAX_HEADING_CHARS
        ? `${heading.slice(0, MAX_HEADING_CHARS).trim()}...`
        : heading
    )
    .slice(0, 80);
}

function extractTags(content: string): string[] {
  const tagMatches = content.match(/#[\p{L}\p{N}_/-]+/gu) ?? [];
  return Array.from(new Set(tagMatches.map((tag) => tag.slice(1)))).slice(0, 80);
}

function findBestHeading(headings: string[], terms: string[]): string | undefined {
  let bestHeading: string | undefined;
  let bestScore = 0;

  headings.forEach((heading) => {
    const lowerHeading = heading.toLowerCase();
    const score = terms.filter((term) => lowerHeading.includes(term)).length;

    if (score > bestScore) {
      bestScore = score;
      bestHeading = heading;
    }
  });

  return bestHeading;
}

function isFuzzyMatch(value: string, term: string): boolean {
  if (term.length < 4) {
    return false;
  }

  let cursor = 0;

  for (const char of term) {
    cursor = value.indexOf(char, cursor);

    if (cursor === -1) {
      return false;
    }

    cursor += 1;
  }

  return true;
}

function isIgnoredPath(path: string): boolean {
  const lowerPath = path.toLowerCase();
  return (
    lowerPath.startsWith(".obsidian/") ||
    lowerPath.startsWith(".git/") ||
    lowerPath.startsWith(".contex-history/")
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
