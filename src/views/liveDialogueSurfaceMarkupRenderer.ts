import type { UiTextKey } from "../i18n";

export interface LiveDialogueSurfaceMarkupRefs {
  surfaceEl: HTMLElement;
  transcriptEl: HTMLElement;
  orbEl: HTMLButtonElement;
  phaseEl: HTMLElement;
}

export interface LiveDialogueSurfaceMarkupRendererDeps {
  t: (key: UiTextKey) => string;
  setIcon: (element: HTMLElement, icon: string) => void;
  onToggleLiveDialogue: () => void;
}

export function getLiveDialogueSurfaceAttributes(): Record<string, string> {
  return {
    "aria-hidden": "true",
    "aria-live": "polite"
  };
}

export function getLiveDialogueSurfaceDefaultPhase(): string {
  return "Live Dialogue";
}

export class LiveDialogueSurfaceMarkupRenderer {
  constructor(private readonly deps: LiveDialogueSurfaceMarkupRendererDeps) {}

  render(rootEl: HTMLElement): LiveDialogueSurfaceMarkupRefs {
    const surfaceEl = rootEl.createDiv({
      cls: "contex-agent__live-surface",
      attr: getLiveDialogueSurfaceAttributes()
    });
    const transcriptEl = surfaceEl.createDiv({
      cls: "contex-agent__live-transcript"
    });
    const orbWrapEl = surfaceEl.createDiv({
      cls: "contex-agent__live-orb-wrap"
    });
    const orbEl = orbWrapEl.createEl("button", {
      cls: "contex-agent__live-orb",
      attr: {
        type: "button",
        "aria-label": this.deps.t("startLiveDialogue")
      }
    });

    this.deps.setIcon(
      orbEl.createSpan({
        cls: "contex-agent__live-orb-icon"
      }),
      "sparkle"
    );
    orbEl.addEventListener("click", () => {
      this.deps.onToggleLiveDialogue();
    });

    const phaseEl = orbWrapEl.createDiv({
      cls: "contex-agent__live-phase",
      text: getLiveDialogueSurfaceDefaultPhase()
    });

    return {
      surfaceEl,
      transcriptEl,
      orbEl,
      phaseEl
    };
  }
}
