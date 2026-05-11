import { stripHiddenTtsHints } from "../voice/speechText";

export function normalizeCreateNotePath(path: string): string {
  const cleaned = path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "")
    .replace(/^(\.\/)+/, "");
  const protectedSafePath = cleaned || "Contex Inbox/Contex Note.md";
  const withFolder = protectedSafePath.includes("/")
    ? protectedSafePath
    : `Contex Inbox/${protectedSafePath}`;

  return withFolder.toLowerCase().endsWith(".md")
    ? withFolder
    : `${withFolder}.md`;
}

export function isSafeCreateNotePath(path: string | undefined): path is string {
  if (!path) {
    return false;
  }

  const cleaned = path.trim();

  return Boolean(
    cleaned &&
      !cleaned.includes("```") &&
      !cleaned.includes("{") &&
      !cleaned.includes("}") &&
      !cleaned.toLowerCase().endsWith("/json.md") &&
      cleaned.length <= 180
  );
}

export function sanitizeCreateNoteFilename(
  filename: string | undefined,
  content: string
): string {
  const fallbackTitle =
    cleanupTitleCandidate(
      firstMarkdownHeading(stripHiddenTtsHints(content)) ?? undefined
    ) ??
    "Contex Note";
  const fallbackFilename = `${slugifyTitle(fallbackTitle)}.md`;
  const candidate = (filename ?? "").trim();
  const lowerCandidate = candidate.toLowerCase();

  if (
    !candidate ||
    candidate === ".md" ||
    lowerCandidate === "json.md" ||
    lowerCandidate === "```json.md" ||
    candidate.includes("```") ||
    candidate.includes("{") ||
    candidate.includes("}") ||
    hasCreateNoteLocationClause(candidate) ||
    isInstructionLikeTitle(candidate)
  ) {
    return fallbackFilename;
  }

  const normalizedCandidate =
    cleanupTitleCandidate(candidate.replace(/\.md$/i, "")) ??
    candidate.replace(/\.md$/i, "");
  const safe = slugifyTitle(normalizedCandidate);

  return safe.toLowerCase().endsWith(".md") ? safe : `${safe}.md`;
}

export function inferCreateNoteTitleFromCommand(
  commandText: string,
  fallback = "Contex Note"
): string {
  const explicitQuotedTitle = extractQuotedTitle(commandText);

  if (explicitQuotedTitle) {
    return explicitQuotedTitle;
  }

  const normalized = normalizeCommandTitleText(commandText);
  const objectTitle = extractObjectTitle(normalized);

  if (objectTitle) {
    return objectTitle;
  }

  const topicTitle = extractTopicTitle(normalized);

  if (topicTitle) {
    return topicTitle;
  }

  return slugifyTitle(fallback);
}

export function slugifyTitle(title: string): string {
  const slug = title
    .trim()
    .replace(/[\\/:*?"<>|#^[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return slug || "Contex Note";
}

export function getFolderPath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

function firstMarkdownHeading(content: string): string | null {
  const heading = content
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(Boolean);

  return heading ?? null;
}

function normalizeCommandTitleText(commandText: string): string {
  return commandText
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[{}[\]"'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractQuotedTitle(text: string): string | null {
  const quotedMatches = Array.from(
    text.matchAll(/[«"“”](.{4,140}?)[»"“”]/gu)
  )
    .map((match) => cleanupTitleCandidate(match[1]))
    .filter((candidate): candidate is string => Boolean(candidate));

  return quotedMatches.at(-1) ?? null;
}

function extractTopicTitle(text: string): string | null {
  const patterns = [
    /(?:^|[\s,;:])(?:про|о|об|about|on)\s+(.+?)(?=\s+(?:и\s+(?:добавь|проведи|сделай|поищи)|с\s+(?:коротким|кратким)|with|using)\b|[.?!;:]|$)/iu,
    /(?:тему|topic)\s+(.+?)(?=\s+(?:и\s+(?:добавь|проведи|сделай|поищи)|with|using)\b|[.?!;:]|$)/iu
  ];

  for (const pattern of patterns) {
    const title = cleanupTitleCandidate(text.match(pattern)?.[1]);

    if (title) {
      return title;
    }
  }

  return null;
}

function extractObjectTitle(text: string): string | null {
  const robust = extractRobustObjectTitle(text);

  if (robust) {
    return robust;
  }

  let candidate = text
    .replace(
      /(?:^|[\s,;:])(?:создай|сделай|заведи|сохрани|create|make|draft|new)(?=$|[\s,;:.!?])/giu,
      " "
    )
    .replace(
      /(?:^|[\s,;:])(?:в|из)\s+(?:текущей\s+)?(?:папк|парк)[еиу]\s+[\p{L}\p{N}_ -]+?(?=\s|[,.!?;:]|$)/giu,
      " "
    )
    .replace(
      /(?:^|[\s,;:])(?:in|inside)\s+(?:the\s+)?(?:current\s+)?folder\s+[\p{L}\p{N}_ -]+?(?=\s|[,.!?;:]|$)/giu,
      " "
    )
    .replace(
      /(?:^|[\s,;:])(?:в\s+текущей\s+папке|in\s+the\s+current\s+folder)(?=$|[\s,;:.!?])/giu,
      " "
    )
    .replace(
      /(?:^|[\s,;:])(?:markdown[-\s]*)?(?:файл|заметк[ауи]?|страниц[ауи]?|note|file|page|markdown file)(?=$|[\s,;:.!?])/giu,
      " "
    )
    .replace(
      /(?:название\s+файла\s+придумай\s+самостоятельно|название\s+придумай\s+самостоятельно|name\s+the\s+file\s+yourself)[\s\S]*$/iu,
      " "
    )
    .replace(
      /\s+(?:и\s+)?(?:добавь|проведи|сделай|поищи|добавить|провести|add|run|do|with)\s+[\s\S]*$/iu,
      " "
    );

  candidate = cleanupTitleCandidate(candidate) ?? "";

  if (!candidate || /^markdown$/i.test(candidate)) {
    return null;
  }

  return candidate;
}

function extractRobustObjectTitle(text: string): string | null {
  const normalized = text
    .replace(/\b(?:вапк[аеуи]?|парк[аеуи]?)\b/giu, "папке")
    .replace(/\s+/g, " ")
    .trim();
  const afterFileWord = normalized.match(
    /(?:файл|заметк[ауи]?|страниц[ауи]?|note|file|page|markdown file)\s+(.+?)(?=\s+(?:и\s+(?:добавь|проведи|сделай|поищи|внутри)|с\s+(?:коротким|кратким)|with|using)\b|[.?!;:]|$)/iu
  );
  const explicitAfterFile = cleanupTitleCandidate(
    stripInstructionTail(afterFileWord?.[1])
  );

  if (explicitAfterFile && !isInstructionLikeTitle(explicitAfterFile)) {
    return explicitAfterFile;
  }

  const topicMatch = normalized.match(
    /(?:^|[\s,;:])(?:про|о|об|about|on)\s+(.+?)(?=\s+(?:и\s+(?:добавь|проведи|сделай|поищи)|с\s+(?:коротким|кратким)|with|using)\b|[.?!;:]|$)/iu
  );
  const topicTitle = cleanupTitleCandidate(topicMatch?.[1]);

  if (topicTitle) {
    return topicTitle;
  }

  const stripped = stripInstructionTail(
    normalized
      .replace(
        /(?:^|[\s,;:])(?:создай|сделай|заведи|сохрани|create|make|draft|new)(?=$|[\s,;:.!?])/giu,
        " "
      )
      .replace(
        /(?:^|[\s,;:])(?:в|из)\s+(?:этой\s+|текущей\s+)?(?:папке|папку|папки)\s+[\p{L}\p{N}_ -]+?(?=\s+(?:файл|заметк|страниц|note|file|page)\b|[,.!?;:]|$)/giu,
        " "
      )
      .replace(
        /(?:^|[\s,;:])(?:в\s+(?:этой|текущей)\s+папке|in\s+the\s+current\s+folder)(?=$|[\s,;:.!?])/giu,
        " "
      )
      .replace(
        /(?:^|[\s,;:])(?:markdown[-\s]*)?(?:файл|заметк[ауи]?|страниц[ауи]?|note|file|page|markdown file)(?=$|[\s,;:.!?])/giu,
        " "
      )
  );
  const cleaned = cleanupTitleCandidate(stripped);

  return cleaned && !isInstructionLikeTitle(cleaned) ? cleaned : null;
}

function stripInstructionTail(value: string | undefined): string {
  return (value ?? "")
    .replace(
      /(?:название\s+(?:файла\s+)?придумай\s+самостоятельно|name\s+the\s+file\s+yourself)[\s\S]*$/iu,
      " "
    )
    .replace(
      /\s+(?:и\s+)?(?:добавь|проведи|сделай|поищи|добавить|провести|add|run|do|with)\s+[\s\S]*$/iu,
      " "
    )
    .trim();
}

function hasCreateNoteLocationClause(value: string | undefined): boolean {
  const normalized = (value ?? "")
    .replace(/\.md$/i, "")
    .replace(/\b(?:\u0432\u0430\u043f\u043a[\u0430\u0435\u0443\u0438]?|\u043f\u0430\u0440\u043a[\u0430\u0435\u0443\u0438]?)\b/giu, "\u043f\u0430\u043f\u043a\u0435")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return false;
  }

  return /(?:^|\s)(?:\u0432|\u0438\u0437)\s+(?:\u044d\u0442\u043e\u0439\s+|\u0442\u0435\u043a\u0443\u0449\u0435\u0439\s+)?(?:\u043f\u0430\u043f\u043a|\u043f\u0430\u0440\u043a)[\u0430\u0435\u0443\u0438]\s+[\p{L}\p{N}_ -]+(?:\s|$)/iu.test(
    normalized
  ) || /(?:^|\s)(?:in|inside)\s+(?:the\s+)?(?:current\s+)?folder\s+[\p{L}\p{N}_ -]+(?:\s|$)/iu.test(
    normalized
  );
}

function isInstructionLikeTitle(value: string | undefined): boolean {
  const normalized = (value ?? "")
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

  if (!normalized) {
    return true;
  }

  return /^(?:создай|создать|сделай|заведи|сохрани|открой|create|make|draft|new)(?:\s|$)/u.test(
    normalized
  ) || /(?:^|\s)(?:в этой папке|в текущей папке|название файла придумай|name the file yourself)(?:\s|$)/u.test(
    normalized
  );
}

function cleanupTitleCandidate(value: string | undefined): string | null {
  const cleaned = normalizeRussianTitleCase(
    (value ?? "")
    .replace(/\.md$/i, "")
    .replace(
      /\s+(?:\u0432|\u0438\u0437)\s+(?:\u044d\u0442\u043e\u0439\s+|\u0442\u0435\u043a\u0443\u0449\u0435\u0439\s+)?(?:\u043f\u0430\u043f\u043a|\u043f\u0430\u0440\u043a)[\u0430\u0435\u0443\u0438]\s+[\p{L}\p{N}_ -]+$/iu,
      " "
    )
    .replace(
      /\s+(?:in|inside)\s+(?:the\s+)?(?:current\s+)?folder\s+[\p{L}\p{N}_ -]+$/iu,
      " "
    )
    .replace(/^[\s,;:.!?-]+|[\s,;:.!?-]+$/g, "")
    .replace(/^(?:\u0441|\u0441\u043e|with)\s+/iu, "")
    .replace(/^(?:про|о|об)\s+/iu, "")
    .replace(
      /^(?:нов(?:ый|ую|ая|ое)|кратк(?:ий|ую|ая|ое)|современн(?:ый|ую|ая|ое)|markdown[-\s]*)\s+/iu,
      ""
    )
    .replace(/^(?:про|о|об)\s+/iu, "")
    .replace(/\s+/g, " ")
    .trim()
  );

  if (!cleaned || cleaned.length < 3 || cleaned.toLowerCase() === "json") {
    return null;
  }

  return slugifyTitle(cleaned).slice(0, 90).trim();
}

function normalizeRussianTitleCase(value: string): string {
  return value
    .split(" ")
    .map((word) => normalizeRussianTitleWord(word))
    .join(" ");
}

function normalizeRussianTitleWord(word: string): string {
  if (!/[А-Яа-яЁё]/.test(word)) {
    return word;
  }

  if (/ыми$/iu.test(word)) {
    return word.replace(/ыми$/iu, "ые");
  }

  if (/ими$/iu.test(word)) {
    return word.replace(/ими$/iu, "ие");
  }

  if (/иями$/iu.test(word)) {
    return word.replace(/иями$/iu, "ии");
  }

  if (/ями$/iu.test(word)) {
    return word.replace(/ями$/iu, "и");
  }

  if (/ами$/iu.test(word)) {
    const stem = word.replace(/ами$/iu, "");
    const ending = /[кгхжчшщц]$/iu.test(stem) ? "и" : "ы";

    return `${stem}${ending}`;
  }

  return word;
}
