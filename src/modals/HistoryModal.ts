import { Modal, Notice, type App } from "obsidian";
import {
  type AiChangeOperation,
  readAiChangeOperations,
  rollbackAiChangeOperation
} from "../history/changeHistory";

type HistoryFilter =
  | "all"
  | "applied"
  | "rolled_back"
  | "recorded"
  | "create-note"
  | "improve-selection";

interface HistoryFilterOption {
  label: string;
  value: HistoryFilter;
}

const HISTORY_FILTERS: HistoryFilterOption[] = [
  { label: "All", value: "all" },
  { label: "Applied", value: "applied" },
  { label: "Rolled back", value: "rolled_back" },
  { label: "Recorded", value: "recorded" },
  { label: "Created notes", value: "create-note" },
  { label: "Improved text", value: "improve-selection" }
];

export class HistoryModal extends Modal {
  private operations: AiChangeOperation[] = [];
  private activeFilter: HistoryFilter = "all";

  constructor(app: App) {
    super(app);
  }

  async onOpen(): Promise<void> {
    this.setTitle("Mindo AI Change History");
    await this.loadAndRender();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async loadAndRender(): Promise<void> {
    this.operations = (await readAiChangeOperations(this.app)).reverse();
    this.render();
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();

    const root = container.createDiv({ cls: "contex-history-modal" });

    if (!this.operations.length) {
      root.createDiv({
        cls: "contex-history-modal__empty",
        text: "No AI changes recorded yet."
      });
      return;
    }

    this.renderFilters(root);

    const filteredOperations = this.getFilteredOperations();

    if (!filteredOperations.length) {
      root.createDiv({
        cls: "contex-history-modal__empty",
        text: "No changes match this filter."
      });
      return;
    }

    filteredOperations.forEach((operation) => {
      this.renderOperation(root, operation);
    });
  }

  private renderFilters(parentEl: HTMLElement): void {
    const filtersEl = parentEl.createDiv({
      cls: "contex-history-modal__filters"
    });

    HISTORY_FILTERS.forEach((filter) => {
      const count = this.countOperationsForFilter(filter.value);
      const button = filtersEl.createEl("button", {
        cls: "contex-history-modal__filter",
        text: `${filter.label} (${count})`
      });
      button.toggleClass("is-active", this.activeFilter === filter.value);
      button.addEventListener("click", () => {
        this.activeFilter = filter.value;
        this.render();
      });
    });
  }

  private renderOperation(
    parentEl: HTMLElement,
    operation: AiChangeOperation
  ): void {
    const itemEl = parentEl.createDiv({ cls: "contex-history-modal__item" });
    const headerEl = itemEl.createDiv({ cls: "contex-history-modal__header" });
    const summaryEl = headerEl.createDiv({
      cls: "contex-history-modal__summary"
    });
    summaryEl.createDiv({
      cls: "contex-history-modal__title",
      text: `${operation.operationType} - ${operation.status}`
    });
    summaryEl.createDiv({
      cls: "contex-history-modal__meta",
      text: `${new Date(operation.timestamp).toLocaleString()} - ${operation.filePath}`
    });

    const actionsEl = headerEl.createDiv({
      cls: "contex-history-modal__actions"
    });
    const details = itemEl.createEl("details", {
      cls: "contex-history-modal__details"
    });
    details.createEl("summary", { text: "Details" });
    this.renderDetails(details, operation);

    if (operation.status === "applied") {
      const rollbackButton = actionsEl.createEl("button", {
        text: "Rollback"
      });
      rollbackButton.addEventListener("click", () => {
        void this.rollbackOperation(operation);
      });
    }
  }

  private async rollbackOperation(operation: AiChangeOperation): Promise<void> {
    try {
      await rollbackAiChangeOperation(this.app, operation.id);
      new Notice(`Rolled back AI change in ${operation.filePath}.`);
      await this.loadAndRender();
    } catch (error) {
      new Notice(this.getErrorMessage(error));
    }
  }

  private renderDetails(
    parentEl: HTMLElement,
    operation: AiChangeOperation
  ): void {
    parentEl.createEl("pre", {
      cls: "contex-history-modal__detail-block",
      text: [
        `id: ${operation.id}`,
        `model: ${operation.model}`,
        `prompt: ${operation.userPrompt}`,
        operation.rolledBackAt ? `rolledBackAt: ${operation.rolledBackAt}` : ""
      ]
        .filter(Boolean)
        .join("\n")
    });

    const beforeAfterEl = parentEl.createDiv({
      cls: "contex-history-modal__before-after"
    });
    this.renderTextBlock(beforeAfterEl, "Selected before", operation.selectedBefore);
    this.renderTextBlock(beforeAfterEl, "Selected after", operation.selectedAfter);
  }

  private renderTextBlock(
    parentEl: HTMLElement,
    title: string,
    content: string
  ): void {
    const blockEl = parentEl.createDiv({
      cls: "contex-history-modal__text-block"
    });
    blockEl.createDiv({
      cls: "contex-history-modal__text-title",
      text: title
    });
    blockEl.createEl("pre", {
      cls: "contex-history-modal__text-content",
      text: content || "(empty)"
    });
  }

  private getFilteredOperations(): AiChangeOperation[] {
    return this.operations.filter((operation) =>
      this.matchesFilter(operation, this.activeFilter)
    );
  }

  private countOperationsForFilter(filter: HistoryFilter): number {
    return this.operations.filter((operation) =>
      this.matchesFilter(operation, filter)
    ).length;
  }

  private matchesFilter(
    operation: AiChangeOperation,
    filter: HistoryFilter
  ): boolean {
    if (filter === "all") {
      return true;
    }

    return operation.status === filter || operation.operationType === filter;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
