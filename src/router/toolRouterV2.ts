import type {
  ContexActionPlan,
  ContexActionSource
} from "../actions/actionTypes";
import {
  buildWorkflowContext,
  routeWorkflow,
  workflowRouteToActionPlan,
  type WorkflowAttachmentContext,
  type WorkflowUiLanguage
} from "../workflows";
import {
  parseSemanticLocalCommandPlan,
  type SemanticLocalCommand
} from "../views/semanticLocalCommandPlan";

export function parseToolRouterResponse(response: string): SemanticLocalCommand[] {
  return parseSemanticLocalCommandPlan(response) ?? [];
}

export function routeUserTextToActionPlan(input: {
  source: ContexActionSource;
  userText: string;
  uiLanguage?: WorkflowUiLanguage;
  activeNotePath?: string;
  activeNoteExcerpt?: string;
  selectedText?: string;
  attachments?: WorkflowAttachmentContext[];
  vaultPaths?: string[];
}): ContexActionPlan {
  const route = routeWorkflow(
    buildWorkflowContext({
      source: input.source,
      userText: input.userText,
      uiLanguage: input.uiLanguage,
      activeNotePath: input.activeNotePath,
      activeNoteExcerpt: input.activeNoteExcerpt,
      selectedText: input.selectedText,
      attachments: input.attachments,
      vaultPaths: input.vaultPaths
    })
  );

  return workflowRouteToActionPlan(route, input.source);
}

export function routerCommandsToActionPlan(input: {
  source: ContexActionSource;
  userText: string;
  commands: SemanticLocalCommand[];
}): ContexActionPlan {
  return {
    id: createId("plan"),
    source: input.source,
    userText: input.userText,
    actions: input.commands.map((command) => {
      const id = createId("action");

      if (command.action === "open_file") {
        return {
          id,
          kind: "open_note",
          query: command.query ?? input.userText
        };
      }

      if (command.action === "create_note" || command.action === "research_note") {
        return {
          id,
          kind: command.action === "research_note" ? "research_note" : "create_note",
          contentPrompt: command.query ?? input.userText,
          requireWeb: command.action === "research_note"
        };
      }

      if (command.action === "replace_text") {
        return {
          id,
          kind: "replace_text",
          replacements: command.replacements?.length
            ? command.replacements
            : command.original && command.suggested
              ? [{ original: command.original, suggested: command.suggested }]
              : []
        };
      }

      if (command.action === "replace_selection") {
        return {
          id,
          kind: "replace_selection",
          suggested: command.suggested ?? ""
        };
      }

      if (command.action === "research_web") {
        return {
          id,
          kind: "search_web",
          query: command.query ?? input.userText
        };
      }

      if (command.action === "search_vault" || command.action === "semantic_vault") {
        return {
          id,
          kind: "search_vault",
          query: command.query ?? input.userText
        };
      }

      if (command.action === "read_last_answer") {
        return {
          id,
          kind: "read_answer",
          target: "latest_assistant"
        };
      }

      return {
        id,
        kind: "none",
        reason: `Unsupported router command: ${command.action}`
      };
    })
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
