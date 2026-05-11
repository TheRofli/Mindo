import {
  applyModelProfile,
  getActiveModelProfile
} from "../../settings/modelProfiles";
import type { ContexSettings, LlmModelProfile } from "../../types";

export class ModelProfileController {
  getActive(settings: ContexSettings): LlmModelProfile {
    return getActiveModelProfile(settings);
  }

  apply(settings: ContexSettings, profile: LlmModelProfile): ContexSettings {
    return applyModelProfile(settings, profile);
  }
}
