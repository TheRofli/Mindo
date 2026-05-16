import { formatActionReceiptStatus } from "../chat/chatMessages";
import type {
  ActionReceipt,
  ChatMessage,
  VaultSourceSection,
  VaultSearchResult,
  WebSearchResult
} from "../types";

export type ChatMessageRenderKind =
  | "typing"
  | "web-research"
  | "vault-search"
  | "diff-preview"
  | "action-receipt"
  | "assistant-markdown"
  | "plain";

export interface ChatRenderState {
  isLoading?: boolean;
  streamingMessageId?: string | null;
}

export function getChatMessageClassNames(message: ChatMessage): string[] {
  const messageClasses = [
    "contex-agent__message",
    `contex-agent__message--${message.role}`
  ];

  if (message.actionReceipt) {
    messageClasses.push("contex-agent__message--receipt");
  }

  if (message.sources?.length || message.webSources?.length) {
    messageClasses.push("contex-agent__message--with-sources");
  }

  return messageClasses;
}

export function formatChatMessageRoleLabel(
  role: ChatMessage["role"]
): string {
  if (role === "assistant") {
    return "Mindo";
  }

  if (role === "user") {
    return "You";
  }

  return role;
}

export function getChatMessageRenderKind(
  message: ChatMessage,
  state: ChatRenderState
): ChatMessageRenderKind {
  if (
    message.role === "assistant" &&
    state.isLoading &&
    message.id === state.streamingMessageId &&
    !message.content.trim()
  ) {
    return "typing";
  }

  if (message.webResearchResults) {
    return "web-research";
  }

  if (message.vaultSearchResults) {
    return "vault-search";
  }

  if (message.diffPreview) {
    return "diff-preview";
  }

  if (message.actionReceipt) {
    return "action-receipt";
  }

  if (message.role === "assistant" && message.content.trim()) {
    return "assistant-markdown";
  }

  return "plain";
}

export function getVisibleSources<T extends VaultSearchResult | WebSearchResult>(
  sources: T[],
  maxVisible = 2
): T[] {
  return sources.slice(0, maxVisible);
}

export function formatCollapsedSourceLabel(
  count: number,
  uiLanguage: "en" | "ru",
  kind: "vault" | "web" = "vault"
): string {
  const prefix = kind === "web" ? "web-" : "";

  if (uiLanguage === "ru") {
    const noun = count === 1 ? "\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a" : "\u0438\u0441\u0442\u043e\u0447\u043d\u0438\u043a\u0430";
    return `${count} ${prefix}${noun}`;
  }

  const noun = count === 1 ? "source" : "sources";
  return `${count} ${kind === "web" ? "web " : ""}${noun}`;
}

export function formatVaultSearchTitle(query: string, resultCount: number): string {
  return resultCount
    ? `Search results for "${query}"`
    : `No results for "${query}"`;
}

export function formatVaultSearchResultScoreText(
  result: VaultSearchResult
): string {
  return [
    `Score: ${result.score}`,
    result.matches?.length ? `Matches: ${result.matches.join(", ")}` : ""
  ]
    .filter(Boolean)
    .join(" | ");
}

export interface WebResearchProviderTextInput {
  provider?: string | null;
  query: string;
  searchQuery: string;
  fallbackUsed?: boolean;
}

export function formatWebResearchProviderText(
  input: WebResearchProviderTextInput
): string {
  return [
    input.provider ? `Provider: ${input.provider}` : "",
    input.searchQuery && input.searchQuery !== input.query
      ? `Search: ${input.searchQuery}`
      : "",
    input.fallbackUsed ? "Fallback used" : ""
  ]
    .filter(Boolean)
    .join(" | ");
}

export function formatWebResultsTitle(query: string, resultCount: number): string {
  return resultCount
    ? `Web sources for "${query}"`
    : `No web sources for "${query}"`;
}

export function getWebResultMetaText(result: WebSearchResult): string {
  return [
    result.source,
    result.sourceType ? `Type: ${result.sourceType}` : "",
    result.publishedDate,
    result.freshnessHint ? `Date: ${result.freshnessHint}` : ""
  ]
    .filter(Boolean)
    .join(" | ");
}

export interface ChatScrollAfterRenderInput {
  shouldStickToBottom: boolean;
  previousScrollTop: number;
  scrollHeight: number;
}

export interface ChatScrollAfterRenderResult {
  nextScrollTop: number;
  shouldAutoScrollChat: boolean;
}

export function resolveChatScrollAfterRender(
  input: ChatScrollAfterRenderInput
): ChatScrollAfterRenderResult {
  if (input.shouldStickToBottom) {
    return {
      nextScrollTop: input.scrollHeight,
      shouldAutoScrollChat: true
    };
  }

  return {
    nextScrollTop: input.previousScrollTop,
    shouldAutoScrollChat: false
  };
}

export interface RenderTypingIndicatorOptions {
  onCancel: () => void;
}

export function renderTypingIndicatorElement(
  parentEl: HTMLElement,
  options: RenderTypingIndicatorOptions
): void {
  const indicatorEl = parentEl.createDiv({
    cls: "contex-agent__typing-indicator",
    attr: {
      "aria-label": "Assistant is thinking"
    }
  });
  indicatorEl.createSpan({
    text: "Assistant"
  });

  const cancelButton = indicatorEl.createEl("button", {
    cls: "contex-agent__typing-cancel",
    attr: {
      type: "button",
      "aria-label": "Cancel response"
    }
  });
  cancelButton.addEventListener("click", options.onCancel);

  const dotsEl = cancelButton.createSpan({
    cls: "contex-agent__thinking-dots"
  });

  for (let index = 0; index < 3; index += 1) {
    dotsEl.createSpan({
      cls: "contex-agent__thinking-dot"
    });
  }
}

export interface RenderActionReceiptOptions {
  onOpenPath: (path: string) => void;
}

export function renderActionReceiptElement(
  parentEl: HTMLElement,
  receipt: ActionReceipt,
  options: RenderActionReceiptOptions
): void {
  const receiptEl = parentEl.createDiv({
    cls: [
      "contex-agent__action-receipt",
      `contex-agent__action-receipt--${receipt.status}`
    ]
  });
  receiptEl.createSpan({
    cls: "contex-agent__action-receipt-status",
    text: formatActionReceiptStatus(receipt.status)
  });
  receiptEl.createSpan({
    cls: "contex-agent__action-receipt-label",
    text: receipt.label
  });

  if (receipt.detail) {
    receiptEl.createSpan({
      cls: "contex-agent__action-receipt-detail",
      text: receipt.detail
    });
  }

  if (receipt.path) {
    const openButton = receiptEl.createEl("button", {
      text: "Open"
    });
    openButton.addEventListener("click", () => {
      options.onOpenPath(receipt.path ?? "");
    });
  }
}

export interface RenderVaultSourcesOptions {
  uiLanguage: "en" | "ru";
  onOpenPath: (path: string) => void;
}

export function renderVaultSourcesElement(
  parentEl: HTMLElement,
  sources: VaultSearchResult[],
  _sections: VaultSourceSection[] = [],
  options: RenderVaultSourcesOptions
): void {
  const visibleSources = getVisibleSources(sources);

  if (!visibleSources.length) {
    return;
  }

  const sourcesEl = parentEl.createEl("details", {
    cls: "contex-agent__answer-sources"
  });
  sourcesEl.createEl("summary", {
    cls: "contex-agent__answer-sources-title",
    text: formatCollapsedSourceLabel(sources.length, options.uiLanguage)
  });

  visibleSources.forEach((source) => {
    const sourceEl = sourcesEl.createDiv({
      cls: "contex-agent__answer-source"
    });
    const headerEl = sourceEl.createDiv({
      cls: "contex-agent__answer-source-header"
    });
    headerEl.createDiv({
      cls: "contex-agent__answer-source-path",
      text: source.path
    });
    const openButton = headerEl.createEl("button", {
      text: "Open"
    });
    openButton.addEventListener("click", () => {
      options.onOpenPath(source.path);
    });
  });
}

export interface RenderWebSourcesOptions {
  uiLanguage: "en" | "ru";
}

export function renderWebSourcesElement(
  parentEl: HTMLElement,
  sources: WebSearchResult[],
  options: RenderWebSourcesOptions
): void {
  const visibleSources = getVisibleSources(sources);

  if (!visibleSources.length) {
    return;
  }

  const sourcesEl = parentEl.createEl("details", {
    cls: "contex-agent__inline-web-sources"
  });
  sourcesEl.createEl("summary", {
    cls: "contex-agent__inline-web-sources-title",
    text: formatCollapsedSourceLabel(sources.length, options.uiLanguage, "web")
  });

  visibleSources.forEach((source, index) => {
    const sourceEl = sourcesEl.createDiv({
      cls: "contex-agent__inline-web-source"
    });
    const titleEl = sourceEl.createEl("a", {
      cls: "contex-agent__inline-web-source-title",
      text: `${index + 1}. ${source.title}`,
      href: source.url
    });
    titleEl.setAttribute("target", "_blank");
    titleEl.setAttribute("rel", "noopener noreferrer");
    sourceEl.createDiv({
      cls: "contex-agent__inline-web-source-meta",
      text: [
        source.source,
        source.sourceType ? `Type: ${source.sourceType}` : "",
        source.publishedDate,
        source.freshnessHint ? `Date: ${source.freshnessHint}` : ""
      ]
        .filter(Boolean)
        .join(" | ")
    });
  });
}

export interface RenderVaultSearchResultsOptions {
  onAttachAll: (results: VaultSearchResult[]) => void;
  onAttachOne: (result: VaultSearchResult) => void;
  onOpenPath: (path: string) => void;
}

export function renderVaultSearchResultsElement(
  parentEl: HTMLElement,
  message: ChatMessage,
  options: RenderVaultSearchResultsOptions
): void {
  const results = message.vaultSearchResults ?? [];
  const query = message.vaultSearchQuery ?? "";
  const rootEl = parentEl.createDiv({
    cls: "contex-agent__search-results"
  });

  rootEl.createDiv({
    cls: "contex-agent__search-title",
    text: formatVaultSearchTitle(query, results.length)
  });

  if (!results.length) {
    return;
  }

  const actionsEl = rootEl.createDiv({
    cls: "contex-agent__search-actions"
  });
  const askAllButton = actionsEl.createEl("button", {
    cls: "mod-cta",
    text: "Attach all"
  });
  askAllButton.addEventListener("click", () => {
    options.onAttachAll(results);
  });

  results.forEach((result, index) => {
    const resultEl = rootEl.createDiv({
      cls: "contex-agent__search-result"
    });
    resultEl.createDiv({
      cls: "contex-agent__search-result-title",
      text: `${index + 1}. ${result.path}`
    });
    resultEl.createDiv({
      cls: "contex-agent__search-result-score",
      text: formatVaultSearchResultScoreText(result)
    });
    if (result.heading) {
      resultEl.createDiv({
        cls: "contex-agent__search-result-heading",
        text: `Heading: ${result.heading}`
      });
    }
    resultEl.createDiv({
      cls: "contex-agent__search-result-snippet",
      text: result.snippet
    });
    const resultActionsEl = resultEl.createDiv({
      cls: "contex-agent__search-result-actions"
    });
    const attachButton = resultActionsEl.createEl("button", {
      text: "Attach"
    });
    attachButton.addEventListener("click", () => {
      options.onAttachOne(result);
    });
    const openButton = resultActionsEl.createEl("button", {
      text: "Open"
    });
    openButton.addEventListener("click", () => {
      options.onOpenPath(result.path);
    });
  });
}
