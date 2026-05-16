import type { VaultSearchResult, WebSearchResult } from "../types";
import { appendSourceReferenceSection } from "../sources/sourceReferences";

export interface GeneratedNoteMarkdownOptions {
  includeSources: boolean;
  vaultSources?: VaultSearchResult[];
  webSources?: WebSearchResult[];
}

export function buildGeneratedNoteMarkdownContent(
  rawContent: string,
  title: string,
  path: string,
  options: GeneratedNoteMarkdownOptions
): string {
  const body = sanitizeStreamedNoteMarkdown(rawContent, title, path).trim();

  if (!options.includeSources) {
    return body;
  }

  return appendSourceReferenceSection(body, {
    vaultSources: options.vaultSources,
    webSources: options.webSources
  });
}

export function chooseGeneratedNoteTitle(options: {
  currentTitle: string;
  rawContent: string;
  userPrompt?: string;
}): string {
  const currentTitle = cleanupGeneratedTitle(options.currentTitle) || "Mindo Note";
  const generatedTitle = extractFirstMarkdownHeadingTitle(options.rawContent);

  if (!generatedTitle) {
    return currentTitle;
  }

  const normalizedCurrent = normalizeTitle(currentTitle);
  const normalizedGenerated = normalizeTitle(generatedTitle);

  if (!normalizedGenerated) {
    return currentTitle;
  }

  if (normalizedCurrent === normalizedGenerated) {
    return generatedTitle;
  }

  const prompt = normalizeTitle(options.userPrompt);
  const shouldTrustGeneratedTitle =
    asksModelToNameFile(prompt) ||
    isWeakGeneratedNoteTitle(currentTitle) ||
    getTitleSimilarity(normalizedCurrent, normalizedGenerated) >= 0.62;

  return shouldTrustGeneratedTitle ? generatedTitle : currentTitle;
}

export function extractFirstMarkdownHeadingTitle(content: string): string | null {
  const extracted = extractMarkdownFromAccidentalStructuredResponse(content);
  const markdown = stripSingleMarkdownFence(extracted);
  const heading = markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*#\s+(.+?)\s*$/)?.[1])
    .find((value): value is string => Boolean(value?.trim()));

  return cleanupGeneratedTitle(heading);
}

export function stripDuplicateLeadingTitle(
  content: string,
  title?: string,
  path?: string
): string {
  const expectedTitle = normalizeTitle(title || getBasenameWithoutExtension(path));

  if (!expectedTitle) {
    return content.trim();
  }

  const trimmed = content.trim();
  const frontmatterMatch = trimmed.match(/^(---\s*\n[\s\S]*?\n---\s*\n?)/);
  const frontmatter = frontmatterMatch?.[1] ?? "";
  const body = frontmatter ? trimmed.slice(frontmatter.length) : trimmed;
  const headingMatch = body.match(/^\s*#\s+(.+?)\s*(?:\n|$)/);

  if (!headingMatch?.[1]) {
    return stripDuplicatePlainLeadingTitle(frontmatter, body, expectedTitle, trimmed);
  }

  const headingTitle = normalizeTitle(headingMatch[1]);

  if (!isDuplicateTitle(headingTitle, expectedTitle)) {
    return stripDuplicatePlainLeadingTitle(frontmatter, body, expectedTitle, trimmed);
  }

  const bodyWithoutHeading = body.slice(headingMatch[0].length).replace(/^\n+/, "");

  return `${frontmatter}${bodyWithoutHeading}`.trim();
}

export function removeDuplicateLeadingTitle(
  title: string,
  content: string
): string {
  return stripDuplicateLeadingTitle(content, title);
}

function stripDuplicatePlainLeadingTitle(
  frontmatter: string,
  body: string,
  expectedTitle: string,
  fallback: string
): string {
  const plainTitleMatch = body.match(/^\s*(.+?)\s*(?:\n|$)/);

  if (!plainTitleMatch?.[1]) {
    return fallback;
  }

  const firstLine = plainTitleMatch[1]
    .replace(/[:：]\s*$/, "")
    .trim();

  if (!isDuplicateTitle(normalizeTitle(firstLine), expectedTitle)) {
    return fallback;
  }

  const bodyWithoutTitle = body
    .slice(plainTitleMatch[0].length)
    .replace(/^\n+/, "");

  return `${frontmatter}${bodyWithoutTitle}`.trim();
}

export function sanitizeStreamedNoteMarkdown(
  content: string,
  title?: string,
  path?: string
): string {
  const extracted = extractMarkdownFromAccidentalStructuredResponse(content);
  const unfenced = stripSingleMarkdownFence(extracted);

  return stripDuplicateLeadingTitle(unfenced, title, path);
}

function extractMarkdownFromAccidentalStructuredResponse(content: string): string {
  const cleaned = stripSingleJsonFence(content.trim());

  try {
    const parsed = JSON.parse(cleaned) as { content?: unknown };

    if (typeof parsed.content === "string") {
      return parsed.content.trim();
    }
  } catch {
    // The model followed the Markdown instruction. Keep the raw text.
  }

  return cleaned;
}

function stripSingleJsonFence(content: string): string {
  const fenceMatch = content.match(/^```(?:json)?[ \t]*\n([\s\S]*?)\s*```$/i);

  return fenceMatch?.[1]?.trim() ?? content;
}

function stripSingleMarkdownFence(content: string): string {
  const fenceMatch = content
    .trim()
    .match(/^```(?:markdown|md)?[ \t]*\n([\s\S]*?)\s*```$/i);

  return fenceMatch?.[1]?.trim() ?? content.trim();
}

function getBasenameWithoutExtension(path?: string): string {
  const filename = path?.split(/[\\/]/).pop() ?? "";

  return filename.replace(/\.md$/i, "");
}

function normalizeTitle(title?: string): string {
  return (title ?? "")
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanupGeneratedTitle(title?: string): string | null {
  const cleaned = (title ?? "")
    .replace(/\.md$/i, "")
    .replace(/[\\/:*?"<>|#^[\]`*_]+/g, " ")
    .replace(
      /\s+(?:\u0432|\u0438\u0437)\s+(?:\u044d\u0442\u043e\u0439\s+|\u0442\u0435\u043a\u0443\u0449\u0435\u0439\s+)?(?:\u043f\u0430\u043f\u043a|\u043f\u0430\u0440\u043a)[\u0430\u0435\u0443\u0438]\s+[\p{L}\p{N}_ -]+$/iu,
      " "
    )
    .replace(
      /\s+(?:in|inside)\s+(?:the\s+)?(?:current\s+)?folder\s+[\p{L}\p{N}_ -]+$/iu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 2 || cleaned.toLowerCase() === "json") {
    return null;
  }

  return cleaned.slice(0, 90);
}

function asksModelToNameFile(normalizedPrompt?: string): boolean {
  const prompt = normalizedPrompt ?? "";

  if (
    prompt.includes("название файла придумай") ||
    prompt.includes("придумай название")
  ) {
    return true;
  }

  return (
    prompt.includes("название файла придумай") ||
    prompt.includes("придумай название") ||
    prompt.includes("name the file yourself") ||
    prompt.includes("choose the file name") ||
    prompt.includes("invent the title")
  );
}

function isWeakGeneratedNoteTitle(title: string): boolean {
  const normalized = normalizeTitle(title);

  if (
    /^(создай|создать|сделай|заведи|сохрани|открой|create|make|draft|new|only|только)(?:\s|$)/u.test(
      normalized
    ) ||
    /\b(файл|заметк|страниц|папк|парк|current folder|this folder|предложить правку|name the file)\b/u.test(
      normalized
    ) ||
    /^(?:с|со|with)\s+[\p{L}\p{N}]/u.test(normalized)
  ) {
    return true;
  }

  return (
    !normalized ||
    /^(создай|создать|сделай|заведи|открой|create|make|draft|new|only|только)(?:\s|$)/u.test(
      normalized
    ) ||
    /\b(файл|заметк|страниц|папк|парк|current folder|this folder|предложить правку|name the file)\b/u.test(
      normalized
    )
  );
}

function isDuplicateTitle(candidate: string, expected: string): boolean {
  if (!candidate || !expected) {
    return false;
  }

  if (candidate === expected) {
    return true;
  }

  if (
    (candidate.includes(expected) || expected.includes(candidate)) &&
    Math.min(candidate.length, expected.length) >= 6
  ) {
    return true;
  }

  return getTitleSimilarity(candidate, expected) >= 0.82;
}

function getTitleSimilarity(left: string, right: string): number {
  const maxLength = Math.max(left.length, right.length);

  if (!maxLength) {
    return 1;
  }

  return 1 - levenshteinDistance(left, right) / maxLength;
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length] ?? 0;
}
