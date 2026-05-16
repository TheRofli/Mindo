import type {
  ChatMessage,
  ContexSettings,
  CurrentNoteContext,
  LlmFileAttachment,
  LlmRequestContext
} from "../types";
import { buildTextReplacementDiffPreview } from "../diff/diffService";
import type { AutoWebContext } from "../views/sidebarTypes";

export interface CurrentNoteUpdateNote {
  path: string;
  name: string;
  content: string;
}

export interface BuildCurrentNoteUpdatePromptOptions {
  note: CurrentNoteUpdateNote;
  userPrompt: string;
  autoWebContextText?: string;
  projectMemoryText?: string;
}

export interface PrepareCurrentNoteUpdatePreviewOptions {
  settings: ContexSettings;
  note: CurrentNoteUpdateNote;
  userPrompt: string;
  attachedFiles: LlmFileAttachment[] | null;
  messageIndex: number;
  createdAt?: number;
  readProjectMemoryContext: () => Promise<string | null>;
  buildAutoWebContextForRequest: (
    userPrompt: string,
    context: Pick<LlmRequestContext, "currentNote" | "projectMemory">
  ) => Promise<AutoWebContext | null>;
  formatAutoWebContextForPrompt: (context: AutoWebContext) => string;
  formatProjectMemoryForPrompt: (projectMemory: string) => string;
  cleanReplacement: (text: string) => string;
  stripSpeechHints: (text: string) => string;
  requestLlmChatCompletion: (
    settings: ContexSettings,
    messages: ChatMessage[],
    context?: LlmRequestContext | null
  ) => Promise<string>;
}

export interface CurrentNoteUpdatePreviewResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  autoWebContext: AutoWebContext | null;
}

export function buildCurrentNoteUpdatePrompt(
  options: BuildCurrentNoteUpdatePromptOptions
): string {
  return [
    "Rewrite the current Markdown note into a clearer, better structured version.",
    "Preserve facts, meaning, language, links, frontmatter, code blocks, and important headings.",
    "Return only the full replacement Markdown. Do not add explanations, quotes, code fences, or hidden TTS comments.",
    "",
    "User update request:",
    options.userPrompt,
    "",
    options.autoWebContextText ?? "",
    "",
    options.projectMemoryText ?? "",
    "",
    "Current note path:",
    options.note.path,
    "",
    "Current note content:",
    options.note.content
  ].join("\n");
}

export async function prepareCurrentNoteUpdatePreview(
  options: PrepareCurrentNoteUpdatePreviewOptions
): Promise<CurrentNoteUpdatePreviewResult> {
  const createdAt = options.createdAt ?? Date.now();
  const currentNoteContext: CurrentNoteContext = {
    path: options.note.path,
    name: options.note.name,
    content: options.note.content,
    isTruncated: false,
    originalLength: options.note.content.length,
    includedLength: options.note.content.length
  };
  const projectMemory = await options.readProjectMemoryContext();
  const autoWebContext = await options.buildAutoWebContextForRequest(
    options.userPrompt,
    {
      currentNote: currentNoteContext,
      projectMemory
    }
  );

  const rawSuggested = await options.requestLlmChatCompletion(
    options.settings,
    [
      {
        id: `${createdAt}-update-note`,
        role: "user",
        content: buildCurrentNoteUpdatePrompt({
          note: options.note,
          userPrompt: options.userPrompt,
          autoWebContextText: autoWebContext
            ? options.formatAutoWebContextForPrompt(autoWebContext)
            : "",
          projectMemoryText: projectMemory
            ? options.formatProjectMemoryForPrompt(projectMemory)
            : ""
        }),
        createdAt
      }
    ],
    options.attachedFiles
      ? {
          attachments: options.attachedFiles
        }
      : null
  );
  const suggested = options.cleanReplacement(
    options.stripSpeechHints(rawSuggested)
  );

  if (!suggested.trim()) {
    throw new Error("LLM returned an empty note update.");
  }

  const userMessage: ChatMessage = {
    id: `${createdAt}-${options.messageIndex}`,
    role: "user",
    content: options.userPrompt,
    createdAt,
    attachments: options.attachedFiles
  };
  const assistantMessage: ChatMessage = {
    id: `${createdAt}-${options.messageIndex + 1}`,
    role: "assistant",
    content: suggested,
    createdAt,
    diffPreview: buildTextReplacementDiffPreview({
      title: "Update current note preview",
      sourcePath: options.note.path,
      originalOccurrenceIndex: 0,
      original: options.note.content,
      suggested,
      operationType: "update-note",
      userPrompt: options.userPrompt
    })
  };

  if (autoWebContext) {
    assistantMessage.webResearchQuery = autoWebContext.query;
    assistantMessage.webSearchQuery = autoWebContext.searchQuery;
    assistantMessage.webResearchResults = autoWebContext.results;
    assistantMessage.webResearchProvider = autoWebContext.provider;
    assistantMessage.webResearchFallbackReason = autoWebContext.fallbackReason;
    assistantMessage.webSources = autoWebContext.results;
  }

  return {
    userMessage,
    assistantMessage,
    autoWebContext
  };
}
