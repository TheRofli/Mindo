export interface SidebarNoticeControllerDeps {
  getContextDetailEl: () => HTMLElement | null;
  getErrorEl: () => HTMLElement | null;
}

export class SidebarNoticeController {
  constructor(private readonly deps: SidebarNoticeControllerDeps) {}

  setContextDetail(message: string | null, isWarning: boolean): void {
    const contextDetailEl = this.deps.getContextDetailEl();

    if (!contextDetailEl) {
      return;
    }

    contextDetailEl.setText(message ?? "");
    contextDetailEl.toggleClass(
      "contex-agent__context-detail--warning",
      isWarning
    );
    contextDetailEl.toggleClass("contex-agent__hidden", !message);
  }

  setError(message: string | null): void {
    const errorEl = this.deps.getErrorEl();

    if (!errorEl) {
      return;
    }

    errorEl.setText(message ?? "");
    errorEl.toggleClass("contex-agent__hidden", !message);
  }
}
