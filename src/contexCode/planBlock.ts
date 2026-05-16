import { calculatePlanProgress, getCurrentTask } from "./progress";
import type {
  ContexCodePlan,
  ContexCodePlanStatus,
  ContexCodeTask,
  ContexCodeTaskStatus
} from "./planTypes";

const START_MARKER = "<!-- contex-code:start";
const END_MARKER = "<!-- contex-code:end -->";
const CUSTOM_CALLOUT_PATTERN = /^>\s*\[!contex-code[^\]]*\]/iu;
const PROGRESS_FILLED = String.fromCharCode(0x2593);
const PROGRESS_EMPTY = String.fromCharCode(0x2591);
const MIDDLE_DOT = String.fromCharCode(0x00b7);
const ELLIPSIS = String.fromCharCode(0x2026);

export type ContexCodeBlockLanguage = "en" | "ru";

export interface ContexCodeBlockRenderOptions {
  language?: ContexCodeBlockLanguage;
}

interface BlockLabels {
  status: (status: ContexCodePlanStatus) => string;
  handoff: string;
  project: string;
  statusLabel: string;
  progress: string;
  tasks: string;
  now: string;
  next: string;
  map: string;
  noActiveTask: string;
  allClear: string;
  links: string;
  designSpec: string;
  fullPlan: string;
}

export interface ContexCodeBlockMatch {
  start: number;
  end: number;
  text: string;
  planId?: string;
}

export function renderContexCodeBlock(
  plan: ContexCodePlan,
  options: ContexCodeBlockRenderOptions = {}
): string {
  const labels = getBlockLabels(options.language);
  const progress = calculatePlanProgress(plan);
  const currentTask = getCurrentTask(plan);
  const nextTasks = getNextTasks(plan, currentTask, 3);
  const progressBar = renderProgressBar(progress.percent);
  const artifactLinks = renderArtifactLinks(plan, labels);

  const phaseLines = plan.phases.flatMap((phase, index) => [
    `> \`${formatPhaseNumber(index + 1)}\` **${compactText(getDisplayTitle(phase), 92)}**`,
    ...phase.tasks.map(
      (task) =>
        `>   - ${renderTaskMarker(task.status)} ${renderTaskTitle(task)}`
    ),
    ">"
  ]);

  return [
    `> [!contex-code]+ Mindo Code ${MIDDLE_DOT} ${progress.completedTasks}/${progress.totalTasks} ${MIDDLE_DOT} ${progress.percent}%`,
    `> <span class="contex-code-plan-id" data-plan-id="${escapeAttribute(plan.id)}"></span>`,
    `> **${labels.project}** ${compactText(plan.title, 92)}`,
    `> **${labels.statusLabel}** ${labels.status(plan.status)} ${MIDDLE_DOT} ${labels.handoff}`,
    `> **${labels.progress}** <span class="contex-code-progress">${progressBar} | ${progress.percent}%</span>`,
    ...(artifactLinks ? [`> **${labels.links}** ${artifactLinks}`] : []),
    ">",
    `> **${labels.now}**`,
    currentTask
      ? `> ${renderTaskMarker(currentTask.status)} **${compactText(getDisplayTitle(currentTask), 110)}**`
      : `> ${labels.noActiveTask}`,
    ">",
    `> **${labels.next}**`,
    ...formatNextTaskLines(nextTasks, labels.allClear),
    ">",
    `> **${labels.map}**`,
    ...phaseLines
  ].join("\n");
}

export function findContexCodeBlock(markdown: string): ContexCodeBlockMatch | null {
  const custom = findCustomContexCodeBlock(markdown);
  if (custom) {
    return custom;
  }

  return findLegacyContexCodeBlock(markdown);
}

function findLegacyContexCodeBlock(markdown: string): ContexCodeBlockMatch | null {
  const start = markdown.indexOf(START_MARKER);
  if (start < 0) {
    return null;
  }

  const endMarkerIndex = markdown.indexOf(END_MARKER, start);
  if (endMarkerIndex < 0) {
    return null;
  }

  const end = endMarkerIndex + END_MARKER.length;
  const text = markdown.slice(start, end);

  return {
    start,
    end,
    text,
    planId: extractPlanIdFromBlock(text)
  };
}

export function extractPlanIdFromBlock(markdown: string): string | undefined {
  return (
    markdown.match(/data-plan-id="([^"]+)"/)?.[1] ??
    markdown.match(/contex-code:start\s+id="([^"]+)"/)?.[1]
  );
}

export function upsertContexCodeBlock(
  markdown: string,
  plan: ContexCodePlan,
  options: ContexCodeBlockRenderOptions = {}
): string {
  const block = renderContexCodeBlock(plan, options);
  const existing = findContexCodeBlock(markdown);

  if (existing) {
    return `${markdown.slice(0, existing.start)}${block}${markdown.slice(existing.end)}`;
  }

  const insertAt = getInsertionOffset(markdown);
  const before = markdown.slice(0, insertAt).replace(/\s*$/u, "");
  const after = markdown.slice(insertAt).replace(/^\s*/u, "");

  if (!before) {
    return `${block}\n\n${after}`.trimEnd();
  }

  return `${before}\n\n${block}${after ? `\n\n${after}` : ""}`;
}

function getInsertionOffset(markdown: string): number {
  let offset = 0;

  if (markdown.startsWith("---\n")) {
    const end = markdown.indexOf("\n---", 4);
    if (end >= 0) {
      offset = end + "\n---".length;
      if (markdown[offset] === "\n") {
        offset += 1;
      }
    }
  }

  const rest = markdown.slice(offset);
  const headingMatch = rest.match(/^#\s+.+(?:\n|$)/u);
  if (headingMatch) {
    offset += headingMatch[0].length;
  }

  return offset;
}

function renderProgressBar(percent: number): string {
  return renderBar(percent, 20);
}

function renderBar(percent: number, total: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round((clamped / 100) * total);

  return `${PROGRESS_FILLED.repeat(filled)}${PROGRESS_EMPTY.repeat(total - filled)}`;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function findCustomContexCodeBlock(markdown: string): ContexCodeBlockMatch | null {
  const lines = markdown.split("\n");
  let offset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!CUSTOM_CALLOUT_PATTERN.test(line)) {
      offset += line.length + 1;
      continue;
    }

    const start = offset;
    let end = offset + line.length;

    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const nextLine = lines[cursor];
      if (!nextLine.startsWith(">")) {
        break;
      }
      end += 1 + nextLine.length;
    }

    const text = markdown.slice(start, end);
    return {
      start,
      end,
      text,
      planId: extractPlanIdFromBlock(text)
    };
  }

  return null;
}

function getNextTasks(
  plan: ContexCodePlan,
  currentTask: ContexCodeTask | null,
  limit: number
): ContexCodeTask[] {
  const tasks = plan.phases.flatMap((phase) => phase.tasks);
  const currentIndex = currentTask
    ? tasks.findIndex((task) => task.id === currentTask.id)
    : -1;
  const candidates = tasks.filter((task, index) => {
    if (currentTask && index <= currentIndex) {
      return false;
    }
    return !["done", "skipped"].includes(task.status);
  });

  return candidates.slice(0, limit);
}

function formatNextTaskLines(tasks: ContexCodeTask[], fallback: string): string[] {
  if (tasks.length === 0) {
    return [`> ${fallback}`];
  }

  return tasks.map((task) => `> - ${compactText(getDisplayTitle(task), 70)}`);
}

function renderTaskMarker(status: ContexCodeTaskStatus): string {
  switch (status) {
    case "done":
      return "✓";
    case "skipped":
      return "-";
    case "in_progress":
      return "▶";
    case "blocked":
      return "!";
    case "review":
      return "?";
    case "ready":
      return "◇";
    case "queued":
    default:
      return "□";
  }
}

function renderTaskTitle(task: ContexCodeTask): string {
  const title = compactText(getDisplayTitle(task), 96);
  return task.status === "in_progress" ? `**${title}**` : title;
}

function getDisplayTitle(item: { title: string; displayTitle?: string }): string {
  return item.displayTitle?.trim() || item.title;
}

function getBlockLabels(language: ContexCodeBlockLanguage | undefined): BlockLabels {
  if (language === "ru") {
    return {
      status: localizeRuStatus,
      handoff: "\u0433\u043e\u0442\u043e\u0432 \u0434\u043b\u044f IDE",
      project: "\u041f\u0440\u043e\u0435\u043a\u0442",
      statusLabel: "\u0421\u0442\u0430\u0442\u0443\u0441",
      progress: "\u041f\u0440\u043e\u0433\u0440\u0435\u0441\u0441",
      tasks: "\u0437\u0430\u0434\u0430\u0447",
      now: "\u0421\u0435\u0439\u0447\u0430\u0441",
      next: "\u0414\u0430\u043b\u044c\u0448\u0435",
      map: "\u041f\u043b\u0430\u043d",
      noActiveTask: "\u043d\u0435\u0442 \u0430\u043a\u0442\u0438\u0432\u043d\u043e\u0439 \u0437\u0430\u0434\u0430\u0447\u0438",
      allClear: "\u043e\u0447\u0435\u0440\u0435\u0434\u044c \u043f\u0443\u0441\u0442\u0430",
      links: "\u0424\u0430\u0439\u043b\u044b",
      designSpec: "\u0434\u0438\u0437\u0430\u0439\u043d-spec",
      fullPlan: "\u043f\u043e\u043b\u043d\u044b\u0439 IDE-\u043f\u043b\u0430\u043d"
    };
  }

  return {
    status: (status) => status,
    handoff: "handoff-ready",
    project: "Project",
    statusLabel: "Status",
    progress: "Progress",
    tasks: "tasks",
    now: "Now",
    next: "Next",
    map: "Plan",
    noActiveTask: "no active task",
    allClear: "all clear",
    links: "Files",
    designSpec: "design spec",
    fullPlan: "full IDE plan"
  };
}

function localizeRuStatus(status: ContexCodePlanStatus): string {
  switch (status) {
    case "draft":
      return "\u0447\u0435\u0440\u043d\u043e\u0432\u0438\u043a";
    case "active":
      return "\u0430\u043a\u0442\u0438\u0432\u0435\u043d";
    case "blocked":
      return "\u0437\u0430\u0431\u043b\u043e\u043a\u0438\u0440\u043e\u0432\u0430\u043d";
    case "review":
      return "\u043d\u0430 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0435";
    case "done":
      return "\u0433\u043e\u0442\u043e\u0432";
    case "archived":
      return "\u0432 \u0430\u0440\u0445\u0438\u0432\u0435";
    default:
      return status;
  }
}

function formatPhaseNumber(index: number): string {
  return index.toString().padStart(2, "0");
}

function compactText(value: string, maxLength: number): string {
  const text = value.replace(/\s+/gu, " ").trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}${ELLIPSIS}`;
}

function renderArtifactLinks(plan: ContexCodePlan, labels: BlockLabels): string {
  const links = [
    plan.designSpecPath ? formatWikiLink(plan.designSpecPath, labels.designSpec) : "",
    plan.fullPlanPath ? formatWikiLink(plan.fullPlanPath, labels.fullPlan) : ""
  ].filter(Boolean);

  return links.join(` ${MIDDLE_DOT} `);
}

function formatWikiLink(path: string, label: string): string {
  const target = path.replace(/\.md$/iu, "");
  return `[[${target}|${label}]]`;
}
