import type { WorkflowRoute } from "../workflows";
import type { LocalCommandAction } from "./sidebarTypes";

export interface ResolveWorkflowCreateTargetOptions {
  route: WorkflowRoute;
  commandText: string;
  activePath?: string;
  resolveVaultFolderPath: (folderHint: string) => string | null;
  resolveCreateNoteTargetFolder: (
    commandText: string,
    activePath?: string
  ) => string;
  inferCreateNoteTitleFromCommand: (
    commandText: string,
    fallback?: string
  ) => string;
  inferResearchNoteTitle: (commandText: string) => string | null;
  sanitizeCreateNoteFilename: (
    filename: string | undefined,
    content: string
  ) => string;
}

export interface WorkflowRouteToLocalCommandActionOptions {
  route: WorkflowRoute;
  originalText: string;
  findLatestAppliedDiffMessageId: () => string | null;
}

export function resolveWorkflowCreateTarget(
  options: ResolveWorkflowCreateTargetOptions
): { title: string; targetFolder: string } {
  const createAction = options.route.actions.find(
    (action) => action.kind === "create_note" || action.kind === "research_note"
  );
  const titleHint =
    (createAction?.kind === "create_note" || createAction?.kind === "research_note"
      ? createAction.title
      : undefined) ?? options.route.title;
  const folderHint =
    (createAction?.kind === "create_note" || createAction?.kind === "research_note"
      ? createAction.folderHint
      : undefined) ?? options.route.folderHint;
  const targetFolder = folderHint
    ? options.resolveVaultFolderPath(folderHint) ?? folderHint
    : options.resolveCreateNoteTargetFolder(
        options.commandText,
        options.activePath
      );
  const inferredTitle = options.inferCreateNoteTitleFromCommand(
    options.commandText,
    options.inferResearchNoteTitle(options.commandText) || "Mindo Note"
  );
  const candidateTitle = (titleHint || inferredTitle).replace(/\.md$/i, "");
  const title = options
    .sanitizeCreateNoteFilename(
      `${candidateTitle}.md`,
      `# ${inferredTitle}`
    )
    .replace(/\.md$/i, "");

  return {
    title,
    targetFolder
  };
}

export function workflowRouteToLocalCommandAction(
  options: WorkflowRouteToLocalCommandActionOptions
): LocalCommandAction | null {
  const { route, originalText } = options;

  if (route.intent === "chat" || !route.actions.length) {
    return null;
  }

  const createAction = route.actions.find(
    (action) => action.kind === "create_note" || action.kind === "research_note"
  );

  if (createAction?.kind === "create_note") {
    return {
      kind: "create-note",
      commandText: route.effectiveText,
      displayText: originalText
    };
  }

  if (createAction?.kind === "research_note") {
    return {
      kind: "research-note",
      commandText: route.effectiveText,
      displayText: originalText
    };
  }

  const localActions = route.actions
    .map((action): LocalCommandAction | null => {
      if (action.kind === "open_note") {
        return {
          kind: "open-file",
          commandText: originalText,
          query: action.candidatePath || action.query
        };
      }

      if (action.kind === "replace_text" && action.replacements.length) {
        return action.replacements.length === 1
          ? {
              kind: "replace-text",
              commandText: originalText,
              replacement: action.replacements[0]
            }
          : {
              kind: "replace-multiple",
              commandText: originalText,
              replacements: action.replacements
            };
      }

      if (action.kind === "replace_selection") {
        return {
          kind: "replace-selection-or-line",
          commandText: originalText,
          suggested: action.suggested
        };
      }

      if (action.kind === "search_web") {
        return {
          kind: "research-web",
          query: action.query
        };
      }

      if (action.kind === "search_vault") {
        return {
          kind: "semantic-vault",
          query: action.query
        };
      }

      if (action.kind === "read_answer") {
        return {
          kind: "read-last-answer"
        };
      }

      if (action.kind === "undo_change") {
        const messageId = options.findLatestAppliedDiffMessageId();

        return messageId
          ? {
              kind: "undo-diff",
              messageId
            }
          : null;
      }

      return null;
    })
    .filter((action): action is LocalCommandAction => Boolean(action));

  if (!localActions.length) {
    return null;
  }

  return localActions.length === 1
    ? localActions[0]
    : {
        kind: "action-plan",
        commandText: originalText,
        actions: localActions
      };
}
