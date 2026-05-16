import type { ContexActionSource } from "../actions/actionTypes";
import { buildWorkflowContext, routeWorkflow, type WorkflowRoute } from "../workflows";

const MAX_WORKFLOW_ACTIVE_NOTE_EXCERPT_CHARS = 12000;
const MAX_WORKFLOW_ATTACHMENT_TEXT_CHARS = 1000;

export interface WorkflowOrchestratorAttachment {
  name: string;
  mime?: string;
  size: number;
  textExcerpt?: string;
}

export interface WorkflowOrchestratorDependencies {
  getUiLanguage: () => "en" | "ru";
  getAttachments: () => WorkflowOrchestratorAttachment[];
  getVaultPaths: () => string[];
}

export interface BuildWorkflowRouteInput {
  commandText: string;
  source?: ContexActionSource;
  activeNotePath?: string;
  activeNoteContent?: string;
}

export class WorkflowOrchestrator {
  constructor(private readonly dependencies: WorkflowOrchestratorDependencies) {}

  buildRoute(input: BuildWorkflowRouteInput): WorkflowRoute {
    const activeNoteContent = input.activeNoteContent;

    return routeWorkflow(
      buildWorkflowContext({
        userText: input.commandText,
        source: input.source ?? "chat",
        uiLanguage: this.dependencies.getUiLanguage(),
        activeNotePath: input.activeNotePath,
        activeNoteExcerpt: activeNoteContent?.slice(
          0,
          MAX_WORKFLOW_ACTIVE_NOTE_EXCERPT_CHARS
        ),
        activeNoteWordCount: activeNoteContent
          ? activeNoteContent.split(/\s+/).filter(Boolean).length
          : undefined,
        attachments: this.dependencies.getAttachments().map((attachment) => ({
          name: attachment.name,
          mime: attachment.mime,
          size: attachment.size,
          textExcerpt: attachment.textExcerpt?.slice(
            0,
            MAX_WORKFLOW_ATTACHMENT_TEXT_CHARS
          )
        })),
        vaultPaths: this.dependencies.getVaultPaths()
      })
    );
  }

  buildRouteForCommand(
    commandText: string,
    activeNotePath?: string,
    activeNoteContent?: string
  ): WorkflowRoute {
    return this.buildRoute({
      commandText,
      source: "chat",
      activeNotePath,
      activeNoteContent
    });
  }
}
