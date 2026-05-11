const DEFAULT_PLAN_TITLE = "Contex Code Plan";

const RU_INSTRUCTION_WORDS = [
  "создай",
  "создать",
  "сделай",
  "сделать",
  "заведи",
  "завести",
  "напиши",
  "написать",
  "файл",
  "заметку",
  "заметка",
  "markdown",
  "md"
];

const EN_INSTRUCTION_WORDS = [
  "create",
  "make",
  "draft",
  "write",
  "note",
  "file",
  "markdown",
  "md"
];

export function createPlanId(title: string, now = new Date().toISOString()): string {
  const stamp = now.slice(0, 10).replace(/-/g, "");
  return `ccp_${stamp}_${slugifyContexCodeIdPart(title || DEFAULT_PLAN_TITLE)}`;
}

export function createTaskId(
  phaseIndex: number,
  taskIndex: number,
  title: string
): string {
  return `task_${phaseIndex}_${taskIndex}_${slugifyContexCodeIdPart(title || "task")}`;
}

export function slugifyContexCodeIdPart(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  return normalized || "plan";
}

export function derivePlanTitle(input: string, fallback = DEFAULT_PLAN_TITLE): string {
  const quoted = input.match(/[“"«](.+?)[”"»]/u)?.[1]?.trim();
  if (quoted) {
    return normalizeTitle(quoted, fallback);
  }

  const withoutCorrection = stripSupersededOpenPart(input);
  const withoutFolderHints = stripFolderHints(withoutCorrection);
  const afterPreciseMarker = takeAfterPreciseTopicMarker(withoutFolderHints);
  const withoutInstruction = stripInstructionWords(afterPreciseMarker);
  const cleaned = stripTopicPrepositions(withoutInstruction);

  return normalizeTitle(cleaned, fallback);
}

function stripSupersededOpenPart(value: string): string {
  const lowered = value.toLowerCase();
  const correctionMarkers = [
    "точнее",
    "извиняюсь",
    "нет, не",
    "лучше",
    "rather",
    "actually",
    "instead"
  ];

  let result = value;
  for (const marker of correctionMarkers) {
    const index = lowered.lastIndexOf(marker);
    if (index >= 0) {
      result = value.slice(index + marker.length);
    }
  }

  return result;
}

function stripFolderHints(value: string): string {
  return value
    .replace(/\b(in|inside|within)\s+(the\s+)?(current\s+)?folder\s+["'`«“]?[^\.,;!?]+["'`»”]?/giu, " ")
    .replace(/\b(in|inside|within)\s+["'`«“]?[^\.,;!?]+\s+folder["'`»”]?/giu, " ")
    .replace(/(?:^|\s)в\s+(текущей|этой)\s+папке(?:\s|$)/giu, " ")
    .replace(/(?:^|\s)в\s+папк[еуи]\s+["'`«“]?[^,.;!?]+["'`»”]?/giu, " ")
    .replace(/(?:^|\s)из\s+папк[и]\s+["'`«“]?[^,.;!?]+["'`»”]?/giu, " ")
    .replace(/(?:^|\s)папк[аеуыи]\s+["'`«“]?[^,.;!?]+["'`»”]?/giu, " ");
}

function takeAfterPreciseTopicMarker(value: string): string {
  const markers = [
    /\b(?:about|on)\b/iu,
    /\b(?:про|о|об)\b/iu
  ];

  let bestIndex = -1;
  let bestLength = 0;
  for (const marker of markers) {
    const match = marker.exec(value);
    if (match?.index !== undefined && match.index > bestIndex) {
      bestIndex = match.index;
      bestLength = match[0].length;
    }
  }

  if (bestIndex >= 0) {
    return value.slice(bestIndex + bestLength);
  }

  return value;
}

function stripInstructionWords(value: string): string {
  const words = value
    .replace(/[.,;!?]+/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const filtered = words.filter((word) => {
    const normalized = word.toLowerCase().replace(/^#+/, "");
    return (
      !RU_INSTRUCTION_WORDS.includes(normalized) &&
      !EN_INSTRUCTION_WORDS.includes(normalized)
    );
  });

  return filtered.join(" ");
}

function stripTopicPrepositions(value: string): string {
  return value
    .replace(/^(?:с|со|про|о|об|для|about|on|for)\s+/iu, "")
    .trim();
}

function normalizeTitle(value: string, fallback: string): string {
  const cleaned = value
    .replace(/[`*_#>]+/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/g, "")
    .trim();

  if (!cleaned) {
    return fallback;
  }

  const title = cleaned
    .split(/\s+/)
    .map((word) => normalizeRussianInstrumentalWord(word))
    .join(" ");

  return `${title.charAt(0).toUpperCase()}${title.slice(1)}`;
}

function normalizeRussianInstrumentalWord(word: string): string {
  const lower = word.toLowerCase();
  const preserveCase = (replacement: string): string =>
    word.charAt(0) === word.charAt(0).toUpperCase()
      ? `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`
      : replacement;

  if (/иями$/u.test(lower)) {
    return preserveCase(lower.replace(/иями$/u, "ии"));
  }
  if (/ями$/u.test(lower)) {
    return preserveCase(lower.replace(/ями$/u, "и"));
  }
  if (/ами$/u.test(lower)) {
    return preserveCase(lower.replace(/ами$/u, "ы"));
  }
  if (/ыми$/u.test(lower)) {
    return preserveCase(lower.replace(/ыми$/u, "ые"));
  }
  if (/ими$/u.test(lower)) {
    return preserveCase(lower.replace(/ими$/u, "ие"));
  }

  return word;
}
