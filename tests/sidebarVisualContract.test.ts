import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const pluginDir = process.cwd();
const styles = readFileSync(join(pluginDir, "styles.css"), "utf8");
const viewSourceFiles = listSourceFiles(join(pluginDir, "src", "views"));

assertStyleRule(".contex-agent", (body) =>
  body.includes("--mindo-accent: #7b6cf6;")
);

for (const selector of [
  ".contex-agent__home-hero",
  ".contex-agent__home-logo",
  ".contex-agent__home-greeting"
]) {
  assertStyleRule(selector);
}

for (const selector of [
  ".contex-agent__message-content.markdown-rendered",
  ".contex-agent__live-transcript-text.markdown-rendered"
]) {
  assertStyleRule(selector, (body) => /\bcolor:\s*#16131c;/u.test(body));
}

assertStyleRule(".contex-agent__message", (body) =>
  [
    /\bborder:\s*2px solid var\(--mindo-ink\);/u,
    /\bbackground:\s*#fbf8ff;/u,
    /\bbox-shadow:\s*4px 6px 0 rgba\(17,\s*16,\s*24,\s*0\.2\);/u,
    /\bcolor:\s*#16131c;/u
  ].every((pattern) => pattern.test(body))
);
assertStyleRule(".contex-agent__message--assistant .contex-agent__message-role");

assertStyleRule(".contex-agent__live-transcript-bubble", (body) =>
  [
    /\bborder:\s*2px solid var\(--mindo-ink\);/u,
    /\bbackground:\s*#fbf8ff;/u,
    /\bbox-shadow:\s*4px 6px 0 rgba\(17,\s*16,\s*24,\s*0\.2\);/u
  ].every((pattern) => pattern.test(body))
);
assertStyleRule(".contex-agent__live-transcript-item--assistant");

assert.equal(styles.includes("!important"), false, "styles.css must avoid !important.");
assert.equal(
  styles.includes("text-decoration"),
  false,
  "styles.css must avoid text-decoration to stay Obsidian review-safe."
);
assert.equal(
  /url\(\s*["']?\.\/assets\//u.test(styles),
  false,
  "styles.css must not depend on optional ./assets runtime paths."
);

assert.deepEqual(findNativeTooltipTitles(viewSourceFiles), []);

console.log("sidebarVisualContract tests passed");

function assertStyleRule(
  selector: string,
  predicate: (body: string) => boolean = () => true
): void {
  const matchingRules = styleRulesForSelector(selector);

  assert.notEqual(matchingRules.length, 0, `Missing CSS rule for ${selector}.`);
  assert.equal(
    matchingRules.some(predicate),
    true,
    `CSS rule for ${selector} does not satisfy the sidebar visual contract.`
  );
}

function styleRulesForSelector(selector: string): string[] {
  return [...styles.matchAll(/([^{}]+)\{([^{}]*)\}/gu)]
    .filter((match) =>
      match[1]
        .split(",")
        .map((candidate) => candidate.trim())
        .includes(selector)
    )
    .map((match) => match[2]);
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      const stat = statSync(path);

      if (stat.isDirectory()) {
        return listSourceFiles(path);
      }

      return entry.endsWith(".ts") ? [path] : [];
    })
    .sort();
}

function findNativeTooltipTitles(files: string[]): string[] {
  return files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const failures: string[] = [];

    for (const match of source.matchAll(
      /\b((?:this\.)?[A-Za-z_$][\w$]*(?:\??\.[A-Za-z_$][\w$]*)*)\??\.setAttribute\(\s*(["'])title\2\s*,/gu
    )) {
      failures.push(
        formatFailure(
          file,
          'setAttribute("title", ...)',
          ` for ${match[1] ?? "unknown target"}`
        )
      );
    }

    failures.push(...findAttrTitleTooltipProperties(file, source));

    return failures;
  });
}

function findAttrTitleTooltipProperties(file: string, source: string): string[] {
  const failures: string[] = [];
  const attrStartPattern = /\battr\s*:\s*\{/gu;

  for (const match of source.matchAll(attrStartPattern)) {
    const openBraceIndex = source.indexOf("{", match.index ?? 0);
    const closeBraceIndex = findMatchingBrace(source, openBraceIndex);

    if (openBraceIndex < 0 || closeBraceIndex < 0) {
      continue;
    }

    const titleIndex = findTopLevelTitleProperty(source, openBraceIndex + 1, closeBraceIndex);

    if (titleIndex >= 0) {
      failures.push(formatFailure(file, "attr: { title: ... }"));
    }
  }

  return failures;
}

function findMatchingBrace(source: string, openBraceIndex: number): number {
  if (openBraceIndex < 0) {
    return -1;
  }

  let depth = 0;
  let index = openBraceIndex;

  while (index < source.length) {
    const skippedIndex = skipIgnoredSyntax(source, index);

    if (skippedIndex !== index) {
      index = skippedIndex;
      continue;
    }

    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;

      if (depth === 0) {
        return index;
      }
    }

    index += 1;
  }

  return -1;
}

function findTopLevelTitleProperty(source: string, start: number, end: number): number {
  let depth = 0;
  let index = start;

  while (index < end) {
    const skippedIndex = skipIgnoredSyntax(source, index);

    if (skippedIndex !== index) {
      index = skippedIndex;
      continue;
    }

    const char = source[index];

    if (char === "{") {
      depth += 1;
      index += 1;
      continue;
    }

    if (char === "}") {
      depth = Math.max(0, depth - 1);
      index += 1;
      continue;
    }

    if (depth === 0) {
      const titleMatch = source.slice(index, end).match(/^\s*(?:title|["']title["'])\s*:/u);

      if (titleMatch) {
        return index + titleMatch[0].search(/(?:title|["']title["'])/u);
      }
    }

    index += 1;
  }

  return -1;
}

function skipIgnoredSyntax(source: string, index: number): number {
  const char = source[index];
  const next = source[index + 1];

  if (char === "/" && next === "/") {
    const lineEnd = source.indexOf("\n", index + 2);
    return lineEnd < 0 ? source.length : lineEnd + 1;
  }

  if (char === "/" && next === "*") {
    const commentEnd = source.indexOf("*/", index + 2);
    return commentEnd < 0 ? source.length : commentEnd + 2;
  }

  if (char === '"' || char === "'" || char === "`") {
    return skipStringLike(source, index, char);
  }

  return index;
}

function skipStringLike(source: string, start: number, quote: string): number {
  let index = start + 1;

  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2;
      continue;
    }

    if (source[index] === quote) {
      return index + 1;
    }

    index += 1;
  }

  return source.length;
}

function formatFailure(file: string, pattern: string, detail = ""): string {
  const path = relative(pluginDir, file).replaceAll("\\", "/");

  return `${path} reintroduced native tooltip ${pattern}${detail}`;
}
