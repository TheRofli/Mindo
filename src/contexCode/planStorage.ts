import { normalizeContexCodePlan, serializeContexCodePlan } from "./planSchema";
import type { ContexCodePlan } from "./planTypes";

export interface ContexCodeVaultAdapterLike {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  write(path: string, content: string): Promise<void>;
  read(path: string): Promise<string>;
  list?(path: string): Promise<string[] | { files: string[]; folders: string[] }>;
}

const PLAN_ROOT = ".contex/plans";

export function getPlanSidecarPath(planId: string): string {
  return `${PLAN_ROOT}/${sanitizePlanFileName(planId)}.json`;
}

export async function saveContexCodePlan(
  adapter: ContexCodeVaultAdapterLike,
  plan: ContexCodePlan
): Promise<void> {
  await ensureFolder(adapter, ".contex");
  await ensureFolder(adapter, PLAN_ROOT);
  await adapter.write(getPlanSidecarPath(plan.id), serializeContexCodePlan(plan));
}

export async function loadContexCodePlan(
  adapter: ContexCodeVaultAdapterLike,
  planId: string
): Promise<ContexCodePlan> {
  const raw = await adapter.read(getPlanSidecarPath(planId));
  return normalizeContexCodePlan(JSON.parse(raw));
}

export async function listContexCodePlans(
  adapter: ContexCodeVaultAdapterLike
): Promise<ContexCodePlan[]> {
  if (!adapter.list || !(await adapter.exists(PLAN_ROOT))) {
    return [];
  }

  const listed = await adapter.list(PLAN_ROOT);
  const files = Array.isArray(listed) ? listed : listed.files;
  const plans: ContexCodePlan[] = [];

  for (const path of files.filter((filePath) => filePath.endsWith(".json"))) {
    try {
      plans.push(normalizeContexCodePlan(JSON.parse(await adapter.read(path))));
    } catch {
      // Ignore corrupt sidecars. The diagnostics command can surface them later.
    }
  }

  return plans.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function ensureFolder(
  adapter: ContexCodeVaultAdapterLike,
  path: string
): Promise<void> {
  if (!(await adapter.exists(path))) {
    await adapter.mkdir(path);
  }
}

function sanitizePlanFileName(value: string): string {
  return value.replace(/[^a-z0-9а-я_-]+/giu, "_").replace(/^_+|_+$/g, "") || "plan";
}
