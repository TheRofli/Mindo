import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { VectorRagDocument } from "../rag/vectorRag";
import type { VaultSearchResult } from "../types";
import { parseRustCoreSearchResponse } from "./protocol";
import {
  encodeRustCoreSearchWireRequest,
  getRustCoreExecutableName
} from "./wireProtocol";

export interface RustCoreSearchOptions {
  query: string;
  documents: VectorRagDocument[];
  limit?: number;
  pluginDir?: string;
  executablePath?: string;
  timeoutMs?: number;
}

const DEFAULT_RUST_CORE_TIMEOUT_MS = 5000;
const MAX_RUST_CORE_STDOUT_CHARS = 8 * 1024 * 1024;
const MAX_RUST_CORE_STDERR_CHARS = 64 * 1024;
const executablePathCache = new Map<string, string>();

export async function searchWithRustCore(
  options: RustCoreSearchOptions
): Promise<VaultSearchResult[] | null> {
  const executablePath =
    options.executablePath ??
    resolveRustCoreExecutablePath(options.pluginDir ?? __dirname);

  if (!executablePath) {
    return null;
  }

  const request = encodeRustCoreSearchWireRequest({
    query: options.query,
    documents: options.documents,
    limit: options.limit ?? 8
  });

  try {
    const stdout = await runRustCoreProcess(
      executablePath,
      request,
      options.timeoutMs ?? DEFAULT_RUST_CORE_TIMEOUT_MS
    );
    const parsed: unknown = JSON.parse(stdout);

    return parseRustCoreSearchResponse(parsed);
  } catch (error) {
    console.warn("[Mindo] Rust core search unavailable", error);
    return null;
  }
}

export function resolveRustCoreExecutablePath(
  pluginDir: string,
  platform?: NodeJS.Platform
): string | null {
  const cacheKey = `${platform ?? "auto"}:${pluginDir}`;
  const cached = executablePathCache.get(cacheKey);

  if (cached && existsSync(cached)) {
    return cached;
  }

  const resolved =
    getRustCoreCandidatePaths(pluginDir, platform).find((path) =>
      existsSync(path)
    ) ?? null;

  if (resolved) {
    executablePathCache.set(cacheKey, resolved);
  } else {
    executablePathCache.delete(cacheKey);
  }

  return resolved;
}

export function getRustCoreCandidatePaths(
  pluginDir: string,
  platform?: NodeJS.Platform
): string[] {
  const executableNames = platform
    ? [getRustCoreExecutableName(platform)]
    : ["contex-core.exe", "contex-core"];

  return executableNames.flatMap((executableName) => [
    join(pluginDir, "bin", executableName),
    join(
      pluginDir,
      "tools",
      "contex_core",
      "target",
      "release",
      executableName
    )
  ]);
}

function runRustCoreProcess(
  executablePath: string,
  request: string,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(executablePath, [], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      child.kill();
      reject(new Error("Rust core search timed out"));
    }, Math.max(500, timeoutMs));

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");

      if (stdout.length > MAX_RUST_CORE_STDOUT_CHARS && !settled) {
        settled = true;
        clearTimeout(timeout);
        child.kill();
        reject(new Error("Rust core stdout exceeded limit"));
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");

      if (stderr.length > MAX_RUST_CORE_STDERR_CHARS) {
        stderr = stderr.slice(-MAX_RUST_CORE_STDERR_CHARS);
      }
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (code !== 0) {
        reject(
          new Error(
            `Rust core exited with code ${code ?? "unknown"}${stderr ? `: ${stderr}` : ""}`
          )
        );
        return;
      }

      resolve(stdout.trim());
    });

    child.stdin.end(request);
  });
}
