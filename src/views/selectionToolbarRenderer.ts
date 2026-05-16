import { SELECTED_TEXT_ACTIONS, type NoteAction } from "./noteActions";

export type SelectionToolbarActionRoute =
  | {
      kind: "diff";
      action: NoteAction;
      title: string;
      operationType: "improve-selection" | "expand-selection";
    }
  | {
      kind: "create-note";
      action: NoteAction;
    }
  | {
      kind: "prompt";
      prompt: string;
    };

export interface SelectionToolbarRendererDeps {
  setIcon: (element: HTMLElement, icon: string) => void;
  onDiffAction: (
    action: NoteAction,
    title: string,
    operationType: "improve-selection" | "expand-selection"
  ) => void;
  onCreateNote: (action: NoteAction) => void;
  onPromptAction: (prompt: string, action: NoteAction) => void;
}

export interface SelectionToolbarRefs {
  toolbarEl: HTMLElement;
  buttons: HTMLButtonElement[];
}

export function getSelectionToolbarActionRoute(
  action: NoteAction
): SelectionToolbarActionRoute {
  if (
    action.kind === "improve-selection" ||
    action.kind === "expand-selection"
  ) {
    return {
      kind: "diff",
      action,
      title:
        action.kind === "expand-selection"
          ? "Expand selection preview"
          : "Improve selection preview",
      operationType: action.kind
    };
  }

  if (action.kind === "create-note") {
    return {
      kind: "create-note",
      action
    };
  }

  return {
    kind: "prompt",
    prompt: action.prompt
  };
}

export class SelectionToolbarRenderer {
  constructor(private readonly deps: SelectionToolbarRendererDeps) {}

  render(): SelectionToolbarRefs {
    const toolbarEl = document.body.createDiv({
      cls: "contex-agent__selection-toolbar contex-agent__hidden"
    });
    const buttons: HTMLButtonElement[] = [];

    SELECTED_TEXT_ACTIONS.forEach((action) => {
      const button = toolbarEl.createEl("button", {
        cls: "contex-agent__selection-toolbar-button",
        attr: {
          type: "button",
          "aria-label": action.label
        }
      });

      if (action.icon) {
        this.deps.setIcon(button, action.icon);
      } else {
        button.setText(action.label);
      }

      button.addEventListener("mousedown", (event) => {
        event.preventDefault();
      });
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.routeAction(action);
      });
      buttons.push(button);
    });

    return {
      toolbarEl,
      buttons
    };
  }

  private routeAction(action: NoteAction): void {
    const route = getSelectionToolbarActionRoute(action);

    if (route.kind === "diff") {
      this.deps.onDiffAction(route.action, route.title, route.operationType);
      return;
    }

    if (route.kind === "create-note") {
      this.deps.onCreateNote(route.action);
      return;
    }

    this.deps.onPromptAction(route.prompt, action);
  }
}
