import type { App } from "obsidian";
import {
  createSemanticVaultAssistantMessage,
  createSlashCommandUserMessage,
  createVaultSearchAssistantMessage,
  createWebResearchAssistantMessage
} from "../../chat/searchCommandMessages";
import type {
  ChatMessage,
  ContexSettings,
  VaultSearchResult,
  VaultSourceSection,
  WebSearchResult
} from "../../types";

interface WebSearchResponse {
  provider: string;
  fallbackReason?: string;
  results: WebSearchResult[];
}

interface SemanticVaultSectionContextBundle {
  context: string;
  sections: VaultSourceSection[];
}

export interface SearchCommandControllerOptions {
  app: App;
  settings: ContexSettings;
  getMessages: () => ChatMessage[];
  clearInput: () => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  renderMessages: () => Promise<void> | void;
  getErrorMessage: (error: unknown) => string;
  rememberVaultSearch: (
    query: string,
    results: VaultSearchResult[]
  ) => void;
  searchVaultMarkdown: (
    app: App,
    query: string
  ) => Promise<VaultSearchResult[]>;
  formatVaultSearchResults: (results: VaultSearchResult[]) => string;
  searchWeb: (
    settings: ContexSettings,
    query: string
  ) => Promise<WebSearchResponse>;
  formatWebSearchResults: (
    query: string,
    results: WebSearchResult[],
    provider?: string,
    fallbackReason?: string
  ) => string;
  rewriteWebResearchQuery: (query: string) => Promise<string>;
  summarizeWebResearch: (
    query: string,
    results: WebSearchResult[],
    searchQuery?: string
  ) => Promise<string>;
  expandSemanticVaultQuery: (query: string) => Promise<string[]>;
  searchSemanticVaultMarkdown: (
    app: App,
    query: string,
    queryVariants: string[],
    limit: number,
    settings: ContexSettings
  ) => Promise<VaultSearchResult[]>;
  buildSemanticVaultSectionContext: (
    query: string,
    results: VaultSearchResult[]
  ) => Promise<SemanticVaultSectionContextBundle>;
  answerSemanticVaultQuestion: (
    query: string,
    results: VaultSearchResult[],
    sourceContextOverride?: string
  ) => Promise<string>;
}

export class SearchCommandController {
  constructor(private readonly options: SearchCommandControllerOptions) {}

  async sendVaultSearch(query: string): Promise<void> {
    if (!query) {
      return;
    }

    const messages = this.options.getMessages();
    messages.push(
      createSlashCommandUserMessage({
        command: "search",
        query,
        messageIndex: messages.length
      })
    );

    this.options.clearInput();
    this.options.setError(null);
    this.options.setLoading(true);

    try {
      const results = await this.options.searchVaultMarkdown(
        this.options.app,
        query
      );
      this.options.rememberVaultSearch(query, results);
      messages.push(
        createVaultSearchAssistantMessage({
          content: this.options.formatVaultSearchResults(results),
          query,
          results,
          messageIndex: messages.length
        })
      );
      this.options.setStatus("Status: Ready");
    } catch (error) {
      this.options.setError(this.options.getErrorMessage(error));
      this.options.setStatus("Status: Search failed");
    } finally {
      this.options.setLoading(false);
      await this.options.renderMessages();
    }
  }

  async sendWebResearch(query: string): Promise<void> {
    if (!query) {
      return;
    }

    const messages = this.options.getMessages();
    messages.push(
      createSlashCommandUserMessage({
        command: "web",
        query,
        messageIndex: messages.length
      })
    );

    this.options.clearInput();
    this.options.setError(null);
    this.options.setLoading(true);
    this.options.setStatus("Status: Searching web");

    try {
      const searchQuery = await this.options.rewriteWebResearchQuery(query);
      const response = await this.options.searchWeb(
        this.options.settings,
        searchQuery
      );
      const results = response.results;
      const content = results.length
        ? await this.options.summarizeWebResearch(query, results, searchQuery)
        : this.options.formatWebSearchResults(
            searchQuery,
            results,
            response.provider,
            response.fallbackReason
          );

      messages.push(
        createWebResearchAssistantMessage({
          content,
          query,
          searchQuery,
          results,
          provider: response.provider,
          fallbackReason: response.fallbackReason,
          messageIndex: messages.length
        })
      );
      this.options.setStatus("Status: Ready");
    } catch (error) {
      this.options.setError(this.options.getErrorMessage(error));
      this.options.setStatus("Status: Web research failed");
    } finally {
      this.options.setLoading(false);
      await this.options.renderMessages();
    }
  }

  async sendSemanticVaultQuestion(query: string): Promise<void> {
    if (!query) {
      return;
    }

    const messages = this.options.getMessages();
    messages.push(
      createSlashCommandUserMessage({
        command: "rag",
        query,
        messageIndex: messages.length
      })
    );

    this.options.clearInput();
    this.options.setError(null);
    this.options.setLoading(true);
    this.options.setStatus("Status: Semantic vault search");

    try {
      const variants = await this.options.expandSemanticVaultQuery(query);
      const results = await this.options.searchSemanticVaultMarkdown(
        this.options.app,
        query,
        variants,
        8,
        this.options.settings
      );
      const sectionBundle = results.length
        ? await this.options.buildSemanticVaultSectionContext(query, results)
        : { context: "", sections: [] };
      const content = results.length
        ? await this.options.answerSemanticVaultQuestion(
            query,
            results,
            sectionBundle.context
          )
        : `No semantically related notes found for "${query}".`;

      this.options.rememberVaultSearch(query, results);
      messages.push(
        createSemanticVaultAssistantMessage({
          content,
          query,
          results,
          sections: sectionBundle.sections,
          messageIndex: messages.length
        })
      );
      this.options.setStatus("Status: Ready");
    } catch (error) {
      this.options.setError(this.options.getErrorMessage(error));
      this.options.setStatus("Status: Semantic search failed");
    } finally {
      this.options.setLoading(false);
      await this.options.renderMessages();
    }
  }
}
