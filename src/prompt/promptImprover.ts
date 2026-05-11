import type { ChatMessage } from "../types";

export function buildPromptImprovementMessages(prompt: string): ChatMessage[] {
  return [
    {
      id: `prompt-improve-${Date.now()}`,
      role: "user",
      content: [
        "Rewrite the following user prompt for an Obsidian AI agent.",
        "Preserve the user's intent, language, concrete constraints, file/folder names, and requested actions.",
        "Make the prompt clearer, more specific, and easier for the agent to execute.",
        "Return only the improved prompt text. Do not add explanations, headings, quotes, or code fences.",
        "",
        "Prompt:",
        prompt
      ].join("\n"),
      createdAt: Date.now()
    }
  ];
}

export function cleanImprovedPrompt(value: string): string {
  let cleaned = value.trim();

  cleaned = cleaned.replace(/^```(?:\w+)?\s*/i, "").replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}
