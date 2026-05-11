import assert from "node:assert/strict";
import {
  buildWikiNodeFrontmatter,
  createWikiNodeId,
  parseWikiJsonl,
  serializeWikiJsonl,
  type ContexWikiNode
} from "../src/wiki/wikiSchema";

const node: ContexWikiNode = {
  id: createWikiNodeId("concept", "Local LLM"),
  type: "concept",
  title: "Local LLM",
  aliases: ["локальная модель", "local language model"],
  summary: "A language model that runs on local hardware.",
  path: "Contex Wiki/Wiki/Concepts/Local LLM.md",
  confidence: 0.88,
  freshness: "current",
  sources: [
    {
      id: "source-web-local-llm",
      kind: "web",
      title: "Local LLM guide",
      locator: "https://example.com/local-llm",
      capturedAt: "2026-05-08T00:00:00.000Z"
    }
  ],
  relations: [
    {
      type: "uses",
      targetId: createWikiNodeId("tool", "Ollama"),
      label: "Often runs through Ollama"
    }
  ],
  createdAt: "2026-05-08T00:00:00.000Z",
  updatedAt: "2026-05-08T00:00:00.000Z"
};

assert.equal(node.id, createWikiNodeId("concept", "Local LLM"));
assert.match(node.id, /^concept-local-llm-[a-z0-9]{8}$/);
assert.match(createWikiNodeId("concept", "Контекст"), /^concept-node-[a-z0-9]{8}$/);

const jsonl = serializeWikiJsonl([node]);
const parsed = parseWikiJsonl<ContexWikiNode>(jsonl);

assert.equal(parsed.records.length, 1);
assert.equal(parsed.records[0]?.id, node.id);
assert.equal(parsed.errors.length, 0);

const withBadLine = parseWikiJsonl<ContexWikiNode>(`${jsonl}{bad json`);

assert.equal(withBadLine.records.length, 1);
assert.equal(withBadLine.errors.length, 1);
assert.equal(withBadLine.errors[0]?.line, 2);

const frontmatter = buildWikiNodeFrontmatter(node);

assert.ok(frontmatter.startsWith("---\n"));
assert.ok(frontmatter.includes("contex_node: true"));
assert.ok(frontmatter.includes(`node_id: ${node.id}`));
assert.ok(frontmatter.includes("node_type: concept"));
assert.ok(frontmatter.includes("aliases:"));
assert.ok(frontmatter.endsWith("---\n"));

console.log("wikiSchema tests passed");
