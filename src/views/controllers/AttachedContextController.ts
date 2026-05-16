import type { LlmFileAttachment, VaultSearchResult } from "../../types";
import type {
  ClipboardFileDataLike,
  PreparedAttachedFiles
} from "./AttachmentController";

export interface AttachedContextPasteEventLike {
  clipboardData: ClipboardFileDataLike | null;
  preventDefault(): void;
}

export interface AttachedContextControllerDeps {
  extractClipboardFiles: (clipboardData: ClipboardFileDataLike) => File[];
  prepareAttachedFiles: (
    files: File[],
    existingFiles: LlmFileAttachment[]
  ) => Promise<PreparedAttachedFiles>;
  getAttachedVaultResults: () => VaultSearchResult[] | null;
  setAttachedVaultResults: (results: VaultSearchResult[] | null) => void;
  getAttachedFiles: () => LlmFileAttachment[];
  setAttachedFiles: (files: LlmFileAttachment[]) => void;
  setUseVaultSearch: (useVaultSearch: boolean) => void;
  setUseVaultSearchChecked: (checked: boolean) => void;
  rememberVaultSearch: (query: string, results: VaultSearchResult[]) => void;
  renderAttachedContext: () => void;
  setContextDetail: (message: string | null, isWarning: boolean) => void;
  setError: (message: string | null) => void;
  setStatus: (status: string) => void;
  focusInput: () => void;
  getErrorMessage: (error: unknown) => string;
}

export class AttachedContextController {
  constructor(private readonly deps: AttachedContextControllerDeps) {}

  attachVaultResults(results: VaultSearchResult[], query = ""): void {
    this.deps.setAttachedVaultResults(results);
    this.deps.setUseVaultSearch(true);
    this.deps.rememberVaultSearch(query, results);
    this.deps.setUseVaultSearchChecked(true);
    this.deps.setContextDetail(
      `Attached ${results.length} vault search result${
        results.length === 1 ? "" : "s"
      } to the next message.`,
      false
    );
    this.deps.renderAttachedContext();
    this.deps.focusInput();
  }

  async handlePaste(event: AttachedContextPasteEventLike): Promise<void> {
    const clipboardData = event.clipboardData;

    if (!clipboardData) {
      return;
    }

    const files = this.deps.extractClipboardFiles(clipboardData);

    if (!files.length) {
      return;
    }

    event.preventDefault();
    await this.attachFiles(files);
  }

  async attachFiles(files: File[]): Promise<void> {
    if (!files.length) {
      return;
    }

    this.deps.setError(null);
    this.deps.setStatus("Status: Attaching files");

    try {
      const result = await this.deps.prepareAttachedFiles(
        files,
        this.deps.getAttachedFiles()
      );
      this.deps.setAttachedFiles(result.attachedFiles);
      this.deps.renderAttachedContext();
      this.deps.setContextDetail(
        `Attached ${result.newAttachments.length} file${
          result.newAttachments.length === 1 ? "" : "s"
        } to the next message.`,
        false
      );
      this.deps.setStatus("Status: Ready");
      this.deps.focusInput();
    } catch (error) {
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Attach failed");
    }
  }

  clearAttachedContext(): void {
    this.deps.setAttachedVaultResults(null);
    this.deps.setAttachedFiles([]);
    this.deps.renderAttachedContext();
    this.deps.setContextDetail("Attached context cleared.", false);
  }
}
