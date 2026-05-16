export type LiveBargeInDecision =
  | { kind: "ignore"; prompt?: string }
  | { kind: "stop"; prompt: string }
  | { kind: "prompt"; prompt: string };

export interface LiveBargeInHandlerControllerDeps {
  getIsHandling: () => boolean;
  setIsHandling: (value: boolean) => void;
  getLastHandledAt: () => number;
  setLastHandledAt: (value: number) => void;
  now: () => number;
  shouldRunSpeechMonitor: () => boolean;
  stopMonitor: () => void;
  syncMonitor: () => void;
  stopAcknowledgement: () => void;
  setStatus: (status: string) => void;
  setContextDetail: (message: string, isWarning: boolean) => void;
  getIsLoading: () => boolean;
  getSpeakingMessageId: () => string | null;
  cancelCurrentGeneration: () => void;
  stopSpeaking: () => void;
  renderMessages: () => void | Promise<void>;
  startLiveDialogueListening: () => Promise<void>;
  getAssistantText: () => string;
  getAcknowledgementText: () => string;
  resolveTranscript: (input: {
    transcript: string;
    assistantText: string;
    now: number;
    lastHandledAt: number;
  }) => LiveBargeInDecision;
  clearLiveTranscriptPreviewState: () => void;
  setInputValue: (value: string) => void;
  sendUserMessage: () => Promise<void>;
  trimPrompt: (value: string, maxLength: number) => string;
  getEvents?: () => string[];
}

export class LiveBargeInHandlerController {
  constructor(private readonly deps: LiveBargeInHandlerControllerDeps) {}

  async handleVoiceDetected(): Promise<void> {
    if (this.deps.getIsHandling() || !this.deps.shouldRunSpeechMonitor()) {
      return;
    }

    this.beginInterruption(this.deps.now());
    this.deps.stopAcknowledgement();
    this.deps.setStatus("Status: Interrupted");
    this.deps.setContextDetail("Live interruption: listening", false);
    this.stopAssistantWork();

    try {
      await this.deps.startLiveDialogueListening();
    } finally {
      this.finishInterruption();
    }
  }

  async handleTranscript(transcript: string): Promise<void> {
    const now = this.deps.now();
    const assistantText = [
      this.deps.getAssistantText(),
      this.deps.getAcknowledgementText()
    ]
      .filter(Boolean)
      .join(" ");

    const decision = this.deps.resolveTranscript({
      transcript,
      assistantText,
      now,
      lastHandledAt: this.deps.getLastHandledAt()
    });

    if (decision.kind === "ignore") {
      return;
    }

    this.beginInterruption(now);
    this.deps.setStatus("Status: Interrupted");
    this.deps.setContextDetail(
      `Live interruption: ${this.deps.trimPrompt(decision.prompt, 80)}`,
      false
    );
    this.stopAssistantWork();

    if (decision.kind === "stop") {
      this.deps.setStatus("Status: Live Dialogue interrupted");
      this.deps.setContextDetail("Live interruption: stopped", false);
      this.deps.clearLiveTranscriptPreviewState();
      this.finishInterruption();
      return;
    }

    this.deps.setInputValue(decision.prompt);

    try {
      await this.deps.sendUserMessage();
    } finally {
      this.finishInterruption();
    }
  }

  private beginInterruption(now: number): void {
    this.deps.setIsHandling(true);
    this.deps.setLastHandledAt(now);
    this.deps.stopMonitor();
  }

  private finishInterruption(): void {
    this.deps.setIsHandling(false);
    this.deps.syncMonitor();
  }

  private stopAssistantWork(): void {
    if (this.deps.getIsLoading()) {
      this.deps.cancelCurrentGeneration();
      return;
    }

    if (this.deps.getSpeakingMessageId()) {
      this.deps.stopSpeaking();
      void this.deps.renderMessages();
    }
  }
}
