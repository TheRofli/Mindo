import type {
  ContexCodePhase,
  ContexCodePlan,
  ContexCodeProgress,
  ContexCodeTask,
  ContexCodeTaskStatus
} from "./planTypes";

const COMPLETED_STATUSES = new Set<ContexCodeTaskStatus>(["done", "skipped"]);

export function calculatePlanProgress(plan: ContexCodePlan): ContexCodeProgress {
  const tasks = getAllTasks(plan);
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => COMPLETED_STATUSES.has(task.status)).length;
  const blockedTasks = tasks.filter((task) => task.status === "blocked").length;
  const reviewTasks = tasks.filter((task) => task.status === "review").length;
  const activeTasks = tasks.filter((task) => task.status === "in_progress").length;

  return {
    totalTasks,
    completedTasks,
    blockedTasks,
    reviewTasks,
    activeTasks,
    percent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  };
}

export function getCurrentTask(plan: ContexCodePlan): ContexCodeTask | null {
  const tasks = getAllTasks(plan);
  const explicit = plan.currentTaskId
    ? tasks.find(
        (task) => task.id === plan.currentTaskId && !COMPLETED_STATUSES.has(task.status)
      )
    : undefined;

  return (
    explicit ??
    tasks.find((task) => task.status === "in_progress") ??
    tasks.find((task) => task.status === "ready") ??
    tasks.find((task) => task.status === "queued") ??
    tasks.find((task) => task.status === "review") ??
    null
  );
}

export function findTask(
  plan: ContexCodePlan,
  taskId: string
): { phase: ContexCodePhase; task: ContexCodeTask } | null {
  for (const phase of plan.phases) {
    const task = phase.tasks.find((candidate) => candidate.id === taskId);
    if (task) {
      return { phase, task };
    }
  }

  return null;
}

export function transitionTask(
  plan: ContexCodePlan,
  taskId: string,
  status: ContexCodeTaskStatus,
  now = new Date().toISOString()
): ContexCodePlan {
  const next = clonePlan(plan);
  let touched = false;

  for (const phase of next.phases) {
    for (const task of phase.tasks) {
      if (task.id === taskId) {
        task.status = status;
        task.updatedAt = now;
        touched = true;
      }
    }
    phase.status = derivePhaseStatus(phase.tasks);
  }

  if (!touched) {
    throw new Error(`Contex Code task not found: ${taskId}`);
  }

  next.updatedAt = now;
  const current = getCurrentTask(next);
  next.currentTaskId = current?.id;
  next.status = derivePlanStatus(next);

  return next;
}

function derivePhaseStatus(tasks: ContexCodeTask[]): ContexCodeTaskStatus {
  if (tasks.length === 0) {
    return "queued";
  }
  if (tasks.every((task) => COMPLETED_STATUSES.has(task.status))) {
    return "done";
  }
  if (tasks.some((task) => task.status === "blocked")) {
    return "blocked";
  }
  if (tasks.some((task) => task.status === "review")) {
    return "review";
  }
  if (tasks.some((task) => task.status === "in_progress")) {
    return "in_progress";
  }
  if (tasks.some((task) => task.status === "ready")) {
    return "ready";
  }
  return "queued";
}

function derivePlanStatus(plan: ContexCodePlan): ContexCodePlan["status"] {
  const tasks = getAllTasks(plan);
  if (tasks.length > 0 && tasks.every((task) => COMPLETED_STATUSES.has(task.status))) {
    return "done";
  }
  if (tasks.some((task) => task.status === "blocked")) {
    return "blocked";
  }
  if (tasks.some((task) => task.status === "review")) {
    return "review";
  }
  if (tasks.some((task) => task.status === "in_progress" || task.status === "done")) {
    return "active";
  }
  return plan.status === "archived" ? "archived" : "draft";
}

function getAllTasks(plan: ContexCodePlan): ContexCodeTask[] {
  return plan.phases.flatMap((phase) => phase.tasks);
}

function clonePlan(plan: ContexCodePlan): ContexCodePlan {
  return JSON.parse(JSON.stringify(plan)) as ContexCodePlan;
}
