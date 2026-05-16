import assert from "node:assert/strict";
import { ContexCodeWorkflowController } from "../src/views/controllers/ContexCodeWorkflowController";
import { DEFAULT_SETTINGS, type ChatMessage } from "../src/types";
import type {
  ContexCodeAppLike,
  ContexCodePlanningInterview
} from "../src/contexCode";

const projectFile = {
  path: "Projects/LiveCollab.md",
  basename: "LiveCollab",
  name: "LiveCollab.md"
};

const fakeApp: ContexCodeAppLike = {
  vault: {
    adapter: {
      read: async () => "",
      write: async () => {},
      exists: async () => false,
      mkdir: async () => {},
      list: async () => ({ files: [], folders: [] })
    },
    read: async () => "# LiveCollab\n\nCollaborative markdown workspace.",
    modify: async () => {}
  },
  workspace: {
    getActiveFile: () => projectFile
  }
};

const baseInterview: ContexCodePlanningInterview = {
  projectTitle: "LiveCollab",
  projectNotePath: projectFile.path,
  summary: "Collaborative Obsidian workspace.",
  readyToPlan: false,
  questions: [
    {
      id: "sync_architecture",
      label: "Синхронизация",
      question: "Какой способ синхронизации нужен для MVP?",
      reason: "Это влияет на архитектуру.",
      options: [
        {
          id: "relay",
          label: "Relay server",
          value: "Use a simple WebSocket relay for MVP."
        }
      ]
    }
  ]
};

function createController(
  requestCompletion: (messages: ChatMessage[]) => Promise<string>
): ContexCodeWorkflowController {
  return new ContexCodeWorkflowController({
    app: fakeApp,
    settings: DEFAULT_SETTINGS,
    getUiLanguage: () => "ru",
    requestCompletion: async (_settings, messages) => requestCompletion(messages)
  });
}

{
  const prompts: string[] = [];
  const controller = createController(async (messages) => {
    prompts.push(String(messages[0].content));
    return "```json\n{\"title\":\"LiveCollab\",\"phases\":[]}\n```";
  });

  const draft = await controller.buildPlanDraftForFile(projectFile, {
    markdown: "# LiveCollab"
  });

  assert.deepEqual(draft, { title: "LiveCollab", phases: [] });
  assert.match(prompts[0], /Projects\/LiveCollab\.md/);
}

{
  const controller = createController(async () => {
    throw new Error("network down");
  });

  const draft = await controller.buildPlanDraftForFile(projectFile, {
    markdown: "# LiveCollab"
  });

  assert.equal(draft, null);
}

{
  const controller = createController(async () => {
    throw new Error("network down");
  });

  const interview = await controller.buildAdaptivePlanningInterviewForFile(
    projectFile,
    "# LiveCollab\n\nProject note."
  );

  assert.equal(interview.projectNotePath, projectFile.path);
  assert.ok(interview.questions.length > 0);
}

{
  const controller = createController(async () =>
    JSON.stringify({
      readyToPlan: false,
      summary: "Need one more decision.",
      question: {
        id: "privacy_model",
        label: "Приватность",
        question: "Какая модель приватности нужна?",
        reason: "Это влияет на хранение данных.",
        options: [
          {
            id: "local_first",
            label: "Local-first",
            value: "Keep all notes local by default."
          }
        ]
      }
    })
  );
  const pending = {
    file: projectFile,
    markdown: "# LiveCollab",
    interview: baseInterview,
    currentQuestionIndex: 0,
    answers: [
      {
        questionId: "sync_architecture",
        answer: "Use WebSocket relay for MVP."
      }
    ],
    questionMessageId: "q1"
  };

  const decision = await controller.buildNextAdaptivePlanningQuestion(pending);

  assert.equal(decision.readyToPlan, false);
  assert.equal(decision.hasQuestion, true);
  assert.equal(pending.currentQuestionIndex, 1);
  assert.equal(pending.interview.questions[1].id, "privacy_model");
}

{
  const controller = createController(async () =>
    JSON.stringify({
      readyToPlan: true,
      summary: "Enough architecture detail is known.",
      question: null
    })
  );
  const pending = {
    file: projectFile,
    markdown: "# LiveCollab",
    interview: baseInterview,
    currentQuestionIndex: 0,
    answers: [
      {
        questionId: "sync_architecture",
        answer: "Use WebSocket relay for MVP."
      }
    ],
    questionMessageId: "q1"
  };

  const decision = await controller.buildNextAdaptivePlanningQuestion(pending);

  assert.equal(decision.readyToPlan, true);
  assert.equal(decision.hasQuestion, false);
  assert.equal(pending.interview.readyToPlan, true);
}

{
  const controller = createController(async () =>
    JSON.stringify({
      readyToPlan: false,
      summary: "Need one more decision.",
      question: {
        id: "collab_transport",
        label: "Transport",
        question: "Should collaboration use WebSocket relay or peer-to-peer sync?",
        reason: "This changes the backend and privacy model.",
        options: [
          {
            id: "relay",
            label: "Relay",
            value: "Use a small WebSocket relay for MVP."
          }
        ]
      }
    })
  );
  const pending = {
    file: projectFile,
    markdown: "# LiveCollab",
    interview: baseInterview,
    currentQuestionIndex: 0,
    answers: [],
    questionMessageId: "q1"
  };

  const result = await controller.advancePendingInterviewWithAnswer(
    pending,
    "Use WebSocket relay for MVP."
  );

  assert.equal(result.kind, "question");
  assert.match(result.content, /Вопрос 2 из 2/);
  assert.equal(pending.answers[0].answer, "Use WebSocket relay for MVP.");
  assert.equal(pending.currentQuestionIndex, 1);
}

{
  const controller = createController(async () =>
    JSON.stringify({
      projectTitle: "LiveCollab",
      summary: "Collaborative Obsidian workspace.",
      readyToPlan: false,
      questions: [
        {
          id: "sync_architecture",
          label: "Синхронизация",
          question: "Какой способ синхронизации нужен для MVP?",
          reason: "Это влияет на архитектуру.",
          options: [
            {
              id: "relay",
              label: "Relay",
              value: "Use a simple WebSocket relay for MVP."
            }
          ]
        }
      ]
    })
  );

  const result = await controller.startPlanningForFile(projectFile, "# LiveCollab");

  assert.equal(result.kind, "question");
  assert.equal(result.pending.file.path, projectFile.path);
  assert.equal(result.pending.currentQuestionIndex, 0);
  assert.equal(result.pending.questionMessageId, null);
  assert.match(result.content, /Вопрос 1 из 1/);
}

console.log("contexCodeWorkflowController tests passed");
