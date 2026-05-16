export interface ChatScrollControllerDeps {
  getChatEl: () => HTMLElement | null;
  bottomThresholdPx?: number;
}

export class ChatScrollController {
  private shouldAutoScroll = true;

  constructor(private readonly deps: ChatScrollControllerDeps) {}

  getShouldAutoScroll(): boolean {
    return this.shouldAutoScroll;
  }

  setShouldAutoScroll(value: boolean): void {
    this.shouldAutoScroll = value;
  }

  isNearBottom(): boolean {
    const chatEl = this.deps.getChatEl();

    if (!chatEl) {
      return true;
    }

    return (
      chatEl.scrollHeight - chatEl.scrollTop - chatEl.clientHeight <=
      (this.deps.bottomThresholdPx ?? 8)
    );
  }

  updateFromScroll(): boolean {
    this.shouldAutoScroll = this.isNearBottom();
    return this.shouldAutoScroll;
  }
}
