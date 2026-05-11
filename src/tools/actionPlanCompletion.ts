import type {
  SemanticLocalCommand,
  SemanticVoiceTextReplacement
} from "../views/semanticLocalCommandPlan";

export function completeOpenThenReplacePlan(
  commands: SemanticLocalCommand[],
  userText: string
): SemanticLocalCommand[] {
  const normalizedCommands = normalizeSemanticLocalCommandsForUserText(
    commands,
    userText
  );

  if (
    !normalizedCommands.some((command) => command.action === "open_file") ||
    normalizedCommands.some(
      (command) =>
        command.action === "replace_text" || command.action === "replace_selection"
    )
  ) {
    return normalizedCommands;
  }

  const replacement = extractReplacementFromCompoundText(userText);

  if (!replacement) {
    return normalizedCommands;
  }

  return [
    ...normalizedCommands,
    {
      action: "replace_text",
      replacements: [replacement]
    }
  ];
}

export function normalizeSemanticLocalCommandsForUserText(
  commands: SemanticLocalCommand[],
  userText: string
): SemanticLocalCommand[] {
  const promoted = promoteFreshCreateCommands(commands, userText);

  if (!hasCorrectionMarker(userText)) {
    return promoted;
  }

  const finalCreateIndex = findLastIndex(promoted, (command) =>
    command.action === "create_note" || command.action === "research_note"
  );

  if (finalCreateIndex > 0) {
    return promoted.slice(finalCreateIndex);
  }

  return promoted;
}

export function extractReplacementFromCompoundText(
  userText: string
): SemanticVoiceTextReplacement | null {
  const patterns = [
    new RegExp(
      [
        "(?:^|[\\s,.;:!?])",
        "(?:",
        "\\u0437\\u0430\\u043c\\u0435\\u043d\\u0438",
        "|\\u043f\\u043e\\u043c\\u0435\\u043d\\u044f\\u0439",
        "|\\u0438\\u0437\\u043c\\u0435\\u043d\\u0438",
        "|\\u0438\\u0441\\u043f\\u0440\\u0430\\u0432\\u044c",
        "|replace",
        "|change",
        ")",
        "\\s+",
        "(?:",
        "\\u0442\\u0435\\u043a\\u0441\\u0442",
        "|\\u0444\\u0440\\u0430\\u0437\\u0443",
        "|\\u0441\\u043b\\u043e\\u0432\\u043e",
        "|\\u0441\\u0442\\u0440\\u043e\\u043a\\u0443",
        "|text",
        "|phrase",
        "|word",
        "|line",
        ")?",
        "\\s*",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "(.+?)",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "\\s+",
        "(?:\\u043d\\u0430|to|with)",
        "\\s+",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "(.+?)",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "(?=$|[.!?;])"
      ].join(""),
      "iu"
    ),
    new RegExp(
      [
        "(?:^|[\\s,.;:!?])",
        "(?:\\u0443\\u0431\\u0435\\u0440\\u0438|\\u0443\\u0434\\u0430\\u043b\\u0438|remove|delete)",
        "\\s+",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "(.+?)",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "\\s+",
        "(?:(?:\\u0438|and)\\s+)?",
        "(?:\\u043f\\u043e\\u0441\\u0442\\u0430\\u0432\\u044c|\\u0432\\u0441\\u0442\\u0430\\u0432\\u044c|\\u043d\\u0430\\u043f\\u0438\\u0448\\u0438|put|write|use)",
        "\\s+",
        "(?:\\u0432\\u043c\\u0435\\u0441\\u0442\\u043e\\s+(?:\\u043d\\u0435\\u0433\\u043e|\\u044d\\u0442\\u043e\\u0433\\u043e)\\s+)?",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "(.+?)",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "(?:\\s+instead)?",
        "(?=$|[.!?;])"
      ].join(""),
      "iu"
    ),
    new RegExp(
      [
        "(?:^|[\\s,.;:!?])",
        "(?:\\u0432\\u043c\\u0435\\u0441\\u0442\\u043e|instead\\s+of)",
        "\\s+",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "(.+?)",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "\\s+",
        "(?:\\u043d\\u0430\\u043f\\u0438\\u0448\\u0438|\\u043f\\u043e\\u0441\\u0442\\u0430\\u0432\\u044c|\\u0432\\u0441\\u0442\\u0430\\u0432\\u044c|write|put|use)",
        "\\s+",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "(.+?)",
        "[\"'`\\u00ab\\u00bb\\u201c\\u201d]?",
        "(?=$|[.!?;])"
      ].join(""),
      "iu"
    )
  ];

  for (const pattern of patterns) {
    const match = userText.match(pattern);
    const original = cleanReplacementSide(match?.[1] ?? "");
    const suggested = cleanReplacementSide(match?.[2] ?? "");

    if (original && suggested && original !== suggested) {
      return {
        original,
        suggested
      };
    }
  }

  return null;
}

function cleanReplacementSide(value: string): string {
  return value
    .replace(/^[\s,.;:!?"'`\u00ab\u00bb\u201c\u201d]+/, "")
    .replace(/[\s,.;:!?"'`\u00ab\u00bb\u201c\u201d]+$/, "")
    .replace(/(\p{L})[-\u2013\u2014](\p{L})/gu, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function promoteFreshCreateCommands(
  commands: SemanticLocalCommand[],
  userText: string
): SemanticLocalCommand[] {
  if (!needsFreshResearch(userText)) {
    return commands;
  }

  return commands.map((command) =>
    command.action === "create_note"
      ? {
          ...command,
          action: "research_note"
        }
      : command
  );
}

function needsFreshResearch(text: string): boolean {
  return /web|internet|online|fresh|latest|current|today|this year|sources|источник|источники|интернет|веб|актуаль|свеж|современ|сегодня|202[0-9]/iu.test(
    text
  );
}

function hasCorrectionMarker(text: string): boolean {
  return /actually|no wait|instead|rather|correction|точнее|нет[, ]|не открывай|лучше|передумал|подожди/iu.test(
    text
  );
}

function findLastIndex<T>(
  values: T[],
  predicate: (value: T) => boolean
): number {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (predicate(values[index])) {
      return index;
    }
  }

  return -1;
}
