import type { VaultSearchResult, WebSearchResult } from "../types";

export interface VoiceSessionMemory {
  activeFolder?: string;
  currentTopic?: string;
  lastFoundFiles: VaultSearchResult[];
  lastOpenedFile?: string;
  lastUserIntent?: string;
  updatedAt?: number;
}

export type VoiceRecordingStopMode = "insert" | "send" | "discard";

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{
          isFinal: boolean;
          0?: { transcript?: string };
        }>;
      }) => void)
    | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}

export type VoiceMemoryIntent =
  | "attach-last-results"
  | "open-last-file"
  | "summarize-last-file";

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

export interface VoiceTextReplacement {
  original: string;
  suggested: string;
}

export interface TextOccurrenceMatch {
  original: string;
  occurrenceIndex?: number;
}

export interface OpenFileQueryParts {
  fileQuery: string;
  folderQuery?: string;
}

export interface AutoWebContext {
  query: string;
  searchQuery: string;
  reason: string;
  provider: string;
  fallbackReason?: string;
  results: WebSearchResult[];
}

export interface AutoWebDecision {
  query: string;
  reason: string;
}
