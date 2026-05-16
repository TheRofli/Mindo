import type {
  SemanticLocalCommand,
  SemanticVoiceTextReplacement
} from "../views/semanticLocalCommandPlan";

export interface SemanticLocalCommandExecutorHandlers {
  previewTextReplacement: (
    commandText: string,
    replacement: SemanticVoiceTextReplacement
  ) => Promise<unknown>;
  previewMultiTextReplacement: (
    commandText: string,
    replacements: SemanticVoiceTextReplacement[]
  ) => Promise<unknown>;
  previewSelectionOrLineReplacement: (
    commandText: string,
    replacement: string
  ) => Promise<unknown>;
  openFileByQuery: (query: string, commandText: string) => Promise<unknown>;
  openLastFile: (commandText: string) => Promise<unknown>;
  sendVaultSearch: (query: string) => Promise<unknown>;
  sendSemanticVaultQuestion: (query: string) => Promise<unknown>;
  sendWebResearch: (query: string) => Promise<unknown>;
  createResearchNote: (
    commandText: string,
    displayText: string
  ) => Promise<unknown>;
  createNote: (commandText: string) => Promise<unknown>;
  updateCurrentNote: (commandText: string) => Promise<unknown>;
  speakLatestAssistantMessage: () => Promise<unknown>;
  stopSpeaking: () => void;
}

export async function executeSemanticLocalCommand(
  command: SemanticLocalCommand,
  commandText: string,
  handlers: SemanticLocalCommandExecutorHandlers
): Promise<boolean> {
  if (command.action === "replace_text") {
    const replacements = command.replacements?.length
      ? command.replacements
      : command.original && command.suggested
        ? [
            {
              original: command.original,
              suggested: command.suggested
            }
          ]
        : [];

    if (!replacements.length) {
      return false;
    }

    if (replacements.length === 1) {
      await handlers.previewTextReplacement(commandText, replacements[0]);
      return true;
    }

    await handlers.previewMultiTextReplacement(commandText, replacements);
    return true;
  }

  if (command.action === "replace_selection" && command.suggested) {
    await handlers.previewSelectionOrLineReplacement(
      commandText,
      command.suggested
    );
    return true;
  }

  if (command.action === "open_file" && command.query) {
    await handlers.openFileByQuery(command.query, commandText);
    return true;
  }

  if (command.action === "open_last_file") {
    await handlers.openLastFile(commandText);
    return true;
  }

  if (command.action === "search_vault" && command.query) {
    await handlers.sendVaultSearch(command.query);
    return true;
  }

  if (command.action === "semantic_vault" && command.query) {
    await handlers.sendSemanticVaultQuestion(command.query);
    return true;
  }

  if (command.action === "research_web" && command.query) {
    await handlers.sendWebResearch(command.query);
    return true;
  }

  if (command.action === "research_note") {
    await handlers.createResearchNote(commandText, commandText);
    return true;
  }

  if (command.action === "create_note") {
    await handlers.createNote(commandText);
    return true;
  }

  if (command.action === "update_note") {
    await handlers.updateCurrentNote(commandText);
    return true;
  }

  if (command.action === "read_last_answer") {
    await handlers.speakLatestAssistantMessage();
    return true;
  }

  if (command.action === "stop_speaking") {
    handlers.stopSpeaking();
    return true;
  }

  return false;
}
