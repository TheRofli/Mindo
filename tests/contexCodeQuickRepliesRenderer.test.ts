import assert from "node:assert/strict";
import { getContexCodeQuickReplies } from "../src/views/contexCodeQuickRepliesRenderer";
import type { PendingContexCodeInterviewState } from "../src/views/controllers/ContexCodeWorkflowController";

const pending: PendingContexCodeInterviewState = {
  file: { path: "Projects/LiveCollab.md" },
  markdown: "# LiveCollab",
  currentQuestionIndex: 0,
  answers: [],
  questionMessageId: "assistant-1",
  interview: {
    projectTitle: "LiveCollab",
    projectNotePath: "Projects/LiveCollab.md",
    summary: "Collaborative Obsidian workspace.",
    readyToPlan: false,
    questions: [
      {
        id: "architecture",
        label: "Architecture",
        question: "Which sync architecture should the MVP use?",
        reason: "The implementation depends on the sync model.",
        options: [
          {
            id: "relay",
            label: "Relay server",
            value: "Use a small relay server for MVP sync."
          }
        ]
      }
    ]
  }
};

assert.deepEqual(
  getContexCodeQuickReplies({
    pending,
    messageId: "assistant-1",
    uiLanguage: "en"
  }),
  [
    {
      id: "relay",
      label: "Relay server",
      value: "Use a small relay server for MVP sync."
    }
  ]
);

assert.deepEqual(
  getContexCodeQuickReplies({
    pending,
    messageId: "assistant-2",
    uiLanguage: "en"
  }),
  []
);

assert.deepEqual(
  getContexCodeQuickReplies({
    pending: null,
    messageId: "assistant-1",
    uiLanguage: "en"
  }),
  []
);

console.log("contexCodeQuickRepliesRenderer tests passed");
