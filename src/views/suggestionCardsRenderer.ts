import { getActionText, type UiLanguage, type UiTextKey } from "../i18n";
import {
  NOTE_ACTIONS,
  getNoteActionId,
  type NoteAction
} from "./noteActions";

export interface SuggestionCardModel {
  id: string;
  action: NoteAction;
  label: string;
  description: string;
}

export interface SuggestionCardsRendererDeps {
  getUiLanguage: () => UiLanguage;
  t: (key: UiTextKey) => string;
  runNoteAction: (action: NoteAction) => void | Promise<void>;
  setIcon: (element: HTMLElement, icon: string) => void;
}

export interface SuggestionCardsRenderInput {
  suggestionsEl: HTMLElement | null;
  messages: readonly unknown[];
  noteActionButtons: HTMLButtonElement[];
  refreshConversationChrome: () => void;
}

export function getSuggestionCards(
  uiLanguage: UiLanguage
): SuggestionCardModel[] {
  return NOTE_ACTIONS.map((action) => {
    const id = getNoteActionId(action);
    const localizedAction = getActionText(uiLanguage, id);

    return {
      id,
      action,
      label: localizedAction.label,
      description: localizedAction.description
    };
  });
}

export class SuggestionCardsRenderer {
  constructor(private readonly deps: SuggestionCardsRendererDeps) {}

  render(input: SuggestionCardsRenderInput): HTMLButtonElement[] {
    const { suggestionsEl, messages } = input;

    if (!suggestionsEl) {
      return input.noteActionButtons;
    }

    input.refreshConversationChrome();
    const noteActionButtons = input.noteActionButtons.filter(
      (button) =>
        button.isConnected &&
        !button.classList.contains("contex-agent__suggestion-card")
    );

    suggestionsEl.empty();
    suggestionsEl.toggleClass("contex-agent__suggestions--hidden", messages.length > 0);

    if (messages.length > 0) {
      return noteActionButtons;
    }

    suggestionsEl.createDiv({
      cls: "contex-agent__suggestions-title",
      text: this.deps.t("suggestedPrompts")
    });
    const cardsEl = suggestionsEl.createDiv({
      cls: "contex-agent__suggestion-cards"
    });

    getSuggestionCards(this.deps.getUiLanguage()).forEach((card) => {
      const cardEl = cardsEl.createEl("button", {
        cls: "contex-agent__suggestion-card",
        attr: {
          type: "button"
        }
      });
      const textEl = cardEl.createDiv({
        cls: "contex-agent__suggestion-card-text"
      });
      textEl.createDiv({
        cls: "contex-agent__suggestion-card-title",
        text: card.label
      });
      textEl.createDiv({
        cls: "contex-agent__suggestion-card-desc",
        text: card.description
      });
      const iconEl = cardEl.createSpan({
        cls: "contex-agent__suggestion-card-icon"
      });
      this.deps.setIcon(iconEl, "plus-circle");
      cardEl.addEventListener("click", () => {
        void this.deps.runNoteAction(card.action);
      });
      noteActionButtons.push(cardEl);
    });

    return noteActionButtons;
  }
}
