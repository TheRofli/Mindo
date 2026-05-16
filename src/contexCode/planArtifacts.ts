import { calculatePlanProgress, getCurrentTask } from "./progress";
import type { ContexCodePlan, ContexCodeSource, ContexCodeTask } from "./planTypes";
import type { ContexCodeVaultAdapterLike } from "./planStorage";

const FULL_PLAN_ROOT = ".contex/plans";

export interface ContexCodeArtifactPaths {
  designSpecPath: string;
  fullPlanPath: string;
}

export function buildContexCodeArtifactPaths(
  projectNotePath: string,
  title: string,
  planId: string
): ContexCodeArtifactPaths {
  const folder = getFolderPath(projectNotePath);

  return {
    designSpecPath: joinPath(folder, `${sanitizeMarkdownFileName(title)} - design.md`),
    fullPlanPath: `${FULL_PLAN_ROOT}/${sanitizeMarkdownFileName(planId)} - ide-plan.md`
  };
}

export async function saveContexCodePlanArtifacts(
  adapter: ContexCodeVaultAdapterLike,
  plan: ContexCodePlan,
  projectMarkdown: string
): Promise<void> {
  if (!plan.designSpecPath || !plan.fullPlanPath) {
    return;
  }

  await ensureParentFolders(adapter, plan.fullPlanPath);
  await adapter.write(plan.designSpecPath, renderContexCodeDesignSpec(plan, projectMarkdown));
  await adapter.write(plan.fullPlanPath, renderContexCodeFullIdePlan(plan, projectMarkdown));
}

export function renderContexCodeDesignSpec(
  plan: ContexCodePlan,
  projectMarkdown = ""
): string {
  const progress = calculatePlanProgress(plan);
  const overview = extractFirstParagraph(projectMarkdown);
  const phaseLines = plan.phases.flatMap((phase) => [
    `### ${phase.title}`,
    "",
    phase.summary || "This phase needs confirmation during planning.",
    "",
    ...phase.tasks.slice(0, 5).map((task) => `- ${task.title}`),
    ""
  ]);

  return [
    `# ${plan.title} - Design Spec`,
    "",
    `Status: ${plan.status}`,
    `Progress: ${progress.completedTasks}/${progress.totalTasks} (${progress.percent}%)`,
    `Project note: ${formatWikiLink(plan.projectNotePath)}`,
    plan.fullPlanPath ? `Full IDE plan: ${formatWikiLink(plan.fullPlanPath)}` : "",
    "",
    "## Overview",
    "",
    overview || "This project spec was derived from the active Obsidian note.",
    "",
    "## Goals",
    "",
    ...plan.phases.map((phase) => `- ${phase.summary || phase.title}`),
    "",
    "## Proposed Architecture",
    "",
    ...phaseLines,
    "## Acceptance Direction",
    "",
    "- The plan is clear enough for a coding agent to execute.",
    "- The implementation can be verified with explicit checks.",
    "- The Obsidian project note remains the human-facing control surface.",
    "",
    "## Open Questions",
    "",
    "- Confirm MVP scope.",
    "- Confirm visual and interaction style.",
    "- Confirm deployment or packaging target.",
    ""
  ]
    .filter((line, index, lines) => line || lines[index - 1] !== "")
    .join("\n")
    .trimEnd() + "\n";
}

export function renderContexCodeFullIdePlan(
  plan: ContexCodePlan,
  projectMarkdown = ""
): string {
  const currentTask = getCurrentTask(plan);
  const sourceLines = plan.sources.length
    ? plan.sources.map((source) => `- ${formatSource(source)}`)
    : ["- No explicit sources attached."];
  const taskSections = plan.phases.flatMap((phase, phaseIndex) => [
    `## Phase ${phaseIndex + 1}: ${phase.title}`,
    "",
    phase.summary || "Implement this phase according to the project note and design spec.",
    "",
    ...phase.tasks.flatMap((task, taskIndex) =>
      renderIdeTaskSection(task, phaseIndex + 1, taskIndex + 1)
    )
  ]);

  return [
    `# ${plan.title} Implementation Plan`,
    "",
    "> This is the full Mindo Code plan for IDE and coding-agent handoff.",
    "",
    "## Metadata",
    "",
    `- Plan ID: ${plan.id}`,
    `- Status: ${plan.status}`,
    `- Project note: ${plan.projectNotePath}`,
    plan.designSpecPath ? `- Design spec: ${plan.designSpecPath}` : "",
    `- Current task: ${currentTask?.title ?? "none"}`,
    "",
    "## Goal",
    "",
    extractFirstParagraph(projectMarkdown) ||
      "Turn the project note into a verified implementation.",
    "",
    "## Sources",
    "",
    ...sourceLines,
    "",
    "## Working Rules",
    "",
    "- Keep changes scoped to the active task.",
    "- Do not revert unrelated user work.",
    "- Update or sync the Mindo Code plan after completing a task.",
    "- Prefer tests or explicit manual verification for every task.",
    "",
    ...taskSections
  ]
    .filter((line, index, lines) => line || lines[index - 1] !== "")
    .join("\n")
    .trimEnd() + "\n";
}

function renderIdeTaskSection(
  task: ContexCodeTask,
  phaseIndex: number,
  taskIndex: number
): string[] {
  return [
    `### Task ${phaseIndex}.${taskIndex}: ${task.title}`,
    "",
    `Status: ${task.status}`,
    "",
    "Goal:",
    task.summary || task.title,
    "",
    "Files:",
    ...formatList(task.files, "Use repository context to identify files."),
    "",
    "Implementation:",
    "- Inspect the existing code before editing.",
    "- Implement the smallest coherent change that satisfies the task.",
    "- Keep naming and architecture consistent with the project.",
    "",
    "Acceptance:",
    ...formatList(task.acceptance, "The task is implemented and verified."),
    "",
    "Verification:",
    ...formatList(task.commands, "npm run test"),
    ""
  ];
}

function formatList(items: string[] | undefined, fallback: string): string[] {
  const values = (items ?? []).filter((item) => item.trim());
  return values.length ? values.map((item) => `- ${item}`) : [`- ${fallback}`];
}

function formatSource(source: ContexCodeSource): string {
  if (source.url) {
    return `[${source.title}](${source.url})`;
  }

  if (source.path) {
    return formatWikiLink(source.path, source.title);
  }

  return source.title;
}

function formatWikiLink(path: string, label?: string): string {
  const target = path.replace(/\.md$/iu, "");
  const safeLabel = label?.trim();
  return safeLabel ? `[[${target}|${safeLabel}]]` : `[[${target}]]`;
}

function extractFirstParagraph(markdown: string): string {
  const withoutFrontmatter = markdown.replace(/^---\n[\s\S]*?\n---\n/u, "");
  const lines = withoutFrontmatter
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith(">"));

  return lines.slice(0, 3).join(" ").slice(0, 700).trim();
}

async function ensureParentFolders(
  adapter: ContexCodeVaultAdapterLike,
  path: string
): Promise<void> {
  const parts = path.split("/").slice(0, -1);
  let current = "";

  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    if (!(await adapter.exists(current))) {
      await adapter.mkdir(current);
    }
  }
}

function getFolderPath(path: string): string {
  const index = path.lastIndexOf("/");
  return index >= 0 ? path.slice(0, index) : "";
}

function joinPath(folder: string, fileName: string): string {
  return folder ? `${folder}/${fileName}` : fileName;
}

function sanitizeMarkdownFileName(value: string): string {
  return (
    value
      .replace(/\.md$/iu, "")
      .replace(/[\\/:*?"<>|#^[\]`]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 90) || "Mindo Code Plan"
  );
}
