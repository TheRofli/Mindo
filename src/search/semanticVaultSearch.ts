import type { App } from "obsidian";
import type { VaultSearchResult } from "../types";
import { searchVectorVaultMarkdown } from "../rag/vaultRag";
import {
  searchWikiFirstMarkdown,
  type WikiFirstRagOptions
} from "../rag/wikiFirstRag";
import { searchVaultMarkdownMany } from "./vaultSearch";

const MAX_QUERY_VARIANTS = 6;
const MAX_RESULTS_PER_QUERY = 8;

export async function searchSemanticVaultMarkdown(
  app: App,
  query: string,
  queryVariants: string[],
  limit = 8,
  options: WikiFirstRagOptions = {}
): Promise<VaultSearchResult[]> {
  const searches = normalizeQueryVariants(query, queryVariants).slice(
    0,
    MAX_QUERY_VARIANTS
  );
  const wikiResults = await searchWikiFirstMarkdown(app, query, limit, options);
  const resultSets = await searchVaultMarkdownMany(
    app,
    searches,
    MAX_RESULTS_PER_QUERY
  );
  const vectorResults = await searchVectorVaultMarkdown(app, query, limit);
  const boostedKeywordResults: VaultSearchResult[] = [];

  resultSets.forEach((results, searchIndex) => {
    results.forEach((result, resultIndex) => {
      const semanticBoost =
        Math.max(0, MAX_QUERY_VARIANTS - searchIndex) * 6 +
        Math.max(0, MAX_RESULTS_PER_QUERY - resultIndex);

      boostedKeywordResults.push({
        ...result,
        score: result.score + semanticBoost,
        matches: Array.from(new Set([...(result.matches ?? []), "semantic"]))
      });
    });
  });

  return mergeVaultSearchResults([wikiResults, boostedKeywordResults, vectorResults])
    .slice(0, limit);
}

export function formatSemanticVaultContext(
  results: VaultSearchResult[]
): string {
  return results
    .map((result, index) =>
      [
        `Source ${index + 1}`,
        `Path: ${result.path}`,
        `Title: ${result.title}`,
        result.heading ? `Heading: ${result.heading}` : "",
        `Score: ${result.score}`,
        `Snippet: ${result.snippet}`
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function normalizeQueryVariants(query: string, variants: string[]): string[] {
  return Array.from(
    new Set(
      [query, ...variants]
        .map((variant) => variant.trim())
        .filter((variant) => variant.length >= 2)
    )
  );
}

export function mergeVaultSearchResults(
  resultSets: VaultSearchResult[][]
): VaultSearchResult[] {
  const resultMap = new Map<
    string,
    { result: VaultSearchResult; totalScore: number; evidenceCount: number }
  >();

  for (const results of resultSets) {
    for (const result of results) {
      const existing = resultMap.get(result.path);

      if (!existing) {
        resultMap.set(result.path, {
          result,
          totalScore: result.score,
          evidenceCount: 1
        });
        continue;
      }

      const bestResult = result.score > existing.result.score ? result : existing.result;
      existing.result = {
        ...bestResult,
        matches: Array.from(
          new Set([...(existing.result.matches ?? []), ...(result.matches ?? [])])
        )
      };
      existing.totalScore += result.score;
      existing.evidenceCount += 1;
    }
  }

  return Array.from(resultMap.values())
    .map(({ result, totalScore, evidenceCount }) => {
      const evidenceBonus = Math.min(24, Math.max(0, totalScore - result.score) * 0.35);
      const matches =
        evidenceCount > 1
          ? Array.from(new Set([...(result.matches ?? []), "multi-evidence"]))
          : result.matches;

      return {
        ...result,
        score: Math.round((result.score + evidenceBonus) * 1000) / 1000,
        matches
      };
    })
    .sort((left, right) => right.score - left.score);
}
