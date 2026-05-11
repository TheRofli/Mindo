import type { CreateNoteProposal } from "../modals/CreateNoteModal";

export interface ParsedCreateNoteProposal extends Partial<CreateNoteProposal> {
  title?: string;
}

export function parseCreateNoteProposalText(
  content: string
): ParsedCreateNoteProposal {
  const cleaned = cleanJsonLikeResponse(content);

  try {
    const parsed = JSON.parse(cleaned) as Partial<CreateNoteProposal> & {
      title?: string;
    };

    return normalizeParsedProposal(parsed);
  } catch {
    const loose = parseLooseCreateNoteProposal(cleaned);

    if (loose.content || loose.title || loose.path) {
      if (!loose.content && looksLikeJsonObject(cleaned)) {
        return {
          ...loose,
          content: ""
        };
      }

      return loose;
    }

    return {
      title: firstSafeMarkdownHeading(content) ?? "Contex Note",
      content: sanitizeRawCreateNoteFallback(content)
    };
  }
}

export function cleanJsonLikeResponse(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);

  if (fenceMatch?.[1]) {
    return fenceMatch[1].trim();
  }

  const innerFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  if (innerFenceMatch?.[1]) {
    return innerFenceMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim();
  }

  return trimmed;
}

export function sanitizeCreateNoteTitle(title: string | undefined): string | null {
  const cleaned = (title ?? "")
    .replace(/^```(?:json|markdown|md)?/i, "")
    .replace(/```$/i, "")
    .replace(/[{}[\]"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned || cleaned.length < 2 || cleaned.toLowerCase() === "json") {
    return null;
  }

  return cleaned.slice(0, 100);
}

function normalizeParsedProposal(
  parsed: Partial<CreateNoteProposal> & { title?: string }
): ParsedCreateNoteProposal {
  return {
    title:
      typeof parsed.title === "string"
        ? sanitizeCreateNoteTitle(parsed.title) ?? undefined
        : undefined,
    path: typeof parsed.path === "string" ? parsed.path : undefined,
    content: typeof parsed.content === "string" ? parsed.content : undefined
  };
}

function parseLooseCreateNoteProposal(content: string): ParsedCreateNoteProposal {
  const title = readLooseStringField(content, "title");
  const path = readLooseStringField(content, "path");
  const parsedContent = readLooseStringField(content, "content");

  return {
    title: sanitizeCreateNoteTitle(title ?? undefined) ?? undefined,
    path: path?.trim() || undefined,
    content: parsedContent?.trim() || undefined
  };
}

function readLooseStringField(content: string, field: string): string | null {
  const keyPattern = new RegExp(`["']${escapeRegExp(field)}["']\\s*:`, "i");
  const keyMatch = keyPattern.exec(content);

  if (!keyMatch) {
    return null;
  }

  let index = keyMatch.index + keyMatch[0].length;

  while (/\s/.test(content[index] ?? "")) {
    index += 1;
  }

  const quote = content[index];

  if (quote !== `"` && quote !== "'") {
    return null;
  }

  index += 1;
  let value = "";

  for (; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === "\\") {
      value += decodeJsonEscape(next ?? "");
      index += 1;
      continue;
    }

    if (char === quote && isLikelyFieldTerminator(content, index + 1)) {
      return value;
    }

    value += char;
  }

  return value.trim() || null;
}

function isLikelyFieldTerminator(content: string, index: number): boolean {
  let cursor = index;

  while (/\s/.test(content[cursor] ?? "")) {
    cursor += 1;
  }

  return content[cursor] === "," || content[cursor] === "}" || cursor >= content.length;
}

function decodeJsonEscape(char: string): string {
  switch (char) {
    case "n":
      return "\n";
    case "r":
      return "\r";
    case "t":
      return "\t";
    case "\\":
      return "\\";
    case `"`:
      return `"`;
    case "'":
      return "'";
    default:
      return char;
  }
}

function sanitizeRawCreateNoteFallback(content: string): string {
  const cleaned = cleanJsonLikeResponse(content);

  if (looksLikeJsonObject(cleaned)) {
    return "";
  }

  return content.trim();
}

function looksLikeJsonObject(content: string): boolean {
  return /^\{[\s\S]*\}?$/.test(content.trim());
}

function firstSafeMarkdownHeading(content: string): string | null {
  const heading = content
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .map((line) => sanitizeCreateNoteTitle(line))
    .find((line): line is string => Boolean(line));

  return heading ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
