import type { App, TFile } from "obsidian";
import type { CurrentNoteContext } from "../types";

const MAX_CURRENT_NOTE_CONTEXT_CHARS = 12000;

export interface CurrentNoteContextResult {
  context: CurrentNoteContext | null;
  warning: string | null;
}

export async function getCurrentNoteContext(
  app: App
): Promise<CurrentNoteContextResult> {
  const file = app.workspace.getActiveFile();

  if (!file) {
    return {
      context: null,
      warning: "No active Markdown note found."
    };
  }

  if (file.extension !== "md") {
    return {
      context: null,
      warning: `Active file is not a Markdown note: ${file.path}`
    };
  }

  const content = await app.vault.cachedRead(file);
  const context = buildCurrentNoteContext(file, content);

  return {
    context,
    warning: context.isTruncated
      ? `Current note context uses first ${context.includedLength} of ${context.originalLength} characters to keep requests fast.`
      : null
  };
}

export function getCurrentNoteLabel(app: App): string | null {
  const file = app.workspace.getActiveFile();
  return file?.extension === "md" ? file.path : null;
}

function buildCurrentNoteContext(
  file: TFile,
  content: string
): CurrentNoteContext {
  const includedContent = content.slice(0, MAX_CURRENT_NOTE_CONTEXT_CHARS);

  return {
    path: file.path,
    name: file.basename,
    content: includedContent,
    isTruncated: content.length > MAX_CURRENT_NOTE_CONTEXT_CHARS,
    originalLength: content.length,
    includedLength: includedContent.length
  };
}
