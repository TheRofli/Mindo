import { classifyAttachment, type AttachmentKind } from "./attachmentPipeline";
import type { LlmFileAttachment } from "../types";
import type { ContexWikiSourceRef } from "../wiki/wikiSchema";

export interface AttachmentContextOptions {
  maxTextChars?: number;
}

export interface AttachmentContextItem {
  name: string;
  type: string;
  size: number;
  kind: AttachmentKind;
  label: string;
  contextText: string;
  thumbnailDataUrl?: string;
  canUseForVision: boolean;
  canUseForWiki: boolean;
}

export function buildAttachmentContextItems(
  attachments: LlmFileAttachment[],
  options: AttachmentContextOptions = {}
): AttachmentContextItem[] {
  const maxTextChars = options.maxTextChars ?? 1200;

  return attachments.map((attachment) => {
    const kind = classifyAttachment(attachment.type, attachment.name);
    const contextText = trimWithEllipsis(attachment.text ?? "", maxTextChars);
    const canUseForVision = kind === "image" && Boolean(attachment.dataUrl);
    const canUseForWiki =
      Boolean(contextText) || kind === "pdf" || kind === "text" || canUseForVision;

    return {
      name: attachment.name,
      type: attachment.type || "unknown",
      size: attachment.size,
      kind,
      label: `${attachment.name || "Attached file"} (${kind}, ${formatBytes(
        attachment.size
      )})`,
      contextText,
      thumbnailDataUrl: canUseForVision ? attachment.dataUrl : undefined,
      canUseForVision,
      canUseForWiki
    };
  });
}

export function summarizeAttachmentContext(
  items: AttachmentContextItem[]
): string {
  if (!items.length) {
    return "No attachments.";
  }

  return items
    .map((item) => {
      const capabilities = [
        item.canUseForVision ? "vision" : "",
        item.contextText ? "text extracted" : "",
        item.canUseForWiki ? "wiki source" : ""
      ]
        .filter(Boolean)
        .join(", ");

      return `- ${item.label}${capabilities ? `: ${capabilities}` : ""}`;
    })
    .join("\n");
}

export function buildAttachmentSourceRefs(
  attachments: LlmFileAttachment[],
  options: { now?: string } = {}
): ContexWikiSourceRef[] {
  const now = options.now ?? new Date().toISOString();

  return buildAttachmentContextItems(attachments).map((item, index) => ({
    id: `attachment-${hashText(`${item.name}:${item.size}:${index}`).slice(0, 10)}`,
    kind: "attachment",
    title: item.name || `Attachment ${index + 1}`,
    locator: `attachment://${encodeAttachmentLocator(item.name || `attachment-${index + 1}`)}`,
    capturedAt: now,
    excerpt: item.contextText || undefined
  }));
}

function trimWithEllipsis(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (!normalized || normalized.length <= maxChars) {
    return normalized;
  }

  if (maxChars <= 3) {
    return normalized.slice(0, maxChars);
  }

  return `${normalized.slice(0, maxChars - 3).trimEnd()}...`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

function encodeAttachmentLocator(value: string): string {
  return encodeURIComponent(value).replace(/%2F/gi, "/");
}

function hashText(value: string): string {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36).padStart(8, "0");
}
