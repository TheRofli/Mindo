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
    id: "vault-recall",
    label: "Ask your vault",
    prompt:
      "What have I already written about this? Answer from my vault and cite the notes you used."
  },
  {
    id: "connect-note",
    label: "Connect this note",
    prompt:
      "Connect this note to related notes in my vault. Explain the strongest links and cite the notes."
  },
  {
    id: "improve-draft",
    label: "Improve this draft",
    kind: "update-current-note",
    prompt:
      "Make this draft clearer. Show a preview/diff first and do not silently change the note."
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
  const actionId = getNoteActionId(action);

  if (actionId === "vault-recall") {
    return "Find what your notes already say about the current idea.";
  }

  if (actionId === "connect-note") {
    return "Find notes that connect to the active note.";
  }

  if (actionId === "improve-draft") {
    return "Draft a clearer version through preview/diff.";
  }

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
  const actionId = getNoteActionId(action);

  if (actionId === "vault-recall") {
    return "Vault Recall";
  }

  if (actionId === "connect-note") {
    return "Note Connections";
  }

  if (actionId === "improve-draft") {
    return "Draft Preview";
  }

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
