import type { WorkflowDefinition, WorkflowIntent } from "./workflowTypes";

const WORKFLOW_REGISTRY: WorkflowDefinition[] = [
  workflow("chat", "Chat", "Ordinary assistant conversation.", ["general question"], "low", false),
  workflow("vault_action", "Vault Action", "Open, find, read, or navigate notes.", ["open file", "find note"], "low", false),
  workflow("note_creation", "Note Creation", "Create notes with clean names and useful content.", ["create note", "draft page"], "low", false),
  workflow("safe_edit", "Safe Edit", "Rewrite or replace text using preview/diff.", ["replace text", "improve selection"], "medium", false),
  workflow("research_update", "Research Update", "Use web/RAG when freshness matters.", ["latest", "current", "2026", "check freshness"], "medium", false),
  workflow("project_brainstorm", "Project Brainstorm", "Ask focused questions before project planning.", ["project idea", "architecture"], "low", false),
  workflow("code_plan", "Mindo Code Plan", "Create design specs and IDE handoff plans.", ["code plan", "implementation plan"], "low", false),
  workflow("debugging", "Debugging", "Investigate failures systematically.", ["bug", "error", "broken"], "medium", false),
  workflow("review", "Review", "Review notes, code, plans, or decisions.", ["review", "audit"], "low", false),
  workflow("wiki_memory", "Wiki Memory", "Write durable memory automatically.", ["remember", "wiki"], "low", false),
  workflow("live_dialogue", "Live Dialogue", "Short voice-first action conversation.", ["voice", "live"], "medium", false),
  workflow("delete_or_move", "Delete Or Move", "Destructive file operations.", ["delete", "move"], "high", true)
];

export function getWorkflowRegistry(): WorkflowDefinition[] {
  return WORKFLOW_REGISTRY.map((item) => ({ ...item, whenToUse: [...item.whenToUse] }));
}

export function getWorkflowDefinition(id: WorkflowIntent): WorkflowDefinition | undefined {
  return getWorkflowRegistry().find((workflowDefinition) => workflowDefinition.id === id);
}

function workflow(
  id: WorkflowIntent,
  name: string,
  description: string,
  whenToUse: string[],
  riskLevel: WorkflowDefinition["riskLevel"],
  requiresConfirmation: boolean
): WorkflowDefinition {
  return {
    id,
    name,
    description,
    whenToUse,
    riskLevel,
    requiresConfirmation
  };
}
