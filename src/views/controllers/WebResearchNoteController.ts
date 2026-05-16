import type { CreateNoteProposal } from "../../modals/CreateNoteModal";
import {
  buildWebResearchNoteContent,
  buildWebResearchSourceContext
} from "../../web/webResearchNote";
import type {
  ChatMessage,
  SelectedTextContext,
  WebSearchResult
} from "../../types";
import { slugifyTitle } from "../createNotePathUtils";

export type WebResearchNoteControllerDeps = {
  projectResearchFolder: string;
  setError: (error: string | null) => void;
  getUniqueNotePath: (path: string) => Promise<string>;
  formatWebSearchContext: (results: WebSearchResult[]) => string;
  applyCreateNoteProposal: (
    proposal: CreateNoteProposal,
    sourceContext: SelectedTextContext,
    userPrompt?: string
  ) => Promise<void>;
  openCreateNoteModal: (options: {
    title: string;
    createButtonText: string;
    proposal: CreateNoteProposal;
    onApply: (proposal: CreateNoteProposal) => Promise<void>;
  }) => void;
};

export class WebResearchNoteController {
  constructor(private readonly deps: WebResearchNoteControllerDeps) {}

  async createWebResearchNote(message: ChatMessage): Promise<void> {
    const query = message.webResearchQuery ?? "Web research";
    const searchQuery = message.webSearchQuery ?? query;
    const results = message.webResearchResults ?? [];

    if (!results.length) {
      this.deps.setError("There are no web sources to save yet.");
      return;
    }

    const content = buildWebResearchNoteContent({
      query,
      searchQuery,
      summary: message.content,
      checkedDate: new Date().toISOString().slice(0, 10),
      results
    });
    const sourceContext = buildWebResearchSourceContext({
      query,
      contentLength: content.length,
      results,
      formatWebSearchContext: this.deps.formatWebSearchContext
    });
    const proposal: CreateNoteProposal = {
      path: await this.deps.getUniqueNotePath(
        `${this.deps.projectResearchFolder}/${slugifyTitle(query)}.md`
      ),
      content
    };

    this.deps.openCreateNoteModal({
      title: "Create Research Note",
      createButtonText: "Create",
      proposal,
      onApply: async (proposal) => {
        await this.deps.applyCreateNoteProposal(
          proposal,
          sourceContext,
          `Research web: ${query}`
        );
      }
    });
  }
}
