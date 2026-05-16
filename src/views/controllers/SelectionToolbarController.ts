import type { SelectedTextContext } from "../../types";
import type { SelectionToolbarRefs } from "../selectionToolbarRenderer";

interface SelectedTextContextResult {
  context: SelectedTextContext | null;
}

export interface SelectionToolbarControllerDeps {
  renderToolbar: () => SelectionToolbarRefs;
  getIsLoading: () => boolean;
  getSelectionRange: () => Range | null;
  getSelectionRect: (range: Range) => DOMRect | null;
  getSelectedTextContext: () => SelectedTextContextResult;
  setFloatingSelectedTextContext: (context: SelectedTextContext | null) => void;
  setLastSelectedTextContext: (context: SelectedTextContext) => void;
  setLastSelectedTextContextAt: (value: number) => void;
  now: () => number;
  getViewportWidth: () => number;
  setTimeout: (callback: () => void, delayMs: number) => number;
  clearTimeout: (timerId: number) => void;
}

export class SelectionToolbarController {
  private toolbarEl: HTMLElement | null = null;
  private buttons: HTMLButtonElement[] = [];
  private timerId: number | null = null;

  constructor(private readonly deps: SelectionToolbarControllerDeps) {}

  create(): void {
    this.toolbarEl?.remove();
    const refs = this.deps.renderToolbar();
    this.toolbarEl = refs.toolbarEl;
    this.buttons = refs.buttons;
  }

  queueUpdate(): void {
    if (this.timerId !== null) {
      this.deps.clearTimeout(this.timerId);
    }

    this.timerId = this.deps.setTimeout(() => {
      this.timerId = null;
      this.update();
    }, 80);
  }

  update(): void {
    if (!this.toolbarEl || this.deps.getIsLoading()) {
      return;
    }

    const range = this.deps.getSelectionRange();
    const rect = range ? this.deps.getSelectionRect(range) : null;
    const contextResult = this.deps.getSelectedTextContext();

    if (!rect || !contextResult.context) {
      this.hide();
      return;
    }

    this.deps.setFloatingSelectedTextContext(contextResult.context);
    this.deps.setLastSelectedTextContext(contextResult.context);
    this.deps.setLastSelectedTextContextAt(this.deps.now());
    this.toolbarEl.toggleClass(
      "contex-agent__selection-toolbar--below",
      rect.top < 44
    );
    const left = `${Math.min(
      this.deps.getViewportWidth() - 16,
      Math.max(16, rect.left + rect.width / 2)
    )}px`;
    const top = rect.top < 44 ? `${rect.bottom + 8}px` : `${rect.top - 8}px`;
    this.toolbarEl.setCssStyles({ left, top });
    this.toolbarEl.removeClass("contex-agent__hidden");
  }

  hide(): void {
    if (this.toolbarEl) {
      this.toolbarEl.addClass("contex-agent__hidden");
    }

    this.deps.setFloatingSelectedTextContext(null);
  }

  dispose(): void {
    if (this.timerId !== null) {
      this.deps.clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.toolbarEl?.remove();
    this.toolbarEl = null;
    this.buttons = [];
  }

  getToolbarElement(): HTMLElement | null {
    return this.toolbarEl;
  }

  getButtons(): HTMLButtonElement[] {
    return this.buttons;
  }

  getTimerId(): number | null {
    return this.timerId;
  }
}
