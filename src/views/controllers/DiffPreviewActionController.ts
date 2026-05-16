import type {
  ActionReceipt,
  ChatMessage,
  TextDiffPreview
} from "../../types";
import {
  applyDiffPreviewChange,
  type DiffHistoryOperationInput,
  type DiffHistoryOperationResult,
  undoDiffPreviewChange
} from "../../diff/diffPreviewWorkflow";

export type DiffPreviewInlineAction = "accept" | "change" | "undo" | "reject";

export interface DiffPreviewFileRef {
  path: string;
}

export interface DiffPreviewInlineActionDetail {
  messageId?: string;
  action?: DiffPreviewInlineAction;
}

export interface DiffPreviewActionControllerOptions<
  TFile extends DiffPreviewFileRef
> {
  getMessages: () => ChatMessage[];
  getModel: () => string;
  getFile: (path: string) => TFile | null;
  readFile: (file: TFile) => Promise<string>;
  writeFile: (file: TFile, content: string) => Promise<void>;
  assertWritablePath: (path: string) => void;
  recordOperation: (
    input: DiffHistoryOperationInput
  ) => Promise<DiffHistoryOperationResult>;
  markOperationApplied: (operationId: string) => Promise<unknown>;
  rollbackOperation: (operationId: string) => Promise<unknown>;
  requestCompletion: (messages: ChatMessage[]) => Promise<string>;
  cleanReplacement: (value: string) => string;
  clearInlineDiff: (path: string) => void;
  showInlineDiff: (
    messageId: string,
    diffPreview: TextDiffPreview
  ) => Promise<boolean>;
  getActiveRefineMessageId: () => string | null;
  setActiveRefineMessageId: (messageId: string | null) => void;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  appendActionReceipt: (receipt: ActionReceipt) => void;
  setContextDetail: (message: string, isWarning: boolean) => void;
  renderMessages: () => Promise<void> | void;
  notify: (message: string) => void;
  getErrorMessage: (error: unknown) => string;
}

export class DiffPreviewActionController<
  TFile extends DiffPreviewFileRef = DiffPreviewFileRef
> {
  constructor(
    private readonly options: DiffPreviewActionControllerOptions<TFile>
  ) {}

  findMessage(messageId: string): ChatMessage | null {
    return (
      this.options
        .getMessages()
        .find((message) => message.id === messageId) ?? null
    );
  }

  findLatestDiffMessage(status: TextDiffPreview["status"]): ChatMessage | null {
    return (
      [...this.options.getMessages()]
        .reverse()
        .find((message) => message.diffPreview?.status === status) ?? null
    );
  }

  async applyDiffPreview(messageId: string): Promise<void> {
    const message = this.findMessage(messageId);
    const diffPreview = message?.diffPreview;

    if (!diffPreview || diffPreview.status !== "pending") {
      return;
    }

    const file = this.getDiffPreviewFile(diffPreview);

    if (!file) {
      this.options.setError(`Could not find source note: ${diffPreview.sourcePath}`);
      this.options.setStatus("Status: Apply failed");
      return;
    }

    try {
      this.options.assertWritablePath(file.path);
    } catch (error) {
      this.options.setError(this.options.getErrorMessage(error));
      this.options.setStatus("Status: Apply blocked");
      return;
    }

    this.options.setError(null);
    this.options.setLoading(true);

    try {
      const result = await applyDiffPreviewChange({
        diffPreview,
        filePath: file.path,
        model: this.options.getModel(),
        readContent: () => this.options.readFile(file),
        writeContent: (content) => this.options.writeFile(file, content),
        recordOperation: (input) => this.options.recordOperation(input),
        markOperationApplied: async (operationId) => {
          await this.options.markOperationApplied(operationId);
        }
      });

      this.options.setActiveRefineMessageId(null);
      this.options.clearInlineDiff(file.path);
      this.options.setStatus("Status: Applied");
      this.options.notify("Mindo applied the suggested replacement.");
      this.options.appendActionReceipt(result.receipt);
    } catch (error) {
      this.options.setError(this.options.getErrorMessage(error));
      this.options.setStatus("Status: Apply failed");
    } finally {
      this.options.setLoading(false);
      void this.options.renderMessages();
    }
  }

  async undoDiffPreview(messageId: string): Promise<void> {
    const message = this.findMessage(messageId);
    const diffPreview = message?.diffPreview;

    if (!diffPreview || diffPreview.status !== "applied") {
      return;
    }

    const file = this.getDiffPreviewFile(diffPreview);

    if (!file) {
      this.options.setError(`Could not find source note: ${diffPreview.sourcePath}`);
      this.options.setStatus("Status: Undo failed");
      return;
    }

    this.options.setError(null);
    this.options.setLoading(true);

    try {
      const result = await undoDiffPreviewChange({
        diffPreview,
        filePath: file.path,
        readContent: () => this.options.readFile(file),
        writeContent: (content) => this.options.writeFile(file, content),
        rollbackOperation: (operationId) =>
          this.options.rollbackOperation(operationId)
      });

      this.options.setActiveRefineMessageId(null);
      this.options.setStatus("Status: Reverted");
      this.options.notify("Mindo reverted the accepted replacement.");
      this.options.appendActionReceipt(result.receipt);
    } catch (error) {
      this.options.setError(this.options.getErrorMessage(error));
      this.options.setStatus("Status: Undo failed");
    } finally {
      this.options.setLoading(false);
      void this.options.renderMessages();
    }
  }

  async refineDiffPreview(
    messageId: string,
    instruction: string
  ): Promise<void> {
    const trimmedInstruction = instruction.trim();
    const message = this.findMessage(messageId);
    const diffPreview = message?.diffPreview;

    if (!trimmedInstruction || !diffPreview || diffPreview.status !== "pending") {
      return;
    }

    this.options.setError(null);
    this.options.setLoading(true);
    this.options.setStatus("Status: Updating preview");

    try {
      const refined = await this.options.requestCompletion([
        {
          id: `${Date.now()}-refine`,
          role: "user",
          content: [
            "Revise the suggested Markdown replacement based on the user's instruction.",
            "Preserve the meaning and language of the original selected text.",
            "Return only the final replacement Markdown. Do not add explanations, headings, quotes, or code fences.",
            "",
            "Original selected text:",
            diffPreview.original,
            "",
            "Current suggested replacement:",
            diffPreview.suggested,
            "",
            "User instruction:",
            trimmedInstruction
          ].join("\n"),
          createdAt: Date.now()
        }
      ]);

      diffPreview.suggested = this.options.cleanReplacement(refined);
      this.options.setActiveRefineMessageId(null);
      this.options.setStatus("Status: Ready");
      void this.showInlineDiffForMessage(messageId);
    } catch (error) {
      this.options.setError(this.options.getErrorMessage(error));
      this.options.setStatus("Status: Update failed");
    } finally {
      this.options.setLoading(false);
      void this.options.renderMessages();
    }
  }

  rejectDiffPreview(messageId: string): void {
    const message = this.findMessage(messageId);

    if (!message?.diffPreview || message.diffPreview.status !== "pending") {
      return;
    }

    message.diffPreview.status = "rejected";
    this.options.setActiveRefineMessageId(null);
    this.options.clearInlineDiff(message.diffPreview.sourcePath);
    this.options.setStatus("Status: Rejected");
    this.options.appendActionReceipt({
      status: "rejected",
      label: "Rejected change preview",
      detail: message.diffPreview.sourcePath,
      path: message.diffPreview.sourcePath
    });
    void this.options.renderMessages();
  }

  handleInlineDiffAction(detail: DiffPreviewInlineActionDetail): void {
    if (!detail.messageId || !detail.action) {
      return;
    }

    if (detail.action === "accept") {
      void this.applyDiffPreview(detail.messageId);
      return;
    }

    if (detail.action === "change") {
      this.options.setActiveRefineMessageId(
        this.options.getActiveRefineMessageId() === detail.messageId
          ? null
          : detail.messageId
      );
      void this.options.renderMessages();
      return;
    }

    if (detail.action === "undo") {
      void this.undoDiffPreview(detail.messageId);
      return;
    }

    this.rejectDiffPreview(detail.messageId);
  }

  async showInlineDiffForMessage(messageId: string): Promise<void> {
    const message = this.findMessage(messageId);
    const diffPreview = message?.diffPreview;

    if (!diffPreview || diffPreview.status !== "pending") {
      return;
    }

    const didShow = await this.options.showInlineDiff(messageId, diffPreview);

    if (!didShow) {
      this.options.setContextDetail(
        "Inline diff could not be shown in the editor. The sidebar preview is still available.",
        true
      );
    }
  }

  private getDiffPreviewFile(diffPreview: TextDiffPreview): TFile | null {
    return this.options.getFile(diffPreview.sourcePath);
  }
}
