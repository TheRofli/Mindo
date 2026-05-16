import type {
  ActionReceipt,
  CurrentNoteContext,
  LlmRequestContext,
  VaultSearchResult
} from "../../types";
import type { VoiceSessionMemory } from "../sidebarTypes";
import { getFolderPath } from "../createNotePathUtils";

export interface MarkdownFileLike {
  path: string;
  basename: string;
  extension?: string;
}

export interface LastFoundFileControllerDeps<
  TFileLike extends MarkdownFileLike = MarkdownFileLike
> {
  memory: VoiceSessionMemory;
  findLastMentionedMarkdownPaths: () => string[];
  openVaultPath: (path: string, contextDetail: string) => Promise<void>;
  appendActionReceipt: (
    receipt: ActionReceipt,
    userContent?: string
  ) => void;
  sendMessage: (
    text: string,
    context: LlmRequestContext,
    saveToChat?: boolean
  ) => Promise<void>;
  attachVaultResults: (results: VaultSearchResult[]) => void;
  getMarkdownFile: (path: string) => TFileLike | null;
  readFile: (file: TFileLike) => Promise<string>;
  setError: (error: string | null) => void;
  setStatus: (status: string) => void;
  now?: () => number;
  maxContextChars?: number;
}

const DEFAULT_MAX_CONTEXT_CHARS = 12000;

export class LastFoundFileController<
  TFileLike extends MarkdownFileLike = MarkdownFileLike
> {
  constructor(private readonly deps: LastFoundFileControllerDeps<TFileLike>) {}

  async answerFromLastFoundFile(commandText: string): Promise<void> {
    const context = await this.readLastFoundFileContext();

    if (!context) {
      this.deps.setError(
        "No remembered vault search result yet. Say: find notes about ..."
      );
      this.deps.setStatus("Status: No remembered file");
      return;
    }

    await this.deps.sendMessage(
      commandText,
      {
        currentNote: context
      },
      false
    );
  }

  async openLastFoundFile(commandText?: string): Promise<string | null> {
    const path = this.getRememberedPath();

    if (!path) {
      this.deps.setError("No remembered vault search result yet.");
      this.deps.setStatus("Status: No remembered file");
      return null;
    }

    await this.deps.openVaultPath(path, `Opened remembered file: ${path}`);
    this.rememberOpenedPath(path);

    if (commandText) {
      this.deps.appendActionReceipt(
        {
          status: "opened",
          label: "Opened remembered note",
          detail: path,
          path
        },
        commandText
      );
    }

    return path;
  }

  attachLastFoundFiles(): void {
    const results = this.deps.memory.lastFoundFiles;

    if (!results.length) {
      this.deps.setError("No remembered vault search results yet.");
      this.deps.setStatus("Status: No remembered files");
      return;
    }

    this.deps.attachVaultResults(results);
    this.deps.setStatus("Status: Search context attached");
    this.deps.appendActionReceipt({
      status: "done",
      label: "Attached search context",
      detail: `${results.length} source${results.length === 1 ? "" : "s"}`
    });
  }

  async readLastFoundFileContext(): Promise<CurrentNoteContext | null> {
    const path =
      this.deps.memory.lastOpenedFile ??
      this.deps.memory.lastFoundFiles[0]?.path;

    if (!path) {
      return null;
    }

    return this.readMarkdownFileContext(path);
  }

  async readMarkdownFileContext(
    path: string
  ): Promise<CurrentNoteContext | null> {
    const file = this.deps.getMarkdownFile(path);

    if (!file || (file.extension && file.extension !== "md")) {
      return null;
    }

    const content = await this.deps.readFile(file);
    const maxChars =
      this.deps.maxContextChars ?? DEFAULT_MAX_CONTEXT_CHARS;
    const includedContent = content.slice(0, maxChars);

    this.rememberOpenedPath(file.path);

    return {
      path: file.path,
      name: file.basename,
      content: includedContent,
      isTruncated: content.length > maxChars,
      originalLength: content.length,
      includedLength: includedContent.length
    };
  }

  private getRememberedPath(): string | null {
    return (
      this.deps.findLastMentionedMarkdownPaths()[0] ??
      this.deps.memory.lastOpenedFile ??
      this.deps.memory.lastFoundFiles[0]?.path ??
      null
    );
  }

  private rememberOpenedPath(path: string): void {
    this.deps.memory.lastOpenedFile = path;
    this.deps.memory.activeFolder = getFolderPath(path);
    this.deps.memory.updatedAt = this.deps.now?.() ?? Date.now();
  }
}
