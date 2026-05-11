import type { LlmFileAttachment } from "../types";

type SetIconFn = (parent: HTMLElement, iconId: string) => void;

export function formatAttachmentLabel(attachment: LlmFileAttachment): string {
  return [
    attachment.name,
    attachment.type || "unknown",
    formatAttachmentBytes(attachment.size)
  ]
    .filter(Boolean)
    .join(" | ");
}

export function isPreviewableImageAttachment(
  attachment: LlmFileAttachment
): boolean {
  return Boolean(
    attachment.dataUrl &&
      (attachment.type.startsWith("image/") ||
        /\.(png|jpe?g|gif|webp|bmp)$/i.test(attachment.name))
  );
}

export function renderMessageAttachments(
  parentEl: HTMLElement,
  attachments: LlmFileAttachment[],
  setIcon: SetIconFn
): void {
  const attachmentsEl = parentEl.createDiv({
    cls: "contex-agent__message-attachments"
  });

  attachments.forEach((attachment) => {
    const attachmentEl = attachmentsEl.createDiv({
      cls: "contex-agent__message-attachment"
    });

    if (isPreviewableImageAttachment(attachment)) {
      attachmentEl.addClass("contex-agent__message-attachment--image");
      attachmentEl.createEl("img", {
        cls: "contex-agent__message-attachment-thumb",
        attr: {
          src: attachment.dataUrl ?? "",
          alt: attachment.name
        }
      });
    } else {
      const iconEl = attachmentEl.createSpan({
        cls: "contex-agent__message-attachment-icon"
      });
      setIcon(iconEl, attachment.type === "application/pdf" ? "file-text" : "file");
    }

    const metaEl = attachmentEl.createDiv({
      cls: "contex-agent__message-attachment-meta"
    });
    metaEl.createDiv({
      cls: "contex-agent__message-attachment-name",
      text: attachment.name || "Attached file"
    });
    metaEl.createDiv({
      cls: "contex-agent__message-attachment-detail",
      text: [
        attachment.type || "unknown",
        formatAttachmentBytes(attachment.size),
        attachment.text ? "text extracted" : "",
        attachment.dataUrl ? "image attached" : ""
      ]
        .filter(Boolean)
        .join(" | ")
    });
  });
}

function formatAttachmentBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }

  const mb = kb / 1024;

  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}
