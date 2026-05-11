import { findTask } from "./progress";
import type { ContexCodePlan, ContexCodeSource, ContexCodeTask } from "./planTypes";

export interface TaskPacketOptions {
  maxChars?: number;
  includeBoilerplate?: boolean;
  verificationCommands?: string[];
}

export function buildTaskPacket(
  plan: ContexCodePlan,
  taskId: string,
  options: TaskPacketOptions = {}
): string {
  const found = findTask(plan, taskId);
  if (!found) {
    throw new Error(`Contex Code task not found: ${taskId}`);
  }

  const sourceById = new Map(plan.sources.map((source) => [source.id, source]));
  const taskSources = resolveTaskSources(found.task, sourceById);
  const lines = [
    "# Contex Code Task Packet",
    "",
    `Plan: ${plan.title}`,
    `Plan ID: ${plan.id}`,
    `Project note: ${plan.projectNotePath}`,
    `Phase: ${found.phase.title}`,
    `Task: ${found.task.title}`,
    "",
    "## Goal",
    found.task.summary || found.task.title,
    "",
    "## Acceptance",
    ...(found.task.acceptance.length > 0
      ? found.task.acceptance.map((item) => `- ${item}`)
      : ["- Implement the task safely and verify the result."]),
    "",
    "## Files",
    ...((found.task.files ?? []).length > 0
      ? (found.task.files ?? []).map((file) => `- ${file}`)
      : ["- Use the repository context to identify touched files."]),
    "",
    "## Sources",
    ...(taskSources.length > 0
      ? taskSources.map((source) => `- ${formatContexCodeSource(source)}`)
      : ["- No explicit sources attached."]),
    "",
    "## Commands",
    ...formatCommands([...(found.task.commands ?? []), ...(options.verificationCommands ?? [])]),
    "",
    ...(options.includeBoilerplate === false
      ? []
      : [
          "## Working Rules",
          "- Keep changes scoped to this task.",
          "- Do not revert unrelated user work.",
          "- Update the Contex Code plan when the task is done."
        ])
  ];

  return maybeTruncate(lines.join("\n"), options.maxChars);
}

export function formatContexCodeSource(source: ContexCodeSource): string {
  if (source.url) {
    return `[${source.title}](${source.url})`;
  }

  if (source.path) {
    return `[[${source.path}|${source.title}]]`;
  }

  return source.title;
}

function resolveTaskSources(
  task: ContexCodeTask,
  sourceById: Map<string, ContexCodeSource>
): ContexCodeSource[] {
  return (task.sources ?? [])
    .map((id) => sourceById.get(id))
    .filter((source): source is ContexCodeSource => Boolean(source));
}

function formatCommands(commands: string[]): string[] {
  const unique = [...new Set(commands.filter(Boolean))];
  return unique.length > 0 ? unique.map((command) => `- \`${command}\``) : ["- `npm run test`"];
}

function maybeTruncate(value: string, maxChars?: number): string {
  if (!maxChars || value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxChars - 32)).trimEnd()}\n\n...[truncated]`;
}
