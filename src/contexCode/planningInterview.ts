import {
  getLocalizedDefaultQuickOptions,
  isPlanningInterviewRussian,
  localizePlanningQuickOption,
  renderPlanningInterviewQuestionRu,
  renderPlanningInterviewRu
} from "./planningInterviewLocalization";

export type ContexCodePlanningInterviewLanguage = "en" | "ru" | string | null | undefined;

export interface ContexCodePlanningQuestion {
  id: string;
  label: string;
  question: string;
  reason: string;
  options?: ContexCodePlanningQuickOption[];
}

export interface ContexCodePlanningQuickOption {
  id: string;
  label: string;
  value: string;
}

export interface ContexCodePlanningAnswer {
  questionId: string;
  answer: string;
}

export interface ContexCodePlanningInterview {
  projectTitle: string;
  projectNotePath: string;
  summary: string;
  questions: ContexCodePlanningQuestion[];
  readyToPlan: boolean;
}

export interface BuildContexCodePlanningInterviewOptions {
  path: string;
  markdown: string;
  maxQuestions?: number;
  uiLanguage?: ContexCodePlanningInterviewLanguage;
}

export interface BuildContexCodePlanningInterviewPromptOptions {
  path: string;
  markdown: string;
  fallbackInterview?: ContexCodePlanningInterview | null;
  maxQuestions?: number;
  uiLanguage?: ContexCodePlanningInterviewLanguage;
}

export interface BuildContexCodePlanDraftPromptFromInterviewOptions {
  path: string;
  markdown: string;
  interview?: ContexCodePlanningInterview | null;
  answers?: string;
  uiLanguage?: ContexCodePlanningInterviewLanguage;
}

export interface BuildContexCodePlanningNextQuestionPromptOptions {
  path: string;
  markdown: string;
  interview: ContexCodePlanningInterview;
  answers: string;
  maxQuestions?: number;
  uiLanguage?: ContexCodePlanningInterviewLanguage;
}

export interface ContexCodePlanningNextQuestionDecision {
  readyToPlan: boolean;
  summary?: string;
  question: ContexCodePlanningQuestion | null;
}

const DEFAULT_MAX_QUESTIONS = 4;
const MAX_INTERVIEW_MARKDOWN_CHARS = 18000;

const UNIVERSAL_CONTEXT_CODE_PLANNING_CONTRACT = [
  "Universal Mindo Code planning contract:",
  "A strong coding handoff should clarify only the missing high-impact facts needed to build the project safely.",
  "Check the note against these dimensions:",
  "1. Product goal and target user.",
  "2. Primary workflow and success state.",
  "3. MVP scope, explicit non-goals, and later-version ideas.",
  "4. Architecture, runtime, storage, APIs, permissions, and integration boundaries.",
  "5. UI/UX style, interaction model, and important user-facing states.",
  "6. Data model, source of truth, sync/conflict behavior, and migration needs.",
  "7. Security, privacy, authentication, and destructive-action safety.",
  "8. Testing strategy, fixture data, performance budgets, and acceptance checks.",
  "9. Packaging, deployment, distribution, and platform constraints.",
  "10. Risks, unknowns, and decisions that would change implementation order.",
  "",
  "Do not ask generic checklist questions if the note already answers them.",
  "Ask adaptive project-specific questions that would materially improve the coding plan.",
  "Prefer 1-4 questions. Ask 0 questions when the note is already sufficiently specific.",
  "Each question must include 2-4 quick answer options. Options must be useful, specific, and safe defaults.",
  "Keep labels short. Keep option values complete enough to be used later as hard constraints."
].join("\n");

export function buildContexCodePlanningInterview(
  options: BuildContexCodePlanningInterviewOptions
): ContexCodePlanningInterview {
  const projectTitle = inferProjectTitle(options.markdown, options.path);
  const summary = inferProjectSummary(options.markdown);
  const normalized = normalizeForSearch(options.markdown);
  const language = options.uiLanguage ?? "en";
  const questions: ContexCodePlanningQuestion[] = [];

  if (!hasAny(normalized, ["tech stack", "stack", "typescript", "react", "rust", "python", "api", "frontend", "backend", "crdt", "database", "storage", "runtime"])) {
    questions.push({
      id: "stack",
      label: "Architecture / stack",
      question: "What platform, core libraries, runtime, storage, and integration boundaries should the coding plan assume?",
      reason: "The note has a product idea, but not enough implementation constraints.",
      options: getLocalizedDefaultQuickOptions("stack", language)
    });
  }

  if (!hasAny(normalized, ["mvp", "scope", "out of scope", "v1", "version 1", "must have", "nice to have", "roadmap"])) {
    questions.push({
      id: "mvp_scope",
      label: "MVP scope",
      question: "What is the smallest useful MVP, and what should explicitly stay out of scope for the first build?",
      reason: "A coding agent needs tight boundaries to avoid building an overgrown first version.",
      options: getLocalizedDefaultQuickOptions("mvp_scope", language)
    });
  }

  if (!hasAny(normalized, ["ui", "ux", "design", "visual", "layout", "style", "interaction", "screen", "editor", "sidebar"])) {
    questions.push({
      id: "experience",
      label: "User experience",
      question: "How should the feature feel visually and interaction-wise, especially in the main user workflow?",
      reason: "The implementation plan should preserve product taste, not only technical tasks.",
      options: getLocalizedDefaultQuickOptions("experience", language)
    });
  }

  if (!hasAny(normalized, ["test", "verify", "verification", "qa", "acceptance", "e2e", "unit", "manual check", "benchmark"])) {
    questions.push({
      id: "verification",
      label: "Verification",
      question: "How should we verify that the feature works: unit tests, fixture vault, E2E checks, manual scenarios, or benchmarks?",
      reason: "The generated plan should include checks the coding agent can actually run.",
      options: getLocalizedDefaultQuickOptions("verification", language)
    });
  }

  if (!hasAny(normalized, ["release", "package", "deploy", "distribution", "install", "desktop", "mobile", "security", "privacy", "auth"])) {
    questions.push({
      id: "release_constraints",
      label: "Release constraints",
      question: "Are there packaging, privacy, security, desktop/mobile, auth, or deployment constraints that must shape the plan?",
      reason: "Release constraints often change architecture and task order.",
      options: getLocalizedDefaultQuickOptions("release_constraints", language)
    });
  }

  const selectedQuestions = questions.slice(0, options.maxQuestions ?? DEFAULT_MAX_QUESTIONS);

  return {
    projectTitle,
    projectNotePath: options.path,
    summary,
    questions: selectedQuestions,
    readyToPlan: selectedQuestions.length === 0
  };
}

export function buildContexCodePlanningInterviewPrompt(
  options: BuildContexCodePlanningInterviewPromptOptions
): string {
  const fallback = options.fallbackInterview;
  const maxQuestions = options.maxQuestions ?? DEFAULT_MAX_QUESTIONS;
  const uiLanguage = isRussian(options.uiLanguage) ? "Russian" : "English";
  const uiLanguageCode = isRussian(options.uiLanguage) ? "ru" : "en";
  const fallbackLines = fallback?.questions.length
    ? [
        "Fallback heuristic gaps detected by code:",
        ...fallback.questions.map(
          (question, index) =>
            `${index + 1}. ${question.label}: ${question.question} Reason: ${question.reason}`
        ),
        ""
      ]
    : [
        "Fallback heuristic gaps detected by code:",
        "None. The note may already be ready, but still check for project-specific missing decisions.",
        ""
      ];

  return [
    "Analyze this Obsidian project note and decide whether Mindo Code should ask clarifying questions before generating a coding plan.",
    "",
    UNIVERSAL_CONTEXT_CODE_PLANNING_CONTRACT,
    "",
    "Generate adaptive questions for this specific project, not template questions.",
    "If the note has an unusual domain, ask about the domain-specific decisions that would change implementation.",
    "If the user already wrote a clear decision, do not ask it again.",
    "If a local model would likely miss an architectural gap, ask the smallest question that resolves that gap.",
    "",
    `Human-facing UI language: ${uiLanguage} (${uiLanguageCode}).`,
    "All JSON fields shown to the user must use the UI language: projectTitle when possible, summary, questions[].label, questions[].question, questions[].reason, options[].label, and options[].value.",
    "Keep product names, file paths, code identifiers, library names, and API names unchanged.",
    "The later IDE handoff may use English, but this interview is for the user and must be localized.",
    "",
    `Maximum questions: ${maxQuestions}`,
    "",
    "Return only valid JSON. Do not include Markdown fences, prose, comments, or explanation.",
    "Use this JSON shape:",
    JSON.stringify(
      {
        projectTitle: "Short Project Name",
        summary: "One sentence describing the project as understood.",
        readyToPlan: false,
        questions: [
          {
            id: "short_snake_case_id",
            label: "Short label",
            question: "One concrete adaptive question.",
            reason: "Why this matters for the coding plan.",
            options: [
              {
                id: "recommended",
                label: "Recommended",
                value: "Complete answer text to use as a planning constraint."
              }
            ]
          }
        ]
      },
      null,
      2
    ),
    "",
    ...fallbackLines,
    "Active note path:",
    options.path,
    "",
    "Active note markdown:",
    options.markdown.slice(0, MAX_INTERVIEW_MARKDOWN_CHARS)
  ].join("\n");
}

export function parseContexCodePlanningInterviewResponse(
  response: string,
  fallbackInterview: ContexCodePlanningInterview,
  maxQuestions = DEFAULT_MAX_QUESTIONS
): ContexCodePlanningInterview {
  const parsed = parseJsonObject(response);
  if (!parsed) {
    return fallbackInterview;
  }

  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
        .map((question) => sanitizeAdaptiveQuestion(question))
        .filter((question): question is ContexCodePlanningQuestion => Boolean(question))
        .slice(0, maxQuestions)
    : [];

  const readyToPlan =
    Boolean(parsed.readyToPlan) || questions.length === 0;

  return {
    projectTitle: cleanTitle(
      coerceString(parsed.projectTitle) || fallbackInterview.projectTitle
    ),
    projectNotePath: fallbackInterview.projectNotePath,
    summary:
      coerceString(parsed.summary)?.slice(0, 360) ||
      fallbackInterview.summary,
    questions,
    readyToPlan
  };
}

export function buildContexCodePlanningNextQuestionPrompt(
  options: BuildContexCodePlanningNextQuestionPromptOptions
): string {
  const maxQuestions = options.maxQuestions ?? DEFAULT_MAX_QUESTIONS;
  const uiLanguage = isRussian(options.uiLanguage) ? "Russian" : "English";
  const uiLanguageCode = isRussian(options.uiLanguage) ? "ru" : "en";
  const askedQuestions = options.interview.questions.length
    ? options.interview.questions
        .map((question, index) => `${index + 1}. ${question.label}: ${question.question}`)
        .join("\n")
    : "None yet.";
  const answerText = options.answers.trim() || "No answers yet.";

  return [
    "Continue an adaptive Mindo Code planning interview.",
    "",
    UNIVERSAL_CONTEXT_CODE_PLANNING_CONTRACT,
    "",
    "Generate exactly one next adaptive question, or decide that the project is ready for planning.",
    "Think about the active note, the questions already asked, and the user's previous answers.",
    "Do not repeat any question that was already answered.",
    "Ask the next question only if the answer would materially change architecture, implementation order, risk handling, or verification.",
    "If enough high-impact decisions are already known, set readyToPlan to true and question to null.",
    "",
    `Human-facing UI language: ${uiLanguage} (${uiLanguageCode}).`,
    "All user-facing JSON fields must use the UI language.",
    "Keep product names, file paths, code identifiers, library names, and API names unchanged.",
    "",
    `Maximum total interview questions: ${maxQuestions}`,
    "",
    "Return only valid JSON. Do not include Markdown fences, prose, comments, or explanation.",
    "Use this JSON shape:",
    JSON.stringify(
      {
        readyToPlan: false,
        summary: "Updated one-sentence project understanding.",
        question: {
          id: "short_snake_case_id",
          label: "Short label",
          question: "One concrete adaptive question.",
          reason: "Why this matters for the coding plan.",
          options: [
            {
              id: "recommended",
              label: "Recommended",
              value: "Complete answer text to use as a planning constraint."
            }
          ]
        }
      },
      null,
      2
    ),
    "",
    "Current interview summary:",
    options.interview.summary,
    "",
    "Questions already asked:",
    askedQuestions,
    "",
    "Previous planning answers:",
    answerText,
    "",
    "Active note path:",
    options.path,
    "",
    "Active note markdown:",
    options.markdown.slice(0, MAX_INTERVIEW_MARKDOWN_CHARS)
  ].join("\n");
}

export function parseContexCodePlanningNextQuestionResponse(
  response: string
): ContexCodePlanningNextQuestionDecision {
  const parsed = parseJsonObject(response);
  if (!parsed) {
    return {
      readyToPlan: false,
      question: null
    };
  }

  const readyToPlan = Boolean(parsed.readyToPlan);
  const question = readyToPlan
    ? null
    : sanitizeAdaptiveQuestion(parsed.question);

  return {
    readyToPlan,
    summary: coerceString(parsed.summary)?.slice(0, 360) ?? undefined,
    question
  };
}

export function appendContexCodePlanningQuestion(
  interview: ContexCodePlanningInterview,
  question: ContexCodePlanningQuestion,
  summary?: string
): ContexCodePlanningInterview {
  const existingIds = new Set(interview.questions.map((item) => item.id));
  const nextQuestion = existingIds.has(question.id)
    ? {
        ...question,
        id: `${question.id}_${interview.questions.length + 1}`
      }
    : question;

  return {
    ...interview,
    summary: summary?.trim() || interview.summary,
    questions: [...interview.questions, nextQuestion],
    readyToPlan: false
  };
}

export function completeContexCodePlanningInterview(
  interview: ContexCodePlanningInterview,
  summary?: string
): ContexCodePlanningInterview {
  return {
    ...interview,
    summary: summary?.trim() || interview.summary,
    readyToPlan: true
  };
}

export function getContexCodePlanningQuestion(
  interview: ContexCodePlanningInterview,
  index: number
): ContexCodePlanningQuestion | null {
  return interview.questions[index] ?? null;
}

export function getContexCodePlanningQuickOptions(
  question: ContexCodePlanningQuestion,
  language: ContexCodePlanningInterviewLanguage = "en"
): ContexCodePlanningQuickOption[] {
  const options = question.options?.length
    ? question.options
    : getLocalizedDefaultQuickOptions(question.id, language);
  if (!isRussian(language)) return options;

  return options.map((option) => localizePlanningQuickOption(question.id, option));
}

export function renderContexCodePlanningQuestion(
  interview: ContexCodePlanningInterview,
  questionIndex: number,
  language: ContexCodePlanningInterviewLanguage = "en"
): string {
  const question = getContexCodePlanningQuestion(interview, questionIndex);
  if (!question) {
    return renderContexCodePlanningInterview(interview, language);
  }

  if (isRussian(language)) {
    return renderPlanningInterviewQuestionRu(interview, question, questionIndex);
  }

  return [
    questionIndex === 0
      ? `Before I create the Mindo Code plan for ${interview.projectTitle}, I want to clarify it step by step.`
      : `Continuing the Mindo Code planning interview for ${interview.projectTitle}.`,
    "",
    questionIndex === 0 ? `I understand the project as: ${interview.summary}` : "",
    questionIndex === 0 ? "" : "",
    `Question ${questionIndex + 1} of ${interview.questions.length}:`,
    question.question,
    "",
    "Pick a quick answer below, or type your own."
  ].filter(Boolean).join("\n");
}

export function formatContexCodePlanningAnswers(
  interview: ContexCodePlanningInterview,
  answers: ContexCodePlanningAnswer[]
): string {
  if (!answers.length) return "";

  const questionById = new Map(
    interview.questions.map((question) => [question.id, question])
  );

  return answers
    .map((answer, index) => {
      const question = questionById.get(answer.questionId);
      const label = question?.label ?? answer.questionId;
      return `${index + 1}. ${label}: ${answer.answer.trim()}`;
    })
    .join("\n");
}

export function renderContexCodePlanningInterview(
  interview: ContexCodePlanningInterview,
  language: ContexCodePlanningInterviewLanguage = "en"
): string {
  if (isRussian(language)) {
    return renderPlanningInterviewRu(interview);
  }

  if (interview.readyToPlan) {
    return `Ready to create the Mindo Code plan for ${interview.projectTitle}. The note already has enough architecture context.`;
  }

  return [
    `Before I create the Mindo Code plan for ${interview.projectTitle}, I want to lock down the architecture.`,
    "",
    `I understand the project as: ${interview.summary}`,
    "",
    "Reply in one message:",
    ...interview.questions.map((question, index) => `${index + 1}. ${question.question}`)
  ].join("\n");
}

export function buildContexCodePlanDraftPromptFromInterview(
  options: BuildContexCodePlanDraftPromptFromInterviewOptions
): string {
  const interviewLines = options.interview
    ? [
        "Planning interview summary:",
        options.interview.summary,
        "",
        "Planning interview questions:",
        ...options.interview.questions.map(
          (question, index) => `${index + 1}. ${question.label}: ${question.question}`
        )
      ]
    : [];
  const answer = options.answers?.trim();
  const uiLanguage = isRussian(options.uiLanguage) ? "Russian" : "English";
  const uiLanguageCode = isRussian(options.uiLanguage) ? "ru" : "en";

  return [
    "Analyze the active Obsidian project note and create a practical coding plan for Mindo Code.",
    "Return only valid JSON. Do not include Markdown fences, prose, comments, or explanation.",
    "The plan must be derived from the note content and the planning interview, not from the file name alone.",
    "Prefer a short product/project title from the first H1 or the central idea.",
    `Human-facing UI language: ${uiLanguage} (${uiLanguageCode}).`,
    "The small Mindo Code block inserted into the Obsidian note is user-facing.",
    "For every phase and task, write displayTitle and displaySummary in the UI language.",
    "Keep title, summary, acceptance, files, commands, and technical implementation details in clear English for IDE/coding-agent handoff.",
    "If the UI language is Russian, displayTitle/displaySummary must be Russian, but code identifiers, product names, file paths, and library names stay unchanged.",
    "Create 3-6 phases and 2-5 concrete engineering tasks per phase.",
    "Each task should be actionable for a coding agent and include acceptance checks.",
    "Use the user's planning answers as hard constraints. If the answers correct the note, prefer the answers.",
    "Use this JSON shape:",
    JSON.stringify(
      {
        title: "Project Name",
        phases: [
          {
            title: "MVP Foundation",
            displayTitle: "Фундамент MVP",
            summary: "What this phase delivers.",
            displaySummary: "Что этот этап даёт пользователю.",
            tasks: [
              {
                title: "Implement core contract",
                displayTitle: "Реализовать основной контракт",
                summary: "What to change and why.",
                displaySummary: "Что меняется и зачем.",
                acceptance: [
                  "Behavior is implemented.",
                  "Tests or manual verification pass."
                ],
                files: ["src/example.ts"],
                commands: ["npm run test", "npm run build"]
              }
            ]
          }
        ]
      },
      null,
      2
    ),
    "",
    "Active note path:",
    options.path,
    "",
    ...interviewLines,
    "",
    "Planning interview answers:",
    answer || "(No extra answers; use the note only.)",
    "",
    "Active note markdown:",
    options.markdown.slice(0, 24000)
  ].join("\n");
}

function inferProjectTitle(markdown: string, path: string): string {
  const heading = markdown.match(/^#\s+(.+)$/mu)?.[1]?.trim();
  if (heading) return cleanTitle(heading);

  const firstNonEmpty = markdown
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith("---") && !line.startsWith("```"));
  if (firstNonEmpty && firstNonEmpty.length <= 80) return cleanTitle(firstNonEmpty);

  const fileName = path.split(/[\\/]/u).pop()?.replace(/\.md$/iu, "") ?? "Mindo Code Plan";
  return cleanTitle(fileName);
}

function inferProjectSummary(markdown: string): string {
  const bodyLines = markdown
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("---") && !line.startsWith("```"));
  const summary = bodyLines.join(" ").replace(/\s+/gu, " ").trim();
  return summary ? summary.slice(0, 260) : "A project note that needs to become a coding plan.";
}

function cleanTitle(title: string): string {
  return title
    .replace(/^#+\s*/u, "")
    .replace(/[*_`[\]]/gu, "")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, 80) || "Mindo Code Plan";
}

function coerceString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseJsonObject(response: string): Record<string, unknown> | null {
  const trimmed = response.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/iu, "")
    .replace(/\s*```$/u, "")
    .trim();
  const firstBrace = withoutFence.indexOf("{");
  const lastBrace = withoutFence.lastIndexOf("}");
  const jsonText =
    withoutFence.startsWith("{") && withoutFence.endsWith("}")
      ? withoutFence
      : firstBrace >= 0 && lastBrace > firstBrace
        ? withoutFence.slice(firstBrace, lastBrace + 1)
        : "";

  if (!jsonText) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(jsonText);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function sanitizeAdaptiveQuestion(value: unknown): ContexCodePlanningQuestion | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const question = coerceString(record.question);
  if (!question) {
    return null;
  }

  const rawOptions = Array.isArray(record.options) ? record.options : [];
  const options = rawOptions
    .map((option) => sanitizeAdaptiveOption(option))
    .filter((option): option is ContexCodePlanningQuickOption => Boolean(option))
    .slice(0, 4);

  return {
    id: slugQuestionId(coerceString(record.id) || coerceString(record.label) || question),
    label: cleanQuestionLabel(coerceString(record.label) || "Planning decision"),
    question: question.slice(0, 500),
    reason:
      coerceString(record.reason)?.slice(0, 360) ||
      "This decision affects the coding plan.",
    options: options.length ? options : getLocalizedDefaultQuickOptions("adaptive")
  };
}

function sanitizeAdaptiveOption(value: unknown): ContexCodePlanningQuickOption | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const label = coerceString(record.label);
  const optionValue = coerceString(record.value);
  if (!label || !optionValue) {
    return null;
  }

  return {
    id: slugQuestionId(coerceString(record.id) || label),
    label: label.slice(0, 42),
    value: optionValue.slice(0, 700)
  };
}

function cleanQuestionLabel(label: string): string {
  return label.replace(/\s+/gu, " ").trim().slice(0, 64) || "Planning decision";
}

function slugQuestionId(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 48);
  return slug || "planning_decision";
}

function normalizeForSearch(text: string): string {
  return text.toLowerCase().replace(/\u0451/gu, "\u0435");
}

function hasAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function isRussian(language: ContexCodePlanningInterviewLanguage): boolean {
  return isPlanningInterviewRussian(language);
}
