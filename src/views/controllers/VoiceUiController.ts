import type { UiTextKey } from "../../i18n";
import type { ChatMessage } from "../../types";
import {
  getLiveDialogueLatestAssistantText,
  getLiveDialogueLatestUserText,
  getLiveDialogueSurfaceState,
  type LiveDialogueSurfaceState
} from "../../voice/liveDialogueSurface";
import type {
  LiveDialogueSurfaceElements,
  LiveDialogueSurfaceLabels
} from "../liveDialogueSurfaceRenderer";
import type {
  LiveDialogueButtonStateInput,
  MicButtonStateInput
} from "../voiceButtonsRenderer";

export interface VoiceUiControllerElements extends LiveDialogueSurfaceElements {
  micButtonEl: HTMLButtonElement | null;
  liveDialogueButtonEl: HTMLButtonElement | null;
}

export interface VoiceUiControllerState {
  isRecording: boolean;
  isLiveDialogueSessionActive: boolean;
  isLoading: boolean;
  isTranscribingVoice: boolean;
  speakingMessageId: string | null;
  streamingMessageId: string | null;
  messages: ChatMessage[];
  inputValue: string;
}

export interface VoiceUiControllerDeps {
  getElements: () => VoiceUiControllerElements;
  getState: () => VoiceUiControllerState;
  t: (key: UiTextKey) => string;
  refreshMicButton: (
    buttonEl: HTMLButtonElement | null,
    state: MicButtonStateInput
  ) => void;
  refreshLiveDialogueButton: (
    buttonEl: HTMLButtonElement | null,
    state: LiveDialogueButtonStateInput
  ) => void;
  refreshSendButton: () => void;
  renderLiveDialogueSurface: (options: {
    elements: LiveDialogueSurfaceElements;
    state: LiveDialogueSurfaceState;
    labels: LiveDialogueSurfaceLabels;
    isSessionActive: boolean;
  }) => void;
}

export class VoiceUiController {
  constructor(private readonly deps: VoiceUiControllerDeps) {}

  updateMicButton(): void {
    const elements = this.deps.getElements();
    const state = this.deps.getState();

    this.deps.refreshMicButton(elements.micButtonEl, {
      isRecording: state.isRecording,
      recordVoiceLabel: this.deps.t("recordVoice"),
      stopRecordingLabel: this.deps.t("stopRecording")
    });

    this.updateLiveDialogueButton();
    this.deps.refreshSendButton();
  }

  updateLiveDialogueButton(): void {
    const elements = this.deps.getElements();
    const state = this.deps.getState();

    this.deps.refreshLiveDialogueButton(elements.liveDialogueButtonEl, {
      isLiveDialogueSessionActive: state.isLiveDialogueSessionActive,
      isRecording: state.isRecording,
      startLiveDialogueLabel: this.deps.t("startLiveDialogue"),
      stopLiveDialogueLabel: this.deps.t("stopLiveDialogue"),
      sendLiveDialogueTurnLabel: this.deps.t("sendLiveDialogueTurn")
    });

    this.refreshLiveDialogueSurface();
  }

  refreshLiveDialogueSurface(): void {
    const elements = this.deps.getElements();
    const state = this.deps.getState();
    const surfaceState = getLiveDialogueSurfaceState({
      isSessionActive: state.isLiveDialogueSessionActive,
      isRecording: state.isRecording,
      isLoading: state.isLoading,
      isTranscribing: state.isTranscribingVoice,
      isSpeaking: Boolean(state.speakingMessageId),
      latestUserText: getLiveDialogueLatestUserText({
        messages: state.messages,
        liveInput: state.inputValue,
        isRecording: state.isRecording
      }),
      latestAssistantText: getLiveDialogueLatestAssistantText({
        messages: state.messages,
        streamingMessageId: state.streamingMessageId
      }),
      messages: state.messages,
      liveInput: state.inputValue,
      streamingMessageId: state.streamingMessageId
    });

    this.deps.renderLiveDialogueSurface({
      elements: {
        rootEl: elements.rootEl,
        surfaceEl: elements.surfaceEl,
        transcriptEl: elements.transcriptEl,
        orbEl: elements.orbEl,
        phaseEl: elements.phaseEl
      },
      state: surfaceState,
      labels: {
        startLabel: this.deps.t("startLiveDialogue"),
        stopLabel: this.deps.t("stopLiveDialogue"),
        assistantLabel: "Mindo",
        userLabel: "You"
      },
      isSessionActive: state.isLiveDialogueSessionActive
    });
  }
}
