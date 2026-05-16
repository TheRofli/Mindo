import type {
  ModelMenuRefreshInput
} from "../modelMenuRenderer";
import type { LlmModelProfile } from "../../types";

export interface ModelMenuControllerDeps {
  getProfiles: () => LlmModelProfile[];
  getActiveProfile: () => LlmModelProfile;
  renderMenu: (parentEl: HTMLElement) => HTMLElement;
  refreshMenu: (input: ModelMenuRefreshInput) => void;
  toggleMenu: (menuEl: HTMLElement | null) => void;
  closeMenu: (menuEl: HTMLElement | null) => void;
}

export class ModelMenuController {
  private menuEl: HTMLElement | null = null;

  constructor(private readonly deps: ModelMenuControllerDeps) {}

  render(parentEl: HTMLElement): void {
    this.menuEl = this.deps.renderMenu(parentEl);
    this.refresh();
  }

  refresh(): void {
    this.deps.refreshMenu({
      menuEl: this.menuEl,
      profiles: this.deps.getProfiles(),
      activeProfile: this.deps.getActiveProfile()
    });
  }

  toggle(): void {
    this.refresh();
    this.deps.toggleMenu(this.menuEl);
  }

  close(): void {
    this.deps.closeMenu(this.menuEl);
  }

  contains(target: Node): boolean {
    return Boolean(this.menuEl?.contains(target));
  }
}
