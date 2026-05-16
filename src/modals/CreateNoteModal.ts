import { Modal, Notice, type App } from "obsidian";

export interface CreateNoteProposal {
  path: string;
  content: string;
}

interface CreateNoteModalOptions {
  proposal: CreateNoteProposal;
  title?: string;
  createButtonText?: string;
  onApply: (proposal: CreateNoteProposal) => Promise<void>;
  onChange?: (
    proposal: CreateNoteProposal,
    instruction: string
  ) => Promise<CreateNoteProposal>;
}

export class CreateNoteModal extends Modal {
  private proposal: CreateNoteProposal;
  private title: string;
  private createButtonText: string;
  private onApply: (proposal: CreateNoteProposal) => Promise<void>;
  private onChange?: (
    proposal: CreateNoteProposal,
    instruction: string
  ) => Promise<CreateNoteProposal>;

  constructor(app: App, options: CreateNoteModalOptions) {
    super(app);
    this.proposal = options.proposal;
    this.title = options.title ?? "Create Note From Selection";
    this.createButtonText = options.createButtonText ?? "Create";
    this.onApply = options.onApply;
    this.onChange = options.onChange;
  }

  onOpen(): void {
    this.setTitle(this.title);
    const container = this.contentEl;
    container.empty();

    const root = container.createDiv({ cls: "contex-create-note-modal" });
    const refineEl = root.createDiv({
      cls: "contex-create-note-modal__refine contex-agent__hidden"
    });
    const refineInput = refineEl.createEl("textarea", {
      cls: "contex-create-note-modal__refine-input",
      attr: {
        placeholder: "What should change? e.g. Make the title shorter and add a task list."
      }
    });
    const refineActionsEl = refineEl.createDiv({
      cls: "contex-create-note-modal__refine-actions"
    });
    const updateButton = refineActionsEl.createEl("button", {
      cls: "mod-cta",
      text: "Update"
    });
    const hideRefineButton = refineActionsEl.createEl("button", {
      text: "Cancel"
    });

    root.createEl("label", {
      cls: "contex-create-note-modal__label",
      text: "File path"
    });
    const pathInput = root.createEl("input", {
      cls: "contex-create-note-modal__path",
      value: this.proposal.path
    });

    root.createEl("label", {
      cls: "contex-create-note-modal__label",
      text: "Content"
    });
    const contentInput = root.createEl("textarea", {
      cls: "contex-create-note-modal__content"
    });
    contentInput.value = this.proposal.content;

    const actionsEl = root.createDiv({ cls: "contex-create-note-modal__actions" });
    const createButton = actionsEl.createEl("button", {
      cls: "mod-cta",
      text: this.createButtonText
    });
    const changeButton = actionsEl.createEl("button", { text: "Change" });
    const cancelButton = actionsEl.createEl("button", { text: "Cancel" });

    createButton.addEventListener("click", () => {
      void this.applyProposal(createButton, pathInput, contentInput);
    });
    changeButton.addEventListener("click", () => {
      refineEl.toggleClass(
        "contex-agent__hidden",
        !refineEl.classList.contains("contex-agent__hidden")
      );
      refineInput.focus();
    });
    updateButton.addEventListener("click", () => {
      void this.updateProposal(
        updateButton,
        changeButton,
        pathInput,
        contentInput,
        refineInput,
        refineEl
      );
    });
    hideRefineButton.addEventListener("click", () => {
      refineEl.addClass("contex-agent__hidden");
    });
    cancelButton.addEventListener("click", () => this.close());
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async applyProposal(
    createButton: HTMLButtonElement,
    pathInput: HTMLInputElement,
    contentInput: HTMLTextAreaElement
  ): Promise<void> {
    createButton.disabled = true;

    try {
      await this.onApply({
        path: pathInput.value,
        content: contentInput.value
      });
      this.close();
    } catch (error) {
      createButton.disabled = false;
      new Notice(this.getErrorMessage(error));
    }
  }

  private async updateProposal(
    updateButton: HTMLButtonElement,
    changeButton: HTMLButtonElement,
    pathInput: HTMLInputElement,
    contentInput: HTMLTextAreaElement,
    refineInput: HTMLTextAreaElement,
    refineEl: HTMLElement
  ): Promise<void> {
    if (!this.onChange || !refineInput.value.trim()) {
      return;
    }

    updateButton.disabled = true;
    changeButton.disabled = true;

    try {
      const updatedProposal = await this.onChange(
        {
          path: pathInput.value,
          content: contentInput.value
        },
        refineInput.value
      );
      pathInput.value = updatedProposal.path;
      contentInput.value = updatedProposal.content;
      refineInput.value = "";
      refineEl.addClass("contex-agent__hidden");
    } catch (error) {
      new Notice(this.getErrorMessage(error));
    } finally {
      updateButton.disabled = false;
      changeButton.disabled = false;
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
