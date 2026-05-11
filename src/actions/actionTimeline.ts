export type ActionTimelineEventType =
  | "thinking"
  | "running"
  | "searching"
  | "opening"
  | "editing"
  | "speaking"
  | "done"
  | "failed";

export interface ActionTimelineEvent {
  type: ActionTimelineEventType;
  label: string;
  detail?: string;
  path?: string;
  createdAt?: number;
}

export class ActionTimeline {
  private events: Required<ActionTimelineEvent>[] = [];

  constructor(private readonly limit = 50) {}

  push(event: ActionTimelineEvent): void {
    this.events.push({
      detail: "",
      path: "",
      createdAt: Date.now(),
      ...event
    });

    if (this.events.length > this.limit) {
      this.events = this.events.slice(this.events.length - this.limit);
    }
  }

  latest(): Required<ActionTimelineEvent> | null {
    return this.events.at(-1) ?? null;
  }

  all(): Required<ActionTimelineEvent>[] {
    return [...this.events];
  }
}
