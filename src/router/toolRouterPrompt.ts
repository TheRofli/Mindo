import type { VaultCandidate } from "./vaultCandidates";

export interface ToolRouterPromptInput {
  userText: string;
  activeNotePath: string | null;
  candidates: VaultCandidate[];
}

export function buildToolRouterPrompt(input: ToolRouterPromptInput): string {
  return [
    "You are Contex Tool Router.",
    "Return JSON only.",
    "Do not answer the user conversationally.",
    "Choose actions by meaning, including corrected phrases like actually, no wait, instead, точнее, нет, лучше.",
    "If the user corrects themselves, prefer the final corrected intent.",
    "Use provided vault candidates when opening or editing existing notes.",
    "Supported actions: open_file, create_note, research_note, replace_text, replace_selection, search_vault, research_web, update_note, read_last_answer, stop_speaking, none.",
    "For multiple user requests, return {\"actions\":[...]}.",
    "For create_note or research_note, include query with the full final user request and folder/title hints if present.",
    `Active note: ${input.activeNotePath ?? "none"}`,
    "Vault candidates:",
    ...input.candidates.map(
      (candidate, index) =>
        `${index + 1}. ${candidate.path} | folder=${candidate.folder} | title=${candidate.basename} | score=${candidate.score}`
    ),
    "User text:",
    input.userText
  ].join("\n");
}
