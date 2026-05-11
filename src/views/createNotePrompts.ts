export interface CreateNoteFromCommandPromptOptions {
  title: string;
  targetFolder: string;
  commandText: string;
  autoWebContextText?: string;
  projectMemoryText?: string;
  activeNotePath?: string | null;
  activeNoteExcerpt?: string;
  hasAttachments?: boolean;
}

export interface ResearchNotePromptOptions {
  title: string;
  commandText: string;
  targetFolder: string;
  projectMemoryText?: string;
  activeNoteContextText?: string;
  vaultContextText?: string;
  webContextText?: string;
  hasVaultResults: boolean;
  hasAttachments?: boolean;
  dateChecked: string;
}

export interface RefineResearchNotePromptOptions {
  commandText: string;
  sourceText: string;
  currentContent: string;
  instruction: string;
}

export interface CurrentNoteCreatePromptOptions {
  promptLines: string[];
  projectMemoryText?: string;
  currentNotePath: string;
  currentNoteContent: string;
}

export interface RefineCreateNotePromptOptions {
  selectedSourceText: string;
  currentPath: string;
  currentContent: string;
  instruction: string;
}

export interface RefineCurrentNotePromptOptions {
  fallbackFolder: string;
  sourcePath: string;
  sourceContent: string;
  currentPath: string;
  currentContent: string;
  instruction: string;
}

export function buildCreateNoteFromSelectionPrompt(selectedText: string): string {
  return [
    "Create a new Markdown note from the selected text.",
    "Return JSON only with this shape:",
    '{"title":"...","path":"Contex Inbox/... .md","content":"..."}',
    "Use a concise title. Put the note under Contex Inbox. Do not include code fences.",
    "",
    "Selected text:",
    selectedText
  ].join("\n");
}

export function buildCreateNoteFromCommandPrompt(
  options: CreateNoteFromCommandPromptOptions
): string {
  return [
    "Write a new Markdown note requested by the user.",
    "Output Markdown only. Do not output JSON. Do not wrap the answer in a code fence.",
    `The file already has the title heading "${options.title}", so do not repeat that heading.`,
    `The note must belong to this folder: ${options.targetFolder}`,
    "Treat the folder as storage metadata only. Never put the folder name in the note title, first heading, intro, or body unless the user explicitly asks to describe that folder.",
    "For example, if the user asks for a file with jokes in folder Test, the title/topic is Jokes/Анекдоты, not Jokes in folder Test/Анекдоты в папке Test.",
    "Use the user's requested title/content when present.",
    "If the user asks you to invent the title, infer a short human title from the topic/content. Never use command boilerplate like create file, current folder, this folder, or name the file yourself as the title.",
    "If the request refers to the active note, use the active note context.",
    "Do not write bare [Source N] labels. Use concrete Markdown links for web URLs and Obsidian wiki links for vault notes when useful.",
    options.hasAttachments
      ? "Use attached files as additional source/context when relevant."
      : "",
    "Do not include hidden TTS comments.",
    "",
    "User command:",
    options.commandText,
    "",
    options.autoWebContextText ?? "",
    "",
    options.projectMemoryText ?? "",
    "",
    "Active note path:",
    options.activeNotePath ?? "(none)",
    "",
    "Active note excerpt:",
    options.activeNoteExcerpt ?? ""
  ].join("\n");
}

export function buildResearchWorkflowSourceText(options: {
  commandText: string;
  vaultSourceText: string;
  webSourceText: string;
}): string {
  return [
    "User command:",
    options.commandText,
    "",
    "Vault sources:",
    options.vaultSourceText || "(none)",
    "",
    "Web sources:",
    options.webSourceText || "(none)"
  ].join("\n");
}

export function buildResearchNotePrompt(options: ResearchNotePromptOptions): string {
  return [
    "Create a high-quality Markdown research note requested by the user.",
    "Output Markdown only. Do not output JSON. Do not wrap the answer in a code fence.",
    `The file already has the title heading "${options.title}", so do not repeat that heading.`,
    "Treat the target folder as storage metadata only. Never include the folder name in the title, first heading, intro, or body unless the user explicitly asks to describe that folder.",
    "Use concise headings, practical recommendations, risks, and next actions.",
    "Use the supplied vault and web context. Cite concrete Markdown links or Obsidian wiki links when useful.",
    "Do not write bare [Source N] labels. A clickable source section will be appended automatically.",
    options.hasAttachments
      ? "Use attached files as additional source/context when relevant."
      : "",
    "Do not include hidden TTS comments.",
    "",
    `Date checked: ${options.dateChecked}`,
    "User request:",
    options.commandText,
    "",
    "Target folder:",
    options.targetFolder,
    "",
    options.projectMemoryText ?? "",
    "",
    options.activeNoteContextText ?? "",
    "",
    options.hasVaultResults
      ? ["Relevant vault sources:", options.vaultContextText ?? ""].join("\n")
      : "Relevant vault sources: none found.",
    "",
    options.webContextText ?? ""
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildCurrentNoteCreatePrompt(
  options: CurrentNoteCreatePromptOptions
): string {
  return [
    ...options.promptLines,
    "",
    options.projectMemoryText ?? "",
    "",
    "Current note path:",
    options.currentNotePath,
    "",
    "Current note content:",
    options.currentNoteContent
  ].join("\n");
}

export function buildRefineCreateNotePrompt(
  options: RefineCreateNotePromptOptions
): string {
  return [
    "Revise the proposed Markdown note based on the user's instruction.",
    "Return JSON only with this shape:",
    '{"title":"...","path":"Contex Inbox/... .md","content":"..."}',
    "Keep the note useful, concise, and in Markdown. Do not include code fences.",
    "",
    "Selected source text:",
    options.selectedSourceText,
    "",
    "Current file path:",
    options.currentPath,
    "",
    "Current note content:",
    options.currentContent,
    "",
    "User instruction:",
    options.instruction
  ].join("\n");
}

export function buildRefineCurrentNotePrompt(
  options: RefineCurrentNotePromptOptions
): string {
  return [
    "Revise the proposed Markdown note based on the user's instruction.",
    "Return JSON only with this shape:",
    `{"title":"...","path":"${options.fallbackFolder}/... .md","content":"..."}`,
    "Keep the note useful and safe to create. Do not include code fences or hidden TTS comments.",
    "",
    "Original source note path:",
    options.sourcePath,
    "",
    "Original source note content:",
    options.sourceContent,
    "",
    "Current proposed file path:",
    options.currentPath,
    "",
    "Current proposed note content:",
    options.currentContent,
    "",
    "User instruction:",
    options.instruction
  ].join("\n");
}

export function buildRefineResearchNotePrompt(
  options: RefineResearchNotePromptOptions
): string {
  return [
    "Revise the proposed Markdown research note based on the user's instruction.",
    "Return JSON only with this shape:",
    '{"title":"...","content":"..."}',
    "Keep citations and source paths where relevant. Do not include code fences.",
    "",
    "Original user request:",
    options.commandText,
    "",
    "Workflow sources:",
    options.sourceText,
    "",
    "Current proposed note content:",
    options.currentContent,
    "",
    "User instruction:",
    options.instruction
  ].join("\n");
}
