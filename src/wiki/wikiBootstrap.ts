import {
  buildContexCodePromptJsonl,
  buildContexCodePromptLibraryMarkdown
} from "../contexCode/promptLibrary";

export const DEFAULT_WIKI_ROOT_FOLDER = "Contex Wiki";

export interface ContexWikiSettingsLike {
  wikiRootFolder?: string;
}

export interface ContexWikiPaths {
  root: string;
  rawRoot: string;
  wikiRoot: string;
  schemaRoot: string;
  inboxRoot: string;
  raw: {
    web: string;
    vault: string;
    attachments: string;
    chat: string;
    extracts: string;
  };
  wiki: {
    projects: string;
    concepts: string;
    tools: string;
    models: string;
    workflows: string;
    decisions: string;
    problems: string;
    prompts: string;
  };
  schema: {
    nodes: string;
    edges: string;
    aliases: string;
    prompts: string;
    contexCodeEvents: string;
    sources: string;
    stale: string;
    unresolved: string;
    maintenanceLog: string;
    migrations: string;
  };
  inbox: {
    proposedUpdates: string;
  };
}

export interface ContexWikiStatus {
  initialized: boolean;
  root: string;
  missingFolders: string[];
  missingFiles: string[];
}

interface VaultAdapterLike {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  write(path: string, content: string): Promise<void>;
}

interface AppLike {
  vault: {
    adapter: VaultAdapterLike;
  };
}

export function normalizeWikiRootFolder(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  const normalized = raw
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");

  if (
    !normalized ||
    normalized.startsWith(".") ||
    normalized.includes("..") ||
    normalized.includes(":")
  ) {
    return DEFAULT_WIKI_ROOT_FOLDER;
  }

  return normalized;
}

export function getContexWikiPaths(rootFolder?: string): ContexWikiPaths {
  const root = normalizeWikiRootFolder(rootFolder);
  const rawRoot = joinPath(root, "Raw");
  const wikiRoot = joinPath(root, "Wiki");
  const schemaRoot = joinPath(root, "Schema");
  const inboxRoot = joinPath(root, "Inbox");

  return {
    root,
    rawRoot,
    wikiRoot,
    schemaRoot,
    inboxRoot,
    raw: {
      web: joinPath(rawRoot, "Web"),
      vault: joinPath(rawRoot, "Vault"),
      attachments: joinPath(rawRoot, "Attachments"),
      chat: joinPath(rawRoot, "Chat"),
      extracts: joinPath(rawRoot, "Extracts")
    },
    wiki: {
      projects: joinPath(wikiRoot, "Projects"),
      concepts: joinPath(wikiRoot, "Concepts"),
      tools: joinPath(wikiRoot, "Tools"),
      models: joinPath(wikiRoot, "Models"),
      workflows: joinPath(wikiRoot, "Workflows"),
      decisions: joinPath(wikiRoot, "Decisions"),
      problems: joinPath(wikiRoot, "Problems"),
      prompts: joinPath(wikiRoot, "Prompts")
    },
    schema: {
      nodes: joinPath(schemaRoot, "nodes.jsonl"),
      edges: joinPath(schemaRoot, "edges.jsonl"),
      aliases: joinPath(schemaRoot, "aliases.json"),
      prompts: joinPath(schemaRoot, "prompts.jsonl"),
      contexCodeEvents: joinPath(schemaRoot, "contex-code-events.jsonl"),
      sources: joinPath(schemaRoot, "sources.jsonl"),
      stale: joinPath(schemaRoot, "stale.json"),
      unresolved: joinPath(schemaRoot, "unresolved.md"),
      maintenanceLog: joinPath(schemaRoot, "maintenance-log.md"),
      migrations: joinPath(schemaRoot, "migrations")
    },
    inbox: {
      proposedUpdates: joinPath(inboxRoot, "Proposed Updates")
    }
  };
}

export async function getContexWikiStatus(
  app: AppLike,
  settings: ContexWikiSettingsLike
): Promise<ContexWikiStatus> {
  const paths = getContexWikiPaths(settings.wikiRootFolder);
  const missingFolders: string[] = [];
  const missingFiles: string[] = [];

  for (const folder of getContexWikiFolders(paths)) {
    if (!(await app.vault.adapter.exists(folder))) {
      missingFolders.push(folder);
    }
  }

  for (const file of getContexWikiFiles(paths)) {
    if (!(await app.vault.adapter.exists(file.path))) {
      missingFiles.push(file.path);
    }
  }

  return {
    initialized: missingFolders.length === 0 && missingFiles.length === 0,
    root: paths.root,
    missingFolders,
    missingFiles
  };
}

export async function ensureContexWikiStructure(
  app: AppLike,
  settings: ContexWikiSettingsLike
): Promise<ContexWikiStatus> {
  const paths = getContexWikiPaths(settings.wikiRootFolder);

  for (const folder of getContexWikiFolders(paths)) {
    if (!(await app.vault.adapter.exists(folder))) {
      await app.vault.adapter.mkdir(folder);
    }
  }

  for (const file of getContexWikiFiles(paths)) {
    if (!(await app.vault.adapter.exists(file.path))) {
      await app.vault.adapter.write(file.path, file.initialContent);
    }
  }

  return getContexWikiStatus(app, settings);
}

export function getContexWikiFolders(paths: ContexWikiPaths): string[] {
  return [
    paths.root,
    paths.rawRoot,
    paths.raw.web,
    paths.raw.vault,
    paths.raw.attachments,
    paths.raw.chat,
    paths.raw.extracts,
    paths.wikiRoot,
    paths.wiki.projects,
    paths.wiki.concepts,
    paths.wiki.tools,
    paths.wiki.models,
    paths.wiki.workflows,
    paths.wiki.decisions,
    paths.wiki.problems,
    paths.wiki.prompts,
    paths.schemaRoot,
    paths.schema.migrations,
    paths.inboxRoot,
    paths.inbox.proposedUpdates
  ];
}

function getContexWikiFiles(paths: ContexWikiPaths): Array<{
  path: string;
  initialContent: string;
}> {
  return [
    { path: paths.schema.nodes, initialContent: "" },
    { path: paths.schema.edges, initialContent: "" },
    { path: paths.schema.sources, initialContent: "" },
    { path: paths.schema.prompts, initialContent: buildDefaultPromptJsonl() },
    { path: paths.schema.contexCodeEvents, initialContent: "" },
    { path: paths.schema.aliases, initialContent: "{}\n" },
    { path: paths.schema.stale, initialContent: "[]\n" },
    {
      path: paths.schema.unresolved,
      initialContent: "# Unresolved Wiki Items\n\n"
    },
    {
      path: paths.schema.maintenanceLog,
      initialContent: "# Contex Wiki Maintenance Log\n\n"
    },
    {
      path: joinPath(paths.wiki.prompts, "Prompt Library.md"),
      initialContent: buildDefaultPromptLibraryMarkdown()
    }
  ];
}

interface DefaultWikiPrompt {
  id: string;
  title: string;
  category: string;
  intents: string[];
  prompt: string;
}

const DEFAULT_WIKI_PROMPTS: DefaultWikiPrompt[] = [
  {
    id: "explain-active-note",
    title: "Explain active note",
    category: "note",
    intents: ["explain", "eli5", "active-note"],
    prompt:
      "Explain the active note in plain language. Keep the answer structured, practical, and focused on what the user can do next."
  },
  {
    id: "summarize-active-note",
    title: "Summarize active note",
    category: "note",
    intents: ["summary", "compress", "active-note"],
    prompt:
      "Summarize the active note into concise bullets. Preserve decisions, risks, tasks, names, dates, and source links."
  },
  {
    id: "extract-tasks",
    title: "Extract tasks",
    category: "note",
    intents: ["tasks", "todo", "action-items"],
    prompt:
      "Extract actionable tasks from the note. Group them by priority and include owner/date only when the source states them."
  },
  {
    id: "create-roadmap",
    title: "Create roadmap",
    category: "planning",
    intents: ["roadmap", "plan", "milestones"],
    prompt:
      "Turn the active note or user request into milestones, risks, dependencies, and next actions. Keep it realistic and implementation-focused."
  },
  {
    id: "improve-selection",
    title: "Improve selected text",
    category: "editing",
    intents: ["improve", "rewrite", "selection"],
    prompt:
      "Improve the selected Markdown while preserving meaning, tone, formatting, links, and terminology. Return replacement text only."
  },
  {
    id: "expand-selection",
    title: "Expand selected text",
    category: "editing",
    intents: ["expand", "details", "selection"],
    prompt:
      "Expand the selected text into a more complete idea. Keep the original intent and avoid adding unsupported claims."
  },
  {
    id: "make-shorter",
    title: "Make shorter",
    category: "editing",
    intents: ["shorten", "compress", "brief"],
    prompt:
      "Shorten the text while preserving the core message, important details, and original tone. Return the shortened version only."
  },
  {
    id: "fix-grammar",
    title: "Fix grammar and spelling",
    category: "editing",
    intents: ["grammar", "spelling", "proofread"],
    prompt:
      "Fix grammar, spelling, and punctuation. Preserve Markdown structure, links, code blocks, and meaning. Return corrected text only."
  },
  {
    id: "generate-glossary",
    title: "Generate glossary",
    category: "knowledge",
    intents: ["glossary", "terms", "definitions"],
    prompt:
      "Create a glossary of important terms from the source. Use 'Term: Definition' format and sort alphabetically."
  },
  {
    id: "generate-toc",
    title: "Generate table of contents",
    category: "knowledge",
    intents: ["toc", "outline", "structure"],
    prompt:
      "Generate a hierarchical table of contents from the note. Use the existing heading structure and do not invent missing sections."
  },
  {
    id: "current-freshness-check",
    title: "Check freshness",
    category: "research",
    intents: ["freshness", "current", "up-to-date", "web"],
    prompt:
      "Check whether the note is current for the requested date. Use web sources when freshness matters, then propose concrete updates with citations."
  },
  {
    id: "research-note",
    title: "Create research note",
    category: "research",
    intents: ["research", "web", "create-note"],
    prompt:
      "Create a research note using vault context and web sources. Include practical recommendations, risks, next actions, and clickable sources."
  },
  {
    id: "source-audit",
    title: "Source audit",
    category: "research",
    intents: ["sources", "citations", "audit"],
    prompt:
      "Audit the sources in the note. Replace bare Source N labels with clickable vault links, web URLs, or raw Wiki source links."
  },
  {
    id: "wiki-save-decision",
    title: "Save decision to Wiki",
    category: "wiki",
    intents: ["wiki", "memory", "decision"],
    prompt:
      "Convert durable project knowledge into a Wiki update: decision, rationale, source references, freshness, confidence, and related nodes."
  },
  {
    id: "wiki-merge-node",
    title: "Merge Wiki node",
    category: "wiki",
    intents: ["wiki", "merge", "dedupe"],
    prompt:
      "Merge new evidence into an existing Wiki node without duplicating concepts. Preserve sources and update confidence/freshness."
  },
  {
    id: "wiki-stale-check",
    title: "Check stale Wiki knowledge",
    category: "wiki",
    intents: ["wiki", "stale", "maintenance"],
    prompt:
      "Find stale or weak Wiki knowledge. Explain what needs re-checking, why, and which sources should be refreshed."
  },
  {
    id: "open-file-intent",
    title: "Open file intent",
    category: "tools",
    intents: ["open", "file", "vault"],
    prompt:
      "Resolve the exact vault file from the user's filename and folder hints. Prefer real candidates from the vault over guessing."
  },
  {
    id: "replace-text-intent",
    title: "Replace text intent",
    category: "tools",
    intents: ["replace", "edit", "diff"],
    prompt:
      "Resolve old and new text from the user's request, tolerate punctuation/STT differences, then show a safe diff before applying."
  },
  {
    id: "create-note-intent",
    title: "Create note intent",
    category: "tools",
    intents: ["create", "note", "filename"],
    prompt:
      "Create a note with a concise human title derived from the topic. Treat folder names as storage only; never include folder clauses in the title."
  },
  {
    id: "voice-brief-answer",
    title: "Voice brief answer",
    category: "voice",
    intents: ["voice", "live", "brief"],
    prompt:
      "Answer for live dialogue in 1-3 short spoken sentences. Ask one useful follow-up when it would help. Do not read long notes verbatim."
  },
  {
    id: "voice-action-ack",
    title: "Voice action acknowledgement",
    category: "voice",
    intents: ["voice", "ack", "tool"],
    prompt:
      "Acknowledge the action briefly before running it: 'Открываю', 'Сейчас поправлю', 'Секунду, проверяю'. Keep it under 5 words."
  },
  {
    id: "attachment-summary",
    title: "Attachment summary",
    category: "attachments",
    intents: ["attachment", "pdf", "image"],
    prompt:
      "Summarize attached files. Name each file, say what was readable, mention limitations, and connect useful evidence to the user's request."
  },
  {
    id: "prompt-improver",
    title: "Improve user prompt",
    category: "meta",
    intents: ["prompt", "improve", "clarify"],
    prompt:
      "Rewrite the user's draft prompt into a clearer request with goal, context, constraints, expected output, and safety notes. Keep it concise."
  },
  {
    id: "debug-report",
    title: "Debug report",
    category: "maintenance",
    intents: ["debug", "diagnostics", "health"],
    prompt:
      "Turn logs or failures into a concise debug report: symptom, likely cause, reproduction steps, fix options, and verification checklist."
  }
];

function buildDefaultPromptJsonl(): string {
  return [
    DEFAULT_WIKI_PROMPTS.map((prompt) => JSON.stringify(prompt)).join("\n"),
    buildContexCodePromptJsonl().trim()
  ]
    .filter(Boolean)
    .join("\n")
    .concat("\n");
}

function buildDefaultPromptLibraryMarkdown(): string {
  const grouped = new Map<string, DefaultWikiPrompt[]>();

  for (const prompt of DEFAULT_WIKI_PROMPTS) {
    grouped.set(prompt.category, [...(grouped.get(prompt.category) ?? []), prompt]);
  }

  return [
    "# Contex Prompt Library",
    "",
    "This library is created during Contex Wiki initialization. Contex can use it as reusable intent memory for note work, Wiki updates, voice dialogue, attachments, web research, and tool routing.",
    "",
    "Do not treat these prompts as user commands by themselves. Use them as patterns when the user's request matches the intent.",
    "",
    ...Array.from(grouped.entries()).flatMap(([category, prompts]) => [
      `## ${titleCase(category)}`,
      "",
      ...prompts.flatMap((prompt) => [
        `### ${prompt.title}`,
        "",
        `- ID: \`${prompt.id}\``,
        `- Intents: ${prompt.intents.map((intent) => `\`${intent}\``).join(", ")}`,
        "",
        prompt.prompt,
        ""
      ])
    ]),
    "---",
    "",
    buildContexCodePromptLibraryMarkdown()
  ].join("\n");
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function joinPath(...parts: string[]): string {
  return parts
    .flatMap((part) => part.replace(/\\/g, "/").split("/"))
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}
