export interface SpeechPlaybackQueueLike {
  cancel(): void;
}

export interface SpeechPlaybackLifecycleControllerDeps {
  getSpeakingMessageId: () => string | null;
  setSpeakingMessageId: (messageId: string | null) => void;
  getStreamingQueue: () => SpeechPlaybackQueueLike | null;
  setStreamingQueue: (queue: SpeechPlaybackQueueLike | null) => void;
  stopAcknowledgement: () => void;
  stopBrowserSpeech: () => void;
  stopAudioPlayback: () => void;
  finishAudioPlayback: () => void;
  resolveCompletion: (messageId: string, completed: boolean) => void;
  setStatus: (status: string) => void;
  refreshSurface: () => void;
  syncBargeInMonitor: () => void;
  renderMessages: () => void;
}

export class SpeechPlaybackLifecycleController {
  constructor(
    private readonly deps: SpeechPlaybackLifecycleControllerDeps
  ) {}

  stopSpeaking(): void {
    const stoppedMessageId = this.deps.getSpeakingMessageId();

    this.deps.stopAcknowledgement();
    const queue = this.deps.getStreamingQueue();
    if (queue) {
      queue.cancel();
      this.deps.setStreamingQueue(null);
    }

    this.deps.stopBrowserSpeech();
    this.deps.stopAudioPlayback();
    this.deps.setSpeakingMessageId(null);
    this.deps.setStatus("Status: Ready");

    if (stoppedMessageId) {
      this.deps.resolveCompletion(stoppedMessageId, false);
    }

    this.deps.refreshSurface();
    this.deps.syncBargeInMonitor();
  }

  finishSpeaking(messageId: string): void {
    if (this.deps.getSpeakingMessageId() !== messageId) {
      return;
    }

    this.deps.finishAudioPlayback();
    this.deps.setStreamingQueue(null);
    this.deps.setSpeakingMessageId(null);
    this.deps.setStatus("Status: Ready");
    this.deps.resolveCompletion(messageId, true);
    this.deps.refreshSurface();
    this.deps.syncBargeInMonitor();
    this.deps.renderMessages();
  }
}
