import type { TFile } from "obsidian";
import type { CurrentNoteContext, SelectedTextContext } from "../../types";

interface CurrentNoteContextResult {
  context: CurrentNoteContext | null;
  warning: string | null;
}

interface SelectedTextContextResult {
  context: SelectedTextContext | null;
  warning: string | null;
}

export interface ContextReaderControllerDeps {
  getCurrentNoteContext: () => Promise<CurrentNoteContextResult>;
  getSelectedTextContext: () => SelectedTextContextResult;
  getActiveFile: () => TFile | null;
  getActiveMarkdownEditorValue: (path: string) => string | null;
  cachedRead: (file: TFile) => Promise<string>;
  hasUsableSelection: (context: SelectedTextContext | null) => boolean;
  getLastSelectedTextContext: () => SelectedTextContext | null;
  setLastSelectedTextContext: (context: SelectedTextContext | null) => void;
  getLastSelectedTextContextAt: () => number;
  setLastSelectedTextContextAt: (value: number) => void;
  setContextDetail: (message: string | null, isWarning: boolean) => void;
  getActiveNoteText: () => string;
  now: () => number;
  maxNoteActionContextChars: number;
}

export class ContextReaderController {
  constructor(private readonly deps: ContextReaderControllerDeps) {}

  async readCurrentNoteContextForRequest(): Promise<{
    context: CurrentNoteContext | null;
  }> {
    const result = await this.deps.getCurrentNoteContext();

    if (result.context?.isTruncated) {
      this.deps.setContextDetail(
        `Current note context: first ${result.context.includedLength} of ${result.context.originalLength} characters attached for speed.`,
        false
      );
    } else if (result.warning) {
      this.deps.setContextDetail(result.warning, true);
    } else if (result.context) {
      this.deps.setContextDetail(
        `${this.deps.getActiveNoteText()}: ${result.context.path}`,
        false
      );
    }

    return {
      context: result.context
    };
  }

  readSelectedTextContextForRequest(): SelectedTextContextResult {
    const result = this.deps.getSelectedTextContext();

    if (result.warning) {
      this.deps.setContextDetail(result.warning, true);
    } else if (result.context) {
      this.deps.setContextDetail(
        `Selected text: ${result.context.includedLength} characters from ${result.context.path}`,
        false
      );
    }

    return result;
  }

  readSelectedTextContextForVoice(): SelectedTextContextResult {
    const result = this.readSelectedTextContextForRequest();

    if (this.deps.hasUsableSelection(result.context)) {
      this.deps.setLastSelectedTextContext(result.context);
      this.deps.setLastSelectedTextContextAt(this.deps.now());
      return result;
    }

    const activeFile = this.deps.getActiveFile();
    const lastContext = this.deps.getLastSelectedTextContext();
    const lastContextAge =
      this.deps.now() - this.deps.getLastSelectedTextContextAt();

    if (
      lastContext &&
      this.deps.hasUsableSelection(lastContext) &&
      lastContextAge < 120000 &&
      (!activeFile || activeFile.path === lastContext.path)
    ) {
      this.deps.setContextDetail(
        `Selected text: ${lastContext.includedLength} characters from ${lastContext.path}`,
        false
      );

      return {
        context: lastContext,
        warning: null
      };
    }

    return result;
  }

  async readActiveMarkdownNote(): Promise<{
    file: TFile;
    content: string;
  } | null> {
    const file = this.deps.getActiveFile();

    if (!file || file.extension !== "md") {
      return null;
    }

    const editorValue = this.deps.getActiveMarkdownEditorValue(file.path);
    if (editorValue !== null) {
      return {
        file,
        content: editorValue
      };
    }

    return {
      file,
      content: await this.deps.cachedRead(file)
    };
  }

  buildSelectedContextFromNote(
    file: TFile,
    content: string
  ): SelectedTextContext {
    const includedText = content.slice(
      0,
      this.deps.maxNoteActionContextChars
    );
    const isTruncated = includedText.length < content.length;

    this.deps.setContextDetail(
      isTruncated
        ? `Current note context: first ${includedText.length} of ${content.length} characters attached for speed.`
        : `${this.deps.getActiveNoteText()}: ${file.path}`,
      false
    );

    return {
      path: file.path,
      name: file.basename,
      text: includedText,
      isTruncated,
      originalLength: content.length,
      includedLength: includedText.length
    };
  }
}
