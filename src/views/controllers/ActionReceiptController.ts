import type {
  ActionReceipt,
  ChatMessage,
  LlmFileAttachment
} from "../../types";
import {
  actionReceiptToWikiReceipt,
  type WikiMemoryRecordInput
} from "../../wiki/wikiMemoryController";

export interface ActionReceiptMarkdownFileRef {
  path: string;
}

export interface ActionReceiptControllerDeps<
  TFile extends ActionReceiptMarkdownFileRef = ActionReceiptMarkdownFileRef
> {
  getMessages: () => ChatMessage[];
  appendMessages: (...messages: ChatMessage[]) => void;
  createActionReceiptMessages: (
    receipt: ActionReceipt,
    messageCount: number,
    userContent?: string,
    userAttachments?: LlmFileAttachment[] | null
  ) => ChatMessage[];
  getSuppressActionReceiptUserContent: () => boolean;
  renderMessages: () => unknown;
  recordWikiAutopilotMemory: (input: WikiMemoryRecordInput) => Promise<unknown>;
  getMarkdownFiles: () => TFile[];
  findMarkdownPathsInText: (text: string, files: TFile[]) => string[];
}

export class ActionReceiptController<
  TFile extends ActionReceiptMarkdownFileRef = ActionReceiptMarkdownFileRef
> {
  constructor(private readonly deps: ActionReceiptControllerDeps<TFile>) {}

  appendActionReceipt(
    receipt: ActionReceipt,
    userContent?: string,
    userAttachments?: LlmFileAttachment[] | null
  ): void {
    const messages = this.deps.createActionReceiptMessages(
      receipt,
      this.deps.getMessages().length,
      this.deps.getSuppressActionReceiptUserContent()
        ? undefined
        : userContent,
      userAttachments?.length ? userAttachments : null
    );

    this.deps.appendMessages(...messages);
    void this.deps.renderMessages();
    void this.deps.recordWikiAutopilotMemory({
      userText: userContent ?? "",
      assistantText: [receipt.label, receipt.detail].filter(Boolean).join("\n"),
      receipts: [actionReceiptToWikiReceipt(receipt)],
      sourcePaths: receipt.path ? [receipt.path] : []
    });
  }

  appendWorkflowReceipt(receipt: ActionReceipt, userContent?: string): void {
    console.debug("[Mindo] Workflow receipt", receipt);
    this.appendActionReceipt(receipt, userContent);
  }

  findLastMentionedMarkdownPaths(): string[] {
    const files = this.deps.getMarkdownFiles();
    const paths: string[] = [];

    for (const message of [...this.deps.getMessages()].reverse()) {
      if (message.role === "assistant") {
        paths.push(...this.deps.findMarkdownPathsInText(message.content, files));
      }

      if (message.sources?.length) {
        paths.push(...message.sources.map((source) => source.path));
      }

      if (paths.length) {
        return Array.from(new Set(paths));
      }
    }

    return [];
  }
}
