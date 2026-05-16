import type { UiTextKey } from "../i18n";

export const COMPOSER_FILE_ACCEPT =
  "image/*,.pdf,.txt,.md,.markdown,.json,.csv,.ts,.tsx,.js,.jsx,.css,.html";

export const VOICE_WAVEFORM_BAR_COUNT = 17;

export interface InputComposerRefs {
  composerEl: HTMLElement;
  attachedContextEl: HTMLElement;
  promptBoxEl: HTMLElement;
  fileInputEl: HTMLInputElement;
  inputEl: HTMLTextAreaElement;
  modelButtonEl: HTMLButtonElement;
  modelEl: HTMLElement;
  modelProfileManageButtonEl: HTMLButtonElement;
  voiceWaveformEl: HTMLElement;
  voiceWaveformBars: HTMLElement[];
  attachButtonEl: HTMLButtonElement;
  liveDialogueButtonEl: HTMLButtonElement;
  voiceTimerEl: HTMLElement;
  micButtonEl: HTMLButtonElement;
  sendButtonEl: HTMLButtonElement;
}

export interface InputComposerRendererDeps {
  t: (key: UiTextKey) => string;
  setIcon: (element: HTMLElement, icon: string) => void;
  getActiveModelName: () => string;
  onFilesSelected: (files: File[]) => void;
  onInputEnter: () => void;
  onPaste: (event: ClipboardEvent) => void;
  onToggleModelMenu: (event: MouseEvent) => void;
  onManageModelProfiles: () => void;
  renderModelMenu: (parentEl: HTMLElement) => void;
  registerModelMenuOutsideClick: (modelButtonEl: HTMLButtonElement) => void;
  onToggleLiveDialogue: () => void;
  onToggleRecording: () => void;
  onSendButtonClick: () => void;
  renderChatSwitcher: (parentEl: HTMLElement) => void;
}

export function getComposerFileAcceptValue(): string {
  return COMPOSER_FILE_ACCEPT;
}

export function getVoiceWaveformBarIndexes(): number[] {
  return Array.from({ length: VOICE_WAVEFORM_BAR_COUNT }, (_, index) => index);
}

export class InputComposerRenderer {
  constructor(private readonly deps: InputComposerRendererDeps) {}

  render(rootEl: HTMLElement): InputComposerRefs {
    const composer = rootEl.createDiv({ cls: "contex-agent__composer" });
    this.deps.renderChatSwitcher(composer);

    const attachedContextEl = composer.createDiv({
      cls: "contex-agent__attached-context"
    });

    const promptBoxEl = composer.createDiv({
      cls: "contex-agent__prompt-box"
    });
    this.bindPromptBoxDragAndDrop(promptBoxEl);

    const fileInputEl = this.renderFileInput(promptBoxEl);
    const inputEl = this.renderPromptInput(promptBoxEl);
    const actions = promptBoxEl.createDiv({ cls: "contex-agent__actions" });
    const modelRefs = this.renderModelControls(actions, promptBoxEl);
    const voiceRefs = this.renderVoiceControls(actions);

    return {
      composerEl: composer,
      attachedContextEl,
      promptBoxEl,
      fileInputEl,
      inputEl,
      modelButtonEl: modelRefs.modelButtonEl,
      modelEl: modelRefs.modelEl,
      modelProfileManageButtonEl: modelRefs.modelProfileManageButtonEl,
      voiceWaveformEl: voiceRefs.voiceWaveformEl,
      voiceWaveformBars: voiceRefs.voiceWaveformBars,
      attachButtonEl: voiceRefs.attachButtonEl,
      liveDialogueButtonEl: voiceRefs.liveDialogueButtonEl,
      voiceTimerEl: voiceRefs.voiceTimerEl,
      micButtonEl: voiceRefs.micButtonEl,
      sendButtonEl: voiceRefs.sendButtonEl
    };
  }

  private bindPromptBoxDragAndDrop(promptBoxEl: HTMLElement): void {
    promptBoxEl.addEventListener("dragover", (event) => {
      event.preventDefault();
      promptBoxEl.addClass("is-drag-over");
    });
    promptBoxEl.addEventListener("dragleave", () => {
      promptBoxEl.removeClass("is-drag-over");
    });
    promptBoxEl.addEventListener("drop", (event) => {
      event.preventDefault();
      promptBoxEl.removeClass("is-drag-over");

      if (event.dataTransfer?.files.length) {
        this.deps.onFilesSelected(Array.from(event.dataTransfer.files));
      }
    });
  }

  private renderFileInput(promptBoxEl: HTMLElement): HTMLInputElement {
    const fileInputEl = promptBoxEl.createEl("input", {
      attr: {
        type: "file",
        multiple: "true",
        accept: getComposerFileAcceptValue()
      }
    });
    fileInputEl.addClass("contex-agent__file-input");
    fileInputEl.addEventListener("change", () => {
      const files = fileInputEl.files ? Array.from(fileInputEl.files) : [];

      this.deps.onFilesSelected(files);
      fileInputEl.value = "";
    });

    return fileInputEl;
  }

  private renderPromptInput(promptBoxEl: HTMLElement): HTMLTextAreaElement {
    const inputEl = promptBoxEl.createEl("textarea", {
      cls: "contex-agent__input",
      attr: {
        placeholder: this.deps.t("composerPlaceholder")
      }
    });

    inputEl.addEventListener("keydown", (event) => {
      if (event.isComposing) {
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.deps.onInputEnter();
      }
    });
    inputEl.addEventListener("paste", (event) => {
      this.deps.onPaste(event);
    });

    return inputEl;
  }

  private renderModelControls(
    actionsEl: HTMLElement,
    promptBoxEl: HTMLElement
  ): {
    modelButtonEl: HTMLButtonElement;
    modelEl: HTMLElement;
    modelProfileManageButtonEl: HTMLButtonElement;
  } {
    const modelButtonEl = actionsEl.createEl("button", {
      cls: "contex-agent__model-button",
      attr: {
        type: "button",
        "aria-label": this.deps.t("modelProfiles")
      }
    });
    const modelEl = modelButtonEl.createSpan({
      text: this.deps.getActiveModelName()
    });
    modelButtonEl.createSpan({
      cls: "contex-agent__model-status-dot",
      attr: {
        "aria-hidden": "true"
      }
    });
    this.deps.setIcon(modelButtonEl.createSpan(), "chevron-down");
    modelButtonEl.addEventListener("click", (event) => {
      event.stopPropagation();
      this.deps.onToggleModelMenu(event);
    });
    this.deps.renderModelMenu(promptBoxEl);
    this.deps.registerModelMenuOutsideClick(modelButtonEl);

    const modelProfileManageButtonEl = actionsEl.createEl("button", {
      cls: "contex-agent__icon-button contex-agent__model-profile-manage",
      attr: {
        type: "button",
        "aria-label": this.deps.t("manageModelProfiles")
      }
    });
    this.deps.setIcon(modelProfileManageButtonEl, "plus");
    modelProfileManageButtonEl.addEventListener("click", () => {
      this.deps.onManageModelProfiles();
    });

    return {
      modelButtonEl,
      modelEl,
      modelProfileManageButtonEl
    };
  }

  private renderVoiceControls(actionsEl: HTMLElement): {
    voiceWaveformEl: HTMLElement;
    voiceWaveformBars: HTMLElement[];
    attachButtonEl: HTMLButtonElement;
    liveDialogueButtonEl: HTMLButtonElement;
    voiceTimerEl: HTMLElement;
    micButtonEl: HTMLButtonElement;
    sendButtonEl: HTMLButtonElement;
  } {
    const voiceWaveformEl = actionsEl.createDiv({
      cls: "contex-agent__voice-waveform",
      attr: {
        "aria-hidden": "true"
      }
    });
    const voiceWaveformBars = getVoiceWaveformBarIndexes().map(() =>
      voiceWaveformEl.createSpan({
        cls: "contex-agent__voice-waveform-bar"
      })
    );

    const spacer = actionsEl.createDiv({ cls: "contex-agent__actions-spacer" });
    spacer.setText("");

    const attachButtonEl = actionsEl.createEl("button", {
      cls: "contex-agent__icon-button contex-agent__icon-button--ghost",
      attr: {
        type: "button",
        "aria-label": this.deps.t("attachFiles")
      }
    });
    this.deps.setIcon(attachButtonEl, "paperclip");

    const liveDialogueButtonEl = actionsEl.createEl("button", {
      cls: "contex-agent__icon-button contex-agent__live-dialogue-button",
      attr: {
        type: "button",
        "aria-label": this.deps.t("startLiveDialogue")
      }
    });
    this.deps.setIcon(liveDialogueButtonEl, "sparkle");
    liveDialogueButtonEl.addEventListener("click", () => {
      this.deps.onToggleLiveDialogue();
    });

    const voiceTimerEl = actionsEl.createDiv({
      cls: "contex-agent__voice-timer",
      text: "0:00"
    });

    const micButtonEl = actionsEl.createEl("button", {
      cls: "contex-agent__icon-button",
      attr: {
        type: "button",
        "aria-label": this.deps.t("recordVoice")
      }
    });
    this.deps.setIcon(micButtonEl, "mic");
    micButtonEl.addEventListener("click", () => {
      this.deps.onToggleRecording();
    });

    const sendButtonEl = actionsEl.createEl("button", {
      cls: "contex-agent__send-button",
      attr: {
        type: "button",
        "aria-label": this.deps.t("send")
      }
    });
    this.deps.setIcon(sendButtonEl, "arrow-up");
    sendButtonEl.addEventListener("click", () => {
      this.deps.onSendButtonClick();
    });

    attachButtonEl.addEventListener("click", () => {
      const fileInputEl = actionsEl.closest(".contex-agent__prompt-box")
        ?.querySelector<HTMLInputElement>(".contex-agent__file-input");
      fileInputEl?.click();
    });

    return {
      voiceWaveformEl,
      voiceWaveformBars,
      attachButtonEl,
      liveDialogueButtonEl,
      voiceTimerEl,
      micButtonEl,
      sendButtonEl
    };
  }
}
