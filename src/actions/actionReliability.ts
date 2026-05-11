import type {
  ContexActionPlan,
  ContexActionReceipt,
  ContexActionStatus,
  WikiUpdateAction
} from "./actionTypes";

export interface ActionReliabilitySummary {
  isComplete: boolean;
  canClaimSuccess: boolean;
  missingReceiptActionIds: string[];
  failedActionIds: string[];
  pendingActionIds: string[];
}

const SUCCESS_STATUSES = new Set<ContexActionStatus>([
  "opened",
  "saved",
  "applied",
  "rejected",
  "reverted",
  "done",
  "preview"
]);

const PENDING_STATUSES = new Set<ContexActionStatus>([
  "planned",
  "running",
  "needs_confirmation"
]);

export function summarizeActionReliability(
  plan: ContexActionPlan,
  receipts: ContexActionReceipt[]
): ActionReliabilitySummary {
  const receiptsByActionId = new Map(
    receipts.map((receipt) => [receipt.actionId, receipt])
  );
  const missingReceiptActionIds: string[] = [];
  const failedActionIds: string[] = [];
  const pendingActionIds: string[] = [];

  plan.actions.forEach((action) => {
    const receipt = receiptsByActionId.get(action.id);

    if (!receipt) {
      missingReceiptActionIds.push(action.id);
      return;
    }

    if (receipt.status === "failed") {
      failedActionIds.push(action.id);
      return;
    }

    if (PENDING_STATUSES.has(receipt.status)) {
      pendingActionIds.push(action.id);
    }
  });

  const isComplete =
    missingReceiptActionIds.length === 0 && pendingActionIds.length === 0;
  const canClaimSuccess =
    isComplete &&
    failedActionIds.length === 0 &&
    plan.actions.every((action) => {
      const receipt = receiptsByActionId.get(action.id);
      return receipt ? SUCCESS_STATUSES.has(receipt.status) : false;
    });

  return {
    isComplete,
    canClaimSuccess,
    missingReceiptActionIds,
    failedActionIds,
    pendingActionIds
  };
}

export function appendAutomaticWikiFollowUp(
  plan: ContexActionPlan,
  receipts: ContexActionReceipt[]
): ContexActionPlan {
  if (plan.actions.some((action) => action.kind === "update_wiki")) {
    return plan;
  }

  const sourceReceipts = receipts.filter(isMemoryWorthyReceipt);

  if (!sourceReceipts.length || !shouldConsiderWikiUpdate(plan.userText)) {
    return plan;
  }

  const action: WikiUpdateAction = {
    id: createId("wiki"),
    kind: "update_wiki",
    reason: "automatic_memory_candidate",
    sourceActionIds: sourceReceipts.map((receipt) => receipt.actionId),
    sourcePaths: sourceReceipts
      .map((receipt) => receipt.path)
      .filter((path): path is string => Boolean(path)),
    proposalPrompt: plan.userText,
    automatic: true
  };

  return {
    ...plan,
    actions: [...plan.actions, action]
  };
}

function isMemoryWorthyReceipt(receipt: ContexActionReceipt): boolean {
  return (
    (receipt.status === "saved" ||
      receipt.status === "applied" ||
      receipt.status === "done") &&
    (receipt.kind === "create_note" ||
      receipt.kind === "research_note" ||
      receipt.kind === "update_note" ||
      receipt.kind === "replace_text")
  );
}

function shouldConsiderWikiUpdate(userText: string): boolean {
  const normalized = userText.toLowerCase();

  return /research|web|plan|roadmap|architecture|decision|compare|analy[sz]e|исслед|план|архитект|решени|сравн|актуаль|разбор|анализ/u.test(
    normalized
  );
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
