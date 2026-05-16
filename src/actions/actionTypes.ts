export type ContexActionSource = "chat" | "voice" | "button" | "selection" | "system";

export type ContexActionKind =
  | "open_note"
  | "create_note"
  | "replace_text"
  | "replace_selection"
  | "apply_diff"
  | "reject_diff"
  | "undo_change"
  | "search_vault"
  | "search_web"
  | "research_note"
  | "update_wiki"
  | "update_note"
  | "read_answer"
  | "attach_file"
  | "none";

export type ContexActionStatus =
  | "planned"
  | "running"
  | "preview"
  | "opened"
  | "saved"
  | "applied"
  | "rejected"
  | "reverted"
  | "done"
  | "failed"
  | "needs_confirmation";

export interface BaseContexAction<K extends ContexActionKind = ContexActionKind> {
  id: string;
  kind: K;
  reason?: string;
}

export interface OpenNoteAction extends BaseContexAction<"open_note"> {
  query: string;
  folderHint?: string;
  candidatePath?: string;
}

export interface CreateNoteAction
  extends BaseContexAction<"create_note" | "research_note"> {
  kind: "create_note" | "research_note";
  title?: string;
  folderHint?: string;
  path?: string;
  contentPrompt: string;
  requireWeb?: boolean;
}

export interface ReplaceTextAction extends BaseContexAction<"replace_text"> {
  sourcePath?: string;
  replacements: Array<{
    original: string;
    suggested: string;
  }>;
}

export interface ReplaceSelectionAction
  extends BaseContexAction<"replace_selection"> {
  sourcePath?: string;
  suggested: string;
}

export interface DiffAction
  extends BaseContexAction<"apply_diff" | "reject_diff" | "undo_change"> {
  kind: "apply_diff" | "reject_diff" | "undo_change";
  messageId?: string;
  historyOperationId?: string;
}

export interface SearchAction
  extends BaseContexAction<"search_vault" | "search_web"> {
  kind: "search_vault" | "search_web";
  query: string;
}

export interface UpdateNoteAction extends BaseContexAction<"update_note"> {
  sourcePath?: string;
  query?: string;
}

export interface ReadAnswerAction extends BaseContexAction<"read_answer"> {
  target: "latest_assistant" | "latest_file" | "selected_text";
}

export interface WikiUpdateAction extends BaseContexAction<"update_wiki"> {
  sourceActionIds: string[];
  sourcePaths: string[];
  proposalPrompt: string;
  automatic: boolean;
}

export interface NoneAction extends BaseContexAction<"none"> {
  reason: string;
}

export type ContexAction =
  | OpenNoteAction
  | CreateNoteAction
  | ReplaceTextAction
  | ReplaceSelectionAction
  | DiffAction
  | SearchAction
  | UpdateNoteAction
  | ReadAnswerAction
  | WikiUpdateAction
  | NoneAction;

export interface ContexActionPlan {
  id: string;
  source: ContexActionSource;
  userText: string;
  actions: ContexAction[];
}

export interface ContexActionReceipt {
  actionId: string;
  kind: ContexActionKind;
  status: ContexActionStatus;
  label: string;
  detail?: string;
  path?: string;
  error?: string;
}
