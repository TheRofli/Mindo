import {
  annotateAssistantMessageFromContext
} from "../../chat/assistantMessageAnnotations";
import { attachAutoWebContextToRequest } from "../../chat/chatRequestContext";
import type {
  ChatMessage,
  ContexSettings,
  LlmRequestContext,
  TextDiffPreview,
  VaultSearchResult,
  WebSearchResult
} from "../../types";
import type {
  LlmResponseSpeechQueue
} from "../../chat/llmResponseRunner";
import type { AutoWebContext } from "../sidebarTypes";

export interface MessageSendOptions {
  diffPreviewOriginal?: string;
  diffPreviewTitle?: string;
  diffOperationType?: string;
  diffUserPrompt?: string;
  userMessageAlreadyAdded?: boolean;
  liveDialogue?: boolean;
}

export interface LiveSpeechQueue extends LlmResponseSpeechQueue {
  warm(): Promise<void>;
  finish(): Promise<void>;
  cancel(): void;
}

export interface RunAssistantResponseInput {
  settings: ContexSettings;
  requestMessages: ChatMessage[];
  requestContext?: LlmRequestContext | null;
  assistantMessage: ChatMessage;
  abortSignal: AbortSignal;
  speechQueue?: LlmResponseSpeechQueue | null;
  onToken: () => void;
  onStreamingFallback: () => void;
}

export interface WikiAutopilotRecord {
  userText: string;
  assistantText: string;
  sourcePaths?: string[];
  webSources?: WebSearchResult[];
}

export interface MessageSendControllerDeps {
  settings: ContexSettings;
  getMessages: () => ChatMessage[];
  clearInput: () => void;
  setPendingUserMessage: (id: string | null, prompt: string | null) => void;
  setStreamingMessageId: (id: string | null) => void;
  setActiveGenerationAbortController: (
    controller: AbortController | null
  ) => void;
  getActiveGenerationAbortController: () => AbortController | null;
  attachProjectMemoryContext: (
    context: LlmRequestContext | null
  ) => Promise<LlmRequestContext | null>;
  buildAutoWebContextForRequest: (
    content: string,
    context: LlmRequestContext | null
  ) => Promise<AutoWebContext | null>;
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  setError: (error: string | null) => void;
  renderMessages: () => Promise<void> | void;
  queueRenderMessages: () => void;
  runAssistantResponse: (input: RunAssistantResponseInput) => Promise<void>;
  createLiveStreamingSpeechQueue: (
    messageId: string
  ) => LiveSpeechQueue | null;
  clearLiveStreamingSpeechQueue?: (queue: LiveSpeechQueue) => void;
  playLiveDialogueAcknowledgement: (kind: "thinking") => Promise<void> | void;
  finishSpeaking: (messageId: string) => void;
  stopSpeaking: () => void;
  shouldStopSpeakingForMessage?: (messageId: string | null) => boolean;
  removeEmptyAssistantMessages: () => void;
  rememberVaultSearch: (
    query: string,
    results: VaultSearchResult[]
  ) => void;
  recordWikiAutopilotMemory: (
    record: WikiAutopilotRecord
  ) => Promise<void> | void;
  getDiffSourceContent: (path: string) => Promise<string>;
  showInlineDiffForMessage: (messageId: string) => Promise<void> | void;
  cleanReplacement: (text: string) => string;
  getUniqueOccurrenceIndex: (source: string, needle: string) => number;
  isGenerationCanceledError: (error: unknown) => boolean;
  isLiveDialogueSessionActive: () => boolean;
  startLiveDialogueListening: () => Promise<void>;
  continueLiveDialogueWithMessage: (message: ChatMessage) => Promise<void>;
  getErrorMessage: (error: unknown) => string;
}

export class MessageSendController {
  constructor(private readonly deps: MessageSendControllerDeps) {}

  async send(
    content: string | undefined,
    context: LlmRequestContext | null,
    clearInput = true,
    options: MessageSendOptions = {}
  ): Promise<void> {
    if (!content) {
      return;
    }

    const messages = this.deps.getMessages();

    if (!options.userMessageAlreadyAdded) {
      const userMessage: ChatMessage = {
        id: `${Date.now()}-${messages.length}`,
        role: "user",
        content,
        createdAt: Date.now(),
        attachments: context?.attachments?.length ? context.attachments : null
      };

      messages.push(userMessage);
      this.deps.setPendingUserMessage(userMessage.id, content);

      if (clearInput) {
        this.deps.clearInput();
      }

      this.deps.setError(null);
      await this.deps.renderMessages();
    } else {
      const pendingUserMessage = findLatestUserMessage(messages);
      this.deps.setPendingUserMessage(pendingUserMessage?.id ?? null, content);
    }

    this.deps.setLoading(true);

    const liveDialogueContext: LlmRequestContext | null = options.liveDialogue
      ? {
          ...(context ?? {}),
          liveDialogue: true
        }
      : context;
    const contextWithMemory = await this.deps.attachProjectMemoryContext(
      liveDialogueContext
    );
    const autoWebContext = await this.deps.buildAutoWebContextForRequest(
      content,
      contextWithMemory
    );
    const requestContext = attachAutoWebContextToRequest(
      contextWithMemory,
      autoWebContext
    );
    const abortController = new AbortController();
    this.deps.setActiveGenerationAbortController(abortController);

    let liveAssistantMessage: ChatMessage | null = null;
    let shouldContinueLiveDialogue = false;
    let liveSpeechQueue: LiveSpeechQueue | null = null;
    let usedLiveStreamingSpeech = false;
    let liveAssistantMessageId: string | null = null;

    try {
      const requestMessages = [...messages];
      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-${messages.length}`,
        role: "assistant",
        content: "",
        createdAt: Date.now()
      };

      messages.push(assistantMessage);
      liveAssistantMessageId = assistantMessage.id;
      this.deps.setStreamingMessageId(assistantMessage.id);
      await this.deps.renderMessages();

      if (options.liveDialogue) {
        this.deps.setStatus("Status: Thinking");
        liveSpeechQueue = this.deps.createLiveStreamingSpeechQueue(
          assistantMessage.id
        );
        usedLiveStreamingSpeech = Boolean(liveSpeechQueue);
        await liveSpeechQueue?.warm();
        void this.deps.playLiveDialogueAcknowledgement("thinking");
      }

      await this.deps.runAssistantResponse({
        settings: this.deps.settings,
        requestMessages,
        requestContext,
        assistantMessage,
        abortSignal: abortController.signal,
        speechQueue: liveSpeechQueue,
        onToken: () => this.deps.queueRenderMessages(),
        onStreamingFallback: () =>
          this.deps.setStatus(
            "Status: Streaming unavailable, waiting for LLM"
          )
      });

      if (options.diffPreviewOriginal) {
        await this.attachDiffPreview({
          assistantMessage,
          requestContext,
          content,
          options
        });
      }

      const annotationResult = annotateAssistantMessageFromContext(
        assistantMessage,
        requestContext,
        content
      );

      if (annotationResult.rememberVaultSearch) {
        this.deps.rememberVaultSearch(
          annotationResult.rememberVaultSearch.query,
          annotationResult.rememberVaultSearch.results
        );
      }

      void this.deps.recordWikiAutopilotMemory({
        userText: content,
        assistantText: assistantMessage.content,
        sourcePaths: requestContext?.vaultResults?.map((source) => source.path),
        webSources: requestContext?.webResults ?? undefined
      });

      if (liveSpeechQueue) {
        await liveSpeechQueue.finish();
        this.deps.clearLiveStreamingSpeechQueue?.(liveSpeechQueue);
        this.deps.finishSpeaking(assistantMessage.id);
      }

      this.deps.setStreamingMessageId(null);
      this.deps.setStatus("Status: Ready");
      liveAssistantMessage = assistantMessage;
      shouldContinueLiveDialogue = Boolean(options.liveDialogue);
    } catch (error) {
      if (liveSpeechQueue) {
        liveSpeechQueue.cancel();
        this.deps.clearLiveStreamingSpeechQueue?.(liveSpeechQueue);
      }

      if (
        this.deps.shouldStopSpeakingForMessage?.(liveAssistantMessageId) ??
        Boolean(liveAssistantMessageId)
      ) {
        this.deps.stopSpeaking();
      }

      this.deps.setStreamingMessageId(null);
      this.deps.removeEmptyAssistantMessages();

      if (this.deps.isGenerationCanceledError(error)) {
        this.deps.setError(null);
        this.deps.setStatus("Status: Canceled");
      } else {
        this.deps.setError(this.deps.getErrorMessage(error));
        this.deps.setStatus("Status: Error");
      }
    } finally {
      const isCurrentGeneration =
        this.deps.getActiveGenerationAbortController() === abortController;

      if (isCurrentGeneration) {
        this.deps.setActiveGenerationAbortController(null);
        this.deps.setPendingUserMessage(null, null);
        this.deps.setLoading(false);
        await this.deps.renderMessages();
      }

      if (
        isCurrentGeneration &&
        shouldContinueLiveDialogue &&
        liveAssistantMessage &&
        this.deps.isLiveDialogueSessionActive()
      ) {
        if (usedLiveStreamingSpeech) {
          await this.deps.startLiveDialogueListening();
        } else {
          await this.deps.continueLiveDialogueWithMessage(liveAssistantMessage);
        }
      }
    }
  }

  private async attachDiffPreview({
    assistantMessage,
    requestContext,
    content,
    options
  }: {
    assistantMessage: ChatMessage;
    requestContext: LlmRequestContext | null;
    content: string;
    options: MessageSendOptions;
  }): Promise<void> {
    if (!options.diffPreviewOriginal) {
      return;
    }

    assistantMessage.content = this.deps.cleanReplacement(
      assistantMessage.content
    );
    const sourcePath = requestContext?.selectedText?.path ?? "";
    const sourceContent = sourcePath
      ? await this.deps.getDiffSourceContent(sourcePath)
      : "";
    assistantMessage.diffPreview = {
      title: options.diffPreviewTitle ?? "Improve selection preview",
      sourcePath,
      originalOccurrenceIndex: this.deps.getUniqueOccurrenceIndex(
        sourceContent,
        options.diffPreviewOriginal
      ),
      original: options.diffPreviewOriginal,
      suggested: assistantMessage.content,
      status: "pending",
      operationType: options.diffOperationType ?? "improve-selection",
      userPrompt: options.diffUserPrompt ?? content
    } satisfies TextDiffPreview;
    void this.deps.showInlineDiffForMessage(assistantMessage.id);
  }
}

function findLatestUserMessage(messages: ChatMessage[]): ChatMessage | null {
  return (
    [...messages].reverse().find((message) => message.role === "user") ?? null
  );
}
