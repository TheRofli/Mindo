import type { App, TFile } from "obsidian";
import type { ChatMessage, ContexSettings } from "../../types";
import {
  parseSemanticLocalCommandPlan,
  type SemanticLocalCommand
} from "../semanticLocalCommandPlan";
import { buildToolRouterPrompt } from "../../router/toolRouterPrompt";
import { collectVaultCandidates } from "../../router/vaultCandidates";
import { buildVaultCandidatePromptContextFromPaths } from "../../router/vaultCandidatePromptContext";
import { buildSemanticLocalCommandPrompt } from "../../router/semanticLocalCommandPrompt";

export interface SemanticLocalCommandClassifierDeps {
  app: App;
  getSettings: () => ContexSettings;
  readActiveMarkdownNote: () => Promise<{
    file: TFile;
    content: string;
  } | null>;
  findLastMentionedMarkdownPaths: () => string[];
  getLastFoundFilePaths: () => string[];
  requestCompletion: (
    settings: ContexSettings,
    messages: ChatMessage[]
  ) => Promise<string>;
}

export class SemanticLocalCommandClassifier {
  constructor(private readonly deps: SemanticLocalCommandClassifierDeps) {}

  async classifyFirst(
    commandText: string,
    effectiveCommandText?: string
  ): Promise<SemanticLocalCommand | null> {
    const commands = await this.classifyPlan(commandText, effectiveCommandText);

    return commands?.[0] ?? null;
  }

  async classifyPlan(
    commandText: string,
    effectiveCommandText?: string
  ): Promise<SemanticLocalCommand[] | null> {
    const note = await this.deps.readActiveMarkdownNote();
    const mentionedPaths = this.deps.findLastMentionedMarkdownPaths().slice(0, 5);
    const lastResultPaths = this.deps.getLastFoundFilePaths().slice(0, 6);
    const routerUserText =
      effectiveCommandText && effectiveCommandText !== commandText
        ? `${commandText}\nCorrected/latest command segment: ${effectiveCommandText}`
        : commandText;
    const routerCandidates = collectVaultCandidates(
      this.deps.app,
      routerUserText,
      24
    );
    const toolRouterContext = buildToolRouterPrompt({
      userText: routerUserText,
      activeNotePath: note?.file.path ?? null,
      candidates: routerCandidates
    });
    const vaultCandidateContext =
      buildVaultCandidatePromptContextFromPaths(
        this.deps.app.vault.getMarkdownFiles().map((file) => file.path),
        commandText,
        effectiveCommandText,
        [
          note?.file.path ?? "",
          ...mentionedPaths,
          ...lastResultPaths
        ].filter(Boolean)
      );
    const prompt = buildSemanticLocalCommandPrompt({
      commandText,
      effectiveCommandText,
      activeNotePath: note?.file.path ?? null,
      activeNoteExcerpt: note?.content.slice(0, 4000) ?? "",
      mentionedPaths,
      lastResultPaths,
      toolRouterContext,
      vaultCandidateContext
    });
    const response = await this.deps.requestCompletion(this.deps.getSettings(), [
      {
        id: `${Date.now()}-semantic-local-command`,
        role: "user",
        content: prompt,
        createdAt: Date.now()
      }
    ]);

    return parseSemanticLocalCommandPlan(response);
  }
}
