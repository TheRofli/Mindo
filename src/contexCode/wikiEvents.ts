import type { ContexCodePlan, ContexCodeTask } from "./planTypes";

export type ContexCodeWikiEventType =
  | "plan_created"
  | "plan_synced"
  | "task_completed"
  | "task_packet_prepared";

export interface ContexCodeWikiEvent {
  type: `contex_code.${ContexCodeWikiEventType}`;
  planId: string;
  planTitle: string;
  projectNotePath: string;
  taskId?: string;
  taskTitle?: string;
  summary: string;
  createdAt: string;
}

export interface ContexCodeWikiEventWriter {
  writeContexCodeEvent?(event: ContexCodeWikiEvent): Promise<void>;
}

export function buildContexCodeWikiEvent(
  plan: ContexCodePlan,
  type: ContexCodeWikiEventType,
  now = new Date().toISOString(),
  task?: ContexCodeTask
): ContexCodeWikiEvent {
  return {
    type: `contex_code.${type}`,
    planId: plan.id,
    planTitle: plan.title,
    projectNotePath: plan.projectNotePath,
    taskId: task?.id,
    taskTitle: task?.title,
    summary: task
      ? `${type}: ${task.title} in ${plan.title}`
      : `${type}: ${plan.title}`,
    createdAt: now
  };
}

export async function recordContexCodeWikiEvent(
  writer: ContexCodeWikiEventWriter | undefined,
  event: ContexCodeWikiEvent
): Promise<boolean> {
  if (!writer?.writeContexCodeEvent) {
    return false;
  }

  await writer.writeContexCodeEvent(event);
  return true;
}
