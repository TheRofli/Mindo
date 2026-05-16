import type { RustCoreRuntimeDiagnostics } from "../rustCore/indexedSearch";

export interface ContexDiagnosticsInput {
  activeNote: string | null | undefined;
  model: string;
  rust: RustCoreRuntimeDiagnostics;
}

export function buildContexDiagnosticsLines(
  input: ContexDiagnosticsInput
): string[] {
  const { rust } = input;
  return [
    `Active note: ${input.activeNote ?? "none"}`,
    `Model: ${input.model}`,
    `Rust RAG: ${rust.mode}`,
    rust.executablePath ? `Core: ${rust.executablePath}` : "",
    typeof rust.documents === "number" ? `Docs: ${rust.documents}` : "",
    typeof rust.chunks === "number" ? `Chunks: ${rust.chunks}` : "",
    typeof rust.lastIndexMs === "number" ? `Index sync: ${rust.lastIndexMs}ms` : "",
    typeof rust.lastQueryMs === "number" ? `Query: ${rust.lastQueryMs}ms` : "",
    rust.lastError ? `Last error: ${rust.lastError}` : ""
  ].filter((line): line is string => Boolean(line));
}
