import { upsertContexCodeBlock, type ContexCodeBlockRenderOptions } from "./planBlock";
import type { ContexCodePlan } from "./planTypes";

export function normalizeGeneratedProjectMarkdown(input: string, noteTitle: string): string {
  const parsedJson = parseJsonWrappedMarkdown(input);
  const source = parsedJson?.content ?? input;
  const withoutFence = stripOuterJsonFence(source);
  const normalizedLineBreaks = withoutFence.replace(/\r\n/g, "\n");
  const withoutDuplicateHeadings = stripDuplicateLeadingHeadings(
    normalizedLineBreaks,
    noteTitle
  );

  return withoutDuplicateHeadings.trim();
}

export function extractProjectNoteTitle(input: string, fallback: string): string {
  const parsedJson = parseJsonWrappedMarkdown(input);
  const source = parsedJson?.content ?? input;
  const heading = source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.match(/^\s*#\s+(.+?)\s*$/)?.[1])
    .find((value): value is string => Boolean(value?.trim()));

  return (
    cleanupProjectTitle(heading) ??
    cleanupProjectTitle(parsedJson?.title) ??
    cleanupProjectTitle(fallback) ??
    "Mindo Code Plan"
  );
}

export function syncProjectNoteWithPlan(
  markdown: string,
  plan: ContexCodePlan,
  options: ContexCodeBlockRenderOptions = {}
): string {
  const normalized = normalizeGeneratedProjectMarkdown(markdown, plan.title);
  return upsertContexCodeBlock(normalized, plan, options);
}

export function parseJsonWrappedMarkdown(
  input: string
): { title?: string; path?: string; content: string } | null {
  const fenced = input.match(/^```(?:json)?\s*\n([\s\S]+?)\n```\s*$/iu)?.[1] ?? input;
  const trimmed = fenced.trim();

  if (!trimmed.startsWith("{")) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const content = typeof parsed.content === "string" ? parsed.content : undefined;
    if (!content) {
      return null;
    }

    return {
      title: typeof parsed.title === "string" ? parsed.title : undefined,
      path: typeof parsed.path === "string" ? parsed.path : undefined,
      content
    };
  } catch {
    return null;
  }
}

function stripOuterJsonFence(value: string): string {
  return value
    .replace(/^```(?:json)?\s*\n/iu, "")
    .replace(/\n```\s*$/u, "");
}

function stripDuplicateLeadingHeadings(markdown: string, noteTitle: string): string {
  let lines = markdown.split("\n");
  const normalizedTitle = normalizeHeadingText(noteTitle);

  while (lines.length > 0) {
    const first = lines[0].trim();
    if (!first.startsWith("#")) {
      break;
    }

    const headingText = normalizeHeadingText(first.replace(/^#+\s*/u, ""));
    if (headingText !== normalizedTitle) {
      break;
    }

    lines = lines.slice(1);
    while (lines[0]?.trim() === "") {
      lines = lines.slice(1);
    }
  }

  return lines.join("\n");
}

function normalizeHeadingText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`*_#>]+/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanupProjectTitle(value: string | undefined): string | null {
  const cleaned = (value ?? "")
    .replace(/\.md$/i, "")
    .replace(/[\\/:*?"<>|#^[\]`*_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 2 || cleaned.toLowerCase() === "json") {
    return null;
  }

  return cleaned.slice(0, 90);
}
