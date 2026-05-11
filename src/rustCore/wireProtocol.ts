import type { VectorRagDocument } from "../rag/vectorRag";

export interface RustCoreWireSearchRequest {
  query: string;
  documents: VectorRagDocument[];
  limit: number;
}

const RUST_CORE_WIRE_HEADER = "CTXCORE_SEARCH_V1";

export function encodeRustCoreSearchWireRequest(
  request: RustCoreWireSearchRequest
): string {
  const lines = [
    RUST_CORE_WIRE_HEADER,
    String(Math.max(1, request.limit)),
    encodeWireString(request.query.trim()),
    String(request.documents.length)
  ];

  for (const document of request.documents) {
    lines.push(encodeWireString(document.path));
    lines.push(encodeWireString(document.title));
    lines.push(encodeWireString(document.content));
  }

  return `${lines.join("\n")}\n`;
}

export function getRustCoreExecutableName(
  platform: NodeJS.Platform = process.platform
): string {
  return platform === "win32" ? "contex-core.exe" : "contex-core";
}

function encodeWireString(value: string): string {
  return `${Buffer.byteLength(value, "utf8")}\n${value}`;
}
