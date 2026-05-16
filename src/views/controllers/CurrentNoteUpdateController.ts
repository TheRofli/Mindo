import type {
  ChatMessage,
  ContexSettings,
  LlmFileAttachment
} from "../../types";
import type {
  CurrentNoteUpdateNote,
  CurrentNoteUpdatePreviewResult
} from "../../notes/currentNoteUpdateWorkflow";

export interface ActiveMarkdownNoteForUpdate {
  file: {
    path: string;
    basename: string;
  };
  content: string;
}

export interface CurrentNoteUpdateControllerDeps {
  settings: ContexSettings;
  maxWholeNoteUpdateChars: number;
  isLoading: () => boolean;
  readActiveMarkdownNote: () => Promise<ActiveMarkdownNoteForUpdate | null>;
  getAttachedFiles: () => LlmFileAttachment[];
  clearAttachedFiles: () => void;
  renderAttachedContext: () => void;
  prepareCurrentNoteUpdatePreview: (options: {
    settings: ContexSettings;
    note: CurrentNoteUpdateNote;
    userPrompt: string;
    attachedFiles: LlmFileAttachment[] | null;
    messageIndex: number;
  }) => Promise<CurrentNoteUpdatePreviewResult>;
  getMessageCount?: () => number;
  pushMessages: (...messages: ChatMessage[]) => void;
  showInlineDiffForMessage: (messageId: string) => Promise<void>;
  setError: (message: string | null) => void;
  setLoading: (loading: boolean) => void;
  setStatus: (status: string) => void;
  renderMessages: () => Promise<void>;
  getErrorMessage: (error: unknown) => string;
}

export class CurrentNoteUpdateController {
  constructor(private readonly deps: CurrentNoteUpdateControllerDeps) {}

  async update(userPrompt = "Update the current note safely."): Promise<void> {
    if (this.deps.isLoading()) {
      return;
    }

    const note = await this.deps.readActiveMarkdownNote();

    if (!note) {
      this.deps.setError("Open a Markdown note before updating it.");
      this.deps.setStatus("Status: No current note");
      return;
    }

    if (!note.content.trim()) {
      this.deps.setError("Current note is empty.");
      this.deps.setStatus("Status: Update blocked");
      return;
    }

    if (note.content.length > this.deps.maxWholeNoteUpdateChars) {
      this.deps.setError(
        `Current note is too long for whole-note update (${note.content.length} characters). Select a section and use Improve selection, or create a roadmap/memory note instead.`
      );
      this.deps.setStatus("Status: Note too long");
      return;
    }

    this.deps.setError(null);
    this.deps.setLoading(true);
    this.deps.setStatus("Status: Drafting note update");
    const attachedFiles = this.deps.getAttachedFiles().length
      ? [...this.deps.getAttachedFiles()]
      : null;

    try {
      const { userMessage, assistantMessage } =
        await this.deps.prepareCurrentNoteUpdatePreview({
          settings: this.deps.settings,
          note: {
            path: note.file.path,
            name: note.file.basename,
            content: note.content
          },
          userPrompt,
          attachedFiles,
          messageIndex: this.deps.getMessageCount?.() ?? 0
        });

      this.deps.pushMessages(userMessage, assistantMessage);
      this.deps.setStatus("Status: Preview ready");
      void this.deps.showInlineDiffForMessage(assistantMessage.id);
    } catch (error) {
      this.deps.setError(this.deps.getErrorMessage(error));
      this.deps.setStatus("Status: Update failed");
    } finally {
      if (attachedFiles) {
        this.deps.clearAttachedFiles();
        this.deps.renderAttachedContext();
      }

      this.deps.setLoading(false);
      void this.deps.renderMessages();
    }
  }
}
