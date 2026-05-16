type PlanningInterviewLanguage = "en" | "ru" | string | null | undefined;

interface PlanningQuickOption {
  id: string;
  label: string;
  value: string;
}

interface PlanningQuestion {
  id: string;
  label: string;
  question: string;
  reason: string;
  options?: PlanningQuickOption[];
}

interface PlanningInterview {
  projectTitle: string;
  summary: string;
  questions: PlanningQuestion[];
  readyToPlan: boolean;
}

export function isPlanningInterviewRussian(language: PlanningInterviewLanguage): boolean {
  return typeof language === "string" && language.toLowerCase().startsWith("ru");
}

export function getLocalizedDefaultQuickOptions(
  questionId: string,
  language: PlanningInterviewLanguage = "en"
): PlanningQuickOption[] {
  if (isPlanningInterviewRussian(language)) {
    return getDefaultQuickOptionsRu(questionId);
  }

  return getDefaultQuickOptionsEn(questionId);
}

export function localizePlanningQuickOption(
  questionId: string,
  option: PlanningQuickOption
): PlanningQuickOption {
  const localized = getDefaultQuickOptionsRu(questionId).find(
    (candidate) => candidate.id === option.id
  );

  return localized ?? option;
}

export function renderPlanningInterviewQuestionRu(
  interview: PlanningInterview,
  question: PlanningQuestion,
  questionIndex: number
): string {
  return [
    questionIndex === 0
      ? `Перед тем как создать Mindo Code plan для ${interview.projectTitle}, я уточню архитектуру по шагам.`
      : `Продолжаем уточнять Mindo Code plan для ${interview.projectTitle}.`,
    "",
    questionIndex === 0 ? `Я поняла проект так: ${interview.summary}` : "",
    questionIndex === 0 ? "" : "",
    `Вопрос ${questionIndex + 1} из ${interview.questions.length}:`,
    localizePlanningQuestionForDisplay(question),
    "",
    "Можно выбрать вариант ниже или написать свой ответ."
  ].filter(Boolean).join("\n");
}

export function renderPlanningInterviewRu(interview: PlanningInterview): string {
  if (interview.readyToPlan) {
    return `Готова создать Mindo Code plan для ${interview.projectTitle}. В заметке уже достаточно архитектурного контекста.`;
  }

  return [
    `Перед тем как создать Mindo Code plan для ${interview.projectTitle}, я хочу зафиксировать архитектуру.`,
    "",
    `Я поняла проект так: ${interview.summary}`,
    "",
    "Ответь одним сообщением:",
    ...interview.questions.map(
      (question, index) => `${index + 1}. ${localizePlanningQuestionForDisplay(question)}`
    )
  ].join("\n");
}

export function localizePlanningQuestionForDisplay(question: PlanningQuestion): string {
  switch (question.id) {
    case "stack":
      return "Какая платформа, стек, библиотеки, runtime, хранение данных и границы интеграций должны быть в плане?";
    case "mvp_scope":
      return "Какой самый маленький полезный MVP, и что точно не входит в первую версию?";
    case "experience":
      return "Как должен ощущаться продукт визуально и по взаимодействию в главном пользовательском workflow?";
    case "verification":
      return "Как проверять результат: unit tests, fixture vault, E2E, ручные сценарии или benchmarks?";
    case "release_constraints":
      return "Есть ли ограничения по упаковке, privacy, security, desktop/mobile, auth или deployment?";
    default:
      return question.question;
  }
}

function getDefaultQuickOptionsEn(questionId: string): PlanningQuickOption[] {
  switch (questionId) {
    case "stack":
      return [
        {
          id: "obsidian_ts",
          label: "Obsidian plugin",
          value: "Use an Obsidian desktop plugin in TypeScript, with local Markdown files as the source of truth and helper services only when they are clearly needed."
        },
        {
          id: "local_first",
          label: "Local-first app",
          value: "Keep the architecture local-first and privacy-preserving, with optional sync or networking only after the MVP is stable."
        },
        {
          id: "not_sure",
          label: "Let the plan decide",
          value: "Infer a conservative stack from the note and choose the simplest architecture that can ship a useful MVP."
        }
      ];
    case "mvp_scope":
      return [
        {
          id: "lean_mvp",
          label: "Lean MVP",
          value: "Build the smallest useful MVP first: one primary workflow, safe defaults, no advanced polish until the core loop works."
        },
        {
          id: "full_workflow",
          label: "Full workflow",
          value: "Plan the complete workflow end to end, but split it into milestones so the first version stays testable."
        },
        {
          id: "prototype_first",
          label: "Prototype first",
          value: "Start with a prototype that proves the core interaction, then harden storage, errors, and packaging."
        }
      ];
    case "experience":
      return [
        {
          id: "minimal_native",
          label: "Minimal native",
          value: "Make the UI minimal, native-feeling, and editor-first, with compact controls and very clear feedback."
        },
        {
          id: "terminal_style",
          label: "Terminal style",
          value: "Use a stylish minimal terminal-like surface: dense, readable, calm, with progress and state always visible."
        },
        {
          id: "chatgpt_like",
          label: "ChatGPT-like",
          value: "Prioritize a polished conversational workflow with quick choices, visible progress, and friendly confirmations."
        }
      ];
    case "verification":
      return [
        {
          id: "unit_fixture",
          label: "Unit + fixture vault",
          value: "Use unit tests plus a fixture vault that covers duplicate files, Cyrillic paths, attachments, and command routing."
        },
        {
          id: "manual_qa",
          label: "Manual QA checklist",
          value: "Create a strong manual QA checklist for the main flows and add automated tests around the risky logic."
        },
        {
          id: "e2e_perf",
          label: "E2E + performance",
          value: "Include E2E interaction tests and performance budgets for routing, RAG, file actions, and UI responsiveness."
        }
      ];
    case "release_constraints":
      return [
        {
          id: "desktop_private",
          label: "Desktop private beta",
          value: "Target a desktop-only private beta first, with local runtimes, clear diagnostics, and no mobile promises."
        },
        {
          id: "community_plugin",
          label: "Community plugin",
          value: "Shape the plan for Obsidian community-plugin release: clean manifest, packaging, README, release assets, and safe defaults."
        },
        {
          id: "privacy_first",
          label: "Privacy-first",
          value: "Make privacy and local-first behavior non-negotiable: explicit external API settings, safe file actions, and visible sources."
        }
      ];
    default:
      return [
        {
          id: "recommended",
          label: "Recommended",
          value: "Use the recommended conservative default based on the project note."
        },
        {
          id: "fast",
          label: "Move fast",
          value: "Prefer a fast prototype that proves the core behavior before polishing."
        },
        {
          id: "robust",
          label: "Make it robust",
          value: "Prefer a robust implementation plan with explicit tests, error handling, and edge cases."
        }
      ];
  }
}

function getDefaultQuickOptionsRu(questionId: string): PlanningQuickOption[] {
  switch (questionId) {
    case "stack":
      return [
        {
          id: "obsidian_ts",
          label: "Obsidian plugin",
          value: "Использовать desktop-плагин Obsidian на TypeScript: Markdown-файлы остаются источником правды, а внешние helper-сервисы подключаются только там, где они действительно нужны."
        },
        {
          id: "local_first",
          label: "Local-first",
          value: "Держать архитектуру local-first и privacy-preserving: синхронизацию, сеть и внешние сервисы добавлять только после стабильного MVP."
        },
        {
          id: "not_sure",
          label: "Пусть план решит",
          value: "Вывести консервативный стек из заметки и выбрать самую простую архитектуру, которая позволит быстро собрать полезный MVP."
        }
      ];
    case "mvp_scope":
      return [
        {
          id: "lean_mvp",
          label: "Минимальный MVP",
          value: "Сначала собрать самый маленький полезный MVP: один главный workflow, безопасные defaults и без лишней полировки до рабочего core loop."
        },
        {
          id: "full_workflow",
          label: "Полный workflow",
          value: "Запланировать весь workflow end-to-end, но разбить его на milestones, чтобы первая версия оставалась проверяемой."
        },
        {
          id: "prototype_first",
          label: "Сначала прототип",
          value: "Начать с прототипа, который доказывает главное взаимодействие, а потом укреплять storage, ошибки и упаковку."
        }
      ];
    case "experience":
      return [
        {
          id: "minimal_native",
          label: "Минимально и нативно",
          value: "Сделать UI минимальным, нативным для Obsidian и editor-first: компактные controls, ясные состояния и минимум визуального шума."
        },
        {
          id: "terminal_style",
          label: "Terminal-style",
          value: "Использовать спокойный terminal-like стиль: плотный, читаемый, минималистичный, с хорошо видимым прогрессом и состояниями."
        },
        {
          id: "chatgpt_like",
          label: "Как ChatGPT",
          value: "Сделать ставку на polished conversational workflow: быстрые варианты ответа, видимый прогресс и понятные подтверждения."
        }
      ];
    case "verification":
      return [
        {
          id: "unit_fixture",
          label: "Unit + fixture vault",
          value: "Использовать unit tests и fixture vault с дублями файлов, кириллицей, вложениями и command routing."
        },
        {
          id: "manual_qa",
          label: "Manual QA",
          value: "Сделать сильный manual QA checklist для главных flows и автоматизировать самые рискованные места."
        },
        {
          id: "e2e_perf",
          label: "E2E + скорость",
          value: "Добавить E2E interaction tests и performance budgets для routing, RAG, file actions и UI responsiveness."
        }
      ];
    case "release_constraints":
      return [
        {
          id: "desktop_private",
          label: "Desktop beta",
          value: "Целиться сначала в desktop-only private beta: локальные runtimes, понятная диагностика и никаких обещаний mobile."
        },
        {
          id: "community_plugin",
          label: "Community plugin",
          value: "Готовить план под Obsidian community-plugin release: чистый manifest, packaging, README, release assets и safe defaults."
        },
        {
          id: "privacy_first",
          label: "Privacy-first",
          value: "Сделать privacy и local-first поведение обязательными: явные настройки внешних API, безопасные file actions и видимые sources."
        }
      ];
    default:
      return [
        {
          id: "recommended",
          label: "Рекомендуемый вариант",
          value: "Использовать консервативный рекомендуемый вариант на основе проектной заметки."
        },
        {
          id: "fast",
          label: "Быстрый прототип",
          value: "Сначала быстро доказать core behavior, а полировку добавить после."
        },
        {
          id: "robust",
          label: "Надёжный вариант",
          value: "Сделать более надёжный план с тестами, обработкой ошибок и edge cases."
        }
      ];
  }
}
