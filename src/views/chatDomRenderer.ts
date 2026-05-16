import { MarkdownRenderer, type App, type Component } from "obsidian";
import type { ChatMessage } from "../types";
import { stripHiddenTtsHints } from "../voice/speechText";
import {
  formatWebResearchProviderText,
  formatWebResultsTitle,
  getWebResultMetaText
} from "./chatViewRenderer";

export interface RenderWebResearchMessageOptions {
  app: App;
  component: Component;
  sourcePath: string;
  isCreateDisabled: boolean;
  onCreateResearchNote: (message: ChatMessage) => void;
}

export async function renderWebResearchMessageElement(
  parentEl: HTMLElement,
  message: ChatMessage,
  options: RenderWebResearchMessageOptions
): Promise<void> {
  const query = message.webResearchQuery ?? "";
  const searchQuery = message.webSearchQuery ?? query;
  const results = message.webResearchResults ?? [];
  const rootEl = parentEl.createDiv({
    cls: "contex-agent__web-research"
  });

  if (message.content.trim()) {
    const answerEl = rootEl.createDiv({
      cls: "contex-agent__web-research-answer markdown-rendered"
    });
    await MarkdownRenderer.render(
      options.app,
      stripHiddenTtsHints(message.content),
      answerEl,
      options.sourcePath,
      options.component
    );
  }

  const actionsEl = rootEl.createDiv({
    cls: "contex-agent__web-research-actions"
  });
  actionsEl.createDiv({
    cls: "contex-agent__web-research-provider",
    text: formatWebResearchProviderText({
      provider: message.webResearchProvider,
      query,
      searchQuery,
      fallbackUsed: Boolean(message.webResearchFallbackReason)
    })
  });
  const createNoteButton = actionsEl.createEl("button", {
    cls: "mod-cta",
    text: "Create research note"
  });
  createNoteButton.disabled = options.isCreateDisabled || !results.length;
  createNoteButton.addEventListener("click", () => {
    options.onCreateResearchNote(message);
  });

  const resultsEl = rootEl.createDiv({
    cls: "contex-agent__web-results"
  });
  resultsEl.createDiv({
    cls: "contex-agent__web-results-title",
    text: formatWebResultsTitle(query, results.length)
  });

  results.forEach((result, index) => {
    const resultEl = resultsEl.createDiv({
      cls: "contex-agent__web-result"
    });
    const titleEl = resultEl.createEl("a", {
      cls: "contex-agent__web-result-title",
      text: `${index + 1}. ${result.title}`,
      href: result.url
    });
    titleEl.setAttribute("target", "_blank");
    titleEl.setAttribute("rel", "noopener noreferrer");
    resultEl.createDiv({
      cls: "contex-agent__web-result-url",
      text: result.url
    });

    const metaText = getWebResultMetaText(result);
    if (metaText) {
      resultEl.createDiv({
        cls: "contex-agent__web-result-meta",
        text: metaText
      });
    }
    if (result.qualityNotes?.length) {
      resultEl.createDiv({
        cls: "contex-agent__web-result-quality",
        text: result.qualityNotes.join(" | ")
      });
    }
    resultEl.createDiv({
      cls: "contex-agent__web-result-snippet",
      text: result.snippet || "No snippet returned."
    });
  });
}
