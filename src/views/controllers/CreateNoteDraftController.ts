import type { TFile } from "obsidian";
import type { CreateNoteProposal } from "../../modals/CreateNoteModal";
import type {
  ActionReceipt,
  ChatMessage,
  ContexSettings,
  SelectedTextContext
} from "../../types";
import {
  buildCreateNoteFromSelectionPrompt,
  buildCurrentNoteCreatePrompt
} from "../createNotePrompts";

export interface ActiveMarkdownNoteForCreateDraft {
  file: TFile;
  content: string;
}

export interface CreateNoteDraftModalOptions {
  proposal: CreateNoteProposal;
  onApply: (proposal: CreateNoteProposal) => Promise<void>;
  onChange: (
    proposal: CreateNoteProposal,
    instruction: string
  ) => Promise<CreateNoteProposal>;
}

export interface CreateNoteFromCurrentNoteOptions {
  fallbackFolder: string;
  modalTitle: string;
  promptLines: string[];
  statusText: string;
  userPrompt: string;
}

export interface CreateNoteDraftControllerDeps {
  settings: ContexSettings;
  readSelectedTextContextForRequest: () => {
    context: SelectedTextContext | null;
    warning: string | null;
  };
  hideSelectionToolbar: () => void;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  getErrorMessage: (error: unknown) => string;
  requestLlmChatCompletion: (
    settings: ContexSettings,
    messages: ChatMessage[]
  ) => Promise<string>;
  prepareCreateNoteProposal: (
    proposalText: string,
    fallbackFolder?: string
  ) => Promise<CreateNoteProposal>;
  applyCreateNoteProposal: (
    proposal: CreateNoteProposal,
    selectedContext: SelectedTextContext,
    userPrompt?: string,
    userContent?: string
  ) => Promise<unknown>;
  refineCreateNoteProposal: (
    proposal: CreateNoteProposal,
    selectedContext: SelectedTextContext,
    instruction: string
  ) => Promise<CreateNoteProposal>;
  refineCurrentNoteProposal: (
    proposal: CreateNoteProposal,
    sourceContext: SelectedTextContext,
    instruction: string,
    options: {
      fallbackFolder: string;
      promptLines: string[];
    }
  ) => Promise<CreateNoteProposal>;
  openCreateNoteModal: (options: CreateNoteDraftModalOptions) => void;
  appendActionReceipt: (receipt: ActionReceipt) => void;
  readActiveMarkdownNote: () => Promise<ActiveMarkdownNoteForCreateDraft | null>;
  buildSelectedContextFromNote: (
    file: TFile,
    content: string
  ) => SelectedTextContext;
  readProjectMemoryContext: () => Promise<string | null>;
  formatProjectMemoryForPrompt: (memory: string) => string;
}

export class CreateNoteDraftController {
  constructor(private readonly deps: CreateNoteDraftControllerDeps) {}

  async createNoteFromSelection(
    selectedTextContextOverride?: SelectedTextContext | null
  ): Promise<void> {
    const contextResult = selectedTextContextOverride
      ? {
          context: selectedTextContextOverride,
          warning: null
        }
      : this.deps.readSelectedTextContextForRequest();

    if (!contextResult.context) {
      this.deps.setError(contextResult.warning);
      this.deps.setStatus("Status: No selected text");
      return;
    }

    const selectedContext = contextResult.context;
    this.deps.hideSelectionToolbar();
    this.deps.setError(null);
    this.deps.setLoading(true);
    this.deps.setStatus("Status: Drafting note");

    try {
      const proposalText = await this.deps.requestLlmChatCompletion(
        this.deps.settings,
        [
          {
            id: `${Date.now()}-create-note`,
            role: "user",
            content: buildCreateNoteFromSelectionPrompt(selectedContext.text),
            createdAt: Date.now()
          }
        ]
      );
      const proposal = await this.deps.prepareCreateNoteProposal(proposalText);

      this.deps.openCreateNoteModal({
        proposal,
        onApply: async (editedProposal) => {
          await this.deps.applyCreateNoteProposal(
            editedProposal,
            selectedContext
          );
        },
        onChange: (currentProposal, instruction) =>
          this.deps.refineCreateNoteProposal(
            currentProposal,
            selectedContext,
            instruction
          )
      });
      this.deps.appendActionReceipt({
        status: "preview",
        label: "Drafted note proposal",
        detail: proposal.path
      });
      this.deps.setStatus("Status: Ready");
    } catch (error) {
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Create note failed");
    } finally {
      this.deps.setLoading(false);
    }
  }

  async createNoteFromCurrentNote(
    options: CreateNoteFromCurrentNoteOptions
  ): Promise<void> {
    const note = await this.deps.readActiveMarkdownNote();

    if (!note) {
      this.deps.setError("Open a Markdown note before using this action.");
      this.deps.setStatus("Status: No current note");
      return;
    }

    const sourceContext = this.deps.buildSelectedContextFromNote(
      note.file,
      note.content
    );

    this.deps.setError(null);
    this.deps.setLoading(true);
    this.deps.setStatus(options.statusText);

    try {
      const projectMemory = await this.deps.readProjectMemoryContext();
      const proposalText = await this.deps.requestLlmChatCompletion(
        this.deps.settings,
        [
          {
            id: `${Date.now()}-create-current-note-draft`,
            role: "user",
            content: buildCurrentNoteCreatePrompt({
              promptLines: options.promptLines,
              projectMemoryText: projectMemory
                ? this.deps.formatProjectMemoryForPrompt(projectMemory)
                : "",
              currentNotePath: note.file.path,
              currentNoteContent: sourceContext.text
            }),
            createdAt: Date.now()
          }
        ]
      );
      const proposal = await this.deps.prepareCreateNoteProposal(
        proposalText,
        options.fallbackFolder
      );

      await this.deps.applyCreateNoteProposal(
        proposal,
        sourceContext,
        options.userPrompt,
        options.userPrompt
      );
      this.deps.setStatus("Status: Note created");
    } catch (error) {
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Draft failed");
    } finally {
      this.deps.setLoading(false);
    }
  }
}
