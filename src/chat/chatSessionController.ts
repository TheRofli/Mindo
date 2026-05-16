import type { ChatMessage, ChatSession, ChatState } from "../types";
import { trimChatTitle } from "./chatMessages";

export interface ChatSessionControllerDeps {
  createId?: () => string;
  createTime?: () => number;
}

export interface ChatSessionResolution {
  sessions: ChatSession[];
  activeChatId: string | null;
  messages: ChatMessage[];
}

function getTime(deps: ChatSessionControllerDeps): number {
  return deps.createTime?.() ?? Date.now();
}

function getId(createdAt: number, deps: ChatSessionControllerDeps): string {
  return deps.createId?.() ?? `${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createChatSession(
  title: string,
  deps: ChatSessionControllerDeps = {}
): ChatSession {
  const createdAt = getTime(deps);

  return {
    id: getId(createdAt, deps),
    title,
    messages: [],
    createdAt,
    updatedAt: createdAt
  };
}

export function ensureChatSessionState(
  persistedState: ChatState | null | undefined,
  deps: ChatSessionControllerDeps = {}
): ChatSessionResolution {
  const sessions = persistedState?.sessions.length
    ? [...persistedState.sessions]
    : [createChatSession("New chat", deps)];
  const activeChatId =
    persistedState?.activeChatId &&
    sessions.some((session) => session.id === persistedState.activeChatId)
      ? persistedState.activeChatId
      : sessions[0]?.id ?? null;
  const activeSession =
    sessions.find((session) => session.id === activeChatId) ?? sessions[0];

  return {
    sessions,
    activeChatId: activeSession?.id ?? null,
    messages: activeSession?.messages ?? []
  };
}

export function startNewChatSession(
  currentSessions: ChatSession[],
  deps: ChatSessionControllerDeps = {}
): ChatSessionResolution {
  const session = createChatSession(`Chat ${currentSessions.length + 1}`, deps);
  const sessions = [session, ...currentSessions];

  return {
    sessions,
    activeChatId: session.id,
    messages: session.messages
  };
}

export function switchChatSession(
  sessions: ChatSession[],
  sessionId: string
): ChatSessionResolution | null {
  const session = sessions.find((chat) => chat.id === sessionId);

  if (!session) {
    return null;
  }

  return {
    sessions,
    activeChatId: session.id,
    messages: session.messages
  };
}

export function deleteCurrentChatSession(
  currentSessions: ChatSession[],
  activeChatId: string | null,
  deps: ChatSessionControllerDeps = {}
): ChatSessionResolution {
  if (currentSessions.length <= 1 || !activeChatId) {
    const baseSession = currentSessions[0] ?? createChatSession("New chat", deps);
    const resetSession: ChatSession = {
      ...baseSession,
      title: "New chat",
      messages: [],
      updatedAt: getTime(deps)
    };

    return {
      sessions: [resetSession],
      activeChatId: resetSession.id,
      messages: resetSession.messages
    };
  }

  const sessions = currentSessions.filter((session) => session.id !== activeChatId);
  const activeSession = sessions[0] ?? createChatSession("New chat", deps);

  return {
    sessions: sessions.length ? sessions : [activeSession],
    activeChatId: activeSession.id,
    messages: activeSession.messages
  };
}

export function updateActiveChatTitleFromMessages(
  state: Pick<ChatState, "sessions" | "activeChatId">,
  messages: ChatMessage[],
  deps: ChatSessionControllerDeps = {}
): Pick<ChatState, "sessions" | "activeChatId"> {
  const firstUserMessage = messages.find(
    (message) => message.role === "user" && message.content.trim()
  );
  const updatedAt = getTime(deps);

  const sessions = state.sessions.map((session) =>
    session.id === state.activeChatId
      ? {
          ...session,
          title: firstUserMessage
            ? trimChatTitle(firstUserMessage.content)
            : session.title,
          updatedAt
        }
      : session
  );

  return {
    ...state,
    sessions
  };
}
