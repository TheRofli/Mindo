import type { LlmModelProfile } from "../types";

export interface ModelMenuRendererDeps {
  onSelectProfile: (profile: LlmModelProfile) => void;
}

export interface ModelMenuRefreshInput {
  menuEl: HTMLElement | null;
  profiles: LlmModelProfile[];
  activeProfile: LlmModelProfile;
}

export function getModelProfileMenuItemTitle(profile: LlmModelProfile): string {
  return `${profile.model} | ${profile.baseUrl}`;
}

export function isModelMenuOpen(menuEl: HTMLElement | null): boolean {
  return Boolean(menuEl && !menuEl.classList.contains("contex-agent__hidden"));
}

export class ModelMenuRenderer {
  constructor(private readonly deps: ModelMenuRendererDeps) {}

  render(parentEl: HTMLElement): HTMLElement {
    const menuEl = parentEl.createDiv({
      cls: "contex-agent__model-menu"
    });
    this.close(menuEl);
    return menuEl;
  }

  refresh(input: ModelMenuRefreshInput): void {
    const { menuEl } = input;

    if (!menuEl) {
      return;
    }

    menuEl.empty();

    input.profiles.forEach((profile) => {
      const itemEl = menuEl.createEl("button", {
        cls: "contex-agent__model-menu-item",
        attr: {
          type: "button",
          "aria-label": getModelProfileMenuItemTitle(profile)
        }
      });

      itemEl.toggleClass("is-active", profile.id === input.activeProfile.id);
      itemEl.createSpan({
        cls: "contex-agent__model-menu-item-name",
        text: profile.name
      });
      itemEl.addEventListener("click", () => this.deps.onSelectProfile(profile));
    });
  }

  toggle(menuEl: HTMLElement | null): void {
    if (!menuEl) {
      return;
    }

    menuEl.toggleClass("contex-agent__hidden", isModelMenuOpen(menuEl));
  }

  close(menuEl: HTMLElement | null): void {
    menuEl?.addClass("contex-agent__hidden");
  }
}
