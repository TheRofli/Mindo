import type { UiTextKey } from "../i18n";
import type { ChatSession } from "../types";

export interface ChatSwitcherRendererDeps {
  t: (key: UiTextKey) => string;
  setIcon: (element: HTMLElement, icon: string) => void;
  registerOutsideClick: (
    pickerEl: HTMLElement,
    close: () => void
  ) => void;
  startNewChat: () => void;
  deleteCurrentChat: () => void;
  openChangeHistory: () => void;
  showContexCodeMenu: (event: MouseEvent) => void;
  showMoreActionsMenu: (event: MouseEvent) => void;
  switchChat: (sessionId: string) => void;
}

export interface ChatSwitcherRefs {
  button: HTMLButtonElement;
  menu: HTMLElement;
}

export function getActiveChatMenuLabel(
  sessions: readonly ChatSession[],
  activeChatId: string | null,
  fallback: string
): string {
  return sessions.find((session) => session.id === activeChatId)?.title ?? fallback;
}

export class ChatSwitcherRenderer {
  constructor(private readonly deps: ChatSwitcherRendererDeps) {}

  render(parentEl: HTMLElement): ChatSwitcherRefs {
    const switcherEl = parentEl.createDiv({
      cls: "contex-agent__chat-switcher"
    });

    const pickerEl = switcherEl.createDiv({
      cls: "contex-agent__chat-picker"
    });
    const button = pickerEl.createEl("button", {
      cls: "contex-agent__chat-menu-button",
      attr: {
        type: "button",
        "aria-label": this.deps.t("switchChat")
      }
    });
    const menu = pickerEl.createDiv({
      cls: "contex-agent__chat-menu contex-agent__hidden"
    });

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggle(menu);
    });
    this.deps.registerOutsideClick(pickerEl, () => this.close(menu));

    this.createIconButton(switcherEl, "message-square-plus", "newChat", () => {
      this.deps.startNewChat();
    });
    this.createIconButton(switcherEl, "trash-2", "clearCurrentChat", () => {
      this.deps.deleteCurrentChat();
    });
    this.createIconButton(switcherEl, "history", "changeHistory", () => {
      this.deps.openChangeHistory();
    });
    this.createIconButton(switcherEl, "list-todo", "contexCode", (event) => {
      this.deps.showContexCodeMenu(event);
    });
    this.createIconButton(switcherEl, "more-horizontal", "moreActions", (event) => {
      this.deps.showMoreActionsMenu(event);
    });

    return { button, menu };
  }

  refresh(
    refs: ChatSwitcherRefs | null,
    sessions: readonly ChatSession[],
    activeChatId: string | null
  ): void {
    if (!refs) {
      return;
    }

    refs.button.empty();
    refs.button.createSpan({
      cls: "contex-agent__chat-menu-label",
      text: getActiveChatMenuLabel(sessions, activeChatId, this.deps.t("newChat"))
    });
    this.deps.setIcon(refs.button.createSpan(), "chevron-down");

    refs.menu.empty();
    sessions.forEach((session) => {
      const itemEl = refs.menu.createEl("button", {
        cls: "contex-agent__chat-menu-item",
        text: session.title,
        attr: {
          type: "button"
        }
      });
      itemEl.toggleClass("is-active", session.id === activeChatId);
      itemEl.addEventListener("click", (event) => {
        event.stopPropagation();
        this.deps.switchChat(session.id);
        this.close(refs.menu);
      });
    });
  }

  toggle(menu: HTMLElement | null): void {
    if (!menu) {
      return;
    }

    const isOpen = !menu.classList.contains("contex-agent__hidden");
    menu.toggleClass("contex-agent__hidden", isOpen);
  }

  close(menu: HTMLElement | null): void {
    if (menu) {
      menu.addClass("contex-agent__hidden");
    }
  }

  private createIconButton(
    parentEl: HTMLElement,
    icon: string,
    titleKey: UiTextKey,
    onClick: (event: MouseEvent) => void
  ): HTMLButtonElement {
    const button = parentEl.createEl("button", {
      cls: "contex-agent__icon-button",
      attr: {
        type: "button",
        "aria-label": this.deps.t(titleKey)
      }
    });
    this.deps.setIcon(button, icon);
    button.addEventListener("click", onClick);
    return button;
  }
}
