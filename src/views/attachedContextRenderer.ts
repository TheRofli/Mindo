import type { LlmFileAttachment, VaultSearchResult } from "../types";
import { formatBytes } from "../attachments/fileAttachmentUtils";

export interface AttachedContextRendererDeps {
  setIcon: (element: HTMLElement, icon: string) => void;
  onClear: () => void;
}

export interface AttachedContextRenderInput {
  containerEl: HTMLElement | null;
  vaultResults: VaultSearchResult[] | null;
  files: LlmFileAttachment[];
}

export function getAttachedContextTitle(
  resultCount: number,
  fileCount: number
): string {
  return [
    resultCount
      ? `${resultCount} search result${resultCount === 1 ? "" : "s"}`
      : "",
    fileCount ? `${fileCount} file${fileCount === 1 ? "" : "s"}` : ""
  ]
    .filter(Boolean)
    .join(" + ");
}

export function getAttachedContextPaths(
  results: VaultSearchResult[],
  files: LlmFileAttachment[]
): string {
  return [
    ...results.slice(0, 5).map((result) => result.path),
    ...files
      .slice(0, 5)
      .map(
        (file) =>
          `${file.name} (${file.type || "unknown"}, ${formatBytes(file.size)})`
      )
  ].join("\n");
}

export function getPreviewableAttachedImages(
  files: LlmFileAttachment[]
): LlmFileAttachment[] {
  return files.filter((file) => file.dataUrl && file.type.startsWith("image/"));
}

export class AttachedContextRenderer {
  constructor(private readonly deps: AttachedContextRendererDeps) {}

  render(input: AttachedContextRenderInput): void {
    const { containerEl } = input;

    if (!containerEl) {
      return;
    }

    containerEl.empty();

    const results = input.vaultResults ?? [];
    const files = input.files;

    if (!results.length && !files.length) {
      containerEl.addClass("contex-agent__hidden");
      return;
    }

    containerEl.removeClass("contex-agent__hidden");
    const summaryEl = containerEl.createDiv({
      cls: "contex-agent__attached-context-summary"
    });
    summaryEl.createDiv({
      cls: "contex-agent__attached-context-title",
      text: getAttachedContextTitle(results.length, files.length)
    });
    summaryEl.createDiv({
      cls: "contex-agent__attached-context-paths",
      text: getAttachedContextPaths(results, files)
    });

    const previewableImages = getPreviewableAttachedImages(files);

    if (previewableImages.length) {
      const previewsEl = summaryEl.createDiv({
        cls: "contex-agent__attached-context-previews"
      });

      previewableImages.slice(0, 4).forEach((file) => {
        previewsEl.createEl("img", {
          cls: "contex-agent__attached-context-thumb",
          attr: {
            src: file.dataUrl ?? "",
            alt: file.name
          }
        });
      });
    }

    const clearButton = containerEl.createEl("button", {
      cls: "contex-agent__attached-context-clear",
      attr: {
        type: "button",
        "aria-label": "Clear attached context"
      }
    });
    this.deps.setIcon(clearButton, "x");
    clearButton.addEventListener("click", () => this.deps.onClear());
  }
}
