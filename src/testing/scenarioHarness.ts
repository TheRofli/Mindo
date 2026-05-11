import type {
  ContexActionPlan,
  ContexActionReceipt
} from "../actions/actionTypes";
import {
  parseToolRouterResponse,
  routerCommandsToActionPlan
} from "../router/toolRouterV2";

export interface ContexScenarioInput {
  userText: string;
  vaultPaths: string[];
  routerResponse: object;
}

export interface ContexScenarioResult {
  plan: ContexActionPlan;
  receipts: ContexActionReceipt[];
}

export async function runContexScenario(
  input: ContexScenarioInput
): Promise<ContexScenarioResult> {
  const commands = parseToolRouterResponse(JSON.stringify(input.routerResponse));
  const plan = routerCommandsToActionPlan({
    source: "chat",
    userText: input.userText,
    commands
  });

  return {
    plan,
    receipts: plan.actions.map((action) => {
      if (action.kind === "open_note") {
        const path = action.query;
        return {
          actionId: action.id,
          kind: action.kind,
          status: input.vaultPaths.includes(path) ? "opened" : "failed",
          label: input.vaultPaths.includes(path) ? "Opened note" : "Open failed",
          path
        };
      }

      if (action.kind === "create_note" || action.kind === "research_note") {
        return {
          actionId: action.id,
          kind: action.kind,
          status: "saved",
          label: "Created note",
          path: "Obsidian/Plan.md"
        };
      }

      return {
        actionId: action.id,
        kind: action.kind,
        status: "done",
        label: "Done"
      };
    })
  };
}
