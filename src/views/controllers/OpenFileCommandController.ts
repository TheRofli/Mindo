import type { ActionTimelineEventType } from "../../actions/actionTimeline";
import type { ActionReceipt, VaultSearchResult } from "../../types";
import { getFolderPath } from "../createNotePathUtils";

type DirectOpenFileCandidate = {
  path: string;
  basename: string;
};

type RustPathResolverResult = {
  path: string;
  score: number;
};

export type OpenFileCommandControllerDeps = {
  getMarkdownPaths: () => string[];
  resolveDirectCandidate: (query: string) => DirectOpenFileCandidate | null;
  resolvePathsWithRustCore: (input: {
    query: string;
    paths: string[];
    limit: number;
    pluginDir: string;
  }) => Promise<RustPathResolverResult[] | null>;
  pluginDir?: string;
  searchSemanticVaultMarkdown: (
    query: string,
    variants: string[],
    limit: number
  ) => Promise<VaultSearchResult[]>;
  openVaultPath: (path: string, noticeMessage: string) => Promise<void>;
  rememberVaultSearch: (query: string, results: VaultSearchResult[]) => void;
  appendActionReceipt: (
    receipt: ActionReceipt,
    userContent?: string
  ) => void;
  pushActionTimeline: (
    type: ActionTimelineEventType,
    label: string,
    detail?: string,
    path?: string
  ) => void;
  setError: (error: string | null) => void;
  setStatus: (status: string) => void;
};

export class OpenFileCommandController {
  constructor(private readonly deps: OpenFileCommandControllerDeps) {}

  async openFileByVaultQuery(
    query: string,
    commandText: string
  ): Promise<string | null> {
    this.deps.pushActionTimeline("opening", "Opening note", query);
    const results = await this.resolveQuery(query);

    if (!results.length) {
      this.deps.setError(`Could not find a Markdown note for: ${query}`);
      this.deps.setStatus("Status: Open failed");
      this.deps.pushActionTimeline("failed", "Open failed", query);
      return null;
    }

    const result = results[0];

    this.deps.rememberVaultSearch(query, results);
    await this.deps.openVaultPath(result.path, `Opened file: ${result.path}`);
    this.deps.appendActionReceipt(
      {
        status: "opened",
        label: "Opened note",
        detail: `File: ${result.path} | folder: ${getFolderPath(result.path) || "/"} | query: ${query}`,
        path: result.path
      },
      commandText
    );
    this.deps.pushActionTimeline("done", "Opened note", result.path, result.path);
    return result.path;
  }

  private async resolveQuery(query: string): Promise<VaultSearchResult[]> {
    const directFile = this.deps.resolveDirectCandidate(query);

    if (directFile) {
      return [
        {
          path: directFile.path,
          title: directFile.basename,
          score: 999,
          snippet: "Matched by file name and folder.",
          matches: ["filename", "path"]
        }
      ];
    }

    const paths = this.deps.getMarkdownPaths();
    const rustResolved = await this.deps.resolvePathsWithRustCore({
      query,
      paths,
      limit: 3,
      pluginDir: this.deps.pluginDir ?? ""
    });

    if (rustResolved?.length) {
      return rustResolved.map((result) => ({
        path: result.path,
        title: result.path.split("/").pop()?.replace(/\.md$/i, "") ?? result.path,
        score: result.score,
        snippet: "Matched by Rust path resolver.",
        matches: ["rust-core", "path"]
      }));
    }

    return [];
  }
}
