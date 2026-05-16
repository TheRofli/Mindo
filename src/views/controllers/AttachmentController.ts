import {
  classifyAttachment,
  extractPdfTextFallback as extractAttachmentPdfTextFallback
} from "../../attachments/attachmentPipeline";
import {
  extractPdfTextFromFile,
  inferMimeType,
  isReadableTextFile,
  renameClipboardFile,
  readFileAsDataUrl
} from "../../attachments/fileAttachmentUtils";
import type { LlmFileAttachment } from "../../types";

export interface AttachmentControllerOptions {
  maxTextChars: number;
  maxImageBytes: number;
  maxPdfBytes: number;
  maxAttachedFiles?: number;
}

export interface ClipboardFileItemLike {
  kind: string;
  getAsFile: () => File | null;
}

export interface ClipboardFileDataLike {
  files?: Iterable<File> | ArrayLike<File> | null;
  items?: Iterable<ClipboardFileItemLike> | ArrayLike<ClipboardFileItemLike> | null;
}

export interface PreparedAttachedFiles {
  newAttachments: LlmFileAttachment[];
  attachedFiles: LlmFileAttachment[];
}

export class AttachmentController {
  constructor(private readonly options: AttachmentControllerOptions) {}

  extractClipboardFiles(clipboardData: ClipboardFileDataLike): File[] {
    const files = Array.from(clipboardData.files ?? []);

    for (const item of Array.from(clipboardData.items ?? [])) {
      if (item.kind !== "file") {
        continue;
      }

      const file = item.getAsFile();

      if (!file) {
        continue;
      }

      const hasSameFile = files.some(
        (candidate) =>
          candidate.name === file.name &&
          candidate.size === file.size &&
          candidate.type === file.type
      );

      if (!hasSameFile) {
        files.push(file.name ? file : renameClipboardFile(file));
      }
    }

    return files;
  }

  async prepareAttachedFiles(
    files: File[],
    existingFiles: LlmFileAttachment[]
  ): Promise<PreparedAttachedFiles> {
    const newAttachments = await Promise.all(
      files.map((file) => this.readAttachment(file))
    );
    const maxAttachedFiles = this.options.maxAttachedFiles ?? 8;

    return {
      newAttachments,
      attachedFiles: [...existingFiles, ...newAttachments].slice(
        -maxAttachedFiles
      )
    };
  }

  async readAttachment(file: File): Promise<LlmFileAttachment> {
    const kind = classifyAttachment(file.type || inferMimeType(file.name), file.name);
    const baseAttachment: LlmFileAttachment = {
      name: file.name,
      type: file.type || inferMimeType(file.name),
      size: file.size
    };

    if (kind === "image") {
      if (file.size > this.options.maxImageBytes) {
        return baseAttachment;
      }

      return {
        ...baseAttachment,
        dataUrl: await readFileAsDataUrl(file)
      };
    }

    if (kind === "pdf") {
      if (file.size > this.options.maxPdfBytes) {
        return baseAttachment;
      }

      const rawPdfText = await file.text();
      const extractedText =
        (await extractPdfTextFromFile(file)) ||
        extractAttachmentPdfTextFallback(rawPdfText);

      return {
        ...baseAttachment,
        text: extractedText
          ? extractedText.slice(0, this.options.maxTextChars)
          : undefined
      };
    }

    if (kind === "text" || isReadableTextFile(file)) {
      return {
        ...baseAttachment,
        text: (await file.text()).slice(0, this.options.maxTextChars)
      };
    }

    return baseAttachment;
  }
}
