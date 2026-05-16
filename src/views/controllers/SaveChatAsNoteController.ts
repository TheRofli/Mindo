import {
  prepareSaveChatAsNoteDraft,
  type ChatNoteProposalLike
} from "../../chat/saveChatAsNoteWorkflow";
import type { CreateNoteProposal } from "../../modals/CreateNoteModal";
import type {
  ActionReceipt,
  ChatMessage,
  ContexSettings,
  SelectedTextContext
} from "../../types";

export interface SaveChatAsNoteModalOptions {
  title: string;
  createButtonText: string;
  proposal: CreateNoteProposal;
  onApply: (proposal: CreateNoteProposal) => Promise<void>;
  onChange?: (
    proposal: CreateNoteProposal,
    instruction: string
  ) => Promise<CreateNoteProposal>;
}

export interface SaveChatAsNoteControllerDeps {
  settings: ContexSettings;
  requestLlmChatCompletion: (
    settings: ContexSettings,
    messages: ChatMessage[]
  ) => Promise<string>;
  prepareCreateNoteProposal: (
    proposalText: string,
    fallbackFolder: string
  ) => Promise<ChatNoteProposalLike>;
  getFallbackPath: (title: string) => Promise<string>;
  openCreateNoteModal: (options: SaveChatAsNoteModalOptions) => void;
  applyCreateNoteProposal: (
    proposal: CreateNoteProposal,
    sourceContext: SelectedTextContext,
    reason: string
  ) => Promise<unknown>;
  refineCreateNoteProposal: (
    proposal: CreateNoteProposal,
    sourceContext: SelectedTextContext,
    instruction: string
  ) => Promise<CreateNoteProposal>;
  appendActionReceipt: (receipt: ActionReceipt) => void;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  getErrorMessage: (error: unknown) => string;
}

export interface SaveChatAsNoteControllerOptions {
  isLoading: boolean;
}

export class SaveChatAsNoteController {
  constructor(private readonly deps: SaveChatAsNoteControllerDeps) {}

  async save(
    messages: ChatMessage[],
    options: SaveChatAsNoteControllerOptions
  ): Promise<void> {
    if (options.isLoading) {
      return;
    }

    if (!this.hasConversationContent(messages)) {
      this.deps.setError("There is no chat conversation to save yet.");
      this.deps.setStatus("Status: Empty chat");
      return;
    }

    this.deps.setError(null);
    this.deps.setLoading(true);
    this.deps.setStatus("Status: Turning chat into note");

    try {
      const draft = await prepareSaveChatAsNoteDraft({
        messages,
        settings: this.deps.settings,
        requestLlmChatCompletion: this.deps.requestLlmChatCompletion,
        prepareCreateNoteProposal: this.deps.prepareCreateNoteProposal,
        getFallbackPath: this.deps.getFallbackPath
      });

      this.deps.openCreateNoteModal({
        title: "Create Chat Note",
        createButtonText: "Create",
        proposal: draft.proposal,
        onApply: async (editedProposal) => {
          await this.deps.applyCreateNoteProposal(
            editedProposal,
            draft.sourceContext,
            "Turn conversation into note"
          );
        },
        ...(draft.usedFallback
          ? {}
          : {
              onChange: async (
                currentProposal: CreateNoteProposal,
                instruction: string
              ) => {
                return this.deps.refineCreateNoteProposal(
                  currentProposal,
                  draft.sourceContext,
                  instruction
                );
              }
            })
      });

      this.deps.appendActionReceipt({
        status: "preview",
        label: "Drafted chat note",
        detail: draft.proposal.path
      });

      if (draft.usedFallback) {
        this.deps.setError(this.deps.getErrorMessage(draft.error));
        this.deps.setStatus("Status: Draft fallback ready");
      } else {
        this.deps.setStatus("Status: Ready");
      }
    } catch (error) {
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Draft failed");
    } finally {
      this.deps.setLoading(false);
    }
  }

  private hasConversationContent(messages: ChatMessage[]): boolean {
    return messages.some(
      (message) =>
        message.content.trim() || message.diffPreview || message.actionReceipt
    );
  }
}
