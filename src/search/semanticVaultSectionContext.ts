import type {
  VaultSearchResult,
  VaultSourceSection
} from "../types";

export interface RelevantMarkdownSection {
  heading: string;
  excerpt: string;
  score: number;
}

export interface BuildSemanticVaultSectionContextOptions<TFile> {
  query: string;
  results: VaultSearchResult[];
  maxSources?: number;
  getFileByPath: (path: string) => TFile | null;
  readFile: (file: TFile) => Promise<string>;
  extractRelevantMarkdownSections: (
    content: string,
    query: string,
    result: VaultSearchResult
  ) => RelevantMarkdownSection[];
  formatSemanticVaultContext: (results: VaultSearchResult[]) => string;
}

export interface SemanticVaultSectionContextBundle {
  context: string;
  sections: VaultSourceSection[];
}

export async function buildSemanticVaultSectionContext<TFile>(
  options: BuildSemanticVaultSectionContextOptions<TFile>
): Promise<SemanticVaultSectionContextBundle> {
  const maxSources = options.maxSources ?? 5;
  const sectionsBySource: string[] = [];
  const sourceSections: VaultSourceSection[] = [];

  for (const [index, result] of options.results.slice(0, maxSources).entries()) {
    const file = options.getFileByPath(result.path);

    if (!file) {
      sectionsBySource.push(options.formatSemanticVaultContext([result]));
      continue;
    }

    const content = await options.readFile(file);
    const sections = options.extractRelevantMarkdownSections(
      content,
      options.query,
      result
    );

    sections.forEach((section) => {
      sourceSections.push({
        path: result.path,
        title: result.title,
        heading: section.heading,
        excerpt: section.excerpt,
        score: section.score
      });
    });

    const sectionText = sections
      .map((section, sectionIndex) =>
        [
          `Section ${sectionIndex + 1}`,
          `Heading: ${section.heading}`,
          "Excerpt:",
          section.excerpt
        ].join("\n")
      )
      .join("\n\n");

    sectionsBySource.push(
      [
        `Source ${index + 1}`,
        `Path: ${result.path}`,
        `Title: ${result.title}`,
        result.heading ? `Matched heading: ${result.heading}` : "",
        `Score: ${result.score}`,
        sectionText || `Snippet: ${result.snippet}`
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return {
    context: sectionsBySource.join("\n\n"),
    sections: sourceSections
  };
}
