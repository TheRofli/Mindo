import { cleanJsonLikeResponse } from "../llm/jsonResponse";

export type LiveDialogueRoute = "fast" | "smart";

export interface LiveDialogueRouteDecision {
  route: LiveDialogueRoute;
  confidence: number;
  reason: string;
}

export interface LiveDialogueRoutingPromptInput {
  userText: string;
  hasCurrentNote?: boolean;
  hasSelectedText?: boolean;
  vaultResultCount?: number;
  hasAttachments?: boolean;
  chatMessageCount?: number;
}

const FAST_REASON = "A fast model can handle this as a short Talk to your Vault interaction.";

export function buildLiveDialogueRoutingSystemPrompt(): string {
  return [
    "You are Mindo's live dialogue router for a Talk to your Vault assistant, not a coding-first agent.",
    "Choose which model should answer the user's next spoken request.",
    "",
    "Use route fast when the request is a light vault conversation, quick answer, simple note lookup, short summary, obvious open/find action, small current-note edits, or precise low-risk text replacement.",
    "Use route smart when the request needs cross-vault synthesis, multi-note comparison, project memory reasoning, ambiguous intent resolution, deep analysis, long planning, research judgment, high-stakes accuracy, or multi-step changes.",
    "",
    "Small current-note edits should stay fast when the user gives exact text, a clear target, and the change is local.",
    "Do not route to smart just because the request mentions a file or edit. Route to smart only when the reasoning scope or risk is genuinely higher.",
    "",
    "Return only JSON with this shape:",
    "{\"route\":\"fast|smart\",\"confidence\":0.0,\"reason\":\"short reason\"}"
  ].join("\n");
}

export function buildLiveDialogueRoutingUserPrompt(
  input: LiveDialogueRoutingPromptInput
): string {
  return [
    "Classify this live dialogue request.",
    `Current note context: ${input.hasCurrentNote ? "yes" : "no"}`,
    `Selected text context: ${input.hasSelectedText ? "yes" : "no"}`,
    `Vault search results already available: ${input.vaultResultCount ?? 0}`,
    `Attachments: ${input.hasAttachments ? "yes" : "no"}`,
    `Chat messages in this session: ${input.chatMessageCount ?? 0}`,
    "",
    "User request:",
    input.userText.trim()
  ].join("\n");
}

export function parseLiveDialogueRouteDecision(
  response: string
): LiveDialogueRouteDecision | null {
  try {
    const parsed = JSON.parse(cleanJsonLikeResponse(response));
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const source = parsed as {
      route?: unknown;
      action?: unknown;
      confidence?: unknown;
      reason?: unknown;
    };
    const route = normalizeRoute(source.route ?? source.action);

    if (!route) {
      return null;
    }

    return {
      route,
      confidence: normalizeConfidence(source.confidence),
      reason:
        typeof source.reason === "string" && source.reason.trim()
          ? source.reason.trim().slice(0, 240)
          : route === "smart"
            ? "The request needs deeper vault reasoning."
            : FAST_REASON
    };
  } catch {
    return null;
  }
}

export function fallbackLiveDialogueRoute(
  input: Pick<LiveDialogueRoutingPromptInput, "userText">
): LiveDialogueRouteDecision {
  const text = input.userText.trim().toLowerCase();
  const words = text.split(/\s+/u).filter(Boolean);

  if (!text) {
    return {
      route: "fast",
      confidence: 0.6,
      reason: FAST_REASON
    };
  }

  if (isSmallCurrentNoteEdit(text)) {
    return {
      route: "fast",
      confidence: 0.82,
      reason: "This is a small current-note edit with a precise local target."
    };
  }

  const mentionsCrossVault =
    /(\ball\b|\bevery\b|\bproject\b|\bvault\b|все|всю|проект|хранилищ|vault|заметк)/u.test(text);
  const asksDeepWork =
    /(проанализ|подробн|детальн|глубок|сравни|синтез|roadmap|рисками|архитект|стратег|research|analy[sz]e|detailed|deep|compare|synthesis|plan)/u.test(text);
  const longOrMultiStep = text.length > 520 || words.length > 90;

  if ((mentionsCrossVault && asksDeepWork) || longOrMultiStep) {
    return {
      route: "smart",
      confidence: longOrMultiStep ? 0.78 : 0.86,
      reason: "This needs cross-vault synthesis or deeper multi-step reasoning."
    };
  }

  if (
    /(найди|открой|покажи|прочитай|кратко|быстро|что такое|где|open|find|show|read|summarize briefly|quick)/u.test(
      text
    )
  ) {
    return {
      route: "fast",
      confidence: 0.78,
      reason: "This looks like a quick vault lookup or short explanation."
    };
  }

  return {
    route: "fast",
    confidence: 0.64,
    reason: FAST_REASON
  };
}

function normalizeRoute(value: unknown): LiveDialogueRoute | null {
  if (typeof value !== "string") {
    return null;
  }

  const route = value.trim().toLowerCase().replace(/-/g, "_");

  if (
    route === "smart" ||
    route === "delegate_smart" ||
    route === "delegate_to_smart_model"
  ) {
    return "smart";
  }

  if (
    route === "fast" ||
    route === "fast_execute" ||
    route === "answer_direct" ||
    route === "direct"
  ) {
    return "fast";
  }

  return null;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0.5;
  }

  return Math.max(0, Math.min(1, value));
}

function isSmallCurrentNoteEdit(text: string): boolean {
  const hasEditVerb =
    /(замени|заменить|исправь|поменяй|переименуй|вставь|удали|replace|change|fix|rename|insert|delete)/u.test(
      text
    );
  const localTarget =
    /(текущ|этой заметк|выделенн|строк|слово|фраз|current note|selected text|this note|line|word|phrase)/u.test(
      text
    );
  const exactMarker =
    /(["'«“].+["'»”]| на | to |->|=>)/u.test(text) && text.length < 260;

  return hasEditVerb && localTarget && exactMarker;
}
