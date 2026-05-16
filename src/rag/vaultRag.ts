import { normalizePath, type App, type TFile } from "obsidian";
import type { VaultSearchResult } from "../types";
import {
  buildVectorRagIndexFromDocuments,
  searchVectorRagIndex,
  type VectorRagDocument,
  type VectorRagIndex,
  type VectorRagOptions
} from "./vectorRag";
import {
  markRustCoreTypeScriptFallback,
  searchWithRustCoreIndex
} from "../rustCore/indexedSearch";
import { resolveRustCoreExecutablePath } from "../rustCore/coreSearch";

interface CachedVaultRagIndex {
  signature: string;
  index: VectorRagIndex;
}

interface CachedVectorDocument {
  signature: string;
  document: VectorRagDocument;
}

const DEFAULT_VECTOR_RAG_LIMIT = 8;
const vaultRagCache = new WeakMap<App, CachedVaultRagIndex>();
const vaultDocumentCache = new WeakMap<App, Map<string, CachedVectorDocument>>();

export async function searchVectorVaultMarkdown(
  app: App,
  query: string,
  limit = DEFAULT_VECTOR_RAG_LIMIT,
  options: VectorRagOptions = {}
): Promise<VaultSearchResult[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return [];
  }

  const rustCorePath = resolveRustCoreExecutablePath(__dirname);

  if (rustCorePath) {
    const rustResults = await searchWithRustCoreIndex({
      query: trimmedQuery,
      documents: await getVectorVaultDocuments(app),
      limit,
      pluginDir: __dirname
    });

    if (rustResults !== null) {
      return rustResults;
    }
  }

  markRustCoreTypeScriptFallback();
  const index = await getVectorVaultIndex(app, options);

  return searchVectorRagIndex(index, trimmedQuery, limit).map((result) => ({
    path: result.path,
    title: result.title,
    score: result.score,
    snippet: result.snippet,
    heading: result.heading,
    matches: result.matches
  }));
}

export async function getVectorVaultDocuments(
  app: App
): Promise<VectorRagDocument[]> {
  const files = getSearchableMarkdownFiles(app);
  const cache = getVaultDocumentCache(app);

  return Promise.all(
    files.map(async (file) => {
      const signature = getFileSignature(file);
      const cached = cache.get(file.path);

      if (cached?.signature === signature) {
        return cached.document;
      }

      const document = {
        path: file.path,
        title: file.basename,
        mtime: file.stat.mtime,
        size: file.stat.size,
        content: await app.vault.cachedRead(file)
      };
      cache.set(file.path, {
        signature,
        document
      });

      return document;
    })
  );
}

async function getVectorVaultIndex(
  app: App,
  options: VectorRagOptions
): Promise<VectorRagIndex> {
  const files = getSearchableMarkdownFiles(app);
  const signature = buildVaultSignature(files);
  const cached = vaultRagCache.get(app);

  if (cached?.signature === signature) {
    return cached.index;
  }

  const documents = await getVectorVaultDocuments(app);
  const index = buildVectorRagIndexFromDocuments(documents, options);

  vaultRagCache.set(app, {
    signature,
    index
  });

  return index;
}

function getSearchableMarkdownFiles(app: App): TFile[] {
  return app.vault
    .getMarkdownFiles()
    .filter((file) => !isIgnoredPath(file.path, app.vault.configDir));
}

function buildVaultSignature(files: TFile[]): string {
  return files
    .map((file) => getFileSignature(file))
    .sort()
    .join("|");
}

function getVaultDocumentCache(app: App): Map<string, CachedVectorDocument> {
  const existing = vaultDocumentCache.get(app);

  if (existing) {
    pruneDeletedDocumentCacheEntries(app, existing);
    return existing;
  }

  const next = new Map<string, CachedVectorDocument>();
  vaultDocumentCache.set(app, next);
  return next;
}

function pruneDeletedDocumentCacheEntries(
  app: App,
  cache: Map<string, CachedVectorDocument>
): void {
  const existingPaths = new Set(app.vault.getMarkdownFiles().map((file) => file.path));

  for (const path of cache.keys()) {
    if (!existingPaths.has(path)) {
      cache.delete(path);
    }
  }
}

function getFileSignature(file: TFile): string {
  return `${file.path}:${file.stat.mtime}:${file.stat.size}:${file.basename}`;
}

function isIgnoredPath(path: string, configDir: string): boolean {
  const lowerPath = normalizePath(path).toLowerCase();
  const lowerConfigDir = normalizePath(configDir).toLowerCase();

  return (
    isPathOrChild(lowerPath, lowerConfigDir) ||
    lowerPath.startsWith(".git/") ||
    lowerPath.startsWith(".contex-history/")
  );
}

function isPathOrChild(path: string, parentPath: string): boolean {
  return path === parentPath || path.startsWith(`${parentPath}/`);
}
