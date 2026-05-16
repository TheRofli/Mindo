import type {
  ContexAction,
  ContexActionPlan,
  ContexActionSource
} from "../actions/actionTypes";
import {
  inferCreateNoteTitleFromCommand,
  normalizeCreateNotePath
} from "../views/createNotePathUtils";
import type { WorkflowContextBundle, WorkflowIntent, WorkflowRoute } from "./workflowTypes";

export function routeWorkflow(context: WorkflowContextBundle): WorkflowRoute {
  const text = context.effectiveText;
  const lower = text.toLowerCase();
  const needsWeb = shouldUseWeb(text);
  const replacementPairs = extractReplacementPairs(text);
  const openLike = isOpenRequest(text);
  const createLike = isCreateRequest(text);

  if (isUndoRequest(text)) {
    return createRoute(context, "vault_action", 0.96, "Undo command.", [
      { id: createId("action"), kind: "undo_change" }
    ]);
  }

  if (openLike && replacementPairs.length) {
    const candidate = context.noteCandidates[0];

    return createRoute(
      context,
      "safe_edit",
      0.95,
      "Open note and prepare safe replacement.",
      [
        {
          id: createId("action"),
          kind: "open_note",
          query: text,
          folderHint: context.folderCandidates[0]?.path,
          candidatePath: candidate?.path
        },
        {
          id: createId("action"),
          kind: "replace_text",
          sourcePath: candidate?.path ?? context.activeNote?.path,
          replacements: replacementPairs
        }
      ],
      { candidatePath: candidate?.path, folderHint: context.folderCandidates[0]?.path }
    );
  }

  if (replacementPairs.length || isSelectionEditRequest(text)) {
    return createRoute(context, "safe_edit", 0.88, "Safe edit request.", [
      context.selectedText
        ? {
            id: createId("action"),
            kind: "replace_selection",
            sourcePath: context.activeNote?.path,
            suggested: replacementPairs[0]?.suggested ?? ""
          }
        : {
            id: createId("action"),
            kind: "replace_text",
            sourcePath: context.activeNote?.path,
            replacements: replacementPairs
          }
    ]);
  }

  if (createLike) {
    const title = inferCreateNoteTitleFromCommand(text);
    const rawFolderHint = extractFolderHint(text);
    const folderHint = rawFolderHint
      ? context.folderCandidates[0]?.path ?? rawFolderHint
      : context.activeNote?.folder;
    const path = folderHint ? normalizeCreateNotePath(`${folderHint}/${title}`) : undefined;

    return createRoute(
      context,
      needsWeb ? "research_update" : "note_creation",
      needsWeb ? 0.9 : 0.92,
      needsWeb ? "Create note with web research." : "Create note.",
      [
        {
          id: createId("action"),
          kind: needsWeb ? "research_note" : "create_note",
          title,
          folderHint,
          path,
          contentPrompt: text,
          requireWeb: needsWeb
        }
      ],
      { title, folderHint, needsWeb }
    );
  }

  if (shouldUseResearchUpdate(text, lower)) {
    return createRoute(
      context,
      "research_update",
      0.88,
      "Freshness or actuality request.",
      [
        {
          id: createId("action"),
          kind: "search_web",
          query: text
        },
        {
          id: createId("action"),
          kind: "update_note",
          sourcePath: context.activeNote?.path,
          query: text,
          reason: "Update active note with fresh research."
        }
      ],
      { needsWeb: true }
    );
  }

  if (openLike) {
    const candidate = context.noteCandidates[0];

    return createRoute(
      context,
      "vault_action",
      candidate ? 0.9 : 0.55,
      "Open note request.",
      [
        {
          id: createId("action"),
          kind: "open_note",
          query: text,
          folderHint: context.folderCandidates[0]?.path,
          candidatePath: candidate?.path
        }
      ],
      { candidatePath: candidate?.path, folderHint: context.folderCandidates[0]?.path }
    );
  }

  if (isCodePlanRequest(text)) {
    return createRoute(context, "code_plan", 0.85, "Mindo Code planning request.", []);
  }

  return createRoute(context, "chat", 0.45, "No workflow action needed.", [
    {
      id: createId("action"),
      kind: "none",
      reason: "Ordinary chat."
    }
  ]);
}

export function workflowRouteToActionPlan(
  route: WorkflowRoute,
  source: ContexActionSource = route.source
): ContexActionPlan {
  return {
    id: route.id,
    source,
    userText: route.userText,
    actions: route.actions
  };
}

function createRoute(
  context: WorkflowContextBundle,
  intent: WorkflowIntent,
  confidence: number,
  reason: string,
  actions: ContexAction[],
  extras: Partial<Pick<WorkflowRoute, "title" | "folderHint" | "candidatePath" | "needsWeb">> = {}
): WorkflowRoute {
  return {
    id: createId("workflow"),
    intent,
    confidence,
    reason,
    source: context.source,
    userText: context.userText,
    effectiveText: context.effectiveText,
    uiLanguage: context.uiLanguage,
    actions,
    statusSteps: inferStatusSteps(intent, actions),
    needsWeb: extras.needsWeb ?? actions.some((action) => action.kind === "search_web" || action.kind === "research_note"),
    needsModel: intent !== "vault_action",
    title: extras.title,
    folderHint: extras.folderHint,
    candidatePath: extras.candidatePath
  };
}

function inferStatusSteps(intent: WorkflowIntent, actions: ContexAction[]): string[] {
  const steps: string[] = [];

  if (intent === "research_update") {
    steps.push("searching web");
  }

  actions.forEach((action) => {
    if (action.kind === "open_note") steps.push("opening note");
    if (action.kind === "create_note" || action.kind === "research_note") steps.push("creating note");
    if (action.kind === "replace_text" || action.kind === "replace_selection") steps.push("editing note");
    if (action.kind === "undo_change") steps.push("undoing change");
    if (action.kind === "search_web") steps.push("searching web");
    if (action.kind === "search_vault") steps.push("searching vault");
  });

  steps.push("verifying");

  return Array.from(new Set(steps));
}

function isOpenRequest(text: string): boolean {
  return /(?:^|[\s,;:])(?:открой|открою|открывай|открываем|покажи|open|show)(?=$|[\s,;:.!?])/iu.test(
    text
  );
}

function isCreateRequest(text: string): boolean {
  return /(?:^|[\s,;:])(?:создай|создать|сделай|заведи|сохрани|create|make|draft|new)(?=$|[\s,;:.!?])/iu.test(
    text
  );
}

function isUndoRequest(text: string): boolean {
  return /(?:^|[\s,;:])(?:откати|отмен[аи]|undo|revert)(?=$|[\s,;:.!?])/iu.test(text);
}

function isSelectionEditRequest(text: string): boolean {
  return /(?:выделенн|selected|selection|улучши|перепиши|expand|improve|rewrite|shorten|summari[sz]e)/iu.test(
    text
  );
}

function isCodePlanRequest(text: string): boolean {
  return /(?:contex code|code plan|код[-\s]?план|план для кода|ide plan)/iu.test(text);
}

function shouldUseResearchUpdate(text: string, lower = text.toLowerCase()): boolean {
  return shouldUseWeb(text) || /(?:проверь|обнови|актуальн|свеж|current|fresh|update|verify)/iu.test(lower);
}

function shouldUseWeb(text: string): boolean {
  return /(?:web|internet|интернет|веб|latest|current|fresh|актуальн|свеж|современн|тренд|202[0-9]|на момент|this year|today)/iu.test(
    text
  );
}

function extractFolderHint(text: string): string | undefined {
  const patterns = [
    /(?:^|[\s,;:])(?:в|из)\s+(?:папк|парк)[еиуы]\s+([\p{L}\p{N}_ -]+?)(?=\s+(?:файл|заметк|страниц|план|про|о|об|note|file|page|create|make|draft|new|with|about)\b|[,.!?;:]|$)/iu,
    /(?:^|[\s,;:])(?:in|inside)\s+(?:the\s+)?(?:current\s+)?folder\s+([\p{L}\p{N}_ -]+?)(?=\s+(?:note|file|page|plan|about|with|create|make|draft|new)\b|[,.!?;:]|$)/iu
  ];

  for (const pattern of patterns) {
    const folder = text.match(pattern)?.[1]?.trim();

    if (folder) {
      return folder;
    }
  }

  return undefined;
}

function extractReplacementPairs(text: string): Array<{ original: string; suggested: string }> {
  const patterns = [
    /(?:поменяй|замени|измени|replace|change)\s+(.+?)\s+(?:на|to|with)\s+(.+?)(?=$|[.!?])/giu,
    /(?:напиши|write)\s+(.+?)\s+(?:вместо|instead of)\s+(.+?)(?=$|[.!?])/giu
  ];
  const pairs: Array<{ original: string; suggested: string }> = [];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const first = cleanReplacementValue(match[1]);
      const second = cleanReplacementValue(match[2]);

      if (!first || !second) {
        continue;
      }

      if (/вместо|instead of/iu.test(match[0])) {
        pairs.push({ original: second, suggested: first });
      } else {
        pairs.push({ original: first, suggested: second });
      }
    }
  }

  return pairs;
}

function cleanReplacementValue(value: string | undefined): string {
  return (value ?? "")
    .replace(/^[\s"'“”«»`]+|[\s"'“”«»`]+$/g, "")
    .replace(/(?:\s+в\s+папке\s+[\p{L}\p{N}_ -]+)$/iu, "")
    .trim();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
