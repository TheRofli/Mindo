import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { VectorRagDocument } from "../rag/vectorRag";
import type { VaultSearchResult } from "../types";
import { parseRustCoreSearchResponse } from "./protocol";
import { parseRustCoreResolveResponse, type RustResolvedPath } from "./resolverSearch";
import { resolveRustCoreExecutablePath } from "./coreSearch";
import {
  diffRustCoreDocumentSet,
  encodeRustCoreIndexSearchWireRequest,
  encodeRustCoreIndexWireRequest,
  encodeRustCoreRemoveWireRequest,
  encodeRustCoreResolveWireRequest,
  encodeRustCoreStatusWireRequest,
  encodeRustCoreTextOccurrenceWireRequest,
  encodeRustCoreUpsertWireRequest
} from "./indexProtocol";
import {
  parseRustCoreTextOccurrenceResponse,
  type RustTextOccurrenceResult
} from "./textOccurrenceSearch";

export type RustCoreRuntimeMode =
  | "not-found"
  | "sidecar"
  | "typescript-fallback"
  | "error";

export interface RustCoreRuntimeDiagnostics {
  mode: RustCoreRuntimeMode;
  executablePath?: string;
  documents?: number;
  chunks?: number;
  lastIndexMs?: number;
  lastQueryMs?: number;
  lastError?: string;
  updatedAt?: number;
}

interface RustCoreIndexedSearchOptions {
  query: string;
  documents: VectorRagDocument[];
  limit?: number;
  pluginDir?: string;
  timeoutMs?: number;
}

interface RustCoreResolveOptions {
  query: string;
  paths: string[];
  limit?: number;
  pluginDir?: string;
  timeoutMs?: number;
}

interface RustCoreTextOccurrenceOptions {
  content: string;
  requestedText: string;
  pluginDir?: string;
  timeoutMs?: number;
}

interface PendingRustCoreCommand {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

interface RustCoreStatusResponse {
  version?: unknown;
  status?: unknown;
  documents?: unknown;
  chunks?: unknown;
}

const DEFAULT_TIMEOUT_MS = 7000;
let session: RustCoreIndexSession | null = null;
let diagnostics: RustCoreRuntimeDiagnostics = {
  mode: "not-found"
};

export async function searchWithRustCoreIndex(
  options: RustCoreIndexedSearchOptions
): Promise<VaultSearchResult[] | null> {
  const executablePath = resolveRustCoreExecutablePath(
    options.pluginDir ?? __dirname
  );

  if (!executablePath) {
    updateDiagnostics({
      mode: "not-found",
      executablePath: undefined,
      lastError: undefined
    });
    return null;
  }

  const activeSession =
    session?.executablePath === executablePath
      ? session
      : new RustCoreIndexSession(executablePath, options.timeoutMs);
  session = activeSession;

  try {
    const indexStarted = performance.now();
    const status = await activeSession.ensureIndexed(options.documents);
    const indexElapsed = Math.round(performance.now() - indexStarted);
    const queryStarted = performance.now();
    const response = await activeSession.search(
      options.query,
      options.limit ?? 8
    );
    const queryElapsed = Math.round(performance.now() - queryStarted);
    const results = parseRustCoreSearchResponse(JSON.parse(response));

    updateDiagnostics({
      mode: "sidecar",
      executablePath,
      documents: status.documents,
      chunks: status.chunks,
      lastIndexMs: indexElapsed,
      lastQueryMs: queryElapsed,
      lastError: undefined
    });

    return results;
  } catch (error) {
    updateDiagnostics({
      mode: "error",
      executablePath,
      lastError: error instanceof Error ? error.message : String(error)
    });
    console.warn("[Contex Agent] Rust sidecar search unavailable", error);
    activeSession.stop();
    session = null;
    return null;
  }
}

export async function resolvePathsWithRustCore(
  options: RustCoreResolveOptions
): Promise<RustResolvedPath[] | null> {
  const executablePath = resolveRustCoreExecutablePath(
    options.pluginDir ?? __dirname
  );

  if (!executablePath) {
    updateDiagnostics({
      mode: "not-found",
      executablePath: undefined,
      lastError: undefined
    });
    return null;
  }

  const activeSession =
    session?.executablePath === executablePath
      ? session
      : new RustCoreIndexSession(executablePath, options.timeoutMs);
  session = activeSession;

  try {
    const queryStarted = performance.now();
    const response = await activeSession.resolvePaths(
      options.query,
      options.paths,
      options.limit ?? 8
    );
    const queryElapsed = Math.round(performance.now() - queryStarted);

    updateDiagnostics({
      mode: "sidecar",
      executablePath,
      documents: diagnostics.documents,
      chunks: diagnostics.chunks,
      lastIndexMs: diagnostics.lastIndexMs,
      lastQueryMs: queryElapsed,
      lastError: undefined
    });

    return parseRustCoreResolveResponse(JSON.parse(response));
  } catch (error) {
    updateDiagnostics({
      mode: "error",
      executablePath,
      lastError: error instanceof Error ? error.message : String(error)
    });
    console.warn("[Contex Agent] Rust sidecar resolver unavailable", error);
    activeSession.stop();
    session = null;
    return null;
  }
}

export async function findTextOccurrenceWithRustCore(
  options: RustCoreTextOccurrenceOptions
): Promise<RustTextOccurrenceResult | null> {
  const executablePath = resolveRustCoreExecutablePath(
    options.pluginDir ?? __dirname
  );

  if (!executablePath) {
    updateDiagnostics({
      mode: "not-found",
      executablePath: undefined,
      lastError: undefined
    });
    return null;
  }

  const activeSession =
    session?.executablePath === executablePath
      ? session
      : new RustCoreIndexSession(executablePath, options.timeoutMs);
  session = activeSession;

  try {
    const queryStarted = performance.now();
    const response = await activeSession.findTextOccurrence(
      options.content,
      options.requestedText
    );
    const queryElapsed = Math.round(performance.now() - queryStarted);

    updateDiagnostics({
      mode: "sidecar",
      executablePath,
      documents: diagnostics.documents,
      chunks: diagnostics.chunks,
      lastIndexMs: diagnostics.lastIndexMs,
      lastQueryMs: queryElapsed,
      lastError: undefined
    });

    return parseRustCoreTextOccurrenceResponse(JSON.parse(response));
  } catch (error) {
    updateDiagnostics({
      mode: "error",
      executablePath,
      lastError: error instanceof Error ? error.message : String(error)
    });
    console.warn("[Contex Agent] Rust sidecar text occurrence unavailable", error);
    activeSession.stop();
    session = null;
    return null;
  }
}

export function getRustCoreRuntimeDiagnostics(): RustCoreRuntimeDiagnostics {
  return {
    ...diagnostics
  };
}

export function markRustCoreTypeScriptFallback(): void {
  updateDiagnostics({
    ...diagnostics,
    mode: "typescript-fallback"
  });
}

export function stopRustCoreIndexSession(): void {
  session?.stop();
  session = null;
}

class RustCoreIndexSession {
  private child: ChildProcessWithoutNullStreams | null = null;
  private outputBuffer = "";
  private pending: PendingRustCoreCommand[] = [];
  private documentSignatures = new Map<string, string>();
  private indexed = false;
  private latestStatus = {
    documents: 0,
    chunks: 0
  };

  constructor(
    readonly executablePath: string,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS
  ) {}

  async ensureIndexed(
    documents: VectorRagDocument[]
  ): Promise<{ documents: number; chunks: number }> {
    await this.start();

    if (!this.indexed) {
      const response = await this.send(encodeRustCoreIndexWireRequest(documents));
      this.documentSignatures = diffRustCoreDocumentSet(
        new Map(),
        documents
      ).nextSignatures;
      this.indexed = true;
      return this.applyStatus(response);
    }

    const diff = diffRustCoreDocumentSet(this.documentSignatures, documents);

    if (diff.removedPaths.length) {
      this.applyStatus(
        await this.send(encodeRustCoreRemoveWireRequest(diff.removedPaths))
      );
    }

    if (diff.upsertDocuments.length) {
      this.applyStatus(
        await this.send(encodeRustCoreUpsertWireRequest(diff.upsertDocuments))
      );
    }

    this.documentSignatures = diff.nextSignatures;

    if (!diff.removedPaths.length && !diff.upsertDocuments.length) {
      return this.latestStatus;
    }

    return this.latestStatus;
  }

  async search(query: string, limit: number): Promise<string> {
    await this.start();
    return this.send(encodeRustCoreIndexSearchWireRequest(query, limit));
  }

  async resolvePaths(
    query: string,
    paths: string[],
    limit: number
  ): Promise<string> {
    await this.start();
    return this.send(encodeRustCoreResolveWireRequest(query, paths, limit));
  }

  async findTextOccurrence(
    content: string,
    requestedText: string
  ): Promise<string> {
    await this.start();
    return this.send(
      encodeRustCoreTextOccurrenceWireRequest(content, requestedText)
    );
  }

  stop(): void {
    if (this.child && !this.child.killed) {
      try {
        this.child.stdin.write("CTXCORE_EXIT_V1\n");
      } catch {
        // Ignore shutdown write errors.
      }
      this.child.kill();
    }

    this.child = null;
    this.indexed = false;
    this.pending.splice(0).forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Rust sidecar stopped"));
    });
  }

  private async start(): Promise<void> {
    if (this.child && !this.child.killed) {
      return;
    }

    this.child = spawn(this.executablePath, ["--serve"], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    this.child.stdout.on("data", (chunk: Buffer) => {
      this.handleStdout(chunk.toString("utf8"));
    });
    this.child.stderr.on("data", (chunk: Buffer) => {
      const message = chunk.toString("utf8").trim();

      if (message) {
        console.warn("[Contex Agent] Rust sidecar stderr", message);
      }
    });
    this.child.on("error", (error) => {
      this.rejectAll(error instanceof Error ? error : new Error(String(error)));
    });
    this.child.on("exit", (code) => {
      this.rejectAll(new Error(`Rust sidecar exited with code ${code ?? "unknown"}`));
      this.child = null;
      this.indexed = false;
    });

    this.applyStatus(await this.send(encodeRustCoreStatusWireRequest()));
  }

  private send(command: string): Promise<string> {
    if (!this.child || this.child.killed) {
      return Promise.reject(new Error("Rust sidecar is not running"));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.shift();
        reject(new Error("Rust sidecar command timed out"));
      }, this.timeoutMs);
      this.pending.push({
        resolve,
        reject,
        timeout
      });
      this.child?.stdin.write(command);
    });
  }

  private handleStdout(chunk: string): void {
    this.outputBuffer += chunk;

    while (true) {
      const newlineIndex = this.outputBuffer.indexOf("\n");

      if (newlineIndex === -1) {
        return;
      }

      const line = this.outputBuffer.slice(0, newlineIndex).trim();
      this.outputBuffer = this.outputBuffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      const pending = this.pending.shift();

      if (!pending) {
        continue;
      }

      clearTimeout(pending.timeout);
      pending.resolve(line);
    }
  }

  private applyStatus(response: string): { documents: number; chunks: number } {
    try {
      const parsed = JSON.parse(response) as RustCoreStatusResponse;
      const documents =
        typeof parsed.documents === "number"
          ? parsed.documents
          : this.latestStatus.documents;
      const chunks =
        typeof parsed.chunks === "number" ? parsed.chunks : this.latestStatus.chunks;
      this.latestStatus = {
        documents,
        chunks
      };
    } catch {
      // Search responses are handled by the caller.
    }

    return this.latestStatus;
  }

  private rejectAll(error: Error): void {
    this.pending.splice(0).forEach((pending) => {
      clearTimeout(pending.timeout);
      pending.reject(error);
    });
  }
}

function updateDiagnostics(next: RustCoreRuntimeDiagnostics): void {
  diagnostics = {
    ...next,
    updatedAt: Date.now()
  };
}
