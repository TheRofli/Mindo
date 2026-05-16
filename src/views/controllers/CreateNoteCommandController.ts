import type { TFile } from "obsidian";
import {
  buildCreateNoteFromCommandPrompt,
  buildResearchNotePrompt,
  buildResearchWorkflowSourceText
} from "../createNotePrompts";
import type {
  CreateStreamingGeneratedNoteDeps,
  CreateStreamingGeneratedNoteOptions
} from "../createStreamingGeneratedNote";
import type { WorkflowRoute } from "../../workflows";
import type {
  ActionReceipt,
  ContexSettings,
  LlmFileAttachment,
  LlmRequestContext,
  SelectedTextContext,
  VaultSearchResult,
  VaultSourceSection,
  WebSearchResult
} from "../../types";
import type { AutoWebContext } from "../sidebarTypes";

export interface ActiveMarkdownNoteForCreateCommand {
  file: TFile;
  content: string;
}

export interface SemanticVaultSectionBundle {
  context: string;
  sections: VaultSourceSection[];
}

export interface CreateNoteCommandControllerDeps {
  settings: ContexSettings;
  maxNoteActionContextChars?: number;
  maxResearchNoteSourceChars?: number;
  getAttachedFiles: () => LlmFileAttachment[];
  clearAttachedFiles: () => void;
  renderAttachedContext: () => void;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  getErrorMessage: (error: unknown) => string;
  readActiveMarkdownNote: () => Promise<ActiveMarkdownNoteForCreateCommand | null>;
  buildWorkflowRouteForCommand: (
    commandText: string,
    activePath?: string,
    activeContent?: string
  ) => WorkflowRoute;
  resolveWorkflowCreateTarget: (
    route: WorkflowRoute,
    commandText: string,
    activePath?: string
  ) => { title: string; targetFolder: string };
  buildSelectedContextFromNote: (
    file: TFile,
    content: string
  ) => SelectedTextContext;
  readProjectMemoryContext: () => Promise<string | null>;
  buildAutoWebContextForRequest: (
    commandText: string,
    context: LlmRequestContext | null
  ) => Promise<AutoWebContext | null>;
  createStreamingGeneratedNoteDeps: () => CreateStreamingGeneratedNoteDeps;
  createStreamingGeneratedNote: (
    deps: CreateStreamingGeneratedNoteDeps,
    options: CreateStreamingGeneratedNoteOptions
  ) => Promise<string>;
  expandSemanticVaultQuery: (query: string) => Promise<string[]>;
  searchSemanticVaultMarkdown: (
    query: string,
    variants: string[],
    limit: number
  ) => Promise<VaultSearchResult[]>;
  buildSemanticVaultSectionContext: (
    query: string,
    results: VaultSearchResult[]
  ) => Promise<SemanticVaultSectionBundle>;
  buildResearchWorkflowWebContext: (
    commandText: string,
    context: LlmRequestContext | null
  ) => Promise<AutoWebContext | null>;
  rememberVaultSearch: (
    query: string,
    results: VaultSearchResult[]
  ) => void;
  appendWorkflowReceipt: (
    receipt: ActionReceipt,
    userContent?: string,
    userAttachments?: LlmFileAttachment[] | null
  ) => void;
  formatAutoWebContextForPrompt: (context: AutoWebContext) => string;
  formatProjectMemoryForPrompt: (memory: string) => string;
  formatSemanticVaultContext: (results: VaultSearchResult[]) => string;
  formatWebSearchContext: (results: WebSearchResult[]) => string;
}

const DEFAULT_NOTE_ACTION_CONTEXT_CHARS = 12000;
const DEFAULT_RESEARCH_NOTE_SOURCE_CHARS = 12000;

export class CreateNoteCommandController {
  constructor(private readonly deps: CreateNoteCommandControllerDeps) {}

  async createNoteFromCommandText(
    commandText: string,
    displayCommandText: string
  ): Promise<void> {
    const sourceContext = buildCommandSourceContext(
      "Mindo Command",
      commandText
    );
    const activeNote = await this.deps.readActiveMarkdownNote();
    const workflowRoute = this.deps.buildWorkflowRouteForCommand(
      commandText,
      activeNote?.file.path,
      activeNote?.content
    );
    const createTarget = this.deps.resolveWorkflowCreateTarget(
      workflowRoute,
      commandText,
      activeNote?.file.path
    );
    const attachedFiles = this.getAttachedFilesSnapshot();

    this.deps.setError(null);
    this.deps.setLoading(true);
    this.deps.setStatus("Status: Drafting note");

    try {
      const activeNoteContext = activeNote
        ? this.deps.buildSelectedContextFromNote(
            activeNote.file,
            activeNote.content
          )
        : null;
      const projectMemory = await this.deps.readProjectMemoryContext();
      const contextForResearchDecision: LlmRequestContext = {};

      if (activeNoteContext) {
        contextForResearchDecision.selectedText = activeNoteContext;
      }

      if (projectMemory) {
        contextForResearchDecision.projectMemory = projectMemory;
      }

      if (attachedFiles) {
        contextForResearchDecision.attachments = attachedFiles;
      }

      const autoWebContext =
        await this.deps.buildAutoWebContextForRequest(
          commandText,
          hasRequestContext(contextForResearchDecision)
            ? contextForResearchDecision
            : null
        );
      const title = createTarget.title;

      await this.deps.createStreamingGeneratedNote(
        this.deps.createStreamingGeneratedNoteDeps(),
        {
          title,
          targetFolder: createTarget.targetFolder,
          selectedContext: sourceContext,
          userPrompt: commandText,
          userContent: displayCommandText,
          userAttachments: attachedFiles,
          requestContext: attachedFiles
            ? {
                attachments: attachedFiles
              }
            : null,
          webSources: autoWebContext?.results,
          draftLabel: "Drafting note",
          savedLabel: "Created note",
          prompt: buildCreateNoteFromCommandPrompt({
            title,
            targetFolder: createTarget.targetFolder,
            commandText,
            autoWebContextText: autoWebContext
              ? this.deps.formatAutoWebContextForPrompt(autoWebContext)
              : "",
            projectMemoryText: projectMemory
              ? this.deps.formatProjectMemoryForPrompt(projectMemory)
              : "",
            activeNotePath: activeNote?.file.path ?? null,
            activeNoteExcerpt:
              activeNote?.content.slice(0, this.maxNoteActionContextChars) ??
              "",
            hasAttachments: Boolean(attachedFiles)
          })
        }
      );
      this.deps.setStatus("Status: Note created");
    } catch (error) {
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Create note failed");
    } finally {
      this.clearAttachmentsIfNeeded(attachedFiles);
      this.deps.setLoading(false);
    }
  }

  async createResearchNoteFromCommandText(
    commandText: string,
    displayCommandText: string
  ): Promise<void> {
    const activeNote = await this.deps.readActiveMarkdownNote();
    const workflowRoute = this.deps.buildWorkflowRouteForCommand(
      commandText,
      activeNote?.file.path,
      activeNote?.content
    );
    const createTarget = this.deps.resolveWorkflowCreateTarget(
      workflowRoute,
      commandText,
      activeNote?.file.path
    );
    const attachedFiles = this.getAttachedFilesSnapshot();
    const sourceContext = buildCommandSourceContext(
      "Mindo Research Workflow",
      commandText
    );

    this.deps.setError(null);
    this.deps.setLoading(true);
    this.deps.setStatus("Status: Research workflow");

    try {
      const activeNoteContext = activeNote
        ? this.deps.buildSelectedContextFromNote(
            activeNote.file,
            activeNote.content
          )
        : null;
      const projectMemory = await this.deps.readProjectMemoryContext();
      const vaultVariants =
        await this.deps.expandSemanticVaultQuery(commandText);
      const vaultResults = await this.deps.searchSemanticVaultMarkdown(
        commandText,
        vaultVariants,
        8
      );
      const sectionBundle = vaultResults.length
        ? await this.deps.buildSemanticVaultSectionContext(
            commandText,
            vaultResults
          )
        : { context: "", sections: [] };
      const researchContext: LlmRequestContext = activeNoteContext
        ? {
            selectedText: activeNoteContext,
            vaultResults,
            projectMemory
          }
        : {
            vaultResults,
            projectMemory
          };

      if (attachedFiles) {
        researchContext.attachments = attachedFiles;
      }

      const webContext = await this.deps.buildResearchWorkflowWebContext(
        commandText,
        researchContext
      );

      this.deps.rememberVaultSearch(commandText, vaultResults);
      this.deps.appendWorkflowReceipt(
        {
          status: "done",
          label: "Workflow sources",
          detail: [
            vaultResults.length ? `${vaultResults.length} vault` : "0 vault",
            webContext?.results.length
              ? `${webContext.results.length} web`
              : this.deps.settings.webSearchEnabled
                ? "0 web"
                : "web off"
          ].join(" | ")
        },
        displayCommandText
      );

      const workflowSourceText = buildResearchWorkflowSourceText({
        commandText,
        vaultSourceText: vaultResults.length
          ? this.deps
              .formatSemanticVaultContext(vaultResults)
              .slice(0, this.maxResearchNoteSourceChars)
          : "(none)",
        webSourceText: webContext?.results.length
          ? this.deps
              .formatWebSearchContext(webContext.results)
              .slice(0, this.maxResearchNoteSourceChars)
          : "(none)"
      });
      const title = createTarget.title;

      await this.deps.createStreamingGeneratedNote(
        this.deps.createStreamingGeneratedNoteDeps(),
        {
          title,
          targetFolder: createTarget.targetFolder,
          selectedContext: {
            ...sourceContext,
            text: workflowSourceText,
            originalLength: workflowSourceText.length,
            includedLength: workflowSourceText.length
          },
          userPrompt: commandText,
          userContent: displayCommandText,
          userAttachments: attachedFiles,
          requestContext: attachedFiles
            ? {
                attachments: attachedFiles
              }
            : null,
          vaultSources: vaultResults,
          webSources: webContext?.results,
          draftLabel: "Research note preview",
          savedLabel: "Created research note",
          prompt: buildResearchNotePrompt({
            title,
            commandText,
            targetFolder: createTarget.targetFolder,
            projectMemoryText: projectMemory
              ? this.deps.formatProjectMemoryForPrompt(projectMemory)
              : "",
            activeNoteContextText: activeNote
              ? [
                  "Active note context:",
                  `Path: ${activeNote.file.path}`,
                  activeNote.content.slice(0, this.maxNoteActionContextChars)
                ].join("\n")
              : "",
            vaultContextText:
              sectionBundle.context ||
              this.deps.formatSemanticVaultContext(vaultResults),
            webContextText: webContext
              ? this.deps.formatAutoWebContextForPrompt(webContext)
              : "",
            hasVaultResults: Boolean(vaultResults.length),
            hasAttachments: Boolean(attachedFiles),
            dateChecked: new Date().toISOString().slice(0, 10)
          })
        }
      );
      this.deps.setStatus("Status: Research note created");
    } catch (error) {
      console.warn("[Mindo] Research workflow failed", error);
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Research workflow failed");
      this.deps.appendWorkflowReceipt({
        status: "failed",
        label: "Workflow failed",
        detail: this.deps.getErrorMessage(error)
      });
    } finally {
      this.clearAttachmentsIfNeeded(attachedFiles);
      this.deps.setLoading(false);
    }
  }

  private getAttachedFilesSnapshot(): LlmFileAttachment[] | null {
    const attachedFiles = this.deps.getAttachedFiles();
    return attachedFiles.length ? [...attachedFiles] : null;
  }

  private clearAttachmentsIfNeeded(
    attachedFiles: LlmFileAttachment[] | null
  ): void {
    if (!attachedFiles) {
      return;
    }

    this.deps.clearAttachedFiles();
    this.deps.renderAttachedContext();
  }

  private get maxNoteActionContextChars(): number {
    return (
      this.deps.maxNoteActionContextChars ?? DEFAULT_NOTE_ACTION_CONTEXT_CHARS
    );
  }

  private get maxResearchNoteSourceChars(): number {
    return (
      this.deps.maxResearchNoteSourceChars ??
      DEFAULT_RESEARCH_NOTE_SOURCE_CHARS
    );
  }
}

function buildCommandSourceContext(
  name: string,
  commandText: string
): SelectedTextContext {
  return {
    path: name,
    name,
    text: commandText,
    isTruncated: false,
    originalLength: commandText.length,
    includedLength: commandText.length
  };
}

function hasRequestContext(context: LlmRequestContext): boolean {
  return Boolean(
    context.currentNote ||
      context.selectedText ||
      context.vaultResults?.length ||
      context.projectMemory ||
      context.attachments?.length ||
      context.webResults?.length
  );
}
