import {
  appendContexCodePlanningQuestion,
  buildContexCodePlanDraftPromptFromInterview,
  buildContexCodePlanningInterview,
  buildContexCodePlanningInterviewPrompt,
  buildContexCodePlanningNextQuestionPrompt,
  ContexCodeCommandController,
  completeContexCodePlanningInterview,
  formatContexCodePlanningAnswers,
  getContexCodePlanningQuestion,
  parseContexCodePlanningInterviewResponse,
  parseContexCodePlanningNextQuestionResponse,
  renderContexCodePlanningQuestion,
  type ContexCodeActionResult,
  type ContexCodeAppLike,
  type ContexCodeFileLike,
  type ContexCodePlanningAnswer,
  type ContexCodePlanningInterview,
  type ContexCodePlan
} from "../../contexCode";
import { cleanJsonLikeResponse } from "../../llm/jsonResponse";
import type { ChatMessage, ContexSettings } from "../../types";
import type { UiLanguage } from "../../i18n";

export const DEFAULT_CONTEXT_CODE_PLANNING_QUESTIONS = 4;

export interface PendingContexCodeInterviewState {
  file: ContexCodeFileLike;
  markdown: string;
  interview: ContexCodePlanningInterview;
  currentQuestionIndex: number;
  answers: ContexCodePlanningAnswer[];
  questionMessageId: string | null;
}

export interface ContexCodeWorkflowControllerDeps {
  app: ContexCodeAppLike;
  settings: ContexSettings;
  getUiLanguage: () => UiLanguage;
  requestCompletion?: (
    settings: ContexSettings,
    messages: ChatMessage[]
  ) => Promise<string>;
  maxQuestions?: number;
  resolveFileByPath?: (
    path: string,
    fallback: ContexCodeFileLike
  ) => ContexCodeFileLike;
  warn?: (message: string, error: unknown) => void;
}

export interface ContexCodeNextQuestionResult {
  readyToPlan: boolean;
  summary?: string;
  hasQuestion: boolean;
}

export type ContexCodePendingInterviewAdvanceResult =
  | {
      kind: "question";
      content: string;
    }
  | {
      kind: "plan";
      result: ContexCodeActionResult & { plan: ContexCodePlan };
    };

export type ContexCodePlanningStartResult =
  | {
      kind: "question";
      pending: PendingContexCodeInterviewState;
      content: string;
    }
  | {
      kind: "plan";
      result: ContexCodeActionResult & { plan: ContexCodePlan };
    };

export class ContexCodeWorkflowController {
  private readonly requestCompletion: (
    settings: ContexSettings,
    messages: ChatMessage[]
  ) => Promise<string>;
  private readonly maxQuestions: number;

  constructor(private readonly deps: ContexCodeWorkflowControllerDeps) {
    this.requestCompletion =
      deps.requestCompletion ??
      (async () => {
        throw new Error("Mindo Code LLM request dependency is not configured.");
      });
    this.maxQuestions =
      deps.maxQuestions ?? DEFAULT_CONTEXT_CODE_PLANNING_QUESTIONS;
  }

  async buildPlanDraftForFile(
    file: ContexCodeFileLike,
    options: {
      markdown: string;
      interview?: ContexCodePlanningInterview | null;
      answers?: string;
    }
  ): Promise<unknown | null> {
    try {
      const response = await this.requestCompletion(this.deps.settings, [
        {
          id: `${Date.now()}-contex-code-plan-draft`,
          role: "user",
          content: buildContexCodePlanDraftPromptFromInterview({
            path: file.path,
            markdown: options.markdown,
            interview: options.interview,
            answers: options.answers,
            uiLanguage: this.deps.getUiLanguage()
          }),
          createdAt: Date.now()
        }
      ]);

      return JSON.parse(cleanJsonLikeResponse(response));
    } catch (error) {
      this.deps.warn?.(
        "[Mindo] Falling back to heuristic Mindo Code plan",
        error
      );
      return null;
    }
  }

  createCommandController(): ContexCodeCommandController {
    return new ContexCodeCommandController(
      this.deps.app,
      this.deps.settings,
      this.deps.getUiLanguage()
    );
  }

  createCommandControllerForFile(
    file: ContexCodeFileLike
  ): ContexCodeCommandController {
    const appLike: ContexCodeAppLike = {
      vault: {
        adapter: this.deps.app.vault.adapter,
        read: async (target) => {
          const vaultFile = this.resolveTargetFile(target.path, file);
          return this.deps.app.vault.read(vaultFile);
        },
        modify: async (target, content) => {
          const vaultFile = this.resolveTargetFile(target.path, file);
          await this.deps.app.vault.modify(vaultFile, content);
        }
      },
      workspace: {
        getActiveFile: () => file
      }
    };

    return new ContexCodeCommandController(
      appLike,
      this.deps.settings,
      this.deps.getUiLanguage()
    );
  }

  async buildAdaptivePlanningInterviewForFile(
    file: ContexCodeFileLike,
    markdown: string
  ): Promise<ContexCodePlanningInterview> {
    const fallbackInterview = buildContexCodePlanningInterview({
      path: file.path,
      markdown,
      uiLanguage: this.deps.getUiLanguage()
    });

    try {
      const response = await this.requestCompletion(this.deps.settings, [
        {
          id: `${Date.now()}-contex-code-planning-interview`,
          role: "user",
          content: buildContexCodePlanningInterviewPrompt({
            path: file.path,
            markdown,
            fallbackInterview,
            uiLanguage: this.deps.getUiLanguage()
          }),
          createdAt: Date.now()
        }
      ]);

      return parseContexCodePlanningInterviewResponse(
        response,
        fallbackInterview
      );
    } catch {
      return fallbackInterview;
    }
  }

  async startPlanningForFile(
    file: ContexCodeFileLike,
    markdown: string
  ): Promise<ContexCodePlanningStartResult> {
    const interview = await this.buildAdaptivePlanningInterviewForFile(
      file,
      markdown
    );

    if (!interview.readyToPlan) {
      const pending: PendingContexCodeInterviewState = {
        file,
        markdown,
        interview,
        currentQuestionIndex: 0,
        answers: [],
        questionMessageId: null
      };

      return {
        kind: "question",
        pending,
        content: renderContexCodePlanningQuestion(
          interview,
          0,
          this.deps.getUiLanguage()
        )
      };
    }

    const planDraft = await this.buildPlanDraftForFile(file, {
      markdown,
      interview,
      answers: ""
    });
    const result = await this
      .createCommandControllerForFile(file)
      .createPlan(planDraft);

    return {
      kind: "plan",
      result
    };
  }

  async buildNextAdaptivePlanningQuestion(
    pending: PendingContexCodeInterviewState
  ): Promise<ContexCodeNextQuestionResult> {
    const response = await this.requestCompletion(this.deps.settings, [
      {
        id: `${Date.now()}-contex-code-planning-next-question`,
        role: "user",
        content: buildContexCodePlanningNextQuestionPrompt({
          path: pending.file.path,
          markdown: pending.markdown,
          interview: pending.interview,
          answers: formatContexCodePlanningAnswers(
            pending.interview,
            pending.answers
          ),
          maxQuestions: this.maxQuestions,
          uiLanguage: this.deps.getUiLanguage()
        }),
        createdAt: Date.now()
      }
    ]);
    const decision = parseContexCodePlanningNextQuestionResponse(response);

    if (decision.readyToPlan) {
      pending.interview = completeContexCodePlanningInterview(
        pending.interview,
        decision.summary
      );
      return {
        readyToPlan: true,
        summary: decision.summary,
        hasQuestion: false
      };
    }

    if (!decision.question) {
      return {
        readyToPlan: false,
        summary: decision.summary,
        hasQuestion: false
      };
    }

    const askedQuestions = pending.interview.questions.slice(
      0,
      pending.currentQuestionIndex + 1
    );
    pending.interview = appendContexCodePlanningQuestion(
      {
        ...pending.interview,
        questions: askedQuestions
      },
      decision.question,
      decision.summary
    );
    pending.currentQuestionIndex = pending.interview.questions.length - 1;

    return {
      readyToPlan: false,
      summary: decision.summary,
      hasQuestion: true
    };
  }

  async advancePendingInterviewWithAnswer(
    pending: PendingContexCodeInterviewState,
    answer: string
  ): Promise<ContexCodePendingInterviewAdvanceResult> {
    const question = getContexCodePlanningQuestion(
      pending.interview,
      pending.currentQuestionIndex
    );

    if (question) {
      pending.answers.push({
        questionId: question.id,
        answer: answer.trim()
      });
    }

    const fallbackNextQuestionIndex = pending.currentQuestionIndex + 1;
    const shouldAskMore = pending.answers.length < this.maxQuestions;

    if (shouldAskMore) {
      try {
        const nextDecision = await this.buildNextAdaptivePlanningQuestion(pending);
        if (!nextDecision.readyToPlan && nextDecision.hasQuestion) {
          return {
            kind: "question",
            content: renderContexCodePlanningQuestion(
              pending.interview,
              pending.currentQuestionIndex,
              this.deps.getUiLanguage()
            )
          };
        }
      } catch {
        // Fall through to the deterministic fallback questions below.
      }
    }

    if (
      !pending.interview.readyToPlan &&
      fallbackNextQuestionIndex < pending.interview.questions.length
    ) {
      pending.currentQuestionIndex = fallbackNextQuestionIndex;
      return {
        kind: "question",
        content: renderContexCodePlanningQuestion(
          pending.interview,
          fallbackNextQuestionIndex,
          this.deps.getUiLanguage()
        )
      };
    }

    const planDraft = await this.buildPlanDraftForFile(pending.file, {
      markdown: pending.markdown,
      interview: pending.interview,
      answers: formatContexCodePlanningAnswers(
        pending.interview,
        pending.answers
      )
    });
    const result = await this
      .createCommandControllerForFile(pending.file)
      .createPlan(planDraft);

    return {
      kind: "plan",
      result
    };
  }

  private resolveTargetFile(
    path: string,
    fallback: ContexCodeFileLike
  ): ContexCodeFileLike {
    if (path === fallback.path) {
      return fallback;
    }

    if (this.deps.resolveFileByPath) {
      return this.deps.resolveFileByPath(path, fallback);
    }

    throw new Error(`Mindo Code target file not found: ${path}`);
  }
}
