import type {
  ChatMessage,
  ContexSettings,
  LlmRequestContext,
  VaultSearchResult,
  WebSearchResult
} from "../../types";
import type {
  AutoWebContext,
  AutoWebDecision
} from "../sidebarTypes";
import {
  attachProjectMemoryToRequest
} from "../../chat/chatRequestContext";
import {
  buildAutoWebContext,
  type AutoWebWorkflowPlan
} from "../../chat/autoWebContextBuilder";
import {
  buildProjectMemoryContext,
  type ProjectMemoryFileLike
} from "../../chat/projectMemoryContext";
import {
  formatSemanticVaultContext
} from "../../search/semanticVaultSearch";
import {
  buildSemanticVaultSectionContext as buildSemanticVaultSectionContextBundle,
  type RelevantMarkdownSection,
  type SemanticVaultSectionContextBundle
} from "../../search/semanticVaultSectionContext";
import {
  fallbackWebResearchQuery,
  parseSemanticQueryVariants,
  parseWebResearchQueryRewrite
} from "../../search/queryHelpers";
import {
  summarizeWebResearch as summarizeWebResearchWithContext
} from "../../web/webResearchSummary";

type AutoWebTimelineType = "searching" | "done" | "failed";

export interface WebSearchResponse {
  provider: string;
  fallbackReason?: string;
  results: WebSearchResult[];
}

export interface ContextAssemblyControllerDeps<
  TFile extends ProjectMemoryFileLike,
  TSettings extends Pick<ContexSettings, "webSearchEnabled">
> {
  settings: TSettings;
  requestLlmChatCompletion: (
    settings: TSettings,
    messages: ChatMessage[],
    context?: LlmRequestContext | null
  ) => Promise<string>;
  getMarkdownFiles: () => TFile[];
  getFileByPath: (path: string) => TFile | null;
  readFile: (file: TFile) => Promise<string>;
  extractRelevantMarkdownSections: (
    content: string,
    query: string,
    result: VaultSearchResult
  ) => RelevantMarkdownSection[];
  formatWebSearchContext: (results: WebSearchResult[]) => string;
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
  searchWeb: (
    settings: TSettings,
    searchQuery: string
  ) => Promise<WebSearchResponse>;
  setStatus?: (status: string) => void;
  pushActionTimeline?: (
    type: AutoWebTimelineType,
    label: string,
    detail?: string
  ) => void;
  warn?: (label: string, error: unknown) => void;
  getErrorMessage?: (error: unknown) => string;
}

export class ContextAssemblyController<
  TFile extends ProjectMemoryFileLike,
  TSettings extends Pick<ContexSettings, "webSearchEnabled"> = ContexSettings
> {
  constructor(
    private readonly deps: ContextAssemblyControllerDeps<TFile, TSettings>
  ) {}

  async rewriteWebResearchQuery(query: string): Promise<string> {
    const fallbackQuery = fallbackWebResearchQuery(query);

    try {
      const response = await this.deps.requestLlmChatCompletion(
        this.deps.settings,
        [
          {
            id: `${Date.now()}-web-query-rewrite`,
            role: "user",
            content: [
              "Rewrite this user web research request into one precise search engine query.",
              "Disambiguate 'local LLM' as locally running large language models, not local city news.",
              "Preserve named entities and technical terms.",
              "If the user asks for latest/current/news, include the current year or date.",
              "For news/latest requests, prefer terms like release, announcement, changelog, model release, and official blog over best/guide/roundup.",
              "Return JSON only with this shape:",
              '{"query":"..."}',
              `Current date: ${new Date().toISOString().slice(0, 10)}`,
              "",
              "User request:",
              query
            ].join("\n"),
            createdAt: Date.now()
          }
        ]
      );

      return parseWebResearchQueryRewrite(response, fallbackQuery);
    } catch (error) {
      this.deps.warn?.("[Mindo] Web query rewrite failed", error);
      return fallbackQuery;
    }
  }

  async expandSemanticVaultQuery(query: string): Promise<string[]> {
    try {
      const response = await this.deps.requestLlmChatCompletion(
        this.deps.settings,
        [
          {
            id: `${Date.now()}-semantic-query-expansion`,
            role: "user",
            content: [
              "Expand this Obsidian vault search query into short search variants.",
              "Return JSON only with this shape:",
              '{"queries":["...","..."]}',
              "Include synonyms, project names, likely headings, and Russian/English variants when useful.",
              "Keep each query under 8 words.",
              "",
              "Query:",
              query
            ].join("\n"),
            createdAt: Date.now()
          }
        ]
      );

      return parseSemanticQueryVariants(response);
    } catch (error) {
      this.deps.warn?.("[Mindo] Semantic query expansion failed", error);
      return [];
    }
  }

  async answerSemanticVaultQuestion(
    query: string,
    results: VaultSearchResult[],
    sourceContextOverride?: string
  ): Promise<string> {
    const sourceContext =
      sourceContextOverride ||
      (await this.buildSemanticVaultSectionContext(query, results)).context ||
      formatSemanticVaultContext(results);

    return this.deps.requestLlmChatCompletion(this.deps.settings, [
      {
        id: `${Date.now()}-semantic-vault-answer`,
        role: "user",
        content: [
          "Answer the user's question using only the provided Obsidian vault sources.",
          "If sources are weak or incomplete, say that clearly.",
          "Use concise Markdown. Do not include a Sources section; the UI renders note sources separately.",
          "Prefer extracted sections over short snippets.",
          "Do not invent facts not present in the sources.",
          "",
          "Question:",
          query,
          "",
          "Vault sources and extracted sections:",
          sourceContext
        ].join("\n"),
        createdAt: Date.now()
      }
    ]);
  }

  buildSemanticVaultSectionContext(
    query: string,
    results: VaultSearchResult[]
  ): Promise<SemanticVaultSectionContextBundle> {
    return buildSemanticVaultSectionContextBundle({
      query,
      results,
      getFileByPath: this.deps.getFileByPath,
      readFile: this.deps.readFile,
      extractRelevantMarkdownSections: this.deps.extractRelevantMarkdownSections,
      formatSemanticVaultContext
    });
  }

  summarizeWebResearch(
    query: string,
    results: WebSearchResult[],
    searchQuery?: string
  ): Promise<string> {
    return summarizeWebResearchWithContext({
      query,
      results,
      searchQuery,
      settings: this.deps.settings,
      formatWebSearchContext: this.deps.formatWebSearchContext,
      requestLlmChatCompletion: this.deps.requestLlmChatCompletion
    });
  }

  buildAutoWebContextForRequest(
    userRequest: string,
    context?: LlmRequestContext | null
  ): Promise<AutoWebContext | null> {
    return buildAutoWebContext({
      userRequest,
      context,
      settings: this.deps.settings,
      isLocalOnlyCommandText: this.deps.isLocalOnlyCommandText,
      planContextWorkflow: this.deps.planContextWorkflow,
      decideAutoWebResearch: this.deps.decideAutoWebResearch,
      buildAutoWebResearchQuery: this.deps.buildAutoWebResearchQuery,
      rewriteWebResearchQuery: (query) => this.rewriteWebResearchQuery(query),
      searchWeb: this.deps.searchWeb,
      onStatus: this.deps.setStatus,
      onTimeline: this.deps.pushActionTimeline,
      onError: (error) =>
        this.deps.warn?.("[Mindo] Auto web research failed", error),
      getErrorMessage: this.deps.getErrorMessage
    });
  }

  async attachProjectMemoryContext(
    context: LlmRequestContext | null
  ): Promise<LlmRequestContext | null> {
    if (context?.projectMemory?.trim()) {
      return context;
    }

    const projectMemory = await this.readProjectMemoryContext();

    return attachProjectMemoryToRequest(context, projectMemory);
  }

  readProjectMemoryContext(): Promise<string | null> {
    return buildProjectMemoryContext({
      files: this.deps.getMarkdownFiles(),
      readFile: this.deps.readFile,
      onReadError: (file, error) =>
        this.deps.warn?.(
          `[Mindo] Could not read project memory ${file.path}`,
          error
        )
    });
  }
}
