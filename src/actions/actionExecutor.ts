import type {
  ContexActionPlan,
  ContexActionReceipt,
  CreateNoteAction,
  DiffAction,
  OpenNoteAction,
  ReplaceSelectionAction,
  ReplaceTextAction,
  SearchAction,
  WikiUpdateAction
} from "./actionTypes";
import { classifyActionPermission } from "./permissions";

export interface ContexActionExecutorOps {
  openNote?: (query: string, action: OpenNoteAction) => Promise<string | null>;
  createNote?: (action: CreateNoteAction) => Promise<string | null>;
  replaceText?: (action: ReplaceTextAction) => Promise<string | null | void>;
  replaceSelection?: (action: ReplaceSelectionAction) => Promise<string | null | void>;
  applyDiff?: (action: DiffAction) => Promise<string | null | void>;
  rejectDiff?: (action: DiffAction) => Promise<string | null | void>;
  undoChange?: (action: DiffAction) => Promise<string | null | void>;
  searchVault?: (action: SearchAction) => Promise<string | null | void>;
  searchWeb?: (action: SearchAction) => Promise<string | null | void>;
  updateWiki?: (action: WikiUpdateAction) => Promise<string | null | void>;
  readAnswer?: (actionId: string) => Promise<void>;
}

export async function executeContexActionPlan(
  plan: ContexActionPlan,
  ops: ContexActionExecutorOps
): Promise<ContexActionReceipt[]> {
  const receipts: ContexActionReceipt[] = [];

  for (const action of plan.actions) {
    const permission = classifyActionPermission(action);

    if (permission.mode !== "immediate") {
      receipts.push({
        actionId: action.id,
        kind: action.kind,
        status: permission.mode === "confirm" ? "needs_confirmation" : "failed",
        label: permission.reason
      });
      continue;
    }

    try {
      if (action.kind === "open_note") {
        const path = await ops.openNote?.(action.query, action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: path ? "opened" : "failed",
          label: path ? "Opened note" : "Open failed",
          path: path ?? undefined
        });
        continue;
      }

      if (action.kind === "create_note" || action.kind === "research_note") {
        const path = await ops.createNote?.(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: path ? "saved" : "failed",
          label: path ? "Created note" : "Create failed",
          path: path ?? undefined
        });
        continue;
      }

      if (action.kind === "replace_text") {
        ensureExecutor(ops.replaceText, action.kind);
        const path = await ops.replaceText(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "preview",
          label: "Diff preview",
          path: typeof path === "string" ? path : undefined
        });
        continue;
      }

      if (action.kind === "replace_selection") {
        ensureExecutor(ops.replaceSelection, action.kind);
        const path = await ops.replaceSelection(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "preview",
          label: "Selection diff preview",
          path: typeof path === "string" ? path : undefined
        });
        continue;
      }

      if (action.kind === "apply_diff") {
        ensureExecutor(ops.applyDiff, action.kind);
        const path = await ops.applyDiff(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "applied",
          label: "Applied diff",
          path: typeof path === "string" ? path : undefined
        });
        continue;
      }

      if (action.kind === "reject_diff") {
        ensureExecutor(ops.rejectDiff, action.kind);
        await ops.rejectDiff(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "rejected",
          label: "Rejected diff"
        });
        continue;
      }

      if (action.kind === "undo_change") {
        ensureExecutor(ops.undoChange, action.kind);
        const path = await ops.undoChange(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "reverted",
          label: "Reverted change",
          path: typeof path === "string" ? path : undefined
        });
        continue;
      }

      if (action.kind === "search_vault") {
        ensureExecutor(ops.searchVault, action.kind);
        await ops.searchVault(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "done",
          label: "Vault search complete"
        });
        continue;
      }

      if (action.kind === "search_web") {
        ensureExecutor(ops.searchWeb, action.kind);
        await ops.searchWeb(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "done",
          label: "Web search complete"
        });
        continue;
      }

      if (action.kind === "update_wiki") {
        ensureExecutor(ops.updateWiki, action.kind);
        const path = await ops.updateWiki(action);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "preview",
          label: "Wiki update proposal",
          path: typeof path === "string" ? path : undefined
        });
        continue;
      }

      if (action.kind === "read_answer") {
        ensureExecutor(ops.readAnswer, action.kind);
        await ops.readAnswer?.(action.id);
        receipts.push({
          actionId: action.id,
          kind: action.kind,
          status: "done",
          label: "Reading latest answer"
        });
        continue;
      }

      receipts.push({
        actionId: action.id,
        kind: action.kind,
        status: "failed",
        label: "Action failed",
        error: `Missing executor for ${action.kind}`
      });
    } catch (error) {
      receipts.push({
        actionId: action.id,
        kind: action.kind,
        status: "failed",
        label: "Action failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return receipts;
}

function ensureExecutor<T>(
  executor: T | undefined,
  kind: string
): asserts executor is T {
  if (!executor) {
    throw new Error(`Missing executor for ${kind}`);
  }
}
