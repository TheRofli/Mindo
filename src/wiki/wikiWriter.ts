import { getContexWikiPaths } from "./wikiBootstrap";
import {
  buildWikiNodeFrontmatter,
  type ContexWikiNode,
  type ContexWikiNodeType,
  type ContexWikiSourceRef
} from "./wikiSchema";
import {
  buildWikiConfidenceLabel,
  scoreWikiNodeConfidence
} from "./wikiConfidence";

export function getWikiNodeMarkdownPath(
  rootFolder: string,
  node: Pick<ContexWikiNode, "type" | "title">
): string {
  const paths = getContexWikiPaths(rootFolder);
  const folder = getWikiNodeTypeFolder(paths, node.type);

  return `${folder}/${sanitizeMarkdownFileName(node.title)}.md`;
}

export function buildWikiNodeMarkdown(
  rootFolder: string,
  node: ContexWikiNode
): string {
  const path = node.path || getWikiNodeMarkdownPath(rootFolder, node);
  const nodeWithPath = {
    ...node,
    path
  };
  const sourceLines = node.sources.length
    ? node.sources.map((source) => `- ${formatWikiSourceLink(source)}`)
    : ["- No sources yet."];
  const relationLines = node.relations.length
    ? node.relations.map(
        (relation) => `- ${relation.type} -> ${relation.targetId}`
      )
    : ["- No relations yet."];

  return [
    buildWikiNodeFrontmatter(nodeWithPath).trimEnd(),
    "",
    `# ${node.title}`,
    "",
    node.summary || "_No summary yet._",
    "",
    "## Confidence",
    "",
    buildWikiConfidenceLabel(scoreWikiNodeConfidence(nodeWithPath)),
    "",
    "## Sources",
    "",
    ...sourceLines,
    "",
    "## Relations",
    "",
    ...relationLines,
    ""
  ].join("\n");
}

export function formatWikiSourceLink(source: ContexWikiSourceRef): string {
  if (isWebUrl(source.locator)) {
    return `[${escapeMarkdownLinkText(source.title)}](${source.locator})`;
  }

  if (source.locator.endsWith(".md")) {
    return `[[${source.locator}|${escapeWikiAlias(source.title)}]]`;
  }

  return `${source.title} (${source.locator})`;
}

function getWikiNodeTypeFolder(
  paths: ReturnType<typeof getContexWikiPaths>,
  type: ContexWikiNodeType
): string {
  switch (type) {
    case "project":
      return paths.wiki.projects;
    case "concept":
      return paths.wiki.concepts;
    case "tool":
      return paths.wiki.tools;
    case "model":
      return paths.wiki.models;
    case "workflow":
      return paths.wiki.workflows;
    case "decision":
      return paths.wiki.decisions;
    case "problem":
      return paths.wiki.problems;
  }
}

function sanitizeMarkdownFileName(value: string): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|#^[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return sanitized || "Untitled Wiki Node";
}

function isWebUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function escapeMarkdownLinkText(value: string): string {
  return value.replace(/\]/g, "\\]");
}

function escapeWikiAlias(value: string): string {
  return value.replace(/\|/g, " ");
}
