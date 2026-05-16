import {
  MarkdownRenderer,
  setIcon,
  type App,
  type Component
} from "obsidian";
import { renderMessageAttachments } from "../attachments/attachmentDisplay";
import type {
  ChatMessage,
  VaultSearchResult,
  VaultSourceSection,
  WebSearchResult
} from "../types";
import { stripHiddenTtsHints } from "../voice/speechText";
import {
  getChatMessageClassNames,
  getChatMessageRenderKind,
  formatChatMessageRoleLabel,
  renderActionReceiptElement,
  renderTypingIndicatorElement,
  renderVaultSearchResultsElement,
  renderVaultSourcesElement,
  renderWebSourcesElement,
  resolveChatScrollAfterRender
} from "./chatViewRenderer";
import { renderWebResearchMessageElement } from "./chatDomRenderer";

export interface RenderChatMessagesOptions {
  chatEl: HTMLElement | null;
  messages: ChatMessage[];
  sourcePath: string;
  isLoading: boolean;
  streamingMessageId: string | null;
  speakingMessageId: string | null;
  shouldAutoScrollChat: boolean;
  uiLanguage: "en" | "ru";
  isChatNearBottom: () => boolean;
  canSpeakMessage: (message: ChatMessage) => boolean;
  onToggleSpeakMessage: (message: ChatMessage) => void;
  onCancelResponse: () => void;
  onOpenPath: (path: string) => void;
  onAttachVaultResults: (results: VaultSearchResult[]) => void;
  onCreateWebResearchNote: (message: ChatMessage) => void;
  isCreateWebResearchNoteDisabled: boolean;
  onRenderDiffPreview: (
    parentEl: HTMLElement,
    message: ChatMessage
  ) => void;
  onRenderContexCodePlanningQuickReplies: (
    messageEl: HTMLElement,
    message: ChatMessage
  ) => void;
}

export interface RenderOptimisticUserMessageOptions {
  chatEl: HTMLElement | null;
  message: ChatMessage;
  shouldAutoScrollChat: boolean;
  isChatNearBottom: () => boolean;
}

export interface ChatRenderResult {
  rendered: boolean;
  shouldAutoScrollChat: boolean;
}

export class ChatMessagesRenderer {
  private renderSequence = 0;

  constructor(
    private readonly app: App,
    private readonly component: Component
  ) {}

  async renderMessages(
    options: RenderChatMessagesOptions
  ): Promise<ChatRenderResult> {
    const chatEl = options.chatEl;

    if (!chatEl) {
      return {
        rendered: false,
        shouldAutoScrollChat: options.shouldAutoScrollChat
      };
    }

    const renderSequence = ++this.renderSequence;
    const shouldStickToBottom =
      options.shouldAutoScrollChat || options.isChatNearBottom();
    const previousScrollTop = chatEl.scrollTop;
    chatEl.empty();

    for (const message of options.messages) {
      if (renderSequence !== this.renderSequence) {
        return {
          rendered: false,
          shouldAutoScrollChat: options.shouldAutoScrollChat
        };
      }

      await this.renderMessage(chatEl, message, options);
    }

    if (renderSequence !== this.renderSequence) {
      return {
        rendered: false,
        shouldAutoScrollChat: options.shouldAutoScrollChat
      };
    }

    const scrollState = resolveChatScrollAfterRender({
      shouldStickToBottom,
      previousScrollTop,
      scrollHeight: chatEl.scrollHeight
    });
    chatEl.scrollTop = scrollState.nextScrollTop;

    return {
      rendered: true,
      shouldAutoScrollChat: scrollState.shouldAutoScrollChat
    };
  }

  renderOptimisticUserMessage(
    options: RenderOptimisticUserMessageOptions
  ): ChatRenderResult {
    const chatEl = options.chatEl;

    if (!chatEl) {
      return {
        rendered: false,
        shouldAutoScrollChat: options.shouldAutoScrollChat
      };
    }

    const shouldStickToBottom =
      options.shouldAutoScrollChat || options.isChatNearBottom();
    const messageEl = chatEl.createDiv({
      cls: "contex-agent__message contex-agent__message--user contex-agent__message--optimistic"
    });
    messageEl.setAttribute("data-message-id", options.message.id);

    const messageHeaderEl = messageEl.createDiv({
      cls: "contex-agent__message-header"
    });
    messageHeaderEl.createDiv({
      cls: "contex-agent__message-role",
      text: formatChatMessageRoleLabel(options.message.role)
    });

    const contentEl = messageEl.createDiv({
      cls: "contex-agent__message-content contex-agent__message-content--plain"
    });
    contentEl.setText(options.message.content || "...");

    if (options.message.attachments?.length) {
      renderMessageAttachments(messageEl, options.message.attachments, setIcon);
    }

    if (shouldStickToBottom) {
      chatEl.scrollTop = chatEl.scrollHeight;
      return {
        rendered: true,
        shouldAutoScrollChat: true
      };
    }

    return {
      rendered: true,
      shouldAutoScrollChat: options.shouldAutoScrollChat
    };
  }

  private async renderMessage(
    chatEl: HTMLElement,
    message: ChatMessage,
    options: RenderChatMessagesOptions
  ): Promise<void> {
    const renderKind = getChatMessageRenderKind(message, {
      isLoading: options.isLoading,
      streamingMessageId: options.streamingMessageId
    });

    const messageEl = chatEl.createDiv({
      cls: getChatMessageClassNames(message)
    });

    const messageHeaderEl = messageEl.createDiv({
      cls: "contex-agent__message-header"
    });
    messageHeaderEl.createDiv({
      cls: "contex-agent__message-role",
      text: formatChatMessageRoleLabel(message.role)
    });

    if (options.canSpeakMessage(message)) {
      const isSpeaking = options.speakingMessageId === message.id;
      const speakButton = messageHeaderEl.createEl("button", {
        cls: "contex-agent__message-action",
        attr: {
          type: "button",
          "aria-label": isSpeaking ? "Stop reading" : "Read answer"
        }
      });
      setIcon(speakButton, isSpeaking ? "square" : "volume-2");
      speakButton.addEventListener("click", () => {
        options.onToggleSpeakMessage(message);
      });
    }

    const contentEl = messageEl.createDiv({
      cls: "contex-agent__message-content"
    });

    if (renderKind === "typing") {
      renderTypingIndicatorElement(contentEl, {
        onCancel: options.onCancelResponse
      });
    } else if (renderKind === "web-research") {
      await renderWebResearchMessageElement(contentEl, message, {
        app: this.app,
        component: this.component,
        sourcePath: options.sourcePath,
        isCreateDisabled: options.isCreateWebResearchNoteDisabled,
        onCreateResearchNote: options.onCreateWebResearchNote
      });
    } else if (renderKind === "vault-search") {
      renderVaultSearchResultsElement(contentEl, message, {
        onAttachAll: options.onAttachVaultResults,
        onAttachOne: (result) => {
          options.onAttachVaultResults([result]);
        },
        onOpenPath: options.onOpenPath
      });
    } else if (renderKind === "diff-preview") {
      options.onRenderDiffPreview(contentEl, message);
    } else if (renderKind === "action-receipt" && message.actionReceipt) {
      renderActionReceiptElement(contentEl, message.actionReceipt, {
        onOpenPath: options.onOpenPath
      });
    } else if (renderKind === "assistant-markdown") {
      contentEl.addClass("markdown-rendered");
      await MarkdownRenderer.render(
        this.app,
        stripHiddenTtsHints(message.content),
        contentEl,
        options.sourcePath,
        this.component
      );
      if (message.sources?.length) {
        renderVaultSourcesElement(
          contentEl,
          message.sources,
          message.semanticVaultSections ?? [],
          {
            uiLanguage: options.uiLanguage,
            onOpenPath: options.onOpenPath
          }
        );
      }
      if (message.webSources?.length) {
        renderWebSourcesElement(contentEl, message.webSources, {
          uiLanguage: options.uiLanguage
        });
      }
    } else {
      contentEl.addClass("contex-agent__message-content--plain");
      contentEl.setText(message.content || "...");
    }

    if (message.attachments?.length) {
      renderMessageAttachments(messageEl, message.attachments, setIcon);
    }

    options.onRenderContexCodePlanningQuickReplies(messageEl, message);
  }
}
