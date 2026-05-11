import {
  classifyAttachment,
  extractPdfTextFallback as extractAttachmentPdfTextFallback
} from "../../attachments/attachmentPipeline";
import {
  extractPdfTextFromFile,
  inferMimeType,
  isReadableTextFile,
  readFileAsDataUrl
} from "../../attachments/fileAttachmentUtils";
import type { LlmFileAttachment } from "../../types";

export interface AttachmentControllerOptions {
  maxTextChars: number;
  maxImageBytes: number;
  maxPdfBytes: number;
}

export class AttachmentController {
  constructor(private readonly options: AttachmentControllerOptions) {}

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
