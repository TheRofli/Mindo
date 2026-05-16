export interface RenderSchedulerControllerDeps {
  render: () => void | Promise<void>;
  setTimeout: (callback: () => void, delayMs: number) => number;
  clearTimeout: (timerId: number) => void;
  delayMs?: number;
}

export class RenderSchedulerController {
  private timerId: number | null = null;

  constructor(private readonly deps: RenderSchedulerControllerDeps) {}

  queue(): boolean {
    if (this.timerId !== null) {
      return false;
    }

    this.timerId = this.deps.setTimeout(() => {
      this.timerId = null;
      void this.deps.render();
    }, this.deps.delayMs ?? 150);
    return true;
  }

  dispose(): void {
    if (this.timerId === null) {
      return;
    }

    this.deps.clearTimeout(this.timerId);
    this.timerId = null;
  }
}
