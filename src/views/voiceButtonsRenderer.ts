export interface VoiceButtonViewState {
  icon: string;
  className: string;
  isClassActive: boolean;
  ariaLabel: string;
}

export interface MicButtonStateInput {
  isRecording: boolean;
  recordVoiceLabel: string;
  stopRecordingLabel: string;
}

export interface LiveDialogueButtonStateInput {
  isLiveDialogueSessionActive: boolean;
  isRecording: boolean;
  startLiveDialogueLabel: string;
  stopLiveDialogueLabel: string;
  sendLiveDialogueTurnLabel: string;
}

export interface VoiceButtonsRendererDeps {
  setIcon: (buttonEl: HTMLElement, iconName: string) => void;
}

export function getMicButtonViewState(
  state: MicButtonStateInput
): VoiceButtonViewState {
  const label = state.isRecording
    ? state.stopRecordingLabel
    : state.recordVoiceLabel;

  return {
    icon: state.isRecording ? "square" : "mic",
    className: "is-recording",
    isClassActive: state.isRecording,
    ariaLabel: label
  };
}

export function getLiveDialogueButtonViewState(
  state: LiveDialogueButtonStateInput
): VoiceButtonViewState {
  const label = state.isLiveDialogueSessionActive
    ? state.isRecording
      ? state.sendLiveDialogueTurnLabel
      : state.stopLiveDialogueLabel
    : state.startLiveDialogueLabel;

  return {
    icon: "mindo",
    className: "is-live-dialogue-active",
    isClassActive: state.isLiveDialogueSessionActive,
    ariaLabel: label
  };
}

export class VoiceButtonsRenderer {
  constructor(private readonly deps: VoiceButtonsRendererDeps) {}

  refreshMicButton(
    buttonEl: HTMLButtonElement | null,
    state: MicButtonStateInput
  ): void {
    this.refreshButton(buttonEl, getMicButtonViewState(state));
  }

  refreshLiveDialogueButton(
    buttonEl: HTMLButtonElement | null,
    state: LiveDialogueButtonStateInput
  ): void {
    this.refreshButton(buttonEl, getLiveDialogueButtonViewState(state));
  }

  private refreshButton(
    buttonEl: HTMLButtonElement | null,
    state: VoiceButtonViewState
  ): void {
    if (!buttonEl) {
      return;
    }

    buttonEl.empty();
    this.deps.setIcon(buttonEl, state.icon);
    buttonEl.toggleClass(state.className, state.isClassActive);
    buttonEl.removeAttribute("title");
    buttonEl.setAttribute("aria-label", state.ariaLabel);
  }
}
