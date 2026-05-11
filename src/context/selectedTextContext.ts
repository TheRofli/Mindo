import { MarkdownView, type App, type TFile } from "obsidian";
import type { SelectedTextContext } from "../types";

const MAX_SELECTED_TEXT_CONTEXT_CHARS = 8000;

export interface SelectedTextContextResult {
  context: SelectedTextContext | null;
  warning: string | null;
}

export function getSelectedTextContext(
  app: App,
  selectedTextOverride?: string | null
): SelectedTextContextResult {
  const editorSelection = selectedTextOverride
    ? null
    : getEditorSelection(app);
  const file = editorSelection?.file ?? getActiveMarkdownFile(app);

  if (!file) {
    return {
      context: null,
      warning: "Open a Markdown note before using selection actions."
    };
  }

  const selection =
    selectedTextOverride?.trim() ??
    editorSelection?.text ??
    getDomSelectionText() ??
    "";

  if (!selection) {
    return {
      context: null,
      warning: "Select text in the active note before using selection actions."
    };
  }

  const includedText = selection.slice(0, MAX_SELECTED_TEXT_CONTEXT_CHARS);
  const context: SelectedTextContext = {
    path: file.path,
    name: file.basename,
    text: includedText,
    isTruncated: selection.length > MAX_SELECTED_TEXT_CONTEXT_CHARS,
    originalLength: selection.length,
    includedLength: includedText.length
  };

  return {
    context,
    warning: context.isTruncated
      ? `Selected text context was truncated to ${context.includedLength} of ${context.originalLength} characters.`
      : null
  };
}

function getActiveMarkdownFile(app: App): TFile | null {
  const activeView = app.workspace.getActiveViewOfType(MarkdownView);

  if (activeView?.file) {
    return activeView.file;
  }

  const activeFile = app.workspace.getActiveFile();
  return activeFile?.extension === "md" ? activeFile : null;
}

function getEditorSelection(app: App): { file: TFile; text: string } | null {
  const leaves = app.workspace.getLeavesOfType("markdown");

  for (const leaf of leaves) {
    if (!(leaf.view instanceof MarkdownView) || !leaf.view.file) {
      continue;
    }

    const text = leaf.view.editor.getSelection().trim();

    if (text) {
      return {
        file: leaf.view.file,
        text
      };
    }
  }

  return null;
}

function getDomSelectionText(): string | null {
  const selection = window.getSelection();

  if (!selection || selection.isCollapsed) {
    return null;
  }

  if (
    isSelectionNodeIgnored(selection.anchorNode) ||
    isSelectionNodeIgnored(selection.focusNode)
  ) {
    return null;
  }

  const text = selection.toString().trim();
  return text || null;
}

function isSelectionNodeIgnored(node: Node | null): boolean {
  const element =
    node instanceof Element ? node : node?.parentElement ?? null;

  return Boolean(
    element?.closest(".contex-agent, .contex-agent__selection-toolbar")
  );
}
