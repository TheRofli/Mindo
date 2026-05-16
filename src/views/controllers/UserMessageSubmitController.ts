import { parseChatSlashCommand } from "../../chat/chatSlashCommand";
import { handleEarlyUserMessageWorkflow } from "../../chat/userMessageEarlyWorkflow";
import { buildUserMessageRequestContext } from "../../chat/userMessageRequestContext";
import type {
  ChatMessage,
  ContexSettings,
  CurrentNoteContext,
  LlmFileAttachment,
  LlmRequestContext,
  VaultSearchResult
} from "../../types";

export interface UserMessageSubmitControllerDeps {
  settings: ContexSettings;
  isLoading: () => boolean;
  getInputValue: () => string | undefined;
  clearInput: () => void;
  hasPendingContexCodeInterview: () => boolean;
  sendVaultSearch: (query: string) => Promise<void>;
  sendWebResearch: (query: string) => Promise<void>;
  sendSemanticVaultQuestion: (query: string) => Promise<void>;
  getAttachedFiles: () => LlmFileAttachment[];
  setAttachedFiles: (files: LlmFileAttachment[]) => void;
  getAttachedVaultResults: () => VaultSearchResult[] | null;
  setAttachedVaultResults: (results: VaultSearchResult[] | null) => void;
  renderAttachedContext: () => void;
  getMessages: () => ChatMessage[];
  createUserMessage: (
    content: string,
    index: number,
    attachments: LlmFileAttachment[] | null
  ) => ChatMessage;
  pushMessage: (message: ChatMessage) => void;
  setPendingUserMessage: (id: string | null, prompt: string | null) => void;
  setError: (message: string | null) => void;
  setStatus: (status: string) => void;
  setLoading: (loading: boolean) => void;
  renderOptimisticUserMessage: (message: ChatMessage) => void;
  renderMessages: () => Promise<void>;
  handlePendingContexCodeInterviewAnswer: (
    content: string
  ) => Promise<boolean>;
  handleLocalCommandText: (content: string) => Promise<boolean>;
  continueLiveDialogueAfterLocalAction: () => Promise<void>;
  hasActiveGenerationAbortController: () => boolean;
  setSuppressActionReceiptUserContent: (value: boolean) => void;
  useCurrentNote: () => boolean;
  useVaultSearch: () => boolean;
  readCurrentNoteContext: () => Promise<{
    context: CurrentNoteContext | null;
  }>;
  expandSemanticVaultQuery: (query: string) => Promise<string[]>;
  searchSemanticVault: (
    query: string,
    queryVariants: string[],
    limit: number
  ) => Promise<VaultSearchResult[]>;
  sendMessage: (
    content: string,
    context: LlmRequestContext | null,
    clearInput: boolean,
    options?: { userMessageAlreadyAdded?: boolean; liveDialogue?: boolean }
  ) => Promise<void>;
  getErrorMessage: (error: unknown) => string;
}

export class UserMessageSubmitController {
  constructor(private readonly deps: UserMessageSubmitControllerDeps) {}

  async sendUserMessage(options?: { liveDialogue?: boolean }): Promise<void> {
    if (this.deps.isLoading()) {
      return;
    }

    const content = this.deps.getInputValue()?.trim();

    if (!content) {
      return;
    }

    const slashCommand = parseChatSlashCommand(
      content,
      this.deps.hasPendingContexCodeInterview()
    );

    if (slashCommand?.kind === "vault-search") {
      await this.deps.sendVaultSearch(slashCommand.query);
      return;
    }

    if (slashCommand?.kind === "web-research") {
      await this.deps.sendWebResearch(slashCommand.query);
      return;
    }

    if (slashCommand?.kind === "semantic-vault") {
      await this.deps.sendSemanticVaultQuestion(slashCommand.query);
      return;
    }

    const outgoingAttachments = this.deps.getAttachedFiles().length
      ? [...this.deps.getAttachedFiles()]
      : null;
    const userMessage = this.deps.createUserMessage(
      content,
      this.deps.getMessages().length,
      outgoingAttachments
    );

    this.deps.pushMessage(userMessage);
    this.deps.setPendingUserMessage(userMessage.id, content);
    this.deps.clearInput();
    this.deps.setError(null);
    this.deps.setStatus("Status: Preparing context");
    this.deps.renderOptimisticUserMessage(userMessage);
    this.deps.setLoading(true);
    void this.deps.renderMessages();

    if (
      await handleEarlyUserMessageWorkflow({
        content,
        liveDialogue: Boolean(options?.liveDialogue),
        hasOutgoingAttachments: Boolean(outgoingAttachments),
        handlePendingContexCodeInterviewAnswer: (text) =>
          this.deps.handlePendingContexCodeInterviewAnswer(text),
        handleLocalCommandText: (text) =>
          this.deps.handleLocalCommandText(text),
        clearAttachedContext: () => this.clearAttachedContext(),
        continueLiveDialogueAfterLocalAction: () =>
          this.deps.continueLiveDialogueAfterLocalAction(),
        isLoading: () => this.deps.isLoading(),
        hasActiveGenerationAbortController: () =>
          this.deps.hasActiveGenerationAbortController(),
        setLoading: (loading) => this.deps.setLoading(loading),
        clearPendingUserMessage: () =>
          this.deps.setPendingUserMessage(null, null),
        setSuppressActionReceiptUserContent: (value) =>
          this.deps.setSuppressActionReceiptUserContent(value)
      })
    ) {
      return;
    }

    try {
      const requestContext = await buildUserMessageRequestContext({
        content,
        liveDialogue: options?.liveDialogue,
        useCurrentNote: this.deps.useCurrentNote(),
        useVaultSearch: this.deps.useVaultSearch(),
        outgoingAttachments,
        attachedVaultResults: this.deps.getAttachedVaultResults(),
        readCurrentNoteContext: () => this.deps.readCurrentNoteContext(),
        expandSemanticVaultQuery: (query) =>
          this.deps.expandSemanticVaultQuery(query),
        searchSemanticVault: (query, queryVariants, limit) =>
          this.deps.searchSemanticVault(query, queryVariants, limit)
      });

      await this.deps.sendMessage(
        content,
        requestContext.context,
        false,
        {
          userMessageAlreadyAdded: true,
          liveDialogue: options?.liveDialogue
        }
      );

      if (
        requestContext.usedAttachedVaultResults ||
        requestContext.usedAttachedFiles
      ) {
        this.clearAttachedContext();
      }
    } catch (error) {
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Error");
      this.deps.setLoading(false);
      void this.deps.renderMessages();
    }
  }

  private clearAttachedContext(): void {
    this.deps.setAttachedVaultResults(null);
    this.deps.setAttachedFiles([]);
    this.deps.renderAttachedContext();
  }
}
