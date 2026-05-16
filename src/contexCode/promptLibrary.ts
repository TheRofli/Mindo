export interface ContexCodePrompt {
  kind: "prompt";
  id: string;
  title: string;
  category: string;
  intents: string[];
  prompt: string;
}

const BUILT_IN_PROMPTS: ContexCodePrompt[] = [
  {
    kind: "prompt",
    id: "contex-code-plan-seed",
    title: "Seed Mindo Code plan",
    category: "planning",
    intents: ["code-plan", "project-plan", "todo"],
    prompt:
      "Create a Mindo Code plan from the project note. Split work into phases, small tasks, acceptance criteria, likely files, verification commands, and source references."
  },
  {
    kind: "prompt",
    id: "contex-code-next-task",
    title: "Prepare next task packet",
    category: "planning",
    intents: ["next-task", "task-packet", "handoff"],
    prompt:
      "Prepare a concise task packet for the next unfinished Mindo Code task. Include goal, files, acceptance, sources, commands, and constraints."
  },
  {
    kind: "prompt",
    id: "contex-code-progress-sync",
    title: "Sync implementation progress",
    category: "maintenance",
    intents: ["progress", "sync", "done"],
    prompt:
      "Update task statuses from implementation evidence. Mark only verified work done, record blockers, and keep the project note's progress block current."
  },
  {
    kind: "prompt",
    id: "contex-code-review",
    title: "Review completed task",
    category: "review",
    intents: ["review", "quality", "regression"],
    prompt:
      "Review the completed task for regressions, missing tests, unsafe assumptions, and user-facing workflow gaps. Return findings first."
  },
  {
    kind: "prompt",
    id: "contex-code-debug",
    title: "Debug failed task",
    category: "debugging",
    intents: ["debug", "failure", "triage"],
    prompt:
      "Turn a failing Mindo Code task into a debugging checklist: reproduction, observed behavior, expected behavior, likely cause, fix, and verification."
  },
  {
    kind: "prompt",
    id: "contex-code-source-audit",
    title: "Audit sources",
    category: "sources",
    intents: ["sources", "citations", "links"],
    prompt:
      "Ensure every source in a task packet is clickable and meaningful. Vault sources should open notes; web sources should include URLs; weak sources should be removed."
  },
  {
    kind: "prompt",
    id: "contex-code-refactor-scope",
    title: "Plan safe refactor",
    category: "refactor",
    intents: ["refactor", "architecture", "split"],
    prompt:
      "Split a large refactor into disjoint steps. Name ownership boundaries, touched files, risks, and tests for each step."
  },
  {
    kind: "prompt",
    id: "contex-code-release-check",
    title: "Release readiness check",
    category: "release",
    intents: ["release", "package", "verify"],
    prompt:
      "Check whether a Mindo Code milestone is ready to ship: tests, build, docs, packaging, migrations, user-facing errors, and rollback path."
  }
];

export function getBuiltInContexCodePrompts(): ContexCodePrompt[] {
  return BUILT_IN_PROMPTS.map((prompt) => ({ ...prompt, intents: [...prompt.intents] }));
}

export function buildContexCodePromptJsonl(): string {
  return `${getBuiltInContexCodePrompts().map((prompt) => JSON.stringify(prompt)).join("\n")}\n`;
}

export function buildContexCodePromptLibraryMarkdown(): string {
  const prompts = getBuiltInContexCodePrompts();
  const categories = new Map<string, ContexCodePrompt[]>();

  for (const prompt of prompts) {
    categories.set(prompt.category, [...(categories.get(prompt.category) ?? []), prompt]);
  }

  return [
    "# Mindo Code Prompt Library",
    "",
    "Reusable prompts for Mindo Code planning, coding handoffs, reviews, source audits, debugging, and release checks.",
    "",
    ...Array.from(categories.entries()).flatMap(([category, categoryPrompts]) => [
      `## ${titleCase(category)}`,
      "",
      ...categoryPrompts.flatMap((prompt) => [
        `### ${prompt.title}`,
        "",
        `- ID: \`${prompt.id}\``,
        `- Intents: ${prompt.intents.map((intent) => `\`${intent}\``).join(", ")}`,
        "",
        prompt.prompt,
        ""
      ])
    ])
  ].join("\n");
}

function titleCase(value: string): string {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
