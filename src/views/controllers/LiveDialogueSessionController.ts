import type { ChatMessage } from "../../types";
import {
  buildLiveDialogueActionSpeech,
  createLiveDialogueGreeting
} from "../../voice/liveDialogue";
import { trimTextForContext } from "../../text/textUtils";

export type LiveDialogueStopRecordingMode = "discard" | "insert" | "send";

export interface LiveDialogueSessionState {
  isActive: boolean;
  isRecording: boolean;
  isLoading: boolean;
  isTranscribingVoice: boolean;
  speakingMessageId: string | null;
  messages: ChatMessage[];
}

export interface LiveDialogueSessionControllerDeps {
  getState: () => LiveDialogueSessionState;
  setActive: (value: boolean) => void;
  setTurn: (value: boolean) => void;
  setError: (message: string | null) => void;
  setStatus: (message: string) => void;
  updateLiveDialogueButton: () => void;
  ensureInputStream: () => Promise<MediaStream | null>;
  warmAcknowledgements: () => void;
  warmAudioContext: () => void;
  syncBargeInMonitor: () => void;
  stopBargeInMonitor: () => void;
  stopBargeInAudioMonitor: () => void;
  stopAcknowledgement: () => void;
  stopInputStream: () => void;
  stopRecording: (mode: LiveDialogueStopRecordingMode) => void;
  cancelGeneration: () => void;
  stopSpeaking: () => void;
  renderMessages: () => void;
  speakMessageAndWait: (message: ChatMessage) => Promise<void>;
  startRecording: () => Promise<void>;
  pushMessage: (message: ChatMessage) => void;
  shouldInterruptSpeech: (isActive: boolean, isSpeaking: boolean) => boolean;
  now: () => number;
}

export class LiveDialogueSessionController {
  constructor(private readonly deps: LiveDialogueSessionControllerDeps) {}

  async toggleTurn(): Promise<void> {
    const state = this.deps.getState();

    if (state.isActive && state.isRecording) {
      this.deps.stopRecording("send");
      return;
    }

    if (
      this.deps.shouldInterruptSpeech(
        state.isActive,
        Boolean(state.speakingMessageId)
      )
    ) {
      this.deps.stopSpeaking();
      await this.startListening();
      return;
    }

    if (state.isActive && state.isLoading) {
      this.deps.cancelGeneration();
      await this.startListening();
      return;
    }

    if (state.isActive) {
      this.stopSession();
      return;
    }

    await this.startSession();
  }

  async startSession(): Promise<void> {
    if (this.deps.getState().isActive) {
      return;
    }

    this.deps.setActive(true);
    this.deps.setTurn(false);
    this.deps.setError(null);
    this.deps.setStatus("Status: Live Dialogue starting");
    this.deps.updateLiveDialogueButton();

    const inputStream = await this.deps.ensureInputStream();
    if (!inputStream) {
      this.deps.setActive(false);
      this.deps.setStatus("Status: Voice unavailable");
      this.deps.updateLiveDialogueButton();
      return;
    }

    this.deps.warmAcknowledgements();
    this.deps.warmAudioContext();
    this.deps.syncBargeInMonitor();

    const messageCount = this.deps.getState().messages.length;
    const greetingMessage: ChatMessage = {
      id: `${this.deps.now()}-${messageCount}-live-greeting`,
      role: "assistant",
      content: createLiveDialogueGreeting(),
      createdAt: this.deps.now()
    };

    this.deps.pushMessage(greetingMessage);
    this.deps.renderMessages();
    await this.continueWithMessage(greetingMessage);
  }

  stopSession(): void {
    const state = this.deps.getState();
    this.deps.setActive(false);
    this.deps.setTurn(false);
    this.deps.stopBargeInMonitor();
    this.deps.stopBargeInAudioMonitor();
    this.deps.stopAcknowledgement();

    if (state.isRecording) {
      this.deps.stopRecording("discard");
    }

    if (state.isLoading) {
      this.deps.cancelGeneration();
    }

    if (state.speakingMessageId) {
      this.deps.stopSpeaking();
    }

    this.deps.stopInputStream();
    this.deps.setStatus("Status: Live Dialogue stopped");
    this.deps.updateLiveDialogueButton();
  }

  async continueWithMessage(message: ChatMessage): Promise<void> {
    if (!this.deps.getState().isActive) {
      return;
    }

    await this.deps.speakMessageAndWait(message);
    await this.startListening();
  }

  async continueAfterLocalAction(): Promise<void> {
    const state = this.deps.getState();
    if (!state.isActive) {
      return;
    }

    const latestAssistant = [...state.messages]
      .reverse()
      .find((message) => message.role === "assistant");
    const speech = latestAssistant?.actionReceipt
      ? buildLiveDialogueActionSpeech(latestAssistant.actionReceipt)
      : latestAssistant?.content.trim()
        ? trimTextForContext(latestAssistant.content, 360)
        : "Готово. Что дальше?";
    const speechMessage: ChatMessage = {
      id: `${this.deps.now()}-${state.messages.length}-live-action`,
      role: "assistant",
      content: speech,
      createdAt: this.deps.now()
    };

    this.deps.pushMessage(speechMessage);
    this.deps.renderMessages();
    await this.continueWithMessage(speechMessage);
  }

  async startListening(): Promise<void> {
    const state = this.deps.getState();
    if (
      !state.isActive ||
      state.isRecording ||
      state.isLoading ||
      state.isTranscribingVoice ||
      state.speakingMessageId
    ) {
      return;
    }

    this.deps.setTurn(true);
    this.deps.stopBargeInMonitor();
    this.deps.updateLiveDialogueButton();
    this.deps.setStatus("Status: Live Dialogue listening");
    await this.deps.startRecording();
  }
}
