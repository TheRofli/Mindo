import { StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet
} from "@codemirror/view";
import {
  MarkdownView,
  TFile,
  type App,
  type WorkspaceLeaf
} from "obsidian";
import type { TextDiffPreview } from "../types";

export const INLINE_DIFF_ACTION_EVENT = "contex-agent-inline-diff-action";

export type InlineDiffAction = "accept" | "change" | "reject" | "undo";

interface InlineDiffSpec {
  messageId: string;
  from: number;
  to: number;
  title: string;
  original: string;
  suggested: string;
}

interface InlineDiffActionDetail {
  messageId: string;
  action: InlineDiffAction;
}

const setInlineDiffEffect = StateEffect.define<InlineDiffSpec | null>();

export const inlineDiffExtension = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, transaction) {
    decorations = decorations.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (!effect.is(setInlineDiffEffect)) {
        continue;
      }

      const spec = effect.value;
      decorations = spec ? buildInlineDiffDecorations(spec) : Decoration.none;
    }

    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field)
});

export async function showInlineDiffPreview(
  app: App,
  messageId: string,
  diffPreview: TextDiffPreview
): Promise<boolean> {
  const view = await openMarkdownView(app, diffPreview.sourcePath);

  if (!view) {
    return false;
  }

  const editorView = getEditorView(view);

  if (!editorView) {
    return false;
  }

  const content = editorView.state.doc.toString();
  const range = findOccurrenceRange(
    content,
    diffPreview.original,
    diffPreview.originalOccurrenceIndex
  );

  if (!range) {
    return false;
  }

  editorView.dispatch({
    selection: {
      anchor: range.from,
      head: range.to
    },
    effects: [
      setInlineDiffEffect.of({
        messageId,
        from: range.from,
        to: range.to,
        title: diffPreview.title,
        original: diffPreview.original,
        suggested: diffPreview.suggested
      }),
      EditorView.scrollIntoView(range.from, {
        y: "center"
      })
    ]
  });
  editorView.focus();

  return true;
}

export function clearInlineDiffPreview(app: App, sourcePath?: string): void {
  app.workspace.getLeavesOfType("markdown").forEach((leaf) => {
    const view = leaf.view;

    if (!(view instanceof MarkdownView)) {
      return;
    }

    if (sourcePath && view.file?.path !== sourcePath) {
      return;
    }

    getEditorView(view)?.dispatch({
      effects: setInlineDiffEffect.of(null)
    });
  });
}

function buildInlineDiffDecorations(spec: InlineDiffSpec): DecorationSet {
  const decorations = [
    Decoration.mark({
      class: "contex-agent-inline-diff-original"
    }).range(spec.from, spec.to),
    Decoration.widget({
      block: true,
      side: 1,
      widget: new InlineDiffWidget(spec)
    }).range(spec.to)
  ];

  return Decoration.set(decorations, true);
}

class InlineDiffWidget extends WidgetType {
  constructor(private readonly spec: InlineDiffSpec) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const rootEl = document.createElement("div");
    rootEl.className = "contex-agent-inline-diff";
    rootEl.contentEditable = "false";

    const headerEl = rootEl.createDiv({
      cls: "contex-agent-inline-diff__header"
    });
    headerEl.createDiv({
      cls: "contex-agent-inline-diff__title",
      text: this.spec.title
    });

    const actionsEl = headerEl.createDiv({
      cls: "contex-agent-inline-diff__actions"
    });
    this.createActionButton(actionsEl, view, "Accept", "accept", true);
    this.createActionButton(actionsEl, view, "Change", "change", false);
    this.createActionButton(actionsEl, view, "Reject", "reject", false);

    const linesEl = rootEl.createDiv({
      cls: "contex-agent-inline-diff__lines"
    });

    linesEl.createDiv({
      cls: "contex-agent-inline-diff__line contex-agent-inline-diff__line--added",
      text: `+ ${this.spec.suggested}`
    });
    linesEl.createDiv({
      cls: "contex-agent-inline-diff__line contex-agent-inline-diff__line--removed",
      text: `- ${this.spec.original}`
    });

    return rootEl;
  }

  ignoreEvent(): boolean {
    return false;
  }

  eq(other: InlineDiffWidget): boolean {
    return (
      other.spec.messageId === this.spec.messageId &&
      other.spec.original === this.spec.original &&
      other.spec.suggested === this.spec.suggested
    );
  }

  private createActionButton(
    parentEl: HTMLElement,
    view: EditorView,
    label: string,
    action: InlineDiffAction,
    isPrimary: boolean
  ): void {
    const buttonEl = parentEl.createEl("button", {
      cls: isPrimary ? "mod-cta" : undefined,
      text: label
    });

    buttonEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      view.dom.dispatchEvent(
        new CustomEvent<InlineDiffActionDetail>(INLINE_DIFF_ACTION_EVENT, {
          bubbles: true,
          detail: {
            messageId: this.spec.messageId,
            action
          }
        })
      );
    });
  }
}

async function openMarkdownView(
  app: App,
  path: string
): Promise<MarkdownView | null> {
  const file = app.vault.getAbstractFileByPath(path);

  if (!(file instanceof TFile)) {
    return null;
  }

  const existingLeaf = app.workspace
    .getLeavesOfType("markdown")
    .find((leaf) => {
      return leaf.view instanceof MarkdownView && leaf.view.file?.path === path;
    });

  if (existingLeaf) {
    await app.workspace.revealLeaf(existingLeaf);
    return existingLeaf.view instanceof MarkdownView ? existingLeaf.view : null;
  }

  const activeView = app.workspace.getActiveViewOfType(MarkdownView);
  const targetLeaf: WorkspaceLeaf =
    activeView?.leaf ??
    app.workspace.getLeavesOfType("markdown")[0] ??
    app.workspace.getLeaf("tab");

  await targetLeaf.openFile(file, {
    active: true
  });
  await app.workspace.revealLeaf(targetLeaf);

  return targetLeaf.view instanceof MarkdownView ? targetLeaf.view : null;
}

function getEditorView(markdownView: MarkdownView): EditorView | null {
  const editor = markdownView.editor;

  if (!isRecord(editor) || !("cm" in editor)) {
    return null;
  }

  const cm = editor.cm;

  return cm instanceof EditorView ? cm : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function findOccurrenceRange(
  content: string,
  search: string,
  occurrenceIndex?: number
): { from: number; to: number } | null {
  if (!search) {
    return null;
  }

  if (typeof occurrenceIndex === "number" && occurrenceIndex >= 0) {
    const from = findNthOccurrence(content, search, occurrenceIndex);

    if (from !== -1) {
      return {
        from,
        to: from + search.length
      };
    }
  }

  const from = content.indexOf(search);

  return from === -1
    ? null
    : {
        from,
        to: from + search.length
      };
}

function findNthOccurrence(
  content: string,
  search: string,
  occurrenceIndex: number
): number {
  let from = -1;
  let cursor = 0;

  for (let index = 0; index <= occurrenceIndex; index += 1) {
    from = content.indexOf(search, cursor);

    if (from === -1) {
      return -1;
    }

    cursor = from + search.length;
  }

  return from;
}
