import type {
  ContexAction,
  ContexActionReceipt,
  ContexActionSource
} from "../actions/actionTypes";

export type WorkflowIntent =
  | "chat"
  | "vault_action"
  | "note_creation"
  | "safe_edit"
  | "research_update"
  | "project_brainstorm"
  | "code_plan"
  | "debugging"
  | "review"
  | "wiki_memory"
  | "live_dialogue"
  | "delete_or_move";

export type WorkflowStatus =
  | "idle"
  | "asking"
  | "executing"
  | "verifying"
  | "complete"
  | "failed"
  | "cancelled";

export type WorkflowRiskLevel = "low" | "medium" | "high";

export type WorkflowUiLanguage = "en" | "ru";

export interface WorkflowDefinition {
  id: WorkflowIntent;
  name: string;
  description: string;
  whenToUse: string[];
  riskLevel: WorkflowRiskLevel;
  requiresConfirmation: boolean;
}

export interface WorkflowActiveNoteContext {
  path: string;
  folder: string;
  title: string;
  excerpt?: string;
  wordCount?: number;
}

export interface WorkflowVaultCandidate {
  path: string;
  basename: string;
  folder: string;
  score: number;
}

export interface WorkflowFolderCandidate {
  path: string;
  name: string;
  score: number;
}

export interface WorkflowAttachmentContext {
  id?: string;
  name: string;
  mime?: string;
  size?: number;
  textExcerpt?: string;
}

export interface WorkflowSourceRef {
  label: string;
  locator: string;
  kind?: "vault" | "web" | "raw" | "attachment";
  title?: string;
  date?: string;
  confidence?: number;
}

export interface WorkflowContextBundle {
  source: ContexActionSource;
  userText: string;
  effectiveText: string;
  uiLanguage: WorkflowUiLanguage;
  activeNote?: WorkflowActiveNoteContext;
  selectedText?: string;
  attachments: WorkflowAttachmentContext[];
  noteCandidates: WorkflowVaultCandidate[];
  folderCandidates: WorkflowFolderCandidate[];
  ragSnippets: string[];
  wikiSnippets: string[];
  webSnippets: string[];
  recentChatSummary?: string;
  nowIso: string;
}

export interface WorkflowQuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface WorkflowQuestion {
  id: string;
  prompt: string;
  options: WorkflowQuestionOption[];
}

export interface WorkflowRoute {
  id: string;
  intent: WorkflowIntent;
  confidence: number;
  reason: string;
  source: ContexActionSource;
  userText: string;
  effectiveText: string;
  uiLanguage: WorkflowUiLanguage;
  actions: ContexAction[];
  statusSteps: string[];
  needsWeb: boolean;
  needsModel: boolean;
  title?: string;
  folderHint?: string;
  candidatePath?: string;
  pendingQuestion?: WorkflowQuestion;
}

export interface WorkflowState {
  id: string;
  intent: WorkflowIntent;
  status: WorkflowStatus;
  currentStepIndex: number;
  pendingQuestion?: WorkflowQuestion;
  collectedAnswers: Record<string, string>;
  actionReceipts: ContexActionReceipt[];
  memoryEventIds: string[];
  route: WorkflowRoute;
}

export interface WorkflowRunResult {
  id: string;
  status: WorkflowStatus;
  receipts: ContexActionReceipt[];
  verification?: WorkflowVerificationResult;
}

export interface WorkflowVerificationResult {
  ok: boolean;
  errors: string[];
}

export interface WorkflowMemoryEvent {
  id: string;
  routeId: string;
  intent: WorkflowIntent;
  userText: string;
  assistantText?: string;
  receipts: ContexActionReceipt[];
  sourcePaths: string[];
  createdAt: string;
}
