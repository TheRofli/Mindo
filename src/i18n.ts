export type UiLanguage = "en" | "ru";

export type UiTextKey =
  | "appName"
  | "activeNote"
  | "noActiveNote"
  | "suggestedPrompts"
  | "homeGreeting"
  | "composerPlaceholder"
  | "checkHealth"
  | "modelProfiles"
  | "manageModelProfiles"
  | "attachFiles"
  | "startLiveDialogue"
  | "stopLiveDialogue"
  | "sendLiveDialogueTurn"
  | "recordVoice"
  | "stopRecording"
  | "send"
  | "newChat"
  | "switchChat"
  | "clearCurrentChat"
  | "changeHistory"
  | "contexCode"
  | "moreActions"
  | "turnChatIntoNote"
  | "researchWeb"
  | "semanticVaultSearch"
  | "diagnostics"
  | "improvePrompt"
  | "createCodePlan"
  | "prepareCodeTaskPacket"
  | "markCodeTaskDone"
  | "syncCodePlan"
  | "profile"
  | "interfaceLanguage"
  | "interfaceLanguageDesc"
  | "english"
  | "russian";

export interface LocalizedActionText {
  label: string;
  description: string;
  title?: string;
}

const UI_TEXT: Record<UiLanguage, Record<UiTextKey, string>> = {
  en: {
    appName: "Mindo",
    activeNote: "Active note",
    noActiveNote: "No active Markdown note found.",
    suggestedPrompts: "Suggested Prompts",
    homeGreeting: "Hi, what should we explore today?",
    composerPlaceholder:
      "Your AI assistant for Obsidian • @ to add context • / for custom prompts",
    checkHealth: "Check Mindo health",
    modelProfiles: "Model profiles",
    manageModelProfiles: "Manage model profiles",
    attachFiles: "Attach files",
    startLiveDialogue: "Start Live Dialogue",
    stopLiveDialogue: "Stop Live Dialogue",
    sendLiveDialogueTurn: "Send Live Dialogue turn",
    recordVoice: "Record voice",
    stopRecording: "Stop recording",
    send: "Send",
    newChat: "New chat",
    switchChat: "Switch chat",
    clearCurrentChat: "Clear current chat",
    changeHistory: "AI change history",
    contexCode: "Mindo Code",
    moreActions: "More actions",
    turnChatIntoNote: "Turn chat into note",
    researchWeb: "Research web",
    semanticVaultSearch: "Semantic vault search",
    diagnostics: "Diagnostics",
    improvePrompt: "Improve prompt",
    createCodePlan: "Create Code Plan",
    prepareCodeTaskPacket: "Prepare Code Task Packet",
    markCodeTaskDone: "Mark Code Task Done",
    syncCodePlan: "Sync Code Plan",
    profile: "Profile",
    interfaceLanguage: "Interface Language",
    interfaceLanguageDesc: "Language used by Mindo sidebar and main controls.",
    english: "English",
    russian: "Russian"
  },
  ru: {
    appName: "Mindo",
    activeNote: "Активная заметка",
    noActiveNote: "Активная Markdown-заметка не найдена.",
    suggestedPrompts: "Предложенные команды",
    homeGreeting: "\u041f\u0440\u0438\u0432\u0435\u0442. \u0427\u0442\u043e \u043d\u0430\u0439\u0434\u0451\u043c \u0438\u043b\u0438 \u043e\u0431\u0441\u0443\u0434\u0438\u043c?",
    composerPlaceholder:
      "Ваш AI-ассистент для Obsidian • контекст подключается автоматически • / для команд",
    checkHealth: "Проверить состояние Mindo",
    modelProfiles: "Профили моделей",
    manageModelProfiles: "Управлять профилями моделей",
    attachFiles: "Прикрепить файлы",
    startLiveDialogue: "Начать живой диалог",
    stopLiveDialogue: "Остановить живой диалог",
    sendLiveDialogueTurn: "Отправить реплику живого диалога",
    recordVoice: "Записать голос",
    stopRecording: "Остановить запись",
    send: "Отправить",
    newChat: "Новый чат",
    switchChat: "Переключить чат",
    clearCurrentChat: "Очистить текущий чат",
    changeHistory: "История AI-изменений",
    contexCode: "Mindo Code",
    moreActions: "Ещё",
    turnChatIntoNote: "Сохранить чат как заметку",
    researchWeb: "Поиск в интернете",
    semanticVaultSearch: "Семантический поиск по vault",
    diagnostics: "Диагностика",
    improvePrompt: "Улучшить промпт",
    createCodePlan: "Создать Code Plan",
    prepareCodeTaskPacket: "Подготовить task packet",
    markCodeTaskDone: "Отметить task done",
    syncCodePlan: "Синхронизировать Code Plan",
    profile: "Профиль",
    interfaceLanguage: "Язык интерфейса",
    interfaceLanguageDesc: "Язык сайдбара Mindo и основных элементов.",
    english: "Английский",
    russian: "Русский"
  }
};

const ACTION_TEXT: Record<UiLanguage, Record<string, LocalizedActionText>> = {
  en: {
    "remember-note": {
      label: "Remember note",
      description: "Save the active note as durable project memory.",
      title: "Active Note"
    },
    "update-current-note": {
      label: "Update note",
      description: "Draft a safer, clearer replacement for the active note.",
      title: "Active Note"
    },
    "create-roadmap": {
      label: "Create roadmap",
      description: "Turn the active note into milestones, risks, and next actions.",
      title: "Project Roadmap"
    },
    "summarize-note": {
      label: "Summarize note",
      description: "Summarize the active note into concise bullets.",
      title: "Note Summary"
    },
    "extract-tasks": {
      label: "Extract tasks",
      description: "Pull actionable tasks from the active note.",
      title: "Task Extraction"
    },
    "explain-note": {
      label: "Explain note",
      description: "Explain the active note in plain language.",
      title: "Plain Explanation"
    }
  },
  ru: {
    "remember-note": {
      label: "Запомнить заметку",
      description: "Сохранить активную заметку как долговременную память проекта.",
      title: "Активная заметка"
    },
    "update-current-note": {
      label: "Обновить заметку",
      description: "Подготовить более безопасную и ясную версию активной заметки.",
      title: "Активная заметка"
    },
    "create-roadmap": {
      label: "Создать roadmap",
      description: "Превратить активную заметку в этапы, риски и следующие действия.",
      title: "Roadmap проекта"
    },
    "summarize-note": {
      label: "Кратко пересказать",
      description: "Сжать активную заметку в короткие пункты.",
      title: "Краткое резюме"
    },
    "extract-tasks": {
      label: "Вытащить задачи",
      description: "Найти конкретные задачи в активной заметке.",
      title: "Задачи"
    },
    "explain-note": {
      label: "Объяснить заметку",
      description: "Объяснить активную заметку простым языком.",
      title: "Простое объяснение"
    }
  }
};

export function sanitizeUiLanguage(value: unknown): UiLanguage {
  return value === "ru" ? "ru" : "en";
}

export function getUiLanguageFromObsidianLocale(value: unknown): UiLanguage {
  if (typeof value !== "string") {
    return "en";
  }

  return value.trim().toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function getUiLanguageFromObsidianApp(app: unknown): UiLanguage {
  const vault = (app as { vault?: { getConfig?: (key: string) => unknown } })
    ?.vault;
  const candidates = [
    vault?.getConfig?.("locale"),
    vault?.getConfig?.("language"),
    vault?.getConfig?.("interfaceLanguage"),
    (globalThis as { moment?: { locale?: () => unknown } }).moment?.locale?.()
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return getUiLanguageFromObsidianLocale(candidate);
    }
  }

  return "en";
}

export function getUiText(language: unknown, key: UiTextKey): string {
  const lang = sanitizeUiLanguage(language);
  return UI_TEXT[lang][key] ?? UI_TEXT.en[key];
}

export function getActionText(
  language: unknown,
  actionId: string
): LocalizedActionText {
  const lang = sanitizeUiLanguage(language);
  return ACTION_TEXT[lang][actionId] ?? ACTION_TEXT.en[actionId] ?? {
    label: actionId,
    description: actionId
  };
}
