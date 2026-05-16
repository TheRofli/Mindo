import type { ContexActionKind, ContexActionReceipt } from "../actions/actionTypes";
import { trimTextForContext } from "../text/textUtils";
import type { ActionReceipt, ContexSettings, WebSearchResult } from "../types";
import { decideWikiAutopilot, type WikiAutopilotDecision } from "./wikiAutopilot";
import { ensureContexWikiStructure, getContexWikiPaths } from "./wikiBootstrap";
import {
  buildRawIngestionMarkdown,
  createRawIngestionRecord,
  getRawIngestionPath
} from "./wikiRawIngestion";
import {
  createWikiNodeId,
  parseWikiJsonl,
  serializeWikiJsonl,
  type ContexWikiNode,
  type ContexWikiNodeType
} from "./wikiSchema";
import { buildWikiNodeMarkdown, getWikiNodeMarkdownPath } from "./wikiWriter";

interface WikiVaultAdapterLike {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  write(path: string, content: string): Promise<void>;
  read(path: string): Promise<string>;
}

export interface WikiMemoryAppLike {
  vault: {
    adapter: WikiVaultAdapterLike;
  };
}

export interface WikiMemoryControllerOptions {
  app: WikiMemoryAppLike;
  getSettings: () => ContexSettings;
  getActiveChatId?: () => string | null;
  now?: () => string;
}

export interface WikiMemoryRecordInput {
  userText: string;
  assistantText?: string;
  receipts?: ContexActionReceipt[];
  sourcePaths?: string[];
  webSources?: WebSearchResult[];
}

export type WikiMemoryRecordStatus =
  | "disabled"
  | "manual"
  | "empty"
  | "skipped"
  | "written"
  | "failed";

export interface WikiMemoryRecordResult {
  status: WikiMemoryRecordStatus;
  reason: string;
  decision?: WikiAutopilotDecision;
  rawPath?: string;
  nodePath?: string;
  error?: unknown;
}

export function actionReceiptToWikiReceipt(
  receipt: ActionReceipt,
  actionId = createActionId()
): ContexActionReceipt {
  return {
    actionId,
    kind: inferWikiReceiptKind(receipt),
    status: receipt.status,
    label: receipt.label,
    detail: receipt.detail,
    path: receipt.path
  };
}

export function inferWikiReceiptKind(receipt: ActionReceipt): ContexActionKind {
  const text = `${receipt.label} ${receipt.detail ?? ""}`.toLowerCase();

  if (text.includes("research")) {
    return "research_note";
  }

  if (text.includes("created note") || text.includes("drafting note")) {
    return "create_note";
  }

  if (text.includes("applied") || text.includes("change")) {
    return "replace_text";
  }

  if (text.includes("opened")) {
    return "open_note";
  }

  return "none";
}

export class WikiMemoryController {
  private readonly app: WikiMemoryAppLike;
  private readonly getSettings: () => ContexSettings;
  private readonly getActiveChatId: () => string | null;
  private readonly now: () => string;

  constructor(options: WikiMemoryControllerOptions) {
    this.app = options.app;
    this.getSettings = options.getSettings;
    this.getActiveChatId = options.getActiveChatId ?? (() => null);
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async recordAutopilotMemory(
    input: WikiMemoryRecordInput
  ): Promise<WikiMemoryRecordResult> {
    const settings = this.getSettings();

    if (!settings.wikiEnabled) {
      return {
        status: "disabled",
        reason: "Wiki memory is disabled."
      };
    }

    if (settings.wikiMemoryMode === "manual") {
      return {
        status: "manual",
        reason: "Wiki memory is in manual mode."
      };
    }

    const userText = input.userText.trim();
    const assistantText = input.assistantText?.trim() ?? "";

    if (!userText && !assistantText && !input.sourcePaths?.length) {
      return {
        status: "empty",
        reason: "No content or sources were provided for Wiki memory."
      };
    }

    try {
      await ensureContexWikiStructure(this.app, settings);

      const capturedAt = this.now();
      const existingNodes = await this.loadContexWikiNodes();
      const decision = decideWikiAutopilot({
        userText,
        assistantText,
        receipts: input.receipts,
        sourcePaths: input.sourcePaths,
        webSources: input.webSources?.map((source) => ({
          title: source.title,
          url: source.url,
          date: source.publishedDate,
          excerpt: source.snippet
        })),
        existingNodes,
        now: capturedAt
      });

      if (!decision.shouldWriteWiki) {
        return {
          status: "skipped",
          reason: decision.reason,
          decision
        };
      }

      const rawPath = await this.writeRawMemoryRecord({
        decision,
        userText,
        assistantText,
        capturedAt,
        settings
      });
      const nodePath = await this.writeWikiAutopilotNode({
        nodeType: decision.targetNodeType,
        title: decision.title,
        summary: assistantText || userText || decision.reason,
        rawPath,
        capturedAt,
        confidence: decision.confidence,
        sourcePaths: decision.sourcePaths,
        settings
      });

      return {
        status: "written",
        reason: decision.reason,
        decision,
        rawPath,
        nodePath
      };
    } catch (error) {
      return {
        status: "failed",
        reason: "Wiki memory write failed.",
        error
      };
    }
  }

  async loadContexWikiNodes(): Promise<ContexWikiNode[]> {
    const settings = this.getSettings();
    const paths = getContexWikiPaths(settings.wikiRootFolder);

    if (!(await this.app.vault.adapter.exists(paths.schema.nodes))) {
      return [];
    }

    const content = await this.app.vault.adapter.read(paths.schema.nodes);
    return parseWikiJsonl<ContexWikiNode>(content).records;
  }

  private async writeRawMemoryRecord(input: {
    decision: WikiAutopilotDecision;
    userText: string;
    assistantText: string;
    capturedAt: string;
    settings: ContexSettings;
  }): Promise<string> {
    const record = createRawIngestionRecord({
      kind: "chat",
      title: input.decision.title,
      locator: `chat:${this.getActiveChatId() ?? "current"}`,
      capturedAt: input.capturedAt,
      metadata: {
        reason: input.decision.reason,
        confidence: Math.round(input.decision.confidence * 100) / 100,
        mode: input.settings.wikiMemoryMode
      },
      content: [
        "# Automatic Wiki Memory",
        "",
        input.userText ? "## User" : "",
        input.userText,
        input.assistantText ? "## Assistant" : "",
        input.assistantText,
        input.decision.sourcePaths.length ? "## Source Paths" : "",
        ...input.decision.sourcePaths.map((path) => `- [[${path}]]`),
        input.decision.sources.length ? "## Sources" : "",
        ...input.decision.sources.map(
          (source) => `- ${source.title}: ${source.locator}`
        )
      ]
        .filter((line) => line !== "")
        .join("\n")
    });
    const rawPath = getRawIngestionPath(input.settings.wikiRootFolder, record);

    if (!(await this.app.vault.adapter.exists(rawPath))) {
      await this.app.vault.adapter.write(
        rawPath,
        buildRawIngestionMarkdown(record)
      );
    }

    return rawPath;
  }

  private async writeWikiAutopilotNode(input: {
    nodeType: ContexWikiNodeType;
    title: string;
    summary: string;
    rawPath: string;
    capturedAt: string;
    confidence: number;
    sourcePaths: string[];
    settings: ContexSettings;
  }): Promise<string> {
    const title = sanitizeWikiMemoryTitle(input.title || "Mindo Wiki Update");
    const rawSource = {
      id: `raw-${Date.now().toString(36)}`,
      kind: "raw" as const,
      title: "Automatic chat memory",
      locator: input.rawPath,
      capturedAt: input.capturedAt,
      excerpt: trimTextForContext(input.summary, 240)
    };
    const vaultSources = input.sourcePaths.slice(0, 6).map((path, index) => ({
      id: `vault-${index}-${Date.now().toString(36)}`,
      kind: "vault" as const,
      title: path.split("/").pop()?.replace(/\.md$/i, "") ?? path,
      locator: path,
      capturedAt: input.capturedAt
    }));
    const node: ContexWikiNode = {
      id: createWikiNodeId(input.nodeType, title),
      type: input.nodeType,
      title,
      aliases: [],
      summary: trimTextForContext(input.summary, 1200),
      path: "",
      confidence: input.confidence,
      freshness: "current",
      sources: [rawSource, ...vaultSources],
      relations: [],
      createdAt: input.capturedAt,
      updatedAt: input.capturedAt
    };
    const nodePath = getWikiNodeMarkdownPath(input.settings.wikiRootFolder, node);
    node.path = nodePath;

    if (!(await this.app.vault.adapter.exists(nodePath))) {
      await this.app.vault.adapter.write(
        nodePath,
        buildWikiNodeMarkdown(input.settings.wikiRootFolder, node)
      );
    } else {
      const existing = await this.app.vault.adapter.read(nodePath);
      const updateBlock = [
        "",
        "## Latest Automatic Update",
        "",
        `Captured: ${input.capturedAt}`,
        "",
        trimTextForContext(input.summary, 1200),
        "",
        `Raw source: [[${input.rawPath}]]`,
        ""
      ].join("\n");

      if (!existing.includes(`Raw source: [[${input.rawPath}]]`)) {
        await this.app.vault.adapter.write(
          nodePath,
          `${existing.trim()}\n${updateBlock}`
        );
      }
    }

    await this.appendNodeToSchema(input.settings.wikiRootFolder, node);

    return nodePath;
  }

  private async appendNodeToSchema(
    wikiRootFolder: string,
    node: ContexWikiNode
  ): Promise<void> {
    const paths = getContexWikiPaths(wikiRootFolder);
    const existingNodes = await this.app.vault.adapter.exists(paths.schema.nodes)
      ? await this.app.vault.adapter.read(paths.schema.nodes)
      : "";
    const serializedNode = serializeWikiJsonl([node]);

    if (!existingNodes.includes(`"id":"${node.id}"`)) {
      await this.app.vault.adapter.write(
        paths.schema.nodes,
        `${existingNodes}${serializedNode}`
      );
    }
  }
}

function sanitizeWikiMemoryTitle(value: string): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|#^[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90);

  return sanitized || "Mindo Wiki Update";
}

function createActionId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
