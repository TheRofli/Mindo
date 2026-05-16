export const THINKING_DOT_COUNT = 3;

export interface SendButtonStateInput {
  isLoading: boolean;
  isRecording: boolean;
  isTranscribingVoice: boolean;
}

export interface SendButtonViewState {
  disabled: boolean;
  isLoading: boolean;
  icon: string | null;
  ariaLabel: string;
}

export interface SendButtonRendererDeps {
  setIcon: (buttonEl: HTMLElement, iconName: string) => void;
}

export function getSendButtonViewState(
  state: SendButtonStateInput
): SendButtonViewState {
  if (state.isTranscribingVoice) {
    return {
      disabled: true,
      isLoading: true,
      icon: null,
      ariaLabel: "Transcribing voice"
    };
  }

  if (state.isLoading && !state.isRecording) {
    return {
      disabled: false,
      isLoading: true,
      icon: null,
      ariaLabel: "Cancel response"
    };
  }

  const label = state.isRecording ? "Send voice message" : "Send";

  return {
    disabled: false,
    isLoading: false,
    icon: "arrow-up",
    ariaLabel: label
  };
}

export class SendButtonRenderer {
  constructor(private readonly deps: SendButtonRendererDeps) {}

  refresh(buttonEl: HTMLButtonElement | null, state: SendButtonStateInput): void {
    if (!buttonEl) {
      return;
    }

    const viewState = getSendButtonViewState(state);

    buttonEl.empty();
    buttonEl.toggleClass("is-loading", viewState.isLoading);
    buttonEl.disabled = viewState.disabled;
    buttonEl.removeAttribute("title");
    buttonEl.setAttribute("aria-label", viewState.ariaLabel);

    if (viewState.icon) {
      this.deps.setIcon(buttonEl, viewState.icon);
      return;
    }

    this.renderThinkingDots(buttonEl);
  }

  private renderThinkingDots(parentEl: HTMLElement): void {
    const dotsEl = parentEl.createSpan({
      cls: "contex-agent__thinking-dots"
    });

    for (let index = 0; index < THINKING_DOT_COUNT; index += 1) {
      dotsEl.createSpan({
        cls: "contex-agent__thinking-dot"
      });
    }
  }
}
