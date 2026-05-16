interface AbortableGeneration {
  abort(): void;
}

interface PromptInputLike {
  disabled: boolean;
  value: string;
  focus(): void;
}

export interface GenerationCancelControllerDeps {
  isLoading: () => boolean;
  getActiveGenerationAbortController: () => AbortableGeneration | null;
  setActiveGenerationAbortController: (
    controller: AbortableGeneration | null
  ) => void;
  getStreamingMessageId: () => string | null;
  setStreamingMessageId: (messageId: string | null) => void;
  getPendingUserMessageId: () => string | null;
  setPendingUserMessageId: (messageId: string | null) => void;
  getPendingUserPrompt: () => string | null;
  setPendingUserPrompt: (prompt: string | null) => void;
  getInputEl: () => PromptInputLike | null;
  stopSpeaking: () => void;
  removeMessageById: (messageId: string) => void;
  setError: (message: string | null) => void;
  setStatus: (status: string) => void;
  setLoading: (isLoading: boolean) => void;
  renderMessages: () => void;
}

export class GenerationCancelController {
  constructor(private readonly deps: GenerationCancelControllerDeps) {}

  cancelCurrentGeneration(
    options: { restorePendingUser?: boolean } = {}
  ): boolean {
    if (
      !this.deps.isLoading() &&
      !this.deps.getActiveGenerationAbortController()
    ) {
      return false;
    }

    const restorePendingUser = options.restorePendingUser ?? true;
    this.deps.getActiveGenerationAbortController()?.abort();
    this.deps.setActiveGenerationAbortController(null);
    this.deps.stopSpeaking();

    const streamingMessageId = this.deps.getStreamingMessageId();
    if (streamingMessageId) {
      this.deps.removeMessageById(streamingMessageId);
      this.deps.setStreamingMessageId(null);
    }

    const pendingUserMessageId = this.deps.getPendingUserMessageId();
    if (restorePendingUser && pendingUserMessageId) {
      this.deps.removeMessageById(pendingUserMessageId);

      const inputEl = this.deps.getInputEl();
      const pendingPrompt = this.deps.getPendingUserPrompt();
      if (inputEl && pendingPrompt) {
        inputEl.disabled = false;
        inputEl.value = pendingPrompt;
        inputEl.focus();
      }
    }

    this.deps.setPendingUserMessageId(null);
    this.deps.setPendingUserPrompt(null);
    this.deps.setError(null);
    this.deps.setStatus("Status: Canceled");
    this.deps.setLoading(false);
    this.deps.renderMessages();
    return true;
  }
}
