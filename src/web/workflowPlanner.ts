export interface ContextWorkflowPlan {
  requiresWeb: boolean;
  requiresVault: boolean;
  reason: string;
}

const WEB_SIGNALS = [
  "latest",
  "current facts",
  "current trends",
  "modern",
  "this year",
  "today",
  "2026",
  "актуаль",
  "современ",
  "сегодня",
  "в этом году",
  "на 6 мая 2026",
  "проверь свежесть"
];

const VAULT_SIGNALS = [
  "current note",
  "active note",
  "project context",
  "vault",
  "текущ",
  "заметк",
  "проект",
  "хранилищ"
];

export function planContextWorkflow(text: string): ContextWorkflowPlan {
  const normalized = text.toLowerCase();
  const requiresWeb = WEB_SIGNALS.some((signal) => normalized.includes(signal));
  const requiresVault =
    VAULT_SIGNALS.some((signal) => normalized.includes(signal)) || !requiresWeb;

  return {
    requiresWeb,
    requiresVault,
    reason: requiresWeb
      ? "The request depends on freshness or time-sensitive information."
      : "The request can be answered from local context."
  };
}
