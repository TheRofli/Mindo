import assert from "node:assert/strict";
import {
  appendContexCodePlanningQuestion,
  buildContexCodePlanDraftPromptFromInterview,
  buildContexCodePlanningInterview,
  buildContexCodePlanningInterviewPrompt,
  buildContexCodePlanningNextQuestionPrompt,
  completeContexCodePlanningInterview,
  formatContexCodePlanningAnswers,
  getContexCodePlanningQuestion,
  getContexCodePlanningQuickOptions,
  parseContexCodePlanningInterviewResponse,
  parseContexCodePlanningNextQuestionResponse,
  renderContexCodePlanningInterview,
  renderContexCodePlanningQuestion
} from "../src/contexCode/planningInterview";

const thinIdea = `# LiveShare

Obsidian plugin for shared Markdown workspaces.

Users can share a note, comment on blocks, suggest edits, vote, and keep a clean final file.
`;

const interview = buildContexCodePlanningInterview({
  path: "Projects/LiveShare.md",
  markdown: thinIdea
});

assert.equal(interview.readyToPlan, false);
assert.equal(interview.projectTitle, "LiveShare");
assert.ok(interview.questions.length >= 3);
assert.ok(interview.questions.some((question) => question.id === "stack"));
assert.ok(interview.questions.some((question) => question.id === "mvp_scope"));

const ruMessage = renderContexCodePlanningInterview(interview, "ru");
assert.match(ruMessage, /LiveShare/);
assert.match(ruMessage, /Ответь одним сообщением/);
assert.match(ruMessage, /1\./);
assert.doesNotMatch(ruMessage, /Ð|Ñ/u);

const firstQuestion = getContexCodePlanningQuestion(interview, 0);
assert.ok(firstQuestion);
const secondQuestion = getContexCodePlanningQuestion(interview, 1);
assert.ok(secondQuestion);
const firstQuestionMessage = renderContexCodePlanningQuestion(interview, 0, "en");
assert.match(firstQuestionMessage, /Question 1 of/);
assert.match(
  firstQuestionMessage,
  new RegExp(firstQuestion.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
);
assert.doesNotMatch(
  firstQuestionMessage,
  new RegExp(secondQuestion.question.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
);
const firstQuestionOptions = getContexCodePlanningQuickOptions(firstQuestion, "en");
assert.ok(firstQuestionOptions.length >= 3);
assert.ok(firstQuestionOptions.every((option) => option.label && option.value));
const firstQuestionRuMessage = renderContexCodePlanningQuestion(interview, 0, "ru");
assert.match(firstQuestionRuMessage, /Вопрос 1 из/u);
assert.match(firstQuestionRuMessage, /Можно выбрать вариант ниже/u);
assert.doesNotMatch(firstQuestionRuMessage, /Ð|Ñ/u);
const firstQuestionRuOptions = getContexCodePlanningQuickOptions(firstQuestion, "ru");
assert.ok(firstQuestionRuOptions.length >= 3);
assert.ok(firstQuestionRuOptions.every((option) => option.label && option.value));
assert.ok(
  firstQuestionRuOptions.some((option) =>
    /Obsidian|local-first|TypeScript|архитектур/u.test(`${option.label} ${option.value}`)
  )
);
assert.ok(
  firstQuestionRuOptions.every((option) =>
    !/Let the plan decide|Move fast|Recommended/u.test(`${option.label} ${option.value}`)
  )
);
assert.ok(
  firstQuestionRuOptions.every((option) => !/Ð|Ñ/u.test(`${option.label} ${option.value}`))
);

const formattedAnswers = formatContexCodePlanningAnswers(interview, [
  {
    questionId: firstQuestion.id,
    answer: firstQuestionOptions[0].value
  }
]);
assert.match(formattedAnswers, /Architecture \/ stack/);
assert.match(formattedAnswers, /Obsidian/);

const adaptivePrompt = buildContexCodePlanningInterviewPrompt({
  path: "Projects/LiveShare.md",
  markdown: thinIdea,
  fallbackInterview: interview
});
assert.match(adaptivePrompt, /Universal Mindo Code planning contract/);
assert.match(adaptivePrompt, /Generate adaptive questions/);
assert.match(adaptivePrompt, /Return only valid JSON/);
assert.match(adaptivePrompt, /shared Markdown workspaces/);

const adaptivePromptRu = buildContexCodePlanningInterviewPrompt({
  path: "Projects/LiveShare.md",
  markdown: thinIdea,
  fallbackInterview: interview,
  uiLanguage: "ru"
});
assert.match(adaptivePromptRu, /Human-facing UI language: Russian \(ru\)/);
assert.match(adaptivePromptRu, /questions\[\]\.question/);
assert.match(adaptivePromptRu, /must be localized/);

const adaptiveInterview = parseContexCodePlanningInterviewResponse(
  JSON.stringify({
    projectTitle: "LiveShare",
    summary: "Collaborative Obsidian workspace with shared notes.",
    readyToPlan: false,
    questions: [
      {
        id: "collaboration_model",
        label: "Collaboration model",
        question:
          "Should LiveShare use peer-to-peer sync, a lightweight relay, or a local network server for the first MVP?",
        reason: "The note describes collaboration but not the synchronization boundary.",
        options: [
          {
            id: "p2p",
            label: "Peer-to-peer",
            value: "Use peer-to-peer sync for the MVP and avoid a central backend."
          },
          {
            id: "relay",
            label: "Small relay",
            value: "Use a small relay server for session discovery and conflict-safe collaboration."
          },
          {
            id: "local_network",
            label: "Local network",
            value: "Start with same-network collaboration only."
          }
        ]
      }
    ]
  }),
  interview
);
assert.equal(adaptiveInterview.questions.length, 1);
assert.equal(adaptiveInterview.questions[0].id, "collaboration_model");
assert.match(adaptiveInterview.questions[0].question, /peer-to-peer/);
assert.equal(adaptiveInterview.questions[0].options?.length, 3);

const fallbackAdaptiveInterview = parseContexCodePlanningInterviewResponse(
  "not json",
  interview
);
assert.equal(fallbackAdaptiveInterview.projectTitle, interview.projectTitle);
assert.equal(fallbackAdaptiveInterview.questions.length, interview.questions.length);

const nextQuestionPrompt = buildContexCodePlanningNextQuestionPrompt({
  path: "Projects/LiveShare.md",
  markdown: thinIdea,
  interview: adaptiveInterview,
  answers:
    "1. Collaboration model: Use a small relay server for session discovery and conflict-safe collaboration.",
  uiLanguage: "ru"
});
assert.match(nextQuestionPrompt, /Generate exactly one next adaptive question/);
assert.match(nextQuestionPrompt, /Previous planning answers/);
assert.match(nextQuestionPrompt, /small relay server/);
assert.match(nextQuestionPrompt, /Human-facing UI language: Russian \(ru\)/);

const nextQuestionDecision = parseContexCodePlanningNextQuestionResponse(
  JSON.stringify({
    readyToPlan: false,
    summary: "LiveShare should use a small relay and local CRDT copies.",
    question: {
      id: "conflict_policy",
      label: "Conflict policy",
      question:
        "When two users edit the same block, should LiveShare auto-merge, keep both variants, or ask the owner to resolve it?",
      reason: "Conflict behavior changes the CRDT and suggestion implementation.",
      options: [
        {
          id: "owner_resolves",
          label: "Owner resolves",
          value: "Keep conflicting variants and ask the owner to accept one or merge manually."
        },
        {
          id: "auto_merge_safe",
          label: "Auto-merge safe edits",
          value: "Auto-merge non-overlapping text edits and only ask for overlapping conflicts."
        }
      ]
    }
  })
);
assert.equal(nextQuestionDecision.readyToPlan, false);
assert.ok(nextQuestionDecision.question);
assert.equal(nextQuestionDecision.question.id, "conflict_policy");
assert.equal(nextQuestionDecision.question.options?.length, 2);

const extendedInterview = appendContexCodePlanningQuestion(
  adaptiveInterview,
  nextQuestionDecision.question,
  nextQuestionDecision.summary
);
assert.equal(extendedInterview.questions.length, 2);
assert.equal(extendedInterview.questions[1].id, "conflict_policy");
assert.equal(extendedInterview.summary, "LiveShare should use a small relay and local CRDT copies.");

const readyDecision = parseContexCodePlanningNextQuestionResponse(
  JSON.stringify({
    readyToPlan: true,
    summary: "Enough decisions are available for a coding plan.",
    question: null
  })
);
assert.equal(readyDecision.readyToPlan, true);
assert.equal(readyDecision.question, null);
const completedInterview = completeContexCodePlanningInterview(
  extendedInterview,
  readyDecision.summary
);
assert.equal(completedInterview.readyToPlan, true);
assert.equal(completedInterview.summary, "Enough decisions are available for a coding plan.");

const invalidNextQuestionDecision = parseContexCodePlanningNextQuestionResponse(
  "not json"
);
assert.equal(invalidNextQuestionDecision.readyToPlan, false);
assert.equal(invalidNextQuestionDecision.question, null);

const incompleteNextQuestionDecision = parseContexCodePlanningNextQuestionResponse(
  JSON.stringify({
    readyToPlan: false,
    summary: "The model returned an incomplete next-question payload.",
    question: null
  })
);
assert.equal(incompleteNextQuestionDecision.readyToPlan, false);
assert.equal(incompleteNextQuestionDecision.question, null);

const prompt = buildContexCodePlanDraftPromptFromInterview({
  path: "Projects/LiveShare.md",
  markdown: thinIdea,
  interview,
  answers:
    "Stack: TypeScript Obsidian plugin, Yjs for CRDT, no cloud MVP. MVP: share link, comments, suggest edit. Tests: unit + fixture vault."
});

assert.match(prompt, /Planning interview answers/);
assert.match(prompt, /Yjs for CRDT/);
assert.match(prompt, /Projects\/LiveShare\.md/);
assert.match(prompt, /Return only valid JSON/);

const ruPlanPrompt = buildContexCodePlanDraftPromptFromInterview({
  path: "Projects/LiveShare.md",
  markdown: thinIdea,
  interview,
  answers:
    "Стек: TypeScript Obsidian plugin, Yjs CRDT, no cloud MVP. MVP: share link, comments, suggest edit.",
  uiLanguage: "ru"
});
assert.match(ruPlanPrompt, /Human-facing UI language: Russian \(ru\)/);
assert.match(ruPlanPrompt, /displayTitle/);
assert.match(ruPlanPrompt, /displaySummary/);
assert.match(ruPlanPrompt, /Keep title, summary, acceptance/);

const richIdea = `# LiveShare

## MVP
Share links, comments, suggestions, and merge into a clean note.

## Tech Stack
TypeScript Obsidian plugin, Yjs CRDT, local-first storage.

## Visual Style
Minimal terminal-like UI.

## Verification
Unit tests, fixture vault, and E2E checks.

## Packaging
Desktop-only Obsidian plugin release.
`;

const richInterview = buildContexCodePlanningInterview({
  path: "Projects/LiveShare.md",
  markdown: richIdea
});

assert.equal(richInterview.readyToPlan, true);
assert.equal(richInterview.questions.length, 0);

console.log("contexCodePlanningInterview tests passed");
