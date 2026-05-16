import type {
  ContexSettings,
  LlmRequestContext,
  WebSearchResult
} from "../types";
import type {
  AutoWebContext,
  AutoWebDecision
} from "../views/sidebarTypes";

export interface AutoWebWorkflowPlan {
  requiresWeb: boolean;
  reason: string;
}

export interface AutoWebSearchResponse {
  provider: string;
  fallbackReason?: string;
  results: WebSearchResult[];
}

type AutoWebTimelineType = "searching" | "done" | "failed";

export interface BuildAutoWebContextOptions<
  TSettings extends Pick<ContexSettings, "webSearchEnabled">
> {
  userRequest: string;
  context?: LlmRequestContext | null;
  settings: TSettings;
  isLocalOnlyCommandText: (userRequest: string) => boolean;
  planContextWorkflow: (userRequest: string) => AutoWebWorkflowPlan;
  decideAutoWebResearch: (
    userRequest: string,
    context?: LlmRequestContext | null
  ) => AutoWebDecision | null;
  buildAutoWebResearchQuery: (
    userRequest: string,
    context?: LlmRequestContext | null
  ) => string;
  rewriteWebResearchQuery: (query: string) => Promise<string>;
  searchWeb: (
    settings: TSettings,
    searchQuery: string
  ) => Promise<AutoWebSearchResponse>;
  onStatus?: (status: string) => void;
  onTimeline?: (
    type: AutoWebTimelineType,
    label: string,
    detail?: string
  ) => void;
  onError?: (error: unknown) => void;
  getErrorMessage?: (error: unknown) => string;
}

export async function buildAutoWebContext<
  TSettings extends Pick<ContexSettings, "webSearchEnabled">
>(
  options: BuildAutoWebContextOptions<TSettings>
): Promise<AutoWebContext | null> {
  if (options.isLocalOnlyCommandText(options.userRequest)) {
    return null;
  }

  const workflowPlan = options.planContextWorkflow(options.userRequest);
  const decision =
    options.decideAutoWebResearch(options.userRequest, options.context) ??
    (workflowPlan.requiresWeb
      ? {
          query: options.buildAutoWebResearchQuery(
            options.userRequest,
            options.context
          ),
          reason: workflowPlan.reason
        }
      : null);

  if (!decision || !options.settings.webSearchEnabled) {
    return null;
  }

  try {
    options.onStatus?.("Status: Checking current web");
    options.onTimeline?.("searching", "Checking current web", decision.query);

    const searchQuery = await options.rewriteWebResearchQuery(decision.query);
    const response = await options.searchWeb(options.settings, searchQuery);

    if (!response.results.length) {
      options.onTimeline?.(
        "done",
        "Web search returned no results",
        searchQuery
      );
      return null;
    }

    return {
      query: decision.query,
      searchQuery,
      reason: decision.reason,
      provider: response.provider,
      fallbackReason: response.fallbackReason,
      results: response.results
    };
  } catch (error) {
    const errorMessage =
      options.getErrorMessage?.(error) ??
      (error instanceof Error ? error.message : String(error));

    options.onTimeline?.(
      "failed",
      "Auto web research failed",
      errorMessage
    );
    options.onError?.(error);

    return null;
  }
}
