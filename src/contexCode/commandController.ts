import {
  createContexCodePlanFromActiveNote,
  markCurrentContexCodeTaskDone,
  prepareCurrentContexCodeTaskPacket,
  syncCurrentContexCodePlan,
  type ContexCodeAppLike,
  type ContexCodeCommandOptions
} from "./planCommands";
import type { ContexCodeActionResult, ContexCodePlan } from "./planTypes";
import type { UiLanguage } from "../i18n";
import {
  createContexCodeWikiEventWriter,
  type ContexCodeWikiEventWriterSettings
} from "./wikiEventWriter";

export class ContexCodeCommandController {
  constructor(
    private readonly app: ContexCodeAppLike,
    private readonly settings: ContexCodeWikiEventWriterSettings,
    private readonly language?: UiLanguage
  ) {}

  createPlan(
    planDraft?: unknown
  ): Promise<ContexCodeActionResult & { plan: ContexCodePlan }> {
    return createContexCodePlanFromActiveNote(
      this.app,
      this.buildOptions({ planDraft })
    );
  }

  prepareTaskPacket(): Promise<ContexCodeActionResult & { packet: string }> {
    return prepareCurrentContexCodeTaskPacket(this.app, this.buildOptions());
  }

  markTaskDone(): Promise<ContexCodeActionResult & { plan: ContexCodePlan }> {
    return markCurrentContexCodeTaskDone(this.app, this.buildOptions());
  }

  syncPlan(): Promise<ContexCodeActionResult & { plan: ContexCodePlan }> {
    return syncCurrentContexCodePlan(this.app, this.buildOptions());
  }

  private buildOptions(
    options: ContexCodeCommandOptions = {}
  ): ContexCodeCommandOptions {
    return {
      ...options,
      language: options.language ?? this.language,
      wikiWriter: createContexCodeWikiEventWriter(
        this.app,
        this.settings
      )
    };
  }
}
