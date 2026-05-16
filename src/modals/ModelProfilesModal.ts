import { Modal, Notice, Setting, setIcon, type App } from "obsidian";
import {
  applyModelProfile,
  createModelProfileFromSettings,
  deleteModelProfile,
  getActiveModelProfile,
  upsertModelProfile
} from "../settings/modelProfiles";
import { DEFAULT_SETTINGS, type ContexSettings, type LlmModelProfile } from "../types";

interface ModelProfilesModalOptions {
  settings: ContexSettings;
  onSave: (settings: ContexSettings) => Promise<void>;
}

export class ModelProfilesModal extends Modal {
  private settings: ContexSettings;
  private onSave: (settings: ContexSettings) => Promise<void>;
  private draftProfile: LlmModelProfile;

  constructor(app: App, options: ModelProfilesModalOptions) {
    super(app);
    this.settings = options.settings;
    this.onSave = options.onSave;
    this.draftProfile = getActiveModelProfile(options.settings);
  }

  onOpen(): void {
    this.setTitle("Model Profiles");
    this.render();
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private render(): void {
    const container = this.contentEl;
    container.empty();

    const root = container.createDiv({ cls: "contex-model-profiles-modal" });
    const listEl = root.createDiv({ cls: "contex-model-profiles-modal__list" });

    this.settings.modelProfiles.forEach((profile) => {
      const itemEl = listEl.createDiv({
        cls: "contex-model-profiles-modal__item"
      });
      itemEl.toggleClass(
        "is-active",
        profile.id === this.settings.activeModelProfileId
      );
      const bodyEl = itemEl.createDiv({
        cls: "contex-model-profiles-modal__item-body"
      });
      bodyEl.createDiv({
        cls: "contex-model-profiles-modal__item-title",
        text: profile.name
      });
      bodyEl.createDiv({
        cls: "contex-model-profiles-modal__item-detail",
        text: `${profile.model} - ${profile.baseUrl}`
      });

      const actionsEl = itemEl.createDiv({
        cls: "contex-model-profiles-modal__item-actions"
      });
      const useButton = actionsEl.createEl("button", {
        text: "Use"
      });
      useButton.disabled = profile.id === this.settings.activeModelProfileId;
      useButton.addEventListener("click", () => {
        void this.useProfile(profile);
      });

      const editButton = actionsEl.createEl("button", {
        attr: {
          type: "button",
          "aria-label": "Edit profile"
        }
      });
      setIcon(editButton, "pencil");
      editButton.addEventListener("click", () => {
        this.draftProfile = profile;
        this.render();
      });

      const deleteButton = actionsEl.createEl("button", {
        attr: {
          type: "button",
          "aria-label": "Delete profile"
        }
      });
      setIcon(deleteButton, "trash-2");
      deleteButton.disabled = this.settings.modelProfiles.length <= 1;
      deleteButton.addEventListener("click", () => {
        void this.deleteProfile(profile);
      });
    });

    const formEl = root.createDiv({ cls: "contex-model-profiles-modal__form" });
    formEl.createEl("h3", { text: "Profile" });

    let name = this.draftProfile.name;
    let baseUrl = this.draftProfile.baseUrl;
    let apiKey = this.draftProfile.apiKey;
    let model = this.draftProfile.model;
    let temperature = String(this.draftProfile.temperature);
    let supportsVision = this.draftProfile.supportsVision;

    new Setting(formEl)
      .setName("Name")
      .addText((text) =>
        text.setValue(name).onChange((value) => {
          name = value;
        })
      );
    new Setting(formEl)
      .setName("Base URL / port")
      .addText((text) =>
        text.setValue(baseUrl).onChange((value) => {
          baseUrl = value;
        })
      );
    new Setting(formEl)
      .setName("API key")
      .addText((text) => {
        text.inputEl.type = "password";
        text.inputEl.autocomplete = "off";
        text.setValue(apiKey).onChange((value) => {
          apiKey = value;
        });
      });
    new Setting(formEl)
      .setName("Model")
      .addText((text) =>
        text.setValue(model).onChange((value) => {
          model = value;
        })
      );
    new Setting(formEl)
      .setName("Temperature")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.max = "2";
        text.inputEl.step = "0.1";
        text.setValue(temperature).onChange((value) => {
          temperature = value;
        });
      });
    new Setting(formEl)
      .setName("Supports Vision")
      .addToggle((toggle) =>
        toggle.setValue(supportsVision).onChange((value) => {
          supportsVision = value;
        })
      );

    const actionsEl = formEl.createDiv({
      cls: "contex-model-profiles-modal__actions"
    });
    const newButton = actionsEl.createEl("button", { text: "New" });
    const saveButton = actionsEl.createEl("button", {
      cls: "mod-cta",
      text: "Save profile"
    });
    const closeButton = actionsEl.createEl("button", { text: "Close" });

    newButton.addEventListener("click", () => {
      this.draftProfile = createModelProfileFromSettings(DEFAULT_SETTINGS, {
        id: `profile-${Date.now()}`,
        name: "New profile"
      });
      this.render();
    });
    saveButton.addEventListener("click", () => {
      void this.saveDraftProfile({
        name,
        baseUrl,
        apiKey,
        model,
        temperature,
        supportsVision
      });
    });
    closeButton.addEventListener("click", () => this.close());
  }

  private async useProfile(profile: LlmModelProfile): Promise<void> {
    this.settings = applyModelProfile(this.settings, profile);
    await this.save();
    this.render();
  }

  private async deleteProfile(profile: LlmModelProfile): Promise<void> {
    this.settings.modelProfiles = deleteModelProfile(
      this.settings.modelProfiles,
      profile.id
    );
    if (this.settings.activeModelProfileId === profile.id) {
      this.settings = applyModelProfile(
        this.settings,
        this.settings.modelProfiles[0]
      );
    }
    await this.save();
    this.render();
  }

  private async saveDraftProfile(options: {
    name: string;
    baseUrl: string;
    apiKey: string;
    model: string;
    temperature: string;
    supportsVision: boolean;
  }): Promise<void> {
    const parsedTemperature = Number.parseFloat(options.temperature);
    const profile = createModelProfileFromSettings(
      {
        baseUrl: options.baseUrl,
        apiKey: options.apiKey,
        model: options.model,
        temperature: Number.isFinite(parsedTemperature)
          ? parsedTemperature
          : DEFAULT_SETTINGS.temperature,
        supportsVision: options.supportsVision
      },
      {
        id: this.draftProfile.id,
        name: options.name || options.model || "Model profile"
      }
    );

    this.settings.modelProfiles = upsertModelProfile(
      this.settings.modelProfiles,
      profile
    );
    this.settings = applyModelProfile(this.settings, profile);
    this.draftProfile = profile;
    await this.save();
    new Notice(`Saved model profile: ${profile.name}`);
    this.render();
  }

  private async save(): Promise<void> {
    await this.onSave(this.settings);
  }
}
