import {
  getLiveDialogueFallbackText,
  getLiveDialogueOrbTitle,
  getLiveDialoguePhaseLabel,
  type LiveDialoguePhase,
  type LiveDialogueSurfaceState
} from "../voice/liveDialogueSurface";

export interface LiveDialogueSurfaceElements {
  rootEl: HTMLElement | null;
  surfaceEl: HTMLElement | null;
  transcriptEl: HTMLElement | null;
  orbEl: HTMLButtonElement | null;
  phaseEl: HTMLElement | null;
}

export interface LiveDialogueSurfaceLabels {
  startLabel: string;
  stopLabel: string;
  assistantLabel: string;
  userLabel: string;
}

export interface LiveDialogueTranscriptRow {
  role: "assistant" | "user";
  label: string;
  text: string;
  variant: "message" | "question" | "status";
}

export function getLiveDialogueRootClassNames(): string[] {
  return [
    "is-live-dialogue-surface-active",
    "is-live-dialogue-idle",
    "is-live-dialogue-listening",
    "is-live-dialogue-thinking",
    "is-live-dialogue-speaking",
    "is-live-dialogue-transcribing"
  ];
}

export function getLiveDialoguePhaseClassNames(): string[] {
  return [
    "is-idle",
    "is-listening",
    "is-thinking",
    "is-speaking",
    "is-transcribing"
  ];
}

export function getLiveDialogueTranscriptRows(
  state: LiveDialogueSurfaceState,
  labels: Pick<LiveDialogueSurfaceLabels, "assistantLabel" | "userLabel">
): LiveDialogueTranscriptRow[] {
  const transcript = state.transcript.length
    ? state.transcript
    : [
        {
          role: "assistant" as const,
          text: getLiveDialogueFallbackText(state.phase),
          variant: "status" as const
        }
      ];

  return transcript.map((item) => ({
    role: item.role,
    label: item.role === "assistant" ? labels.assistantLabel : labels.userLabel,
    text: item.text,
    variant: item.variant
  }));
}

export class LiveDialogueSurfaceRenderer {
  render(options: {
    elements: LiveDialogueSurfaceElements;
    state: LiveDialogueSurfaceState;
    labels: LiveDialogueSurfaceLabels;
    isSessionActive: boolean;
  }): void {
    const { elements, state, labels } = options;

    if (!elements.rootEl || !elements.surfaceEl || !elements.transcriptEl) {
      return;
    }

    getLiveDialogueRootClassNames().forEach((className) =>
      elements.rootEl?.removeClass(className)
    );
    state.rootClass
      .split(" ")
      .filter(Boolean)
      .forEach((className) => elements.rootEl?.addClass(className));

    elements.surfaceEl.toggleClass("is-visible", state.showVoiceSurface);
    elements.surfaceEl.setAttribute(
      "aria-hidden",
      state.showVoiceSurface ? "false" : "true"
    );

    elements.phaseEl?.setText(getLiveDialoguePhaseLabel(state.phase));
    this.refreshOrb({
      orbEl: elements.orbEl,
      phase: state.phase,
      isVisible: state.showVoiceSurface,
      isSessionActive: options.isSessionActive,
      labels
    });
    this.renderTranscript({
      transcriptEl: elements.transcriptEl,
      state,
      labels
    });
  }

  private refreshOrb(options: {
    orbEl: HTMLButtonElement | null;
    phase: LiveDialoguePhase;
    isVisible: boolean;
    isSessionActive: boolean;
    labels: Pick<LiveDialogueSurfaceLabels, "startLabel" | "stopLabel">;
  }): void {
    const { orbEl, phase, isVisible, isSessionActive, labels } = options;

    if (!orbEl) {
      return;
    }

    getLiveDialoguePhaseClassNames().forEach((className) =>
      orbEl.removeClass(className)
    );

    orbEl.toggleClass("is-active", isVisible);
    orbEl.addClass(`is-${phase}`);

    const title = getLiveDialogueOrbTitle({
      phase,
      isSessionActive,
      startLabel: labels.startLabel,
      stopLabel: labels.stopLabel
    });

    orbEl.removeAttribute("title");
    orbEl.setAttribute("aria-label", title);

    if (!isVisible) {
      orbEl.setCssProps({
        "--contex-live-scale": "1",
        "--contex-live-glow": "0"
      });
    }
  }

  private renderTranscript(options: {
    transcriptEl: HTMLElement;
    state: LiveDialogueSurfaceState;
    labels: Pick<LiveDialogueSurfaceLabels, "assistantLabel" | "userLabel">;
  }): void {
    const { transcriptEl, state, labels } = options;

    transcriptEl.empty();

    for (const item of getLiveDialogueTranscriptRows(state, labels)) {
      const itemEl = transcriptEl.createDiv({
        cls: [
          "contex-agent__live-transcript-item",
          `contex-agent__live-transcript-item--${item.role}`,
          `contex-agent__live-transcript-item--${item.variant}`
        ]
      });

      if (item.role === "assistant") {
        itemEl.createSpan({
          cls: "contex-agent__live-transcript-avatar",
          text: "M"
        });
      }

      const bubbleEl = itemEl.createDiv({
        cls: "contex-agent__live-transcript-bubble"
      });
      bubbleEl.createDiv({
        cls: "contex-agent__live-transcript-role",
        text: item.label
      });
      bubbleEl.createDiv({
        cls: "contex-agent__live-transcript-text",
        text: item.text
      });
    }

    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }
}
