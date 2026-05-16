import { buildTaskPacket } from "./taskPacket";
import { derivePlanTitle } from "./planIds";
import {
  buildContexCodeArtifactPaths,
  saveContexCodePlanArtifacts
} from "./planArtifacts";
import { buildContexCodeWikiEvent, recordContexCodeWikiEvent, type ContexCodeWikiEventWriter } from "./wikiEvents";
import { getCurrentTask, transitionTask } from "./progress";
import { loadContexCodePlan, saveContexCodePlan, type ContexCodeVaultAdapterLike } from "./planStorage";
import { normalizeContexCodePlan } from "./planSchema";
import { extractPlanIdFromBlock } from "./planBlock";
import { extractProjectNoteTitle, syncProjectNoteWithPlan } from "./projectNote";
import { getUiLanguageFromObsidianApp } from "../i18n";
import type { UiLanguage } from "../i18n";
import type { ContexCodeActionResult, ContexCodePlan } from "./planTypes";

export interface ContexCodeFileLike {
  path: string;
  basename?: string;
  name?: string;
}

export interface ContexCodeAppLike {
  vault: {
    adapter: ContexCodeVaultAdapterLike;
    read(file: ContexCodeFileLike): Promise<string>;
    modify(file: ContexCodeFileLike, content: string): Promise<void>;
  };
  workspace: {
    getActiveFile(): ContexCodeFileLike | null;
  };
}

export interface ContexCodeCommandOptions {
  now?: string;
  language?: UiLanguage;
  wikiWriter?: ContexCodeWikiEventWriter;
  planDraft?: unknown;
}

export async function createContexCodePlanFromActiveNote(
  app: ContexCodeAppLike,
  options: ContexCodeCommandOptions = {}
): Promise<ContexCodeActionResult & { plan: ContexCodePlan }> {
  const activeFile = requireActiveMarkdownFile(app);
  const now = options.now ?? new Date().toISOString();
  const language = options.language ?? getUiLanguageFromObsidianApp(app);
  const markdown = await app.vault.read(activeFile);
  const noteTitle = extractProjectNoteTitle(
    markdown,
    activeFile.basename ?? activeFile.name ?? "Mindo Code Plan"
  );
  const draftTitle = readDraftTitle(options.planDraft);
  const title = draftTitle ?? derivePlanTitle(noteTitle);
  const phases =
    buildPhasesFromDraft(options.planDraft, activeFile.path, now) ??
    buildDefaultPhasesFromMarkdown(markdown, activeFile.path, now, language);
  const basePlan = normalizeContexCodePlan(
    {
      title,
      status: "active",
      projectNotePath: activeFile.path,
      createdAt: now,
      updatedAt: now,
      sources: [
        {
          id: "src_project_note",
          type: "vault",
          title: noteTitle,
          path: activeFile.path,
          confidence: 1
        },
        ...readDraftSources(options.planDraft)
      ],
      phases
    },
    now
  );
  const artifactPaths = buildContexCodeArtifactPaths(
    basePlan.projectNotePath,
    basePlan.title,
    basePlan.id
  );
  const plan = {
    ...basePlan,
    ...artifactPaths
  };

  await saveContexCodePlan(app.vault.adapter, plan);
  await saveContexCodePlanArtifacts(app.vault.adapter, plan, markdown);
  await app.vault.modify(activeFile, syncProjectNoteWithPlan(markdown, plan, {
    language
  }));
  await recordContexCodeWikiEvent(
    options.wikiWriter,
    buildContexCodeWikiEvent(plan, "plan_created", now)
  );

  return {
    kind: "contex_code_plan",
    status: "saved",
    message: `Created Mindo Code plan ${plan.title}.`,
    path: activeFile.path,
    planId: plan.id,
    plan
  };
}

export async function prepareCurrentContexCodeTaskPacket(
  app: ContexCodeAppLike,
  options: ContexCodeCommandOptions = {}
): Promise<ContexCodeActionResult & { packet: string; taskId: string }> {
  const { activeFile, plan } = await loadPlanForActiveNote(app);
  const currentTask = getCurrentTask(plan);
  if (!currentTask) {
    throw new Error("No unfinished Mindo Code task found.");
  }

  const packet = buildTaskPacket(plan, currentTask.id, {
    verificationCommands: ["npm run test", "npm run build"]
  });
  await recordContexCodeWikiEvent(
    options.wikiWriter,
    buildContexCodeWikiEvent(
      plan,
      "task_packet_prepared",
      options.now ?? new Date().toISOString(),
      currentTask
    )
  );

  return {
    kind: "contex_code_task_packet",
    status: "done",
    message: `Prepared task packet for ${currentTask.title}.`,
    path: activeFile.path,
    planId: plan.id,
    packet,
    taskId: currentTask.id
  };
}

export async function markCurrentContexCodeTaskDone(
  app: ContexCodeAppLike,
  options: ContexCodeCommandOptions = {}
): Promise<ContexCodeActionResult & { plan: ContexCodePlan }> {
  const { activeFile, markdown, plan } = await loadPlanForActiveNote(app);
  const currentTask = getCurrentTask(plan);
  if (!currentTask) {
    throw new Error("No unfinished Mindo Code task found.");
  }

  const now = options.now ?? new Date().toISOString();
  const nextPlan = transitionTask(plan, currentTask.id, "done", now);
  await saveContexCodePlan(app.vault.adapter, nextPlan);
  await app.vault.modify(activeFile, syncProjectNoteWithPlan(markdown, nextPlan, {
    language: options.language ?? getUiLanguageFromObsidianApp(app)
  }));
  await recordContexCodeWikiEvent(
    options.wikiWriter,
    buildContexCodeWikiEvent(nextPlan, "task_completed", now, currentTask)
  );

  return {
    kind: "contex_code_task_done",
    status: "saved",
    message: `Marked task done: ${currentTask.title}.`,
    path: activeFile.path,
    planId: nextPlan.id,
    plan: nextPlan
  };
}

export async function syncCurrentContexCodePlan(
  app: ContexCodeAppLike,
  options: ContexCodeCommandOptions = {}
): Promise<ContexCodeActionResult & { plan: ContexCodePlan }> {
  const { activeFile, markdown, plan } = await loadPlanForActiveNote(app);
  await app.vault.modify(activeFile, syncProjectNoteWithPlan(markdown, plan, {
    language: options.language ?? getUiLanguageFromObsidianApp(app)
  }));
  await recordContexCodeWikiEvent(
    options.wikiWriter,
    buildContexCodeWikiEvent(
      plan,
      "plan_synced",
      options.now ?? new Date().toISOString()
    )
  );

  return {
    kind: "contex_code_plan_sync",
    status: "saved",
    message: `Synced Mindo Code plan ${plan.title}.`,
    path: activeFile.path,
    planId: plan.id,
    plan
  };
}

function buildDefaultPhasesFromMarkdown(
  markdown: string,
  path: string,
  now: string,
  language: UiLanguage
): unknown[] {
  const headings = markdown
    .split("\n")
    .map((line) => line.match(/^#{1,3}\s+(.+)$/u)?.[1]?.trim())
    .filter((heading): heading is string => Boolean(heading))
    .slice(0, 6);

  const seed = headings.length > 0 ? headings : ["Plan", "Implement", "Verify"];

  return [
    {
      id: "phase_1",
      title: "Implementation",
      displayTitle: language === "ru" ? "Реализация" : undefined,
      status: "in_progress",
      summary: "Turn the project note into executable coding tasks.",
      displaySummary:
        language === "ru"
          ? "Превратить проектную заметку в исполняемые задачи для разработки."
          : undefined,
      tasks: seed.slice(0, 3).map((heading, index) => ({
        title: heading,
        displayTitle: heading,
        status: index === 0 ? "in_progress" : "queued",
        summary: `Implement or refine: ${heading}.`,
        acceptance: [
          "The change is implemented in the project.",
          "Relevant tests or manual checks pass.",
          "The project note and Mindo Code plan stay in sync."
        ],
        files: [path],
        commands: ["npm run test"],
        sources: ["src_project_note"],
        updatedAt: now
      }))
    }
  ];
}

function buildPhasesFromDraft(
  draft: unknown,
  path: string,
  now: string
): unknown[] | null {
  const source = isRecord(draft) ? draft : {};
  const phases = Array.isArray(source.phases) ? source.phases : null;

  if (!phases?.length) {
    return null;
  }

  return phases.map((phaseInput, phaseIndex) => {
    const phase = isRecord(phaseInput) ? phaseInput : {};
    const tasks = Array.isArray(phase.tasks) ? phase.tasks : [];

    return {
      ...phase,
      status:
        typeof phase.status === "string"
          ? phase.status
          : phaseIndex === 0
            ? "in_progress"
            : "queued",
      tasks: tasks.map((taskInput, taskIndex) => {
        const task = isRecord(taskInput) ? taskInput : {};

        return {
          ...task,
          status:
            typeof task.status === "string"
              ? task.status
              : phaseIndex === 0 && taskIndex === 0
                ? "in_progress"
                : "queued",
          acceptance: readStringArray(task.acceptance, [
            "The task is implemented in code.",
            "The change is verified with tests or a manual check.",
            "The project note and Mindo Code plan stay in sync."
          ]),
          files: readStringArray(task.files, [path]),
          commands: readStringArray(task.commands, ["npm run test"]),
          updatedAt: typeof task.updatedAt === "string" ? task.updatedAt : now
        };
      })
    };
  });
}

function readDraftTitle(draft: unknown): string | null {
  const source = isRecord(draft) ? draft : {};
  const title = typeof source.title === "string" ? source.title.trim() : "";

  return title.length >= 2 ? derivePlanTitle(title) : null;
}

function readDraftSources(draft: unknown): unknown[] {
  const source = isRecord(draft) ? draft : {};

  return Array.isArray(source.sources) ? source.sources : [];
}

function readStringArray(value: unknown, fallback: string[]): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  if (Array.isArray(value)) {
    const items = value
      .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
      .map((item) => item.trim());

    if (items.length > 0) {
      return items;
    }
  }

  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function loadPlanForActiveNote(app: ContexCodeAppLike): Promise<{
  activeFile: ContexCodeFileLike;
  markdown: string;
  plan: ContexCodePlan;
}> {
  const activeFile = requireActiveMarkdownFile(app);
  const markdown = await app.vault.read(activeFile);
  const planId = extractPlanIdFromBlock(markdown);
  if (!planId) {
    throw new Error("Active note does not contain a Mindo Code plan block.");
  }

  return {
    activeFile,
    markdown,
    plan: await loadContexCodePlan(app.vault.adapter, planId)
  };
}

function requireActiveMarkdownFile(app: ContexCodeAppLike): ContexCodeFileLike {
  const activeFile = app.workspace.getActiveFile();
  if (!activeFile || !activeFile.path.toLowerCase().endsWith(".md")) {
    throw new Error("Open a Markdown note before using Mindo Code.");
  }

  return activeFile;
}
