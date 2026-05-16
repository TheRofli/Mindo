export interface ChatWorkspaceClassNames {
  suggestions: string;
  chat: string;
}

export interface ChatWorkspaceRefs {
  suggestionsEl: HTMLElement;
  chatEl: HTMLElement;
}

export interface ChatWorkspaceRendererDeps {
  onChatScroll: () => void;
}

export function getChatWorkspaceClassNames(): ChatWorkspaceClassNames {
  return {
    suggestions: "contex-agent__suggestions",
    chat: "contex-agent__chat"
  };
}

export function getChatWorkspaceAriaLabel(): string {
  return "Chat messages";
}

export class ChatWorkspaceRenderer {
  constructor(private readonly deps: ChatWorkspaceRendererDeps) {}

  render(rootEl: HTMLElement): ChatWorkspaceRefs {
    const classNames = getChatWorkspaceClassNames();
    const suggestionsEl = rootEl.createDiv({
      cls: classNames.suggestions
    });
    const chatEl = rootEl.createDiv({
      cls: classNames.chat,
      attr: {
        "aria-label": getChatWorkspaceAriaLabel()
      }
    });

    chatEl.addEventListener("scroll", () => {
      this.deps.onChatScroll();
    });

    return {
      suggestionsEl,
      chatEl
    };
  }
}
