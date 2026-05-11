import type { VectorRagDocument } from "../rag/vectorRag";

export interface RustCoreDocumentDiff {
  upsertDocuments: VectorRagDocument[];
  removedPaths: string[];
  nextSignatures: Map<string, string>;
}

export function encodeRustCoreIndexWireRequest(
  documents: VectorRagDocument[]
): string {
  return encodeDocumentCommand("CTXCORE_INDEX_V1", documents);
}

export function encodeRustCoreUpsertWireRequest(
  documents: VectorRagDocument[]
): string {
  return encodeDocumentCommand("CTXCORE_UPSERT_V1", documents);
}

export function encodeRustCoreRemoveWireRequest(paths: string[]): string {
  const lines = ["CTXCORE_REMOVE_V1", String(paths.length)];

  paths.forEach((path) => {
    lines.push(encodeWireString(path));
  });

  return `${lines.join("\n")}\n`;
}

export function encodeRustCoreIndexSearchWireRequest(
  query: string,
  limit: number
): string {
  return [
    "CTXCORE_SEARCH_INDEX_V1",
    String(Math.max(1, limit)),
    encodeWireString(query.trim())
  ].join("\n") + "\n";
}

export function encodeRustCoreStatusWireRequest(): string {
  return "CTXCORE_STATUS_V1\n";
}

export function encodeRustCoreDiffWireRequest(
  original: string,
  suggested: string
): string {
  return [
    "CTXCORE_DIFF_V1",
    encodeWireString(original),
    encodeWireString(suggested)
  ].join("\n") + "\n";
}

export function encodeRustCoreTextOccurrenceWireRequest(
  content: string,
  requestedText: string
): string {
  return [
    "CTXCORE_TEXT_OCCURRENCE_V1",
    encodeWireString(content),
    encodeWireString(requestedText)
  ].join("\n") + "\n";
}

export function encodeRustCoreResolveWireRequest(
  query: string,
  paths: string[],
  limit: number
): string {
  const lines = [
    "CTXCORE_RESOLVE_V1",
    String(Math.max(1, limit)),
    encodeWireString(query.trim()),
    String(paths.length)
  ];

  paths.forEach((path) => {
    lines.push(encodeWireString(path));
  });

  return `${lines.join("\n")}\n`;
}

export function diffRustCoreDocumentSet(
  previousSignatures: Map<string, string>,
  nextDocuments: VectorRagDocument[]
): RustCoreDocumentDiff {
  const nextSignatures = new Map<string, string>();
  const upsertDocuments: VectorRagDocument[] = [];

  for (const document of nextDocuments) {
    const signature = getRustCoreDocumentSignature(document);
    nextSignatures.set(document.path, signature);

    if (previousSignatures.get(document.path) !== signature) {
      upsertDocuments.push(document);
    }
  }

  const removedPaths = Array.from(previousSignatures.keys()).filter(
    (path) => !nextSignatures.has(path)
  );

  return {
    upsertDocuments,
    removedPaths,
    nextSignatures
  };
}

export function getRustCoreDocumentSignature(
  document: VectorRagDocument
): string {
  return `${document.mtime ?? 0}:${document.size ?? document.content.length}`;
}

function encodeDocumentCommand(
  header: string,
  documents: VectorRagDocument[]
): string {
  const lines = [header, String(documents.length)];

  for (const document of documents) {
    lines.push(encodeWireString(document.path));
    lines.push(encodeWireString(document.title));
    lines.push(encodeWireString(document.content));
  }

  return `${lines.join("\n")}\n`;
}

function encodeWireString(value: string): string {
  return `${Buffer.byteLength(value, "utf8")}\n${value}`;
}
