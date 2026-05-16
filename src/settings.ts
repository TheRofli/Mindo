import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import type ContexAgentPlugin from "./main";
import { ModelProfilesModal } from "./modals/ModelProfilesModal";
import {
  DEFAULT_SETTINGS,
  type DialogueModelMode,
  type LlmModelProfile,
  type SttBackend,
  type SttModel,
  type SttQualityMode,
  type TtsProvider,
  type TtsReadMode,
  type UiFontMode,
  type WebSearchProvider,
  type WikiMemoryMode
} from "./types";
import {
  ensureContexWikiStructure,
  getContexWikiStatus,
  normalizeWikiRootFolder
} from "./wiki/wikiBootstrap";
import { normalizeProviderConfig } from "./providers/providerRouter";
import {
  applyModelProfile,
  createModelProfileFromSettings,
  getActiveModelProfile,
  sanitizeModelProfiles,
  upsertModelProfile
} from "./settings/modelProfiles";
import {
  getSttModelOptionsForBackend,
  sanitizeSttModelForBackend,
  STT_BACKEND_OPTIONS,
  STT_QUALITY_MODE_OPTIONS
} from "./voice/sttOptions";
import { KOKORO_VOICE_OPTIONS } from "./voice/kokoroVoices";
import { SILERO_VOICE_OPTIONS } from "./voice/sileroVoices";
import { TTS_PROVIDER_OPTIONS } from "./voice/ttsProviders";
import { getUiLanguageFromObsidianApp, getUiText } from "./i18n";
import {
  CONTEX_SETTINGS_SECTIONS,
  sanitizeContexSettingsSection,
  type ContexSettingsSectionId
} from "./settings/settingSections";

export class ContexSettingTab extends PluginSettingTab {
  plugin: ContexAgentPlugin;
  private testAudio: HTMLAudioElement | null = null;
  private testAudioUrl: string | null = null;
  private activeSection: ContexSettingsSectionId = "model";

  constructor(app: App, plugin: ContexAgentPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("contex-settings");

    const language = getUiLanguageFromObsidianApp(this.app);
    this.activeSection = sanitizeContexSettingsSection(this.activeSection);

    new Setting(containerEl).setName(getUiText(language, "appName")).setHeading();
    this.renderSectionTabs(containerEl);
    const modelSectionEl = this.createSection(containerEl, "model");
    const dialogueSectionEl = this.createSection(containerEl, "dialogue");
    const voiceSectionEl = this.createSection(containerEl, "voice");
    const webSectionEl = this.createSection(containerEl, "web");
    const wikiSectionEl = this.createSection(containerEl, "wiki");

    const activeProfile = getActiveModelProfile(this.plugin.settings);

    new Setting(modelSectionEl)
      .setName("Model Profile")
      .setDesc("Saved LLM endpoint/profile used by Mindo.")
      .addDropdown((dropdown) => {
        this.plugin.settings.modelProfiles.forEach((profile) => {
          dropdown.addOption(profile.id, profile.name);
        });

        dropdown
          .setValue(activeProfile.id)
          .onChange(async (value) => {
            const profile = this.plugin.settings.modelProfiles.find(
              (item) => item.id === value
            );

            if (!profile) {
              return;
            }

            this.plugin.settings = applyModelProfile(
              this.plugin.settings,
              profile
            );
            await this.plugin.saveSettings();
            this.display();
          });
      })
      .addButton((button) =>
        button
          .setButtonText("Save current")
          .setTooltip("Save current endpoint/model as the active profile")
          .onClick(async () => {
            const profile = createModelProfileFromSettings(this.plugin.settings, {
              id: this.plugin.settings.activeModelProfileId,
              name: activeProfile.name
            });
            this.plugin.settings.modelProfiles = upsertModelProfile(
              this.plugin.settings.modelProfiles,
              profile
            );
            this.plugin.settings.activeModelProfileId = profile.id;
            await this.plugin.saveSettings();
            this.display();
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Manage")
          .setTooltip("Create, edit, and delete model profiles")
          .onClick(() => {
            new ModelProfilesModal(this.app, {
              settings: this.plugin.settings,
              onSave: async (settings) => {
                this.plugin.settings = settings;
                await this.plugin.saveSettings();
                this.display();
              }
            }).open();
          })
      );

    new Setting(modelSectionEl)
      .setName("Base URL")
      .setDesc("OpenAI-compatible API base URL.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.baseUrl)
          .setValue(this.plugin.settings.baseUrl)
          .onChange(async (value) => {
            this.plugin.settings.baseUrl = value.trim();
            this.syncActiveModelProfile({
              baseUrl: this.plugin.settings.baseUrl
            });
            await this.plugin.saveSettings();
          })
      );

    new Setting(modelSectionEl)
      .setName("API Key")
      .setDesc("API key for the configured endpoint.")
      .addText((text) => {
        text.inputEl.type = "password";
        text
          .setPlaceholder(DEFAULT_SETTINGS.apiKey)
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            this.syncActiveModelProfile({
              apiKey: this.plugin.settings.apiKey
            });
            await this.plugin.saveSettings();
          });
      });

    new Setting(modelSectionEl)
      .setName("Model Name")
      .setDesc("Main model used by future chat requests.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.model)
          .setValue(this.plugin.settings.model)
          .onChange(async (value) => {
            this.plugin.settings.model = value.trim();
            this.syncActiveModelProfile({
              model: this.plugin.settings.model
            });
            await this.plugin.saveSettings();
          })
      );

    const provider = normalizeProviderConfig({
      baseUrl: this.plugin.settings.baseUrl,
      model: this.plugin.settings.model,
      temperature: this.plugin.settings.temperature
    });

    modelSectionEl.createEl("small", {
      text: `Provider: ${provider.kind}`
    });

    new Setting(modelSectionEl)
      .setName("Temperature")
      .setDesc("Sampling temperature for future LLM calls.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "0";
        text.inputEl.max = "2";
        text.inputEl.step = "0.1";
        text
          .setPlaceholder(String(DEFAULT_SETTINGS.temperature))
          .setValue(String(this.plugin.settings.temperature))
          .onChange(async (value) => {
            const parsed = Number.parseFloat(value);
            this.plugin.settings.temperature = Number.isFinite(parsed)
              ? Math.min(2, Math.max(0, parsed))
              : DEFAULT_SETTINGS.temperature;
            this.syncActiveModelProfile({
              temperature: this.plugin.settings.temperature
            });
            await this.plugin.saveSettings();
          });
      });

    new Setting(modelSectionEl)
      .setName("Supports Vision")
      .setDesc("Whether the configured model can accept image inputs later.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.supportsVision)
          .onChange(async (value) => {
            this.plugin.settings.supportsVision = value;
            this.syncActiveModelProfile({
              supportsVision: this.plugin.settings.supportsVision
            });
            await this.plugin.saveSettings();
          })
      );

    new Setting(modelSectionEl)
      .setName("Auto Apply Edits")
      .setDesc("When enabled, Mindo applies generated edit previews to vault files immediately. Change history can still revert applied edits.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoApplyEdits)
          .onChange(async (value) => {
            this.plugin.settings.autoApplyEdits = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(modelSectionEl)
      .setName("Interface Font")
      .setDesc("Use Comfortaa for Mindo's softer rounded style, or inherit Obsidian's interface font.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("comfortaa", "Comfortaa")
          .addOption("obsidian", "Obsidian default")
          .setValue(this.plugin.settings.uiFont)
          .onChange(async (value) => {
            this.plugin.settings.uiFont = value as UiFontMode;
            await this.plugin.saveSettings();
          })
      );

    const dialogueFastProfileId = this.getExistingModelProfileId(
      this.plugin.settings.dialogueFastModelProfileId
    );
    const dialogueSmartProfileId = this.getExistingModelProfileId(
      this.plugin.settings.dialogueSmartModelProfileId
    );

    new Setting(dialogueSectionEl)
      .setName("Dialogue Model Routing")
      .setDesc("Use one model for live dialogue, or split quick replies and deeper reasoning across two model profiles.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("single", "Single profile")
          .addOption("dual", "Fast + Smart profiles")
          .setValue(this.plugin.settings.dialogueModelMode)
          .onChange(async (value) => {
            this.plugin.settings.dialogueModelMode =
              (value === "dual" ? "dual" : "single") as DialogueModelMode;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(dialogueSectionEl)
      .setName("Fast Dialogue Profile")
      .setDesc("Used for lightweight live answers, file lookup, short summaries, and conversational replies.")
      .addDropdown((dropdown) => {
        this.plugin.settings.modelProfiles.forEach((profile) => {
          dropdown.addOption(profile.id, profile.name);
        });

        dropdown
          .setValue(dialogueFastProfileId)
          .onChange(async (value) => {
            this.plugin.settings.dialogueFastModelProfileId =
              this.getExistingModelProfileId(value);
            await this.plugin.saveSettings();
          });
      });

    new Setting(dialogueSectionEl)
      .setName("Smart Dialogue Profile")
      .setDesc("Used when a live request looks complex: deep analysis, code/file edits, planning, research, or long reasoning.")
      .addDropdown((dropdown) => {
        this.plugin.settings.modelProfiles.forEach((profile) => {
          dropdown.addOption(profile.id, profile.name);
        });

        dropdown
          .setValue(dialogueSmartProfileId)
          .onChange(async (value) => {
            this.plugin.settings.dialogueSmartModelProfileId =
              this.getExistingModelProfileId(value);
            await this.plugin.saveSettings();
          });
      })
      .addButton((button) =>
        button
          .setButtonText("Manage profiles")
          .setTooltip("Create, edit, and delete model profiles")
          .onClick(() => {
            new ModelProfilesModal(this.app, {
              settings: this.plugin.settings,
              onSave: async (settings) => {
                this.plugin.settings = settings;
                await this.plugin.saveSettings();
                this.display();
              }
            }).open();
          })
      );

    dialogueSectionEl.createEl("small", {
      text:
        this.plugin.settings.dialogueModelMode === "dual"
          ? "Recommended: keep the fast profile cheap and responsive, and reserve the smart profile for harder live dialogue turns."
          : "Default: Mindo uses the active model profile for both quick and deeper live dialogue turns."
    });

    new Setting(webSectionEl)
      .setName("Web Search")
      .setDesc("Enable web research through a SearXNG-compatible endpoint.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.webSearchEnabled)
          .onChange(async (value) => {
            this.plugin.settings.webSearchEnabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(webSectionEl)
      .setName("Web Search Provider")
      .setDesc("Provider used by Mindo web research.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("searxng", "SearXNG")
          .addOption("duckduckgo", "DuckDuckGo direct")
          .setValue(this.plugin.settings.webSearchProvider)
          .onChange(async (value) => {
            this.plugin.settings.webSearchProvider = value as WebSearchProvider;
            await this.plugin.saveSettings();
          })
      );

    new Setting(webSectionEl)
      .setName("Web Search Endpoint")
      .setDesc("SearXNG search endpoint. Example: http://127.0.0.1:8080/search")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.webSearchEndpoint)
          .setValue(this.plugin.settings.webSearchEndpoint)
          .onChange(async (value) => {
            this.plugin.settings.webSearchEndpoint = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(webSectionEl)
      .setName("Web Search Max Results")
      .setDesc("How many web results Mindo should use for research.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = "12";
        text.inputEl.step = "1";
        text
          .setPlaceholder(String(DEFAULT_SETTINGS.webSearchMaxResults))
          .setValue(String(this.plugin.settings.webSearchMaxResults))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.webSearchMaxResults = Number.isFinite(parsed)
              ? Math.min(12, Math.max(1, parsed))
              : DEFAULT_SETTINGS.webSearchMaxResults;
            await this.plugin.saveSettings();
          });
      });

    new Setting(wikiSectionEl)
      .setName("Wiki Layer")
      .setDesc("Enable Mindo Wiki as durable structured memory.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.wikiEnabled)
          .onChange(async (value) => {
            this.plugin.settings.wikiEnabled = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(wikiSectionEl)
      .setName("Wiki Root Folder")
      .setDesc("Folder where Mindo keeps Raw, Wiki, Schema, and Inbox.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.wikiRootFolder)
          .setValue(this.plugin.settings.wikiRootFolder)
          .onChange(async (value) => {
            this.plugin.settings.wikiRootFolder =
              normalizeWikiRootFolder(value);
            await this.plugin.saveSettings();
          })
      );

    new Setting(wikiSectionEl)
      .setName("Wiki Memory Mode")
      .setDesc("How aggressively Mindo proposes durable Wiki updates.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("manual", "Manual")
          .addOption("assisted", "Assisted")
          .addOption("auto-safe", "Auto-safe")
          .setValue(this.plugin.settings.wikiMemoryMode)
          .onChange(async (value) => {
            this.plugin.settings.wikiMemoryMode = value as WikiMemoryMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(wikiSectionEl)
      .setName("Mindo Wiki Initial Build")
      .setDesc("Create or repair the Wiki folders, schema files, prompt library, and maintenance files.")
      .addButton((button) =>
        button
          .setButtonText("Initialize / repair")
          .setCta()
          .onClick(async () => {
            const status = await ensureContexWikiStructure(
              this.app,
              this.plugin.settings
            );
            new Notice(
              status.initialized
                ? `Mindo Wiki is ready at ${status.root}.`
                : `Mindo Wiki still has ${status.missingFolders.length + status.missingFiles.length} missing items.`
            );
          })
      )
      .addButton((button) =>
        button
          .setButtonText("Check status")
          .onClick(async () => {
            const status = await getContexWikiStatus(
              this.app,
              this.plugin.settings
            );
            new Notice(
              status.initialized
                ? `Mindo Wiki is initialized at ${status.root}.`
                : `Mindo Wiki is not initialized. Missing ${status.missingFolders.length} folders and ${status.missingFiles.length} files.`
            );
          })
      );

    new Setting(voiceSectionEl)
      .setName("STT Endpoint")
      .setDesc("Speech-to-text endpoint. Mindo sends recorded audio as multipart form data.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.sttEndpoint)
          .setValue(this.plugin.settings.sttEndpoint)
          .onChange(async (value) => {
            this.plugin.settings.sttEndpoint = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("STT Backend")
      .setDesc("Speech-to-text engine. Auto-start can run Parakeet or faster-whisper from the bundled local STT helper.")
      .addDropdown((dropdown) => {
        STT_BACKEND_OPTIONS.forEach((option) => {
          dropdown.addOption(option.value, option.label);
        });

        dropdown
          .setValue(this.plugin.settings.sttBackend)
          .onChange(async (value) => {
            const backend = value as SttBackend;
            this.plugin.settings.sttBackend = backend;
            this.plugin.settings.sttModel = sanitizeSttModelForBackend(
              backend,
              this.plugin.settings.sttModel
            );
            await this.plugin.saveSettings();
            this.display();
          });
      });

    new Setting(voiceSectionEl)
      .setName("Auto-start Local STT")
      .setDesc("Start the bundled local STT helper for the selected backend when Mindo loads.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoStartLocalStt)
          .onChange(async (value) => {
            this.plugin.settings.autoStartLocalStt = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("STT Model")
      .setDesc("Model used by the selected STT backend.")
      .addDropdown((dropdown) => {
        getSttModelOptionsForBackend(this.plugin.settings.sttBackend).forEach(
          (option) => {
            dropdown.addOption(option.value, option.label);
          }
        );

        dropdown
          .setValue(this.plugin.settings.sttModel)
          .onChange(async (value) => {
            this.plugin.settings.sttModel = value as SttModel;
            await this.plugin.saveSettings();
          });
      });

    new Setting(voiceSectionEl)
      .setName("STT Mode")
      .setDesc("Preset for speed vs quality. Quality keeps your custom beam size.")
      .addDropdown((dropdown) => {
        STT_QUALITY_MODE_OPTIONS.forEach((option) => {
          dropdown.addOption(option.value, option.label);
        });

        dropdown
          .setValue(this.plugin.settings.sttQualityMode)
          .onChange(async (value) => {
            this.plugin.settings.sttQualityMode = value as SttQualityMode;
            await this.plugin.saveSettings();
          });
      });

    new Setting(voiceSectionEl)
      .setName("STT Language")
      .setDesc("Language hint for Whisper. Use ru for Russian or leave empty for auto-detect.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.sttLanguage)
          .setValue(this.plugin.settings.sttLanguage)
          .onChange(async (value) => {
            this.plugin.settings.sttLanguage = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("STT Beam Size")
      .setDesc("Higher values improve accuracy but make transcription slower.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = "10";
        text.inputEl.step = "1";
        text
          .setPlaceholder(String(DEFAULT_SETTINGS.sttBeamSize))
          .setValue(String(this.plugin.settings.sttBeamSize))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            this.plugin.settings.sttBeamSize = Number.isFinite(parsed)
              ? Math.min(10, Math.max(1, parsed))
              : DEFAULT_SETTINGS.sttBeamSize;
            await this.plugin.saveSettings();
          });
      });

    new Setting(voiceSectionEl)
      .setName("STT Initial Prompt")
      .setDesc("Vocabulary hint for Whisper. Add project names and technical terms here.")
      .addTextArea((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.sttInitialPrompt)
          .setValue(this.plugin.settings.sttInitialPrompt)
          .onChange(async (value) => {
            this.plugin.settings.sttInitialPrompt = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("TTS Provider")
      .setDesc("Text-to-speech provider used by assistant speaker buttons.")
      .addDropdown((dropdown) => {
        TTS_PROVIDER_OPTIONS.forEach((provider) => {
          dropdown.addOption(provider.value, provider.label);
        });

        dropdown
          .setValue(this.plugin.settings.ttsProvider)
          .onChange(async (value) => {
            this.plugin.settings.ttsProvider = value as TtsProvider;
            await this.plugin.saveSettings();
          });
      });

    new Setting(voiceSectionEl)
      .setName("TTS Read Mode")
      .setDesc("Choose whether speaker buttons read the full answer or a short preview.")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("full", "Full answer")
          .addOption("short", "Short preview")
          .setValue(this.plugin.settings.ttsReadMode)
          .onChange(async (value) => {
            this.plugin.settings.ttsReadMode = value as TtsReadMode;
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("Auto-start Local TTS")
      .setDesc("Prepare the selected local TTS provider when Obsidian starts.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.autoStartLocalTts)
          .onChange(async (value) => {
            this.plugin.settings.autoStartLocalTts = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("Fallback to Browser TTS")
      .setDesc("Use the built-in browser voice if the local TTS engine is unavailable.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.fallbackToBrowserTts)
          .onChange(async (value) => {
            this.plugin.settings.fallbackToBrowserTts = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("Kokoro TTS Endpoint")
      .setDesc("Local kokoro-js OpenAI-compatible speech endpoint for English TTS.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.kokoroTtsEndpoint)
          .setValue(this.plugin.settings.kokoroTtsEndpoint)
          .onChange(async (value) => {
            this.plugin.settings.kokoroTtsEndpoint = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("English Voice")
      .setDesc("Kokoro voice used for English TTS.")
      .addDropdown((dropdown) => {
        KOKORO_VOICE_OPTIONS.forEach((voice) => {
          dropdown.addOption(voice.id, voice.label);
        });

        dropdown
          .setValue(this.plugin.settings.kokoroVoice)
          .onChange(async (value) => {
            this.plugin.settings.kokoroVoice = value;
            await this.plugin.saveSettings();
          });
      })
      .addButton((button) =>
        button
          .setButtonText("Test")
          .setTooltip("Play a short English sample")
          .onClick(() => {
            void this.testSpeech("english");
          })
      );

    new Setting(voiceSectionEl)
      .setName("Kokoro Model")
      .setDesc("ONNX model id used by kokoro-js.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.kokoroModel)
          .setValue(this.plugin.settings.kokoroModel)
          .onChange(async (value) => {
            this.plugin.settings.kokoroModel = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("Silero TTS Endpoint")
      .setDesc("Local Silero speech endpoint. Uses Russian v5.5 voices.")
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.sileroTtsEndpoint)
          .setValue(this.plugin.settings.sileroTtsEndpoint)
          .onChange(async (value) => {
            this.plugin.settings.sileroTtsEndpoint = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(voiceSectionEl)
      .setName("Silero Voice")
      .setDesc("Russian voices use Silero v5.5.")
      .addDropdown((dropdown) => {
        SILERO_VOICE_OPTIONS.forEach((voice) => {
          dropdown.addOption(voice.id, voice.label);
        });

        dropdown
          .setValue(this.plugin.settings.sileroVoice)
          .onChange(async (value) => {
            this.plugin.settings.sileroVoice = value;
            await this.plugin.saveSettings();
          });
      })
      .addButton((button) =>
        button
          .setButtonText("Test")
          .setTooltip("Play a short Silero sample")
          .onClick(() => {
            void this.testSpeech("silero");
          })
      );
  }

  private renderSectionTabs(parentEl: HTMLElement): void {
    const tabsEl = parentEl.createDiv({ cls: "contex-settings__tabs" });

    CONTEX_SETTINGS_SECTIONS.forEach((section) => {
      const tabEl = tabsEl.createEl("button", {
        cls: "contex-settings__tab",
        text: section.label,
        attr: {
          type: "button"
        }
      });
      tabEl.toggleClass("is-active", section.id === this.activeSection);
      tabEl.addEventListener("click", () => {
        this.activeSection = section.id;
        this.display();
      });
    });
  }

  private createSection(
    parentEl: HTMLElement,
    sectionId: ContexSettingsSectionId
  ): HTMLElement {
    const sectionEl = parentEl.createDiv({
      cls: "contex-settings__section"
    });
    sectionEl.toggleClass("is-active", sectionId === this.activeSection);
    return sectionEl;
  }

  private getExistingModelProfileId(value: string): string {
    return this.plugin.settings.modelProfiles.some((profile) => profile.id === value)
      ? value
      : getActiveModelProfile(this.plugin.settings).id;
  }

  private syncActiveModelProfile(patch: Partial<LlmModelProfile>): void {
    const sanitized = sanitizeModelProfiles(this.plugin.settings);
    this.plugin.settings.modelProfiles = sanitized.profiles;
    this.plugin.settings.activeModelProfileId = sanitized.activeProfileId;
    const activeProfile = getActiveModelProfile(this.plugin.settings);
    this.plugin.settings.modelProfiles = upsertModelProfile(
      this.plugin.settings.modelProfiles,
      {
        ...activeProfile,
        ...patch
      }
    );
  }

  private async testSpeech(language: "english" | "silero"): Promise<void> {
    let text =
      language === "english"
        ? "Hello, I am Mindo. This is the selected English voice."
        : "Привет, я Mindo. Проверяю выбранный русский голос.";

    try {
      let audioBlob: Blob;

      if (language === "english") {
        audioBlob = await this.plugin.requestLocalKokoroSpeechAudio(text);
      } else {
        audioBlob = await this.plugin.requestLocalSileroSpeechAudio(text);
      }

      this.playTestAudio(audioBlob);
      new Notice(
        language === "english"
          ? "Playing English voice test."
          : "Playing Silero voice test."
      );
    } catch (error) {
      new Notice(this.getErrorMessage(error));
    }
  }

  private playTestAudio(audioBlob: Blob): void {
    this.testAudio?.pause();

    if (this.testAudioUrl) {
      URL.revokeObjectURL(this.testAudioUrl);
    }

    this.testAudioUrl = URL.createObjectURL(audioBlob);
    this.testAudio = new Audio(this.testAudioUrl);
    this.testAudio.addEventListener("ended", () => {
      if (this.testAudioUrl) {
        URL.revokeObjectURL(this.testAudioUrl);
        this.testAudioUrl = null;
      }

      this.testAudio = null;
    });
    void this.testAudio.play();
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}
