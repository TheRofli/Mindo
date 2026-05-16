import { getFolderPath, sanitizeCreateNoteFilename } from "./createNotePathUtils";

export interface PersonalStyleMemory {
  language: "en" | "ru";
  prefersBullets: boolean;
  prefersHeadings: boolean;
  concise: boolean;
}

export interface SmartNoteCreationInput {
  userText: string;
  activeNotePath?: string;
  folderHint?: string;
  titleHint?: string;
  style?: PersonalStyleMemory;
}

export interface SmartNoteCreationPlan {
  title: string;
  folder: string;
  path: string;
  requiresWeb: boolean;
  contentInstruction: string;
}

export function inferPersonalStyleMemory(samples: string[]): PersonalStyleMemory {
  const combined = samples.join("\n");
  const cyrillicCount = countMatches(combined, /[а-яё]/gi);
  const latinCount = countMatches(combined, /[a-z]/gi);
  const bulletCount = countMatches(combined, /^\s*[-*]\s+/gm);
  const headingCount = countMatches(combined, /^#{1,3}\s+/gm);
  const lines = combined.split(/\r?\n/).filter((line) => line.trim());
  const averageLineLength = lines.length
    ? lines.reduce((total, line) => total + line.trim().length, 0) / lines.length
    : 80;

  return {
    language: cyrillicCount > latinCount ? "ru" : "en",
    prefersBullets: bulletCount >= 2,
    prefersHeadings: headingCount >= 1,
    concise: averageLineLength < 90
  };
}

export function buildStyleInstruction(style: PersonalStyleMemory): string {
  const language = style.language === "ru" ? "Russian" : "English";
  const structure = style.prefersBullets
    ? "Prefer concise bullets when they improve scanning."
    : "Use short paragraphs unless bullets are clearly better.";
  const headings = style.prefersHeadings
    ? "Use clear Markdown headings."
    : "Use headings only when they help.";
  const length = style.concise
    ? "Keep the writing compact and practical."
    : "Use enough detail to be useful.";

  return [
    `Write in ${language}.`,
    structure,
    headings,
    length
  ].join(" ");
}

export function planSmartNoteCreation(
  input: SmartNoteCreationInput
): SmartNoteCreationPlan {
  const style =
    input.style ??
    inferPersonalStyleMemory([input.userText, input.titleHint ?? ""]);
  const title = inferTitle(input.userText, input.titleHint);
  const folder = normalizeFolder(
    input.folderHint || getFolderPath(input.activeNotePath ?? "") || "Mindo Inbox"
  );
  const filename = sanitizeCreateNoteFilename(`${title}.md`, `# ${title}`);
  const path = `${folder}/${filename}`;
  const requiresWeb = shouldRequireWeb(input.userText);

  return {
    title,
    folder,
    path,
    requiresWeb,
    contentInstruction: [
      buildStyleInstruction(style),
      "Return Markdown only.",
      "Do not wrap the note in JSON or code fences.",
      "Do not repeat the title as the first heading; Obsidian already shows the file title.",
      requiresWeb
        ? "Use fresh web context and include clickable source references."
        : "Use vault context first and cite sources when available."
    ].join(" ")
  };
}

function inferTitle(userText: string, titleHint?: string): string {
  if (titleHint?.trim()) {
    return cleanupTitle(titleHint);
  }

  const quoted = userText.match(/["“«](.+?)["”»]/u)?.[1]?.trim();

  if (quoted) {
    return cleanupTitle(quoted);
  }

  const cleaned = userText
    .replace(
      /^(создай|сделай|заведи|напиши|create|make|draft)\s+(?:в\s+папке\s+\S+\s+)?(?:файл|заметку|страницу|note|file|page)?\s*/iu,
      ""
    )
    .replace(/^(?:про|о|about)\s+/iu, "")
    .replace(/\b(?:using|with|из|с)\b.*$/iu, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleanupTitle(cleaned || "Mindo Note");
}

function cleanupTitle(value: string): string {
  const cleaned = value
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

  return cleaned ? cleaned.slice(0, 1).toUpperCase() + cleaned.slice(1) : cleaned;
}

function normalizeFolder(value: string): string {
  return value
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/+/g, "/")
    .trim() || "Mindo Inbox";
}

function shouldRequireWeb(userText: string): boolean {
  return /web|internet|latest|current|fresh|modern|202[0-9]|интернет|актуал|свеж|современ|в этом году|на момент/iu.test(
    userText
  );
}

function countMatches(value: string, pattern: RegExp): number {
  return Array.from(value.matchAll(pattern)).length;
}
