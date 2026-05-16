import type {
  ChatMessage,
  SelectedTextContext
} from "../../types";
import { buildTextReplacementDiffPreview } from "../../diff/diffService";
import {
  findUniqueTextOccurrence,
  getUniqueOccurrenceIndex,
  replaceSelectedOccurrence
} from "../../diff/textOccurrence";
import { stripHiddenTtsHints } from "../../voice/speechText";
import type {
  TextOccurrenceMatch,
  VoiceTextReplacement
} from "../sidebarTypes";

export interface VoiceReplacementFileRef {
  path: string;
}

export interface ActiveMarkdownNoteForVoiceReplacement<
  TFile extends VoiceReplacementFileRef
> {
  file: TFile;
  content: string;
}

export interface SelectedTextContextForVoice {
  context: SelectedTextContext | null;
  warning: string | null;
}

export interface VoiceReplacementPreviewControllerOptions<
  TFile extends VoiceReplacementFileRef
> {
  getMessages: () => ChatMessage[];
  appendMessages: (...messages: ChatMessage[]) => void;
  readSelectedTextContextForVoice: () => SelectedTextContextForVoice;
  readActiveMarkdownNote: () => Promise<
    ActiveMarkdownNoteForVoiceReplacement<TFile> | null
  >;
  getMarkdownFile: (path: string) => TFile | null;
  readFile: (file: TFile) => Promise<string>;
  setError: (error: string | null) => void;
  setStatus: (status: string) => void;
  showInlineDiffForMessage: (messageId: string) => Promise<unknown> | unknown;
  renderMessages: () => Promise<unknown> | unknown;
  findOccurrenceWithRustCore?: (input: {
    content: string;
    requestedText: string;
  }) => Promise<
    | {
        match?: TextOccurrenceMatch | null;
        error?: string | null;
      }
    | null
    | undefined
  >;
  createMessageId?: () => string;
  now?: () => number;
  maxWholeNoteUpdateChars?: number;
}

export class VoiceReplacementPreviewController<
  TFile extends VoiceReplacementFileRef = VoiceReplacementFileRef
> {
  constructor(
    private readonly options: VoiceReplacementPreviewControllerOptions<TFile>
  ) {}

  async previewVoiceReplacement(
    commandText: string,
    replacement: string
  ): Promise<void> {
    const contextResult = this.options.readSelectedTextContextForVoice();

    if (!contextResult.context) {
      this.options.setError(contextResult.warning);
      this.options.setStatus("Status: No selected text");
      return;
    }

    const selectedContext = contextResult.context;

    if (selectedContext.isTruncated) {
      this.options.setError(
        "Selected text is too long for a safe voice replacement. Select a smaller passage."
      );
      this.options.setStatus("Status: Selection too long");
      return;
    }

    const sourceFile = this.options.getMarkdownFile(selectedContext.path);

    if (!sourceFile) {
      this.options.setError(`Could not find source note: ${selectedContext.path}`);
      this.options.setStatus("Status: Preview failed");
      return;
    }

    const suggested = this.cleanSuggestedVoiceReplacement(replacement);

    if (!suggested) {
      this.options.setError("Voice replacement text is empty.");
      this.options.setStatus("Status: Preview failed");
      return;
    }

    const sourceContent = await this.options.readFile(sourceFile);
    const { userMessage, assistantMessage } = this.buildPreviewMessages({
      commandText,
      content: suggested,
      diffTitle: "Voice replacement preview",
      sourcePath: selectedContext.path,
      original: selectedContext.text,
      suggested,
      originalOccurrenceIndex: getUniqueOccurrenceIndex(
        sourceContent,
        selectedContext.text
      ),
      operationType: "voice-replace-selection"
    });

    this.commitPreview(userMessage, assistantMessage);
  }

  async previewVoiceReplacementOrCurrentNoteLine(
    commandText: string,
    replacement: string
  ): Promise<void> {
    const contextResult = this.options.readSelectedTextContextForVoice();

    if (contextResult.context) {
      await this.previewVoiceReplacement(commandText, replacement);
      return;
    }

    const note = await this.options.readActiveMarkdownNote();
    const target = note ? inferCurrentNoteReplacementTarget(note.content) : null;

    if (!note || !target) {
      this.options.setError(
        contextResult.warning ??
          "Select text or make the target phrase explicit before replacing it."
      );
      this.options.setStatus("Status: No replacement target");
      return;
    }

    await this.previewVoiceTextReplacement(commandText, {
      original: target,
      suggested: replacement
    });
  }

  async previewVoiceTextReplacement(
    commandText: string,
    replacement: VoiceTextReplacement
  ): Promise<void> {
    const note = await this.options.readActiveMarkdownNote();

    if (!note) {
      this.options.setError("Open a Markdown note before replacing text by voice.");
      this.options.setStatus("Status: No current note");
      return;
    }

    const suggested = this.cleanSuggestedVoiceReplacement(replacement.suggested);

    if (!replacement.original || !suggested) {
      this.options.setError(
        "Voice replacement command did not include both old and new text."
      );
      this.options.setStatus("Status: Preview failed");
      return;
    }

    const occurrence = await this.findUniqueTextOccurrenceForPreview(
      note.content,
      replacement.original
    );

    if (occurrence.error || !occurrence.match) {
      this.options.setError(occurrence.error);
      this.options.setStatus("Status: Preview failed");
      return;
    }

    const original = occurrence.match.original;
    const { userMessage, assistantMessage } = this.buildPreviewMessages({
      commandText,
      content: suggested,
      diffTitle: "Voice text replacement preview",
      sourcePath: note.file.path,
      original,
      suggested,
      originalOccurrenceIndex: occurrence.match.occurrenceIndex,
      operationType: "voice-replace-text"
    });

    this.commitPreview(userMessage, assistantMessage);
  }

  async previewVoiceMultiTextReplacement(
    commandText: string,
    replacements: VoiceTextReplacement[]
  ): Promise<void> {
    const note = await this.options.readActiveMarkdownNote();

    if (!note) {
      this.options.setError("Open a Markdown note before replacing text by voice.");
      this.options.setStatus("Status: No current note");
      return;
    }

    if (
      note.content.length >
      (this.options.maxWholeNoteUpdateChars ?? Number.POSITIVE_INFINITY)
    ) {
      this.options.setError(
        "The active note is too long for a safe multi-replacement preview. Select a smaller section or make one replacement at a time."
      );
      this.options.setStatus("Status: Note too long");
      return;
    }

    let nextContent = note.content;

    for (const replacement of replacements) {
      const original = cleanVoiceReplacementText(replacement.original);
      const suggested = this.cleanSuggestedVoiceReplacement(replacement.suggested);
      const occurrence = await this.findUniqueTextOccurrenceForPreview(
        nextContent,
        original
      );

      if (occurrence.error || !occurrence.match) {
        this.options.setError(occurrence.error);
        this.options.setStatus("Status: Preview failed");
        return;
      }

      nextContent = replaceSelectedOccurrence(
        nextContent,
        occurrence.match.original,
        suggested,
        occurrence.match.occurrenceIndex
      );
    }

    if (nextContent === note.content) {
      this.options.setError("Semantic edit did not change the note.");
      this.options.setStatus("Status: Preview failed");
      return;
    }

    const { userMessage, assistantMessage } = this.buildPreviewMessages({
      commandText,
      content: nextContent,
      diffTitle: "Voice multi-replacement preview",
      sourcePath: note.file.path,
      original: note.content,
      suggested: nextContent,
      originalOccurrenceIndex: 0,
      operationType: "voice-replace-multiple"
    });

    this.commitPreview(userMessage, assistantMessage);
  }

  async findUniqueTextOccurrenceForPreview(
    content: string,
    requestedText: string
  ): Promise<
    | { match: TextOccurrenceMatch; error: null }
    | { match: null; error: string }
  > {
    const rustOccurrence = await this.options.findOccurrenceWithRustCore?.({
      content,
      requestedText
    });

    if (rustOccurrence?.match) {
      return {
        match: {
          original: rustOccurrence.match.original,
          occurrenceIndex: rustOccurrence.match.occurrenceIndex
        },
        error: null
      };
    }

    if (rustOccurrence?.error) {
      return {
        match: null,
        error: rustOccurrence.error
      };
    }

    return findUniqueTextOccurrence(content, requestedText);
  }

  private cleanSuggestedVoiceReplacement(value: string): string {
    return cleanSuggestedReplacement(stripHiddenTtsHints(value));
  }

  private buildPreviewMessages(input: {
    commandText: string;
    content: string;
    diffTitle: string;
    sourcePath: string;
    original: string;
    suggested: string;
    originalOccurrenceIndex?: number;
    operationType: string;
  }): { userMessage: ChatMessage; assistantMessage: ChatMessage } {
    const userMessage: ChatMessage = {
      id: this.createMessageId(),
      role: "user",
      content: input.commandText,
      createdAt: this.now()
    };
    const assistantMessage: ChatMessage = {
      id: this.createMessageId(),
      role: "assistant",
      content: input.content,
      createdAt: this.now(),
      diffPreview: buildTextReplacementDiffPreview({
        title: input.diffTitle,
        sourcePath: input.sourcePath,
        originalOccurrenceIndex: input.originalOccurrenceIndex,
        original: input.original,
        suggested: input.suggested,
        operationType: input.operationType,
        userPrompt: input.commandText
      })
    };

    return { userMessage, assistantMessage };
  }

  private commitPreview(
    userMessage: ChatMessage,
    assistantMessage: ChatMessage
  ): void {
    this.options.setError(null);
    this.options.appendMessages(userMessage, assistantMessage);
    this.options.setStatus("Status: Preview ready");
    void this.options.showInlineDiffForMessage(assistantMessage.id);
    void this.options.renderMessages();
  }

  private createMessageId(): string {
    return (
      this.options.createMessageId?.() ??
      `${Date.now()}-${this.options.getMessages().length}`
    );
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}

function cleanSuggestedReplacement(content: string): string {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);

  return (fenceMatch?.[1] ?? trimmed).trim();
}

function cleanVoiceReplacementText(text: string): string {
  return text
    .trim()
    .replace(/^(?:here is|this is|the following|so)\s*[:\-\u2013\u2014]?\s*/i, "")
    .replace(/^["'\u00ab\u201c]+|["'\u00bb\u201d]+$/g, "")
    .trim();
}

function inferCurrentNoteReplacementTarget(content: string): string | null {
  const meaningfulLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !/^---+$/.test(line));

  if (meaningfulLines.length === 1) {
    return meaningfulLines[0];
  }

  if (meaningfulLines.length <= 3) {
    return meaningfulLines[meaningfulLines.length - 1] ?? null;
  }

  return null;
}
