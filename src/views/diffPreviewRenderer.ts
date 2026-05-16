import {
  buildLineDiff,
  getCompactDiffStatusText,
  getDiffPrefix
} from "../diff/lineDiff";
import {
  getInlineDiffActionButtons,
  type InlineDiffWorkflowAction
} from "../editor/inlineDiffWorkflow";
import type { ChatMessage, TextDiffPreview } from "../types";

export interface DiffPreviewRendererDeps {
  onApply: (messageId: string) => void;
  onReject: (messageId: string) => void;
  onUndo: (messageId: string) => void;
  onToggleChange: (messageId: string) => void;
  onRefine: (messageId: string, instruction: string) => void;
  onCancelRefine: () => void;
  onShowInline: (messageId: string) => void;
}

export interface DiffPreviewRenderInput {
  parentEl: HTMLElement;
  message: ChatMessage;
  activeRefineMessageId: string | null;
  isLoading: boolean;
}

export function isDiffPreviewActionDisabled(
  action: InlineDiffWorkflowAction,
  status: TextDiffPreview["status"],
  isLoading: boolean
): boolean {
  if (isLoading) {
    return true;
  }

  if (action === "undo") {
    return status !== "applied";
  }

  return status !== "pending";
}

export class DiffPreviewRenderer {
  constructor(private readonly deps: DiffPreviewRendererDeps) {}

  render(input: DiffPreviewRenderInput): void {
    const { parentEl, message } = input;
    const diffPreview = message.diffPreview;

    if (!diffPreview) {
      return;
    }

    const previewEl = parentEl.createDiv({
      cls: "contex-agent__diff-preview"
    });

    const isPending = diffPreview.status === "pending";

    if (isPending && input.activeRefineMessageId === message.id) {
      this.renderRefinePanel(previewEl, message.id);
    }

    previewEl.createDiv({
      cls: "contex-agent__diff-title",
      text: diffPreview.title
    });

    previewEl.createDiv({
      cls: [
        "contex-agent__diff-status",
        `contex-agent__diff-status--${diffPreview.status}`
      ],
      text: `Status: ${diffPreview.status}`
    });

    if (!isPending) {
      this.renderCompact(previewEl, message.id, diffPreview, input.isLoading);
      return;
    }

    const panesEl = previewEl.createDiv({
      cls: "contex-agent__diff-panes"
    });
    this.renderPane(panesEl, "Original", diffPreview.original);
    this.renderPane(panesEl, "Suggested", diffPreview.suggested);

    const diffEl = previewEl.createDiv({
      cls: "contex-agent__diff-lines",
      attr: {
        "aria-label": "Diff preview"
      }
    });

    buildLineDiff(diffPreview.original, diffPreview.suggested).forEach((line) => {
      const lineEl = diffEl.createDiv({
        cls: [
          "contex-agent__diff-line",
          `contex-agent__diff-line--${line.type}`
        ],
        text: `${getDiffPrefix(line.type)} ${line.text}`
      });
      lineEl.toggleClass("contex-agent__diff-line--empty", !line.text);
    });

    this.renderActions(previewEl, message.id, diffPreview, input.isLoading);
  }

  private renderCompact(
    parentEl: HTMLElement,
    messageId: string,
    diffPreview: TextDiffPreview,
    isLoading: boolean
  ): void {
    const compactEl = parentEl.createDiv({
      cls: "contex-agent__diff-compact"
    });
    compactEl.createDiv({
      cls: "contex-agent__diff-compact-text",
      text: getCompactDiffStatusText(diffPreview.status)
    });

    const buttons = getInlineDiffActionButtons(diffPreview.status);

    if (buttons.length === 0) {
      return;
    }

    const actionsEl = compactEl.createDiv({
      cls: "contex-agent__diff-actions"
    });

    buttons.forEach((button) => {
      const buttonEl = actionsEl.createEl("button", {
        cls: button.primary ? "mod-cta" : undefined,
        text: button.label
      });
      buttonEl.disabled = isDiffPreviewActionDisabled(
        button.action,
        diffPreview.status,
        isLoading
      );
      buttonEl.addEventListener("click", () => {
        if (button.action === "undo") {
          this.deps.onUndo(messageId);
        }
      });
    });
  }

  private renderRefinePanel(parentEl: HTMLElement, messageId: string): void {
    const panelEl = parentEl.createDiv({
      cls: "contex-agent__diff-refine"
    });
    const inputEl = panelEl.createEl("textarea", {
      cls: "contex-agent__diff-refine-input",
      attr: {
        placeholder: "What should change? e.g. Add one more concrete example."
      }
    });
    const actionsEl = panelEl.createDiv({
      cls: "contex-agent__diff-refine-actions"
    });
    const updateButton = actionsEl.createEl("button", {
      cls: "mod-cta",
      text: "Update"
    });
    const cancelButton = actionsEl.createEl("button", {
      text: "Cancel"
    });

    inputEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        this.deps.onRefine(messageId, inputEl.value);
      }
    });
    updateButton.addEventListener("click", () => {
      this.deps.onRefine(messageId, inputEl.value);
    });
    cancelButton.addEventListener("click", () => this.deps.onCancelRefine());

    window.setTimeout(() => inputEl.focus(), 0);
  }

  private renderActions(
    parentEl: HTMLElement,
    messageId: string,
    diffPreview: TextDiffPreview,
    isLoading: boolean
  ): void {
    const actionsEl = parentEl.createDiv({
      cls: "contex-agent__diff-actions"
    });

    getInlineDiffActionButtons(diffPreview.status).forEach((button) => {
      const buttonEl = actionsEl.createEl("button", {
        cls: button.primary ? "mod-cta" : undefined,
        text: button.label
      });
      buttonEl.disabled = isDiffPreviewActionDisabled(
        button.action,
        diffPreview.status,
        isLoading
      );
      buttonEl.addEventListener("click", () => {
        if (button.action === "accept") {
          this.deps.onApply(messageId);
          return;
        }

        if (button.action === "change") {
          this.deps.onToggleChange(messageId);
          return;
        }

        if (button.action === "reject") {
          this.deps.onReject(messageId);
          return;
        }

        this.deps.onUndo(messageId);
      });
    });

    const showButton = actionsEl.createEl("button", {
      text: "Show in note"
    });

    showButton.disabled =
      diffPreview.status !== "pending" || isLoading;
    showButton.addEventListener("click", () => {
      this.deps.onShowInline(messageId);
    });
  }

  private renderPane(
    parentEl: HTMLElement,
    title: string,
    content: string
  ): void {
    const paneEl = parentEl.createDiv({ cls: "contex-agent__diff-pane" });
    paneEl.createDiv({ cls: "contex-agent__diff-pane-title", text: title });
    paneEl.createEl("pre", {
      cls: "contex-agent__diff-pane-content",
      text: content
    });
  }
}
