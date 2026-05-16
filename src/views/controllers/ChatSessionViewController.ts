import {
  deleteCurrentChatSession,
  ensureChatSessionState,
  startNewChatSession,
  switchChatSession,
  updateActiveChatTitleFromMessages
} from "../../chat/chatSessionController";
import type { ChatMessage, ChatSession, ChatState } from "../../types";

interface ChatSessionViewState {
  sessions: ChatSession[];
  activeChatId: string | null;
  messages: ChatMessage[];
}

export interface ChatSessionViewControllerDeps {
  getHasLoadedChatState: () => boolean;
  setHasLoadedChatState: (value: boolean) => void;
  getPersistedChatState: () => ChatState | null;
  getSessionState: () => ChatSessionViewState;
  setSessionState: (state: ChatSessionViewState) => void;
  onStartNewChat: () => void;
  onSwitchChat: () => void;
  onDeleteChat: () => void;
  refreshChatSelect: () => void;
  renderSuggestions: () => void;
  renderMessages: () => void;
  focusInput: () => void;
  getPersistTimer: () => number | null;
  setPersistTimer: (timer: number | null) => void;
  setTimeout: (callback: () => void, timeoutMs: number) => number;
  clearTimeout: (timer: number) => void;
  saveChatState: (state: ChatState) => Promise<void>;
}

export class ChatSessionViewController {
  constructor(private readonly deps: ChatSessionViewControllerDeps) {}

  ensureChatSession(): void {
    if (!this.deps.getHasLoadedChatState()) {
      this.applySessionState(
        ensureChatSessionState(this.deps.getPersistedChatState())
      );
      this.deps.setHasLoadedChatState(true);
      return;
    }

    const state = this.deps.getSessionState();
    this.applySessionState(
      ensureChatSessionState({
        sessions: state.sessions,
        activeChatId: state.activeChatId
      })
    );
  }

  startNewChat(): void {
    const state = this.deps.getSessionState();
    this.applySessionState(startNewChatSession(state.sessions));
    this.deps.onStartNewChat();
    this.refreshConversation();
    this.deps.focusInput();
  }

  switchChat(sessionId: string): void {
    const state = switchChatSession(
      this.deps.getSessionState().sessions,
      sessionId
    );

    if (!state) {
      return;
    }

    this.applySessionState(state);
    this.deps.onSwitchChat();
    this.refreshConversation();
  }

  deleteCurrentChat(): void {
    const state = this.deps.getSessionState();
    this.applySessionState(
      deleteCurrentChatSession(state.sessions, state.activeChatId)
    );
    this.deps.onDeleteChat();
    this.refreshConversation();
  }

  updateActiveChatTitle(): void {
    const state = this.deps.getSessionState();
    const updated = updateActiveChatTitleFromMessages(
      {
        sessions: state.sessions,
        activeChatId: state.activeChatId
      },
      state.messages
    );

    this.deps.setSessionState({
      sessions: updated.sessions,
      activeChatId: updated.activeChatId,
      messages: state.messages
    });
  }

  queuePersistChatState(): void {
    const existingTimer = this.deps.getPersistTimer();

    if (existingTimer !== null) {
      this.deps.clearTimeout(existingTimer);
    }

    const timer = this.deps.setTimeout(() => {
      this.deps.setPersistTimer(null);
      void this.persistChatState();
    }, 500);

    this.deps.setPersistTimer(timer);
  }

  async persistChatState(): Promise<void> {
    const state = this.deps.getSessionState();

    await this.deps.saveChatState({
      sessions: state.sessions,
      activeChatId: state.activeChatId
    });
  }

  private applySessionState(state: ChatSessionViewState): void {
    this.deps.setSessionState(state);
  }

  private refreshConversation(): void {
    this.deps.refreshChatSelect();
    this.deps.renderSuggestions();
    this.deps.renderMessages();
  }
}
