export type ContexCodePlanStatus =
  | "draft"
  | "active"
  | "blocked"
  | "review"
  | "done"
  | "archived";

export type ContexCodeTaskStatus =
  | "queued"
  | "ready"
  | "in_progress"
  | "blocked"
  | "review"
  | "done"
  | "skipped";

export type ContexCodeSourceType =
  | "vault"
  | "web"
  | "wiki"
  | "raw"
  | "attachment"
  | "manual";

export interface ContexCodeSource {
  id: string;
  type: ContexCodeSourceType;
  title: string;
  path?: string;
  url?: string;
  accessedAt?: string;
  confidence?: number;
}

export interface ContexCodeTask {
  id: string;
  title: string;
  displayTitle?: string;
  displaySummary?: string;
  status: ContexCodeTaskStatus;
  summary: string;
  acceptance: string[];
  files?: string[];
  commands?: string[];
  sources?: string[];
  notes?: string;
  updatedAt: string;
}

export interface ContexCodePhase {
  id: string;
  title: string;
  displayTitle?: string;
  displaySummary?: string;
  status: ContexCodeTaskStatus;
  summary: string;
  tasks: ContexCodeTask[];
}

export interface ContexCodePlan {
  version: 1;
  id: string;
  title: string;
  status: ContexCodePlanStatus;
  projectNotePath: string;
  designSpecPath?: string;
  fullPlanPath?: string;
  currentTaskId?: string;
  createdAt: string;
  updatedAt: string;
  sources: ContexCodeSource[];
  phases: ContexCodePhase[];
}

export interface ContexCodeProgress {
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  reviewTasks: number;
  activeTasks: number;
  percent: number;
}

export interface ContexCodeActionResult {
  kind: string;
  status: "saved" | "done" | "failed";
  message: string;
  path?: string;
  planId?: string;
}
