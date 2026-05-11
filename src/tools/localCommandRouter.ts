import type {
  SemanticLocalCommand,
  SemanticVoiceTextReplacement
} from "../views/semanticLocalCommandPlan";
import { normalizeVoiceCommandNoise } from "../voice/speechNoise";

export type VoiceTextReplacement = SemanticVoiceTextReplacement;

export type VoiceNoteAction = "remember" | "roadmap" | "update-note" | "chat-note";

export type LocalCommandAction =
  | {
      kind: "action-plan";
      commandText: string;
      actions: LocalCommandAction[];
    }
  | {
      kind: "replace-text";
      commandText: string;
      replacement: VoiceTextReplacement;
    }
  | {
      kind: "replace-multiple";
      commandText: string;
      replacements: VoiceTextReplacement[];
    }
  | {
      kind: "replace-selection-or-line";
      commandText: string;
      suggested: string;
    }
  | { kind: "apply-diff"; messageId: string }
  | { kind: "reject-diff"; messageId: string }
  | { kind: "refine-diff"; messageId: string; instruction: string }
  | { kind: "undo-diff"; messageId: string }
  | { kind: "improve-selection" }
  | { kind: "open-last-file"; commandText?: string }
  | { kind: "open-file"; commandText: string; query: string }
  | { kind: "search-vault"; query: string }
  | { kind: "semantic-vault"; query: string }
  | { kind: "research-web"; query: string }
  | { kind: "research-note"; commandText: string; displayText?: string }
  | { kind: "create-note"; commandText: string; displayText?: string }
  | { kind: "read-last-answer" }
  | { kind: "stop-speaking" }
  | { kind: "summarize-last-file"; commandText: string }
  | { kind: "attach-last-results" }
  | { kind: "note-action"; action: VoiceNoteAction; commandText: string };

export function semanticCommandToLocalAction(
  command: SemanticLocalCommand,
  commandText: string
): LocalCommandAction | null {
  if (!command || command.action === "none") {
    return null;
  }

  if (command.action === "replace_text") {
    const replacements = command.replacements?.length
      ? command.replacements
      : command.original && command.suggested
        ? [
            {
              original: command.original,
              suggested: command.suggested
            }
          ]
        : [];

    if (!replacements.length) {
      return null;
    }

    if (replacements.length === 1) {
      return {
        kind: "replace-text",
        commandText,
        replacement: replacements[0]
      };
    }

    return {
      kind: "replace-multiple",
      commandText,
      replacements
    };
  }

  if (command.action === "replace_selection" && command.suggested) {
    return {
      kind: "replace-selection-or-line",
      commandText,
      suggested: command.suggested
    };
  }

  if (command.action === "open_file" && command.query) {
    return {
      kind: "open-file",
      commandText,
      query: preserveExplicitFolder(command.query, commandText)
    };
  }

  if (command.action === "open_last_file") {
    return {
      kind: "open-last-file",
      commandText
    };
  }

  if (command.action === "search_vault" && command.query) {
    return {
      kind: "search-vault",
      query: command.query
    };
  }

  if (command.action === "semantic_vault" && command.query) {
    return {
      kind: "semantic-vault",
      query: command.query
    };
  }

  if (command.action === "research_web" && command.query) {
    return {
      kind: "research-web",
      query: command.query
    };
  }

  if (command.action === "research_note") {
    return {
      kind: "research-note",
      commandText: preserveExplicitFolder(command.query ?? commandText, commandText),
      displayText: commandText
    };
  }

  if (command.action === "create_note") {
    return {
      kind: "create-note",
      commandText: preserveExplicitFolder(command.query ?? commandText, commandText),
      displayText: commandText
    };
  }

  if (command.action === "update_note") {
    return {
      kind: "note-action",
      action: "update-note",
      commandText: command.query ?? commandText
    };
  }

  if (command.action === "read_last_answer") {
    return {
      kind: "read-last-answer"
    };
  }

  if (command.action === "stop_speaking") {
    return {
      kind: "stop-speaking"
    };
  }

  return null;
}

export function shouldPreventLocalCommandChatFallback(commandText: string): boolean {
  const normalized = normalizeLocalRouterText(commandText);

  if (!normalized || isQuestionAboutLocalCommand(normalized)) {
    return false;
  }

  return hasLocalCommandActionMarker(normalized);
}

function hasLocalCommandActionMarker(normalizedText: string): boolean {
  const markers = [
    "\u0441\u043e\u0437\u0434\u0430",
    "\u0441\u0434\u0435\u043b\u0430\u0439",
    "\u0441\u0434\u0435\u043b\u0430\u0442\u044c",
    "\u0437\u0430\u0432\u0435\u0434",
    "\u0441\u043e\u0445\u0440\u0430\u043d\u0438",
    "\u043e\u0442\u043a\u0440\u043e\u0439",
    "\u043e\u0442\u043a\u0440\u044b\u0442\u044c",
    "\u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0439",
    "\u043f\u043e\u043a\u0430\u0436\u0438",
    "\u043d\u0430\u0439\u0434\u0438",
    "\u043f\u043e\u0438\u0449\u0438",
    "\u0437\u0430\u043c\u0435\u043d\u0438",
    "\u0437\u0430\u043c\u0435\u043d\u0438\u0442\u044c",
    "\u043f\u043e\u043c\u0435\u043d\u044f\u0439",
    "\u043f\u043e\u043c\u0435\u043d\u044f\u0442\u044c",
    "\u0438\u0437\u043c\u0435\u043d\u0438",
    "\u0438\u0441\u043f\u0440\u0430\u0432\u044c",
    "\u0443\u0431\u0435\u0440\u0438",
    "\u0432\u0441\u0442\u0430\u0432\u044c",
    "\u0437\u0430\u043f\u043e\u043c\u043d\u0438",
    "\u043e\u0431\u043d\u043e\u0432\u0438",
    "\u043f\u0440\u0438\u043c\u0438",
    "\u043f\u0440\u0438\u043d\u044f\u0442\u044c",
    "\u043e\u0442\u043a\u043b\u043e\u043d\u0438",
    "\u043e\u0442\u043a\u0430\u0442\u0438",
    "\u043e\u0442\u043c\u0435\u043d",
    "\u0432\u0435\u0440\u043d\u0438",
    "\u043d\u0430\u0437\u0430\u0434",
    "\u043f\u0440\u043e\u0447\u0438\u0442\u0430\u0439",
    "\u0437\u0430\u0447\u0438\u0442\u0430\u0439",
    "\u043e\u0437\u0432\u0443\u0447\u044c",
    "\u043e\u0441\u0442\u0430\u043d\u043e\u0432\u0438",
    "\u0441\u0442\u043e\u043f",
    "open",
    "show",
    "create",
    "make",
    "draft",
    "replace",
    "change",
    "search",
    "find",
    "remember",
    "update",
    "accept",
    "reject",
    "undo",
    "read"
  ];

  return markers.some((marker) => normalizedText.includes(marker));
}

function isQuestionAboutLocalCommand(normalizedText: string): boolean {
  const questionPrefixes = [
    "\u043a\u0430\u043a ",
    "\u0437\u0430\u0447\u0435\u043c ",
    "\u043f\u043e\u0447\u0435\u043c\u0443 ",
    "\u0447\u0442\u043e \u0437\u043d\u0430\u0447\u0438\u0442 ",
    "\u043c\u043e\u0436\u043d\u043e \u043b\u0438 ",
    "\u043c\u043e\u0436\u0435\u0448\u044c \u043e\u0431\u044a\u044f\u0441\u043d\u0438\u0442\u044c ",
    "how ",
    "why ",
    "what is ",
    "can i ",
    "can you explain"
  ];

  return questionPrefixes.some((prefix) => normalizedText.startsWith(prefix));
}

export function preserveExplicitFolder(query: string, originalText: string): string {
  const normalizedQuery = normalizeVoiceCommandNoise(query);
  const normalizedOriginalText = normalizeVoiceCommandNoise(originalText);
  const folder = extractExplicitFolderName(normalizedOriginalText);

  if (!folder || extractExplicitFolderName(normalizedQuery) || query.includes("/")) {
    return query;
  }

  return `${query.trim()} in folder ${folder}`.trim();
}

function extractExplicitFolderName(text: string): string | null {
  const normalizedText = normalizeVoiceCommandNoise(text);
  const patterns = [
    /(?:^|[\s,;:])(?:\u0432|\u0438\u0437)\s+(?:\u043f\u0430\u043f\u043a|\u043f\u0430\u0440\u043a)[\u0435\u0438]\s+([\p{L}\p{N}_ -]+?)(?=\s+(?:\u0441\u043e\u0437\u0434\u0430|\u0441\u0434\u0435\u043b\u0430|\u0437\u0430\u0432\u0435\u0434|\u043f\u043b\u0430\u043d|\u0437\u0430\u043c\u0435\u0442\u043a|note|file|create|make|draft|new|plan)\b|[,.!?;:]|$)/iu,
    /(?:^|[\s,;:])(?:in|inside)\s+(?:the\s+)?folder\s+([\p{L}\p{N}_ -]+?)(?=\s+(?:create|make|draft|new|note|file|plan)\b|[,.!?;:]|$)/iu
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    const folder = match?.[1]
      ?.replace(
        /\s+(?:\u0437\u0430\u043c\u0435\u0442\u043a[\p{L}]*|\u0444\u0430\u0439\u043b|\u043f\u043b\u0430\u043d|note|file|plan)[\s\S]*$/iu,
        ""
      )
      .replace(/\b(?:\u0438|and)\b.*$/i, "")
      .trim();

    if (folder) {
      return folder;
    }
  }

  return null;
}

function normalizeLocalRouterText(text: string): string {
  return normalizeVoiceCommandNoise(text).toLocaleLowerCase().replace(/\s+/g, " ").trim();
}
