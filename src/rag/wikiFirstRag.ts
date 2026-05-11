import type { App, TFile } from "obsidian";
import type { VaultSearchResult } from "../types";
import {
  buildVectorRagIndexFromDocuments,
  searchVectorRagIndex,
  type VectorRagDocument
} from "./vectorRag";
import { getContexWikiPaths } from "../wiki/wikiBootstrap";

export interface WikiFirstRagOptions {
  wikiEnabled?: boolean;
  wikiRootFolder?: string;
}

const WIKI_SCORE_BOOST = 120;
const WIKI_ALIAS_BOOST = 180;

export async function searchWikiFirstMarkdown(
  app: App,
  query: string,
  limit: number,
  options: WikiFirstRagOptions = {}
): Promise<VaultSearchResult[]> {
  const trimmedQuery = query.trim();

  if (!trimmedQuery || !options.wikiEnabled) {
    return [];
  }

  const paths = getContexWikiPaths(options.wikiRootFolder);
  const wikiDocuments = await getWikiMarkdownDocuments(app, paths.wikiRoot);

  if (!wikiDocuments.length) {
    return [];
  }

  const index = buildVectorRagIndexFromDocuments(wikiDocuments, {
    maxChunkChars: 1200,
    overlapChars: 120
  });
  const aliasIds = await getExactAliasNodeIds(app, paths.schema.aliases, trimmedQuery);
  const resultsByPath = new Map<string, VaultSearchResult>();

  searchVectorRagIndex(index, trimmedQuery, limit).forEach((result) => {
    resultsByPath.set(result.path, {
      ...result,
      score: result.score + WIKI_SCORE_BOOST,
      matches: Array.from(new Set([...(result.matches ?? []), "wiki"]))
    });
  });

  if (aliasIds.length) {
    wikiDocuments.forEach((document) => {
      if (!aliasIds.some((id) => document.content.includes(id))) {
        return;
      }

      const existing = resultsByPath.get(document.path);
      resultsByPath.set(document.path, {
        path: document.path,
        title: document.title,
        score: (existing?.score ?? 0) + WIKI_ALIAS_BOOST,
        snippet: existing?.snippet ?? createWikiSnippet(document.content),
        heading: existing?.heading,
        matches: Array.from(
          new Set([...(existing?.matches ?? []), "wiki", "wiki-alias"])
        )
      });
    });
  }

  return [...resultsByPath.values()]
    .sort((left, right) => right.score - left.score)
    .slice(0, Math.max(1, limit));
}

async function getWikiMarkdownDocuments(
  app: App,
  wikiRoot: string
): Promise<VectorRagDocument[]> {
  const prefix = `${wikiRoot}/`;
  const files = app.vault
    .getMarkdownFiles()
    .filter((file) => file.path.startsWith(prefix));

  return Promise.all(files.map((file) => toWikiDocument(app, file)));
}

async function toWikiDocument(
  app: App,
  file: TFile
): Promise<VectorRagDocument> {
  return {
    path: file.path,
    title: file.basename,
    content: await app.vault.cachedRead(file),
    mtime: file.stat.mtime,
    size: file.stat.size
  };
}

async function getExactAliasNodeIds(
  app: App,
  aliasesPath: string,
  query: string
): Promise<string[]> {
  const adapter = app.vault.adapter as {
    exists?: (path: string) => Promise<boolean>;
    read?: (path: string) => Promise<string>;
  };

  if (!adapter.exists || !adapter.read || !(await adapter.exists(aliasesPath))) {
    return [];
  }

  try {
    const aliases = JSON.parse(await adapter.read(aliasesPath)) as Record<
      string,
      string[]
    >;
    const ids = aliases[normalizeAliasKey(query)];
    return Array.isArray(ids) ? ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function normalizeAliasKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function createWikiSnippet(content: string): string {
  return content
    .replace(/^---[\s\S]*?---\s*/m, "")
    .trim()
    .slice(0, 520);
}
