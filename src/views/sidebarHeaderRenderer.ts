import type { UiTextKey } from "../i18n";

export interface SidebarLogoAsset {
  fileName: string;
  className: string;
  alt: string;
}

export interface SidebarMetaClassNames {
  sttStatus: string;
  contextStatus: string;
  contextDetail: string;
  status: string;
  error: string;
}

export interface SidebarHeaderRefs {
  headerEl: HTMLElement;
  modelEl: HTMLElement;
  visionEl: HTMLElement;
  sttStatusEl: HTMLElement;
  contextStatusEl: HTMLElement;
  contextDetailEl: HTMLElement;
  statusEl: HTMLElement;
  errorEl: HTMLElement;
}

export interface SidebarHeaderRendererDeps {
  t: (key: UiTextKey) => string;
  getAssetResourcePath: (fileName: string) => string;
}

export function getSidebarLogoAssets(alt: string): SidebarLogoAsset[] {
  return [
    {
      fileName: "assets/logo.png",
      className: "contex-agent__logo",
      alt
    }
  ];
}

export function getSidebarMetaClassNames(): SidebarMetaClassNames {
  return {
    sttStatus: "contex-agent__stt-status",
    contextStatus: "contex-agent__context",
    contextDetail: "contex-agent__context-detail",
    status: "contex-agent__status",
    error: "contex-agent__error"
  };
}

export class SidebarHeaderRenderer {
  constructor(private readonly deps: SidebarHeaderRendererDeps) {}

  render(rootEl: HTMLElement): SidebarHeaderRefs {
    const headerEl = rootEl.createDiv({ cls: "contex-agent__header" });
    const headerTopEl = headerEl.createDiv({
      cls: "contex-agent__header-top"
    });
    const brandEl = headerTopEl.createDiv({ cls: "contex-agent__brand" });

    for (const asset of getSidebarLogoAssets(this.deps.t("appName"))) {
      brandEl.createEl("img", {
        cls: asset.className,
        attr: {
          src: this.deps.getAssetResourcePath(asset.fileName),
          alt: asset.alt
        }
      });
    }

    const classNames = getSidebarMetaClassNames();
    const metaEl = headerEl.createDiv({ cls: "contex-agent__meta" });
    const modelEl = metaEl.createDiv();
    const visionEl = metaEl.createDiv();
    const sttStatusEl = metaEl.createDiv({ cls: classNames.sttStatus });
    const contextStatusEl = metaEl.createDiv({
      cls: classNames.contextStatus
    });
    const contextDetailEl = metaEl.createDiv({
      cls: classNames.contextDetail
    });
    const statusEl = metaEl.createDiv({ cls: classNames.status });
    const errorEl = headerEl.createDiv({ cls: classNames.error });

    return {
      headerEl,
      modelEl,
      visionEl,
      sttStatusEl,
      contextStatusEl,
      contextDetailEl,
      statusEl,
      errorEl
    };
  }
}
