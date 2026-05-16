import { createPlanId, createTaskId } from "./planIds";
import type {
  ContexCodePhase,
  ContexCodePlan,
  ContexCodePlanStatus,
  ContexCodeSource,
  ContexCodeSourceType,
  ContexCodeTask,
  ContexCodeTaskStatus
} from "./planTypes";

const PLAN_STATUSES: ContexCodePlanStatus[] = [
  "draft",
  "active",
  "blocked",
  "review",
  "done",
  "archived"
];

const TASK_STATUSES: ContexCodeTaskStatus[] = [
  "queued",
  "ready",
  "in_progress",
  "blocked",
  "review",
  "done",
  "skipped"
];

const SOURCE_TYPES: ContexCodeSourceType[] = [
  "vault",
  "web",
  "wiki",
  "raw",
  "attachment",
  "manual"
];

export function normalizeContexCodePlan(
  input: unknown,
  now = new Date().toISOString()
): ContexCodePlan {
  const source = isRecord(input) ? input : {};
  const title = readString(source.title, "Untitled Mindo Code Plan");
  const id = readString(source.id, createPlanId(title, now));
  const projectNotePath = readString(source.projectNotePath, `${title}.md`);
  const createdAt = readString(source.createdAt, now);
  const updatedAt = readString(source.updatedAt, now);
  const status = normalizePlanStatus(source.status);
  const sources = Array.isArray(source.sources)
    ? source.sources.map((item, index) => normalizeSource(item, index))
    : [];
  const phases = Array.isArray(source.phases)
    ? source.phases.map((item, index) => normalizePhase(item, index, now))
    : [];

  const currentTaskId =
    typeof source.currentTaskId === "string" && source.currentTaskId.trim()
      ? source.currentTaskId.trim()
      : phases.flatMap((phase) => phase.tasks).find((task) => task.status !== "done")?.id;

  return {
    version: 1,
    id,
    title,
    status,
    projectNotePath,
    designSpecPath: readOptionalString(source.designSpecPath),
    fullPlanPath: readOptionalString(source.fullPlanPath),
    currentTaskId,
    createdAt,
    updatedAt,
    sources,
    phases
  };
}

export function serializeContexCodePlan(plan: ContexCodePlan): string {
  return `${JSON.stringify(normalizeContexCodePlan(plan, plan.updatedAt), null, 2)}\n`;
}

function normalizeSource(input: unknown, index: number): ContexCodeSource {
  const source = isRecord(input) ? input : {};
  const type = SOURCE_TYPES.includes(source.type as ContexCodeSourceType)
    ? (source.type as ContexCodeSourceType)
    : "manual";
  const title = readString(source.title, `Source ${index + 1}`);
  const id = readString(source.id, `src_${index + 1}`);
  const confidence =
    typeof source.confidence === "number" && Number.isFinite(source.confidence)
      ? source.confidence
      : undefined;

  return {
    id,
    type,
    title,
    path: readOptionalString(source.path),
    url: readOptionalString(source.url),
    accessedAt: readOptionalString(source.accessedAt),
    confidence
  };
}

function normalizePhase(input: unknown, index: number, now: string): ContexCodePhase {
  const source = isRecord(input) ? input : {};
  const title = readString(source.title, `Phase ${index + 1}`);
  const tasks = Array.isArray(source.tasks)
    ? source.tasks.map((task, taskIndex) => normalizeTask(task, index, taskIndex, now))
    : [];

  return {
    id: readString(source.id, `phase_${index + 1}`),
    title,
    displayTitle: readOptionalString(source.displayTitle),
    displaySummary: readOptionalString(source.displaySummary),
    status: normalizeTaskStatus(source.status),
    summary: readString(source.summary, ""),
    tasks
  };
}

function normalizeTask(
  input: unknown,
  phaseIndex: number,
  taskIndex: number,
  now: string
): ContexCodeTask {
  const source = isRecord(input) ? input : {};
  const title = readString(source.title, `Task ${phaseIndex + 1}.${taskIndex + 1}`);

  return {
    id: readString(source.id, createTaskId(phaseIndex + 1, taskIndex + 1, title)),
    title,
    displayTitle: readOptionalString(source.displayTitle),
    displaySummary: readOptionalString(source.displaySummary),
    status: normalizeTaskStatus(source.status),
    summary: readString(source.summary, ""),
    acceptance: readStringArray(source.acceptance),
    files: readOptionalStringArray(source.files),
    commands: readOptionalStringArray(source.commands),
    sources: readOptionalStringArray(source.sources),
    notes: readOptionalString(source.notes),
    updatedAt: readString(source.updatedAt, now)
  };
}

function normalizePlanStatus(value: unknown): ContexCodePlanStatus {
  return PLAN_STATUSES.includes(value as ContexCodePlanStatus)
    ? (value as ContexCodePlanStatus)
    : "draft";
}

function normalizeTaskStatus(value: unknown): ContexCodeTaskStatus {
  return TASK_STATUSES.includes(value as ContexCodeTaskStatus)
    ? (value as ContexCodeTaskStatus)
    : "queued";
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readStringArray(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === "string" && Boolean(item.trim())
        )
        .map((item) => item.trim())
    : [];
}

function readOptionalStringArray(value: unknown): string[] | undefined {
  const items = readStringArray(value);
  return items.length > 0 ? items : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
