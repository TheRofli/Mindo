import {
  spawn,
  type ChildProcess
} from "node:child_process";
import {
  appendFileSync,
  mkdirSync
} from "node:fs";
import { dirname, join } from "node:path";
import { Notice, Plugin, WorkspaceLeaf } from "obsidian";
import { buildContexDoctorReport } from "./diagnostics/contexDoctor";
import { DoctorModal } from "./diagnostics/DoctorModal";
import { rollbackLastAiChangeOperation } from "./history/changeHistory";
import { inlineDiffExtension } from "./editor/inlineDiff";
import { HistoryModal } from "./modals/HistoryModal";
import {
  getRustCoreRuntimeDiagnostics,
  stopRustCoreIndexSession
} from "./rustCore/indexedSearch";
import { ContexSettingTab } from "./settings";
import { sanitizeUiLanguage } from "./i18n";
import {
  applyModelProfile,
  sanitizeModelProfiles
} from "./settings/modelProfiles";
import {
  DEFAULT_SETTINGS,
  VIEW_TYPE_CONTEXT_AGENT,
  type ChatState,
  type WebSearchProvider,
  type WikiMemoryMode,
  type ContexSettings
} from "./types";
import { ContexAgentView } from "./views/AgentSidebarView";
import {
  DEFAULT_KOKORO_VOICE,
  SUPPORTED_KOKORO_VOICES
} from "./voice/kokoroVoices";
import {
  DEFAULT_SILERO_VOICE,
  SUPPORTED_SILERO_VOICES
} from "./voice/sileroVoices";
import { sanitizeTtsProvider } from "./voice/ttsProviders";
import {
  type SttHealthPayload,
  isSttHealthCompatible
} from "./voice/sttHealth";
import {
  getEffectiveSttBeamSize,
  sanitizeSttBackend,
  sanitizeSttModelForBackend,
  sanitizeSttQualityMode
} from "./voice/sttOptions";
import { getSttRuntimeConfig } from "./voice/sttRuntime";
import {
  ensureContexWikiStructure,
  getContexWikiPaths,
  getContexWikiStatus,
  normalizeWikiRootFolder
} from "./wiki/wikiBootstrap";
import {
  ContexCodeCommandController,
  type ContexCodeAppLike
} from "./contexCode";
import {
  analyzeWikiMaintenance,
  buildWikiMaintenanceMarkdown
} from "./wiki/wikiMaintenance";
import {
  parseWikiJsonl,
  type ContexWikiNode
} from "./wiki/wikiSchema";

export default class ContexAgentPlugin extends Plugin {
  settings!: ContexSettings;
  private chatState: ChatState | null = null;
  private localSttProcess: ChildProcess | null = null;
  private localKokoroProcess: ChildProcess | null = null;
  private localSileroProcess: ChildProcess | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_CONTEXT_AGENT,
      (leaf) => new ContexAgentView(leaf, this)
    );
    this.registerEditorExtension(inlineDiffExtension);

    this.addRibbonIcon("message-square", "Open Contex Agent", async () => {
      await this.activateView();
    });

    this.addCommand({
      id: "open-agent-sidebar",
      name: "Contex: Open Agent Sidebar",
      callback: async () => {
        await this.activateView();
      }
    });

    this.addCommand({
      id: "rollback-last-ai-change",
      name: "Contex: Rollback Last AI Change",
      callback: async () => {
        try {
          const operation = await rollbackLastAiChangeOperation(this.app);
          new Notice(`Rolled back AI change in ${operation.filePath}.`);
        } catch (error) {
          new Notice(this.getErrorMessage(error));
        }
      }
    });

    this.addCommand({
      id: "show-ai-change-history",
      name: "Contex: Show AI Change History",
      callback: () => {
        new HistoryModal(this.app).open();
      }
    });

    this.addCommand({
      id: "doctor",
      name: "Contex: Doctor",
      callback: async () => {
        await this.openDoctor();
      }
    });

    this.addCommand({
      id: "create-note-from-selection",
      name: "Contex: Create Note From Selection",
      callback: async () => {
        const view = await this.activateView();
        await view?.createNoteFromCurrentSelection();
      }
    });

    this.addCommand({
      id: "remember-current-note",
      name: "Contex: Remember Current Note",
      callback: async () => {
        const view = await this.activateView();
        await view?.rememberCurrentNote();
      }
    });

    this.addCommand({
      id: "update-current-note",
      name: "Contex: Update Current Note",
      callback: async () => {
        const view = await this.activateView();
        await view?.updateCurrentNote();
      }
    });

    this.addCommand({
      id: "create-roadmap-from-note",
      name: "Contex: Create Roadmap From Current Note",
      callback: async () => {
        const view = await this.activateView();
        await view?.createRoadmapFromCurrentNote();
      }
    });

    this.addCommand({
      id: "save-current-chat-as-note",
      name: "Contex: Turn Current Chat Into Note",
      callback: async () => {
        const view = await this.activateView();
        await view?.saveCurrentChatAsNote();
      }
    });

    this.addCommand({
      id: "search-vault",
      name: "Contex: Search Vault",
      callback: async () => {
        const view = await this.activateView();
        view?.focusVaultSearch();
      }
    });

    this.addCommand({
      id: "research-web",
      name: "Contex: Research Web",
      callback: async () => {
        const view = await this.activateView();
        view?.focusWebResearch();
      }
    });

    this.addCommand({
      id: "semantic-vault-search",
      name: "Contex: Semantic Vault Search",
      callback: async () => {
        const view = await this.activateView();
        view?.focusSemanticVaultSearch();
      }
    });

    this.addCommand({
      id: "create-code-plan",
      name: "Contex: Create Code Plan",
      callback: async () => {
        try {
          const result = await this.createContexCodeController().createPlan();
          new Notice(`Created Code Plan: ${result.path ?? result.planId}`);
        } catch (error) {
          new Notice(this.getErrorMessage(error));
        }
      }
    });

    this.addCommand({
      id: "prepare-code-task-packet",
      name: "Contex: Prepare Code Task Packet",
      callback: async () => {
        try {
          const result = await this.createContexCodeController().prepareTaskPacket();
          await navigator.clipboard.writeText(result.packet);
          new Notice("Contex Code task packet copied to clipboard.");
        } catch (error) {
          new Notice(this.getErrorMessage(error));
        }
      }
    });

    this.addCommand({
      id: "mark-code-task-done",
      name: "Contex: Mark Code Task Done",
      callback: async () => {
        try {
          const result = await this.createContexCodeController().markTaskDone();
          new Notice(`Marked Code task done: ${result.path ?? result.planId}`);
        } catch (error) {
          new Notice(this.getErrorMessage(error));
        }
      }
    });

    this.addCommand({
      id: "sync-code-plan",
      name: "Contex: Sync Code Plan",
      callback: async () => {
        try {
          const result = await this.createContexCodeController().syncPlan();
          new Notice(`Synced Code Plan: ${result.path ?? result.planId}`);
        } catch (error) {
          new Notice(this.getErrorMessage(error));
        }
      }
    });

    this.addCommand({
      id: "initialize-wiki",
      name: "Contex: Initialize Wiki",
      callback: async () => {
        const status = await ensureContexWikiStructure(
          this.app as never,
          this.settings
        );
        new Notice(
          status.initialized
            ? `Contex Wiki is ready at ${status.root}.`
            : `Contex Wiki still has ${status.missingFolders.length + status.missingFiles.length} missing items.`
        );
      }
    });

    this.addCommand({
      id: "wiki-status",
      name: "Contex: Wiki Status",
      callback: async () => {
        const status = await getContexWikiStatus(
          this.app as never,
          this.settings
        );
        new Notice(
          status.initialized
            ? `Contex Wiki is initialized at ${status.root}.`
            : `Contex Wiki is not initialized. Missing ${status.missingFolders.length} folders and ${status.missingFiles.length} files.`
        );
      }
    });

    this.addCommand({
      id: "wiki-maintenance-report",
      name: "Contex: Wiki Maintenance Report",
      callback: async () => {
        await ensureContexWikiStructure(this.app as never, this.settings);
        const paths = getContexWikiPaths(this.settings.wikiRootFolder);
        const adapter = this.app.vault.adapter;
        const nodesContent = await adapter.read(paths.schema.nodes).catch(() => "");
        const parsedNodes = parseWikiJsonl<ContexWikiNode>(nodesContent);
        const aliases = await adapter
          .read(paths.schema.aliases)
          .then((content) => JSON.parse(content) as Record<string, string[]>)
          .catch(() => ({}));
        const existingLocators = new Set(
          this.app.vault.getFiles().map((file) => file.path)
        );
        const report = analyzeWikiMaintenance({
          nodes: parsedNodes.records,
          aliases,
          existingLocators
        });

        await adapter.write(
          paths.schema.maintenanceLog,
          buildWikiMaintenanceMarkdown(report, parsedNodes.errors)
        );
        new Notice(
          `Contex Wiki maintenance report updated: ${paths.schema.maintenanceLog}`
        );
      }
    });

    this.addCommand({
      id: "start-local-stt-server",
      name: "Contex: Start Local STT Server",
      callback: () => {
        void this.startLocalSttServer();
      }
    });

    this.addCommand({
      id: "stop-local-stt-server",
      name: "Contex: Stop Local STT Server",
      callback: () => {
        void this.stopLocalSttServer();
      }
    });

    this.addCommand({
      id: "check-local-stt-server",
      name: "Contex: Check Local STT Server",
      callback: async () => {
        const isHealthy = await this.isLocalSttServerHealthy();
        new Notice(
          isHealthy
            ? "Contex Local STT Server is responding."
            : "Contex Local STT Server is not responding yet."
        );
      }
    });

    this.addCommand({
      id: "start-local-kokoro-server",
      name: "Contex: Start Local Kokoro Server",
      callback: () => {
        void this.startLocalKokoroServer();
      }
    });

    this.addCommand({
      id: "stop-local-kokoro-server",
      name: "Contex: Stop Local Kokoro Server",
      callback: () => {
        void this.stopLocalKokoroServer();
      }
    });

    this.addCommand({
      id: "check-local-kokoro-server",
      name: "Contex: Check Local Kokoro Server",
      callback: async () => {
        const isHealthy = await this.isLocalKokoroServerHealthy();
        new Notice(
          isHealthy
            ? "Contex Local Kokoro Server is responding."
            : "Contex Local Kokoro Server is not responding yet."
        );
      }
    });

    this.addCommand({
      id: "start-local-silero-server",
      name: "Contex: Start Local Silero TTS Server",
      callback: () => {
        void this.startLocalSileroServer();
      }
    });

    this.addCommand({
      id: "stop-local-silero-server",
      name: "Contex: Stop Local Silero TTS Server",
      callback: () => {
        void this.stopLocalSileroServer();
      }
    });

    this.addCommand({
      id: "check-local-silero-server",
      name: "Contex: Check Local Silero TTS Server",
      callback: async () => {
        const isHealthy = await this.isLocalSileroServerHealthy();
        new Notice(
          isHealthy
            ? "Contex Local Silero TTS Server is responding."
            : "Contex Local Silero TTS Server is not responding yet."
        );
      }
    });

    this.addSettingTab(new ContexSettingTab(this.app, this));

    if (this.settings.autoStartLocalStt) {
      void this.startLocalSttServer(false);
    }

    if (
      this.settings.autoStartLocalTts &&
      this.settings.ttsProvider === "kokoro"
    ) {
      void this.startLocalKokoroServer(false);
    }

    if (
      this.settings.autoStartLocalTts &&
      this.settings.ttsProvider === "silero"
    ) {
      void this.startLocalSileroServer(false);
    }

  }

  private createContexCodeController(): ContexCodeCommandController {
    return new ContexCodeCommandController(
      this.app as unknown as ContexCodeAppLike,
      this.settings
    );
  }

  onunload(): void {
    stopRustCoreIndexSession();
    void this.stopLocalSttServer(false);
    void this.stopLocalKokoroServer(false);
    void this.stopLocalSileroServer(false);
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CONTEXT_AGENT);
  }

  async loadSettings(): Promise<void> {
    const loaded = (await this.loadData()) as
      | (Partial<ContexSettings> & {
          ttsProvider?: string;
          chatState?: ChatState;
        })
      | null;
    const migrated = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
    const rawTtsProvider = String(
      loaded?.ttsProvider ?? DEFAULT_SETTINGS.ttsProvider
    );

    const legacySettings = migrated as unknown as Record<string, unknown>;
    delete legacySettings.chatterboxTtsEndpoint;
    delete legacySettings.chatterboxVoice;
    delete legacySettings.chatterboxModel;

    migrated.ttsProvider = sanitizeTtsProvider(rawTtsProvider);

    if (!isSupportedWebSearchProvider(String(migrated.webSearchProvider))) {
      migrated.webSearchProvider = DEFAULT_SETTINGS.webSearchProvider;
    }

    migrated.uiLanguage = sanitizeUiLanguage(migrated.uiLanguage);
    migrated.wikiRootFolder = normalizeWikiRootFolder(migrated.wikiRootFolder);
    migrated.wikiEnabled =
      typeof migrated.wikiEnabled === "boolean"
        ? migrated.wikiEnabled
        : DEFAULT_SETTINGS.wikiEnabled;
    migrated.wikiMemoryMode = isSupportedWikiMemoryMode(
      String(migrated.wikiMemoryMode)
    )
      ? (migrated.wikiMemoryMode as WikiMemoryMode)
      : DEFAULT_SETTINGS.wikiMemoryMode;
    if (migrated.wikiMemoryMode === "assisted") {
      migrated.wikiMemoryMode = "auto-safe";
    }

    const sanitizedModelProfiles = sanitizeModelProfiles(migrated);
    migrated.modelProfiles = sanitizedModelProfiles.profiles;
    migrated.activeModelProfileId = sanitizedModelProfiles.activeProfileId;
    Object.assign(
      migrated,
      applyModelProfile(
        migrated as ContexSettings,
        sanitizedModelProfiles.profiles.find(
          (profile) => profile.id === sanitizedModelProfiles.activeProfileId
        ) ?? sanitizedModelProfiles.profiles[0]
      )
    );

    migrated.sttBackend = sanitizeSttBackend(migrated.sttBackend);
    migrated.sttQualityMode = sanitizeSttQualityMode(migrated.sttQualityMode);
    migrated.sttModel = sanitizeSttModelForBackend(
      migrated.sttBackend,
      migrated.sttModel
    );
    if (!migrated.sttLanguage || migrated.sttLanguage === "ru") {
      migrated.sttLanguage = DEFAULT_SETTINGS.sttLanguage;
    }

    migrated.webSearchMaxResults = Number.isFinite(migrated.webSearchMaxResults)
      ? Math.min(12, Math.max(1, migrated.webSearchMaxResults))
      : DEFAULT_SETTINGS.webSearchMaxResults;

    if (
      migrated.kokoroTtsEndpoint ===
      "http://127.0.0.1:8880/v1/audio/speech"
    ) {
      migrated.kokoroTtsEndpoint = DEFAULT_SETTINGS.kokoroTtsEndpoint;
    }

    if (migrated.kokoroModel === "kokoro") {
      migrated.kokoroModel = DEFAULT_SETTINGS.kokoroModel;
    }

    if (!SUPPORTED_KOKORO_VOICES.has(migrated.kokoroVoice)) {
      migrated.kokoroVoice = DEFAULT_KOKORO_VOICE;
    }

    if (!SUPPORTED_SILERO_VOICES.has(migrated.sileroVoice)) {
      migrated.sileroVoice = DEFAULT_SETTINGS.sileroVoice;
    }

    migrated.sileroPronunciationDictionary =
      isPronunciationDictionary(migrated.sileroPronunciationDictionary)
        ? {
            ...DEFAULT_SETTINGS.sileroPronunciationDictionary,
            ...migrated.sileroPronunciationDictionary
          }
        : DEFAULT_SETTINGS.sileroPronunciationDictionary;

    this.settings = migrated as ContexSettings;
    this.chatState = sanitizeChatState(loaded?.chatState);
  }

  async saveSettings(): Promise<void> {
    await this.saveData({
      ...this.settings,
      chatState: this.chatState
    });
    this.refreshAgentViews();
  }

  getChatState(): ChatState | null {
    return this.chatState;
  }

  async openDoctor(): Promise<void> {
    const report = buildContexDoctorReport({
      settings: this.settings,
      activeNotePath: this.app.workspace.getActiveFile()?.path ?? null,
      rust: getRustCoreRuntimeDiagnostics(),
      services: {
        llm: this.settings.baseUrl.trim() ? "unknown" : "fail",
        stt: "unknown",
        tts: this.settings.ttsProvider === "disabled" ? "disabled" : "unknown",
        web: this.settings.webSearchEnabled ? "unknown" : "disabled"
      }
    });

    new DoctorModal(this.app, report).open();
  }

  async saveChatState(chatState: ChatState): Promise<void> {
    this.chatState = sanitizeChatState(chatState);
    await this.saveData({
      ...this.settings,
      chatState: this.chatState
    });
  }

  async ensureLocalKokoroServer(showNotice = true): Promise<boolean> {
    if (await this.isLocalKokoroServerHealthy()) {
      return true;
    }

    await this.startLocalKokoroServer(showNotice);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (await this.isLocalKokoroServerHealthy()) {
        return true;
      }

      await sleep(2000);
    }

    return false;
  }

  async requestLocalKokoroSpeechAudio(text: string): Promise<Blob> {
    const isReady = await this.ensureLocalKokoroServer(true);

    if (!isReady) {
      throw new Error("Local Kokoro JS TTS server is not responding.");
    }

    const endpoint = this.settings.kokoroTtsEndpoint.trim();

    if (!endpoint) {
      throw new Error("Kokoro TTS endpoint is not configured.");
    }

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.settings.kokoroModel || DEFAULT_SETTINGS.kokoroModel,
          input: text,
          voice: this.settings.kokoroVoice || DEFAULT_SETTINGS.kokoroVoice,
          response_format: "wav"
        })
      });
    } catch (error) {
      throw new Error(
        `Local Kokoro JS TTS endpoint is not reachable at ${endpoint}: ${this.getErrorMessage(error)}`
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Local Kokoro JS TTS request failed: ${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      );
    }

    return response.blob();
  }

  async requestLocalSileroSpeechAudio(text: string): Promise<Blob> {
    const isReady = await this.ensureLocalSileroServer(true);

    if (!isReady) {
      throw new Error("Local Silero TTS server is not responding.");
    }

    const endpoint = this.settings.sileroTtsEndpoint.trim();

    if (!endpoint) {
      throw new Error("Silero TTS endpoint is not configured.");
    }

    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          voice: this.getConfiguredLocalSileroVoiceName(),
          pronunciations: this.settings.sileroPronunciationDictionary
        })
      });
    } catch (error) {
      throw new Error(
        `Local Silero TTS endpoint is not reachable at ${endpoint}: ${this.getErrorMessage(error)}`
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Local Silero TTS request failed: ${response.status} ${response.statusText}${errorText ? `: ${errorText}` : ""}`
      );
    }

    return response.blob();
  }

  async ensureLocalSttServer(showNotice = true): Promise<boolean> {
    if (await this.isLocalSttServerHealthy()) {
      return true;
    }

    await this.startLocalSttServer(showNotice);

    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (await this.isLocalSttServerHealthy()) {
        return true;
      }

      await sleep(2000);
    }

    return false;
  }

  async getLocalSttStatus(): Promise<{
    autoStart: boolean;
    backend: string;
    endpoint: string;
    isRunning: boolean;
    language: string;
    model: string;
  }> {
    return {
      autoStart: this.settings.autoStartLocalStt,
      backend: this.settings.sttBackend,
      endpoint: this.settings.sttEndpoint.trim(),
      isRunning: await this.isLocalSttServerHealthy(),
      language: this.settings.sttLanguage.trim() || "auto",
      model: this.settings.sttModel
    };
  }

  async ensureLocalSileroServer(showNotice = true): Promise<boolean> {
    if (await this.isLocalSileroServerHealthy()) {
      return true;
    }

    await this.startLocalSileroServer(showNotice);

    for (let attempt = 0; attempt < 45; attempt += 1) {
      if (await this.isLocalSileroServerHealthy()) {
        return true;
      }

      await sleep(2000);
    }

    return false;
  }

  async activateView(): Promise<ContexAgentView | null> {
    let leaf: WorkspaceLeaf | undefined =
      this.app.workspace.getLeavesOfType(VIEW_TYPE_CONTEXT_AGENT)[0];

    if (!leaf) {
      const rightLeaf =
        this.app.workspace.getRightLeaf(false) ??
        this.app.workspace.getRightLeaf(true);

      if (!rightLeaf) {
        new Notice("Could not open Contex Agent sidebar.");
        return null;
      }

      leaf = rightLeaf;
      await leaf.setViewState({
        type: VIEW_TYPE_CONTEXT_AGENT,
        active: true
      });
    }

    await this.app.workspace.revealLeaf(leaf);
    return leaf.view instanceof ContexAgentView ? leaf.view : null;
  }

  refreshAgentViews(): void {
    this.app.workspace
      .getLeavesOfType(VIEW_TYPE_CONTEXT_AGENT)
      .forEach((leaf) => {
        if (leaf.view instanceof ContexAgentView) {
          leaf.view.refreshSettings();
        }
      });
  }

  private async startLocalSttServer(showNotice = true): Promise<void> {
    if (await this.isLocalSttServerHealthy()) {
      if (showNotice) {
        const runtime = getSttRuntimeConfig(this.settings.sttBackend);
        new Notice(`Contex ${runtime.startupLabel} STT Server is already responding.`);
      }

      return;
    }

    const health = await this.getLocalSttServerHealth();

    if (health) {
      await this.stopLocalSttServer(false);
    }

    if (this.localSttProcess && this.localSttProcess.exitCode === null) {
      if (showNotice) {
        new Notice("Contex Local STT Server is already starting.");
      }

      return;
    }

    const pluginDir = this.getPluginFullPath("");
    const scriptPath = this.getPluginFullPath(
      "tools/stt_server/start_stt_server.ps1"
    );

    if (!pluginDir || !scriptPath) {
      if (showNotice) {
        new Notice("Could not resolve Contex plugin folder.");
      }

      return;
    }

    const runtime = getSttRuntimeConfig(this.settings.sttBackend);

    this.writeLocalSttLog(
      `\n\n=== Starting Contex ${runtime.startupLabel} STT Server ===\n`
    );
    this.localSttProcess = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath
      ],
      {
        cwd: pluginDir,
        env: this.getLocalSttEnvironment(),
        windowsHide: true,
        stdio: "ignore"
      }
    );

    this.localSttProcess.on("error", (error) => {
      this.localSttProcess = null;
      const message = this.getErrorMessage(error);
      this.writeLocalSttLog(`\nProcess error: ${message}\n`);
      new Notice(`Contex Local STT Server failed to start: ${message}`);
    });

    if (showNotice) {
      new Notice(
        `Starting Contex ${runtime.startupLabel} STT Server. ${runtime.firstRunNotice}`
      );
    }

    window.setTimeout(async () => {
      if (await this.isLocalSttServerHealthy()) {
        if (showNotice) {
          new Notice(`Contex ${runtime.startupLabel} STT Server is ready.`);
        }

        return;
      }

      if (showNotice) {
        new Notice(
          `Contex ${runtime.startupLabel} STT Server is still starting. Use Contex: Check Local STT Server in a bit.`
        );
      }
    }, 6000);
  }

  private async stopLocalSttServer(showNotice = true): Promise<void> {
    if (this.localSttProcess && this.localSttProcess.exitCode === null) {
      this.localSttProcess.kill();
      this.localSttProcess = null;
    }

    const pluginDir = this.getPluginFullPath("");
    const scriptPath = this.getPluginFullPath(
      "tools/stt_server/stop_stt_server.ps1"
    );

    if (!pluginDir || !scriptPath) {
      if (showNotice) {
        new Notice("Could not resolve Contex STT stop script.");
      }

      return;
    }

    const port = this.getLocalSttPort();

    if (showNotice) {
      new Notice(`Stopping Contex Local STT Server on port ${port}.`);
    }

    await this.runPowerShellScript(pluginDir, scriptPath, [
      "-Port",
      String(port)
    ]);

    if (showNotice) {
      const isHealthy = await this.isLocalSttServerHealthy();
      new Notice(
        isHealthy
          ? "Contex Local STT Server still appears to be responding."
          : "Contex Local STT Server stopped."
      );
    }
  }

  private async startLocalKokoroServer(showNotice = true): Promise<void> {
    if (await this.isLocalKokoroServerHealthy()) {
      if (showNotice) {
        new Notice("Contex Local Kokoro JS TTS Server is already responding.");
      }

      return;
    }

    if (this.localKokoroProcess && this.localKokoroProcess.exitCode === null) {
      if (showNotice) {
        new Notice("Contex Local Kokoro JS TTS Server is already starting.");
      }

      return;
    }

    const pluginDir = this.getPluginFullPath("");
    const scriptPath = this.getPluginFullPath(
      "tools/tts_server/start_kokoro_server.ps1"
    );

    if (!pluginDir || !scriptPath) {
      if (showNotice) {
        new Notice("Could not resolve Contex Kokoro JS start script.");
      }

      return;
    }

    this.writeLocalKokoroLog("\n\n=== Starting Contex Local Kokoro JS TTS Server ===\n");
    this.localKokoroProcess = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath
      ],
      {
        cwd: pluginDir,
        env: this.getLocalKokoroEnvironment(),
        windowsHide: true,
        stdio: "ignore"
      }
    );

    this.localKokoroProcess.on("error", (error) => {
      this.localKokoroProcess = null;
      const message = this.getErrorMessage(error);
      this.writeLocalKokoroLog(`\nProcess error: ${message}\n`);
      new Notice(`Contex Local Kokoro JS TTS Server failed to start: ${message}`);
    });

    if (showNotice) {
      new Notice(
        "Starting Contex Local Kokoro JS TTS Server. First English speech may download/load the ONNX model."
      );
    }

    window.setTimeout(async () => {
      if (await this.isLocalKokoroServerHealthy()) {
        if (showNotice) {
          new Notice("Contex Local Kokoro JS TTS Server is ready.");
        }

        return;
      }

      if (showNotice) {
        new Notice(
          "Contex Local Kokoro JS TTS Server is still starting. Use Contex: Check Local Kokoro Server in a bit."
        );
      }
    }, 6000);
  }

  private async stopLocalKokoroServer(showNotice = true): Promise<void> {
    if (this.localKokoroProcess && this.localKokoroProcess.exitCode === null) {
      this.localKokoroProcess.kill();
      this.localKokoroProcess = null;
    }

    const pluginDir = this.getPluginFullPath("");
    const scriptPath = this.getPluginFullPath(
      "tools/tts_server/stop_kokoro_server.ps1"
    );

    if (!pluginDir || !scriptPath) {
      if (showNotice) {
        new Notice("Could not resolve Contex Kokoro JS stop script.");
      }

      return;
    }

    await this.runPowerShellScript(pluginDir, scriptPath, [
      "-Port",
      String(this.getLocalKokoroPort())
    ]);

    if (showNotice) {
      const isHealthy = await this.isLocalKokoroServerHealthy();
      new Notice(
        isHealthy
          ? "Contex Local Kokoro JS TTS Server still appears to be responding."
          : "Contex Local Kokoro JS TTS Server stopped."
      );
    }
  }

  private async startLocalSileroServer(showNotice = true): Promise<void> {
    if (await this.isLocalSileroServerHealthy()) {
      if (showNotice) {
        new Notice("Contex Local Silero TTS Server is already responding.");
      }

      return;
    }

    if (this.localSileroProcess && this.localSileroProcess.exitCode === null) {
      if (showNotice) {
        new Notice("Contex Local Silero TTS Server is already starting.");
      }

      return;
    }

    const pluginDir = this.getPluginFullPath("");
    const scriptPath = this.getPluginFullPath(
      "tools/tts_server/start_silero_server.ps1"
    );

    if (!pluginDir || !scriptPath) {
      if (showNotice) {
        new Notice("Could not resolve Contex Silero start script.");
      }

      return;
    }

    this.writeLocalSileroLog("\n\n=== Starting Contex Local Silero TTS Server ===\n");
    this.localSileroProcess = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptPath
      ],
      {
        cwd: pluginDir,
        env: this.getLocalSileroEnvironment(),
        windowsHide: true,
        stdio: "ignore"
      }
    );

    this.localSileroProcess.on("error", (error) => {
      this.localSileroProcess = null;
      const message = this.getErrorMessage(error);
      this.writeLocalSileroLog(`\nProcess error: ${message}\n`);
      new Notice(`Contex Local Silero TTS Server failed to start: ${message}`);
    });

    if (showNotice) {
      new Notice(
        "Starting Contex Local Silero TTS Server. First speech may download/load the selected Russian v5.5 model."
      );
    }
  }

  private async stopLocalSileroServer(showNotice = true): Promise<void> {
    if (this.localSileroProcess && this.localSileroProcess.exitCode === null) {
      this.localSileroProcess.kill();
      this.localSileroProcess = null;
    }

    const pluginDir = this.getPluginFullPath("");
    const scriptPath = this.getPluginFullPath(
      "tools/tts_server/stop_silero_server.ps1"
    );

    if (!pluginDir || !scriptPath) {
      if (showNotice) {
        new Notice("Could not resolve Contex Silero stop script.");
      }

      return;
    }

    await this.runPowerShellScript(pluginDir, scriptPath, [
      "-Port",
      String(this.getLocalSileroPort())
    ]);

    if (showNotice) {
      const isHealthy = await this.isLocalSileroServerHealthy();
      new Notice(
        isHealthy
          ? "Contex Local Silero TTS Server still appears to be responding."
          : "Contex Local Silero TTS Server stopped."
      );
    }
  }

  private getPluginFullPath(relativePath: string): string | null {
    const adapter = this.app.vault.adapter as {
      getFullPath?: (normalizedPath: string) => string;
    };

    if (!adapter.getFullPath || !this.manifest.dir) {
      return null;
    }

    return adapter.getFullPath(
      [this.manifest.dir, relativePath].filter(Boolean).join("/")
    );
  }

  private async isLocalSttServerHealthy(): Promise<boolean> {
    const health = await this.getLocalSttServerHealth();

    return isSttHealthCompatible(this.settings, health);
  }

  private async getLocalSttServerHealth(): Promise<SttHealthPayload | null> {
    const healthUrl = this.getLocalSttHealthUrl();

    if (!healthUrl) {
      return null;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 1500);

    try {
      const response = await fetch(healthUrl, {
        signal: controller.signal
      });

      if (!response.ok) {
        return null;
      }

      return (await response.json()) as SttHealthPayload;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private getLocalSttHealthUrl(): string | null {
    try {
      const url = new URL(this.settings.sttEndpoint);
      url.pathname = "/health";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return null;
    }
  }

  private async isLocalKokoroServerHealthy(): Promise<boolean> {
    const healthUrl = this.getLocalKokoroHealthUrl();

    if (!healthUrl) {
      return false;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(healthUrl, {
        signal: controller.signal
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private getLocalKokoroHealthUrl(): string | null {
    try {
      const url = new URL(this.settings.kokoroTtsEndpoint);
      url.pathname = "/health";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return null;
    }
  }

  private getLocalKokoroPort(): number {
    try {
      const url = new URL(this.settings.kokoroTtsEndpoint);

      if (url.port) {
        return Number.parseInt(url.port, 10);
      }

      return url.protocol === "https:" ? 443 : 80;
    } catch {
      return 9200;
    }
  }

  private async isLocalSileroServerHealthy(): Promise<boolean> {
    const healthUrl = this.getLocalSileroHealthUrl();

    if (!healthUrl) {
      return false;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    try {
      const response = await fetch(healthUrl, {
        signal: controller.signal
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private getLocalSileroHealthUrl(): string | null {
    try {
      const url = new URL(this.settings.sileroTtsEndpoint);
      url.pathname = "/health";
      url.search = "";
      url.hash = "";
      return url.toString();
    } catch {
      return null;
    }
  }

  private getLocalSileroPort(): number {
    try {
      const url = new URL(this.settings.sileroTtsEndpoint);

      if (url.port) {
        return Number.parseInt(url.port, 10);
      }

      return url.protocol === "https:" ? 443 : 80;
    } catch {
      return 9100;
    }
  }

  private getLocalSttPort(): number {
    try {
      const url = new URL(this.settings.sttEndpoint);

      if (url.port) {
        return Number.parseInt(url.port, 10);
      }

      return url.protocol === "https:" ? 443 : 80;
    } catch {
      return 9000;
    }
  }

  private async runPowerShellScript(
    cwd: string,
    scriptPath: string,
    args: string[]
  ): Promise<number> {
    return new Promise<number>((resolve) => {
      const child = spawn(
        "powershell.exe",
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          scriptPath,
          ...args
        ],
        {
          cwd,
          windowsHide: true,
          stdio: "ignore"
        }
      );

      child.on("error", (error) => {
        this.writeLocalSttLog(
          `\nPowerShell script error: ${this.getErrorMessage(error)}\n`
        );
        resolve(1);
      });
      child.on("exit", (code) => resolve(code ?? 1));
    });
  }

  private writeLocalSttLog(message: string): void {
    const logPath = this.getPluginFullPath(".contex-stt/stt.log");

    if (!logPath) {
      return;
    }

    try {
      mkdirSync(dirname(logPath), { recursive: true });
      appendFileSync(logPath, message);
    } catch (error) {
      console.warn("[Contex STT] Could not write STT log", error);
    }
  }

  private writeLocalKokoroLog(message: string): void {
    const localAppData = process.env.LOCALAPPDATA?.trim();
    const userProfile = process.env.USERPROFILE?.trim();
    const logPath = localAppData
      ? join(localAppData, "ContexAgent", "kokoro-js", "kokoro-plugin.log")
      : userProfile
        ? join(
            userProfile,
            "AppData",
            "Local",
            "ContexAgent",
            "kokoro-js",
            "kokoro-plugin.log"
          )
        : this.getPluginFullPath(".contex-kokoro-js/kokoro-plugin.log");

    if (!logPath) {
      return;
    }

    try {
      mkdirSync(dirname(logPath), { recursive: true });
      appendFileSync(logPath, message);
    } catch (error) {
      console.warn("[Contex Kokoro] Could not write Kokoro log", error);
    }
  }

  private writeLocalSileroLog(message: string): void {
    const localAppData = process.env.LOCALAPPDATA?.trim();
    const userProfile = process.env.USERPROFILE?.trim();
    const logPath = localAppData
      ? join(localAppData, "ContexAgent", "silero", "silero-plugin.log")
      : userProfile
        ? join(
            userProfile,
            "AppData",
            "Local",
            "ContexAgent",
            "silero",
            "silero-plugin.log"
          )
        : this.getPluginFullPath(".contex-silero/silero-plugin.log");

    if (!logPath) {
      return;
    }

    try {
      mkdirSync(dirname(logPath), { recursive: true });
      appendFileSync(logPath, message);
    } catch (error) {
      console.warn("[Contex Silero] Could not write Silero log", error);
    }
  }

  private getLocalKokoroEnvironment(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      CONTEX_KOKORO_JS_PORT: String(this.getLocalKokoroPort()),
      CONTEX_KOKORO_MODEL:
        this.settings.kokoroModel || DEFAULT_SETTINGS.kokoroModel,
      CONTEX_KOKORO_VOICE:
        this.settings.kokoroVoice || DEFAULT_SETTINGS.kokoroVoice
    };
  }

  private getLocalSttEnvironment(): NodeJS.ProcessEnv {
    const language = this.settings.sttLanguage.trim();

    return {
      ...process.env,
      CONTEX_STT_BACKEND: this.settings.sttBackend,
      CONTEX_STT_MODEL: this.settings.sttModel || DEFAULT_SETTINGS.sttModel,
      CONTEX_STT_HOST: this.getLocalSttHost(),
      CONTEX_STT_PORT: String(this.getLocalSttPort()),
      CONTEX_STT_LANGUAGE:
        language.toLowerCase() === "auto" ? "" : language,
      CONTEX_STT_BEAM_SIZE: String(
        getEffectiveSttBeamSize(
          this.settings.sttQualityMode,
          this.settings.sttBeamSize || DEFAULT_SETTINGS.sttBeamSize
        )
      ),
      CONTEX_STT_INITIAL_PROMPT:
        this.settings.sttInitialPrompt ||
        DEFAULT_SETTINGS.sttInitialPrompt
    };
  }

  private getLocalSttHost(): string {
    try {
      const url = new URL(this.settings.sttEndpoint);

      return url.hostname || "127.0.0.1";
    } catch {
      return "127.0.0.1";
    }
  }

  private getLocalSileroEnvironment(): NodeJS.ProcessEnv {
    const voice = this.getConfiguredLocalSileroVoiceName();

    return {
      ...process.env,
      CONTEX_SILERO_VOICE: voice,
      CONTEX_SILERO_PORT: String(this.getLocalSileroPort())
    };
  }

  private getConfiguredLocalSileroVoiceName(): string {
    const voice = (
      this.settings.sileroVoice || DEFAULT_SILERO_VOICE
    ).trim();

    return SUPPORTED_SILERO_VOICES.has(voice) ? voice : DEFAULT_SILERO_VOICE;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });
}

function isSupportedWebSearchProvider(
  value: string
): value is WebSearchProvider {
  return value === "searxng" || value === "duckduckgo";
}

function isSupportedWikiMemoryMode(value: string): value is WikiMemoryMode {
  return value === "manual" || value === "assisted" || value === "auto-safe";
}

function isPronunciationDictionary(
  value: unknown
): value is Record<string, string> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([key, pronunciation]) =>
        typeof key === "string" && typeof pronunciation === "string"
    )
  );
}

function sanitizeChatState(value: unknown): ChatState | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !Array.isArray((value as Partial<ChatState>).sessions)
  ) {
    return null;
  }

  const rawState = value as Partial<ChatState>;
  const rawSessions = rawState.sessions;

  if (!rawSessions) {
    return null;
  }

  const sessions = rawSessions
    .map((session) => {
      if (
        typeof session !== "object" ||
        session === null ||
        typeof session.id !== "string" ||
        typeof session.title !== "string" ||
        !Array.isArray(session.messages)
      ) {
        return null;
      }

      return {
        id: session.id,
        title: session.title || "New chat",
        messages: session.messages.filter(
          (message) =>
            typeof message === "object" &&
            message !== null &&
            typeof message.id === "string" &&
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string"
        ),
        createdAt:
          typeof session.createdAt === "number"
            ? session.createdAt
            : Date.now(),
        updatedAt:
          typeof session.updatedAt === "number"
            ? session.updatedAt
            : Date.now()
      };
    })
    .filter((session): session is ChatState["sessions"][number] =>
      Boolean(session)
    )
    .slice(0, 30);

  if (!sessions.length) {
    return null;
  }

  const activeChatId =
    typeof rawState.activeChatId === "string" &&
    sessions.some((session) => session.id === rawState.activeChatId)
      ? rawState.activeChatId
      : sessions[0].id;

  return {
    sessions,
    activeChatId
  };
}
