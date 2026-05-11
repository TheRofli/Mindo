export interface NoteAction {
  id?: string;
  label: string;
  prompt: string;
  icon?: string;
  kind?:
    | "chat"
    | "improve-selection"
    | "expand-selection"
    | "create-note"
    | "remember-note"
    | "update-current-note"
    | "create-roadmap";
}

export const NOTE_ACTIONS: NoteAction[] = [
  {
    id: "explain-note",
    label: "Explain note",
    prompt:
      "Explain the current note in plain language. Highlight the important concepts, why they matter, and anything that seems unclear."
  },
  {
    id: "summarize-note",
    label: "Summarize note",
    prompt:
      "Summarize the current note in concise bullets. Include the main idea, key points, and any open questions."
  },
  {
    id: "create-roadmap",
    label: "Create roadmap",
    kind: "create-roadmap",
    prompt: ""
  },
  {
    id: "extract-tasks",
    label: "Extract tasks",
    prompt:
      "Extract actionable tasks from the current note. Use Markdown checkboxes. Include owners or dates only if they are explicitly present, and do not invent missing details."
  }
];

export const SELECTED_TEXT_ACTIONS: NoteAction[] = [
  {
    label: "Improve selection",
    icon: "sparkles",
    kind: "improve-selection",
    prompt:
      "Improve the selected Markdown text while preserving meaning and keeping the same language. Return only the improved Markdown replacement text. Do not add explanations, headings, quotes, or code fences."
  },
  {
    label: "Explain selection",
    icon: "help-circle",
    prompt:
      "Explain the selected text in plain language. Include the key idea, important details, and anything that may need clarification."
  },
  {
    label: "Expand selection",
    icon: "maximize-2",
    kind: "expand-selection",
    prompt:
      "Expand the selected text into a more complete idea while preserving the original meaning and tone. Return only the expanded Markdown replacement text. Do not add explanations, headings, quotes, or code fences."
  },
  {
    label: "Create note from selection",
    icon: "file-plus",
    kind: "create-note",
    prompt:
      "Create a new Markdown note from the selected text. Return JSON only with keys title, path, and content."
  }
];

export function getActionDescription(action: NoteAction): string {
  if (action.kind === "remember-note") {
    return "Save the active note as durable project memory.";
  }

  if (action.kind === "update-current-note") {
    return "Draft a safer, clearer replacement for the active note.";
  }

  if (action.kind === "create-roadmap") {
    return "Turn the active note into milestones, risks, and next actions.";
  }

  if (action.label === "Summarize note") {
    return "Summarize the active note into concise bullets.";
  }

  if (action.label === "Extract tasks") {
    return "Pull actionable tasks from the active note.";
  }

  if (action.label === "Explain note") {
    return "Explain the active note in plain language.";
  }

  return action.prompt;
}

export function getNoteActionId(action: NoteAction): string {
  if (action.id) {
    return action.id;
  }

  if (action.kind) {
    return action.kind;
  }

  return action.label.toLowerCase().replace(/\s+/g, "-");
}

export function getSuggestionTitle(action: NoteAction): string {
  if (action.kind === "remember-note" || action.kind === "update-current-note") {
    return "Active Note";
  }

  if (action.kind === "create-roadmap") {
    return "Project Roadmap";
  }

  if (action.label === "Summarize note") {
    return "Note Summary";
  }

  if (action.label === "Extract tasks") {
    return "Task Extraction";
  }

  if (action.label === "Explain note") {
    return "Plain Explanation";
  }

  return action.label;
}
