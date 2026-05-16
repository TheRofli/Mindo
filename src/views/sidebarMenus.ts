import type { UiTextKey } from "../i18n";

export type MoreActionsMenuId =
  | "improve-prompt"
  | "turn-chat-into-note"
  | "research-web"
  | "semantic-vault-search"
  | "check-health"
  | "diagnostics";

export type ContexCodeMenuId =
  | "create-code-plan"
  | "prepare-code-task-packet"
  | "mark-code-task-done"
  | "sync-code-plan";

export interface SidebarMenuItem<TId extends string> {
  id: TId;
  title: string;
  icon: string;
}

export interface SidebarMenusRendererDeps {
  createMenu: () => SidebarMenuLike;
  t: (key: UiTextKey) => string;
  improveCurrentPrompt: () => void;
  saveCurrentChatAsNote: () => void;
  focusWebResearch: () => void;
  focusSemanticVaultSearch: () => void;
  checkSystemHealth: () => void;
  openDiagnostics: () => void;
  createContexCodePlan: () => void;
  prepareContexCodeTaskPacket: () => void;
  markContexCodeTaskDone: () => void;
  syncContexCodePlan: () => void;
}

export interface SidebarMenuLike {
  addItem(callback: (item: SidebarMenuItemLike) => void): void;
  showAtMouseEvent(event: MouseEvent): void;
}

export interface SidebarMenuItemLike {
  setTitle(title: string): SidebarMenuItemLike;
  setIcon(icon: string): SidebarMenuItemLike;
  onClick(callback: () => void): SidebarMenuItemLike;
}

const MORE_ACTIONS_MENU_DEFINITIONS: Array<{
  id: MoreActionsMenuId;
  titleKey: UiTextKey;
  icon: string;
}> = [
  {
    id: "improve-prompt",
    titleKey: "improvePrompt",
    icon: "wand-sparkles"
  },
  {
    id: "turn-chat-into-note",
    titleKey: "turnChatIntoNote",
    icon: "file-plus-2"
  },
  {
    id: "research-web",
    titleKey: "researchWeb",
    icon: "globe"
  },
  {
    id: "semantic-vault-search",
    titleKey: "semanticVaultSearch",
    icon: "brain"
  },
  {
    id: "check-health",
    titleKey: "checkHealth",
    icon: "refresh-cw"
  },
  {
    id: "diagnostics",
    titleKey: "diagnostics",
    icon: "activity"
  }
];

const CONTEX_CODE_MENU_DEFINITIONS: Array<{
  id: ContexCodeMenuId;
  titleKey: UiTextKey;
  icon: string;
}> = [
  {
    id: "create-code-plan",
    titleKey: "createCodePlan",
    icon: "list-todo"
  },
  {
    id: "prepare-code-task-packet",
    titleKey: "prepareCodeTaskPacket",
    icon: "clipboard-list"
  },
  {
    id: "mark-code-task-done",
    titleKey: "markCodeTaskDone",
    icon: "check-check"
  },
  {
    id: "sync-code-plan",
    titleKey: "syncCodePlan",
    icon: "refresh-cw"
  }
];

export function getMoreActionsMenuItems(
  t: (key: UiTextKey) => string
): Array<SidebarMenuItem<MoreActionsMenuId>> {
  return MORE_ACTIONS_MENU_DEFINITIONS.map((definition) => ({
    id: definition.id,
    title: t(definition.titleKey),
    icon: definition.icon
  }));
}

export function getContexCodeMenuItems(
  t: (key: UiTextKey) => string
): Array<SidebarMenuItem<ContexCodeMenuId>> {
  return CONTEX_CODE_MENU_DEFINITIONS.map((definition) => ({
    id: definition.id,
    title: t(definition.titleKey),
    icon: definition.icon
  }));
}

export class SidebarMenusRenderer {
  constructor(private readonly deps: SidebarMenusRendererDeps) {}

  showMoreActionsMenu(event: MouseEvent): void {
    this.showMenu(
      event,
      getMoreActionsMenuItems(this.deps.t),
      (id) => this.runMoreActionsMenuItem(id)
    );
  }

  showContexCodeMenu(event: MouseEvent): void {
    this.showMenu(
      event,
      getContexCodeMenuItems(this.deps.t),
      (id) => this.runContexCodeMenuItem(id)
    );
  }

  private showMenu<TId extends string>(
    event: MouseEvent,
    items: Array<SidebarMenuItem<TId>>,
    onClick: (id: TId) => void
  ): void {
    const menu = this.deps.createMenu();

    items.forEach((definition) => {
      menu.addItem((item) => {
        item
          .setTitle(definition.title)
          .setIcon(definition.icon)
          .onClick(() => onClick(definition.id));
      });
    });

    menu.showAtMouseEvent(event);
  }

  private runMoreActionsMenuItem(id: MoreActionsMenuId): void {
    if (id === "improve-prompt") {
      this.deps.improveCurrentPrompt();
      return;
    }

    if (id === "turn-chat-into-note") {
      this.deps.saveCurrentChatAsNote();
      return;
    }

    if (id === "research-web") {
      this.deps.focusWebResearch();
      return;
    }

    if (id === "semantic-vault-search") {
      this.deps.focusSemanticVaultSearch();
      return;
    }

    if (id === "check-health") {
      this.deps.checkSystemHealth();
      return;
    }

    this.deps.openDiagnostics();
  }

  private runContexCodeMenuItem(id: ContexCodeMenuId): void {
    if (id === "create-code-plan") {
      this.deps.createContexCodePlan();
      return;
    }

    if (id === "prepare-code-task-packet") {
      this.deps.prepareContexCodeTaskPacket();
      return;
    }

    if (id === "mark-code-task-done") {
      this.deps.markContexCodeTaskDone();
      return;
    }

    this.deps.syncContexCodePlan();
  }
}
