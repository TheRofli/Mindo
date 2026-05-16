import { completeOpenThenReplacePlan } from "../../tools/actionPlanCompletion";
import { semanticCommandToLocalAction } from "../../tools/localCommandRouter";
import type { SemanticLocalCommand } from "../semanticLocalCommandPlan";
import type { LocalCommandAction } from "../sidebarTypes";

export interface SemanticLocalActionResolverDeps {
  classifyPlan: (
    commandText: string,
    effectiveCommandText?: string
  ) => Promise<SemanticLocalCommand[] | null>;
  setStatus: (status: string) => void;
  warn: (message: string, error: unknown) => void;
}

export class SemanticLocalActionResolver {
  constructor(private readonly deps: SemanticLocalActionResolverDeps) {}

  async resolve(
    commandText: string,
    effectiveCommandText?: string
  ): Promise<LocalCommandAction | null> {
    this.deps.setStatus("Status: Understanding command");

    try {
      const commands = await this.deps.classifyPlan(
        commandText,
        effectiveCommandText
      );
      const completedCommands = completeOpenThenReplacePlan(
        commands ?? [],
        effectiveCommandText ?? commandText
      );
      const actions =
        completedCommands
          ?.map((command) =>
            semanticCommandToLocalAction(command, commandText)
          )
          .filter((action): action is LocalCommandAction => Boolean(action)) ??
        [];

      if (!actions.length) {
        return null;
      }

      return actions.length === 1
        ? actions[0]
        : {
            kind: "action-plan",
            commandText,
            actions
          };
    } catch (error) {
      this.deps.warn("[Mindo] Semantic local command failed", error);
      this.deps.setStatus("Status: Ready");
      return null;
    }
  }
}
