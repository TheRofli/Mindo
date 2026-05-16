export class Notice {
  constructor(
    public readonly message?: string,
    public readonly timeout?: number
  ) {}
}

export class TFile {
  path = "";
  basename = "";
  extension = "";
  stat = {
    ctime: 0,
    mtime: 0,
    size: 0
  };
}

export class ItemView {
  constructor(public readonly leaf?: WorkspaceLeaf) {}
}

export class MarkdownView {
  file: TFile | null = null;
  leaf: WorkspaceLeaf | null = null;
  editor = {
    getValue: () => "",
    getSelection: () => "",
    replaceSelection: (_text: string) => undefined,
    setCursor: (_pos: unknown) => undefined,
    scrollIntoView: (_range: unknown, _center?: boolean) => undefined
  };
}

export class Modal {
  contentEl: HTMLElement | null = null;

  constructor(public readonly app?: App) {}

  open(): void {}

  close(): void {}

  onOpen(): void {}

  onClose(): void {}
}

export class Setting {
  constructor(public readonly containerEl?: HTMLElement) {}

  setName(_name: string): this {
    return this;
  }

  setDesc(_desc: string): this {
    return this;
  }

  addText(_callback: (component: unknown) => void): this {
    return this;
  }

  addTextArea(_callback: (component: unknown) => void): this {
    return this;
  }

  addDropdown(_callback: (component: unknown) => void): this {
    return this;
  }

  addToggle(_callback: (component: unknown) => void): this {
    return this;
  }

  addButton(_callback: (component: unknown) => void): this {
    return this;
  }
}

export class Menu {
  addItem(callback: (item: MenuItem) => void): this {
    callback(new MenuItem());
    return this;
  }

  addSeparator(): this {
    return this;
  }

  showAtMouseEvent(_event: MouseEvent): void {}
}

export class MenuItem {
  setTitle(_title: string): this {
    return this;
  }

  setIcon(_icon: string): this {
    return this;
  }

  onClick(_callback: () => void): this {
    return this;
  }
}

export class WorkspaceLeaf {
  view: unknown = null;

  async openFile(_file: TFile): Promise<void> {}
}

export class Plugin {
  app: App = {} as App;
  manifest = { dir: "" };

  async loadData(): Promise<unknown> {
    return null;
  }

  async saveData(_data: unknown): Promise<void> {}

  addCommand(_command: unknown): void {}

  registerView(_type: string, _viewCreator: unknown): void {}

  registerEvent(_eventRef: unknown): void {}

  registerDomEvent(
    _element: EventTarget,
    _type: string,
    _callback: EventListener
  ): void {}

  addSettingTab(_tab: unknown): void {}
}

export class PluginSettingTab {
  containerEl: HTMLElement | null = null;

  constructor(
    public readonly app?: App,
    public readonly plugin?: Plugin
  ) {}

  display(): void {}
}

export interface App {
  vault?: unknown;
  workspace?: unknown;
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/");
}

export function setIcon(_element: HTMLElement, _icon: string): void {}

export async function requestUrl(): Promise<never> {
  throw new Error("requestUrl is not available in tests");
}
