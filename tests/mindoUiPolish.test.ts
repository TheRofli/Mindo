import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const styles = readFileSync(join(process.cwd(), "styles.css"), "utf8");
const sidebarView = readFileSync(
  join(process.cwd(), "src", "views", "AgentSidebarView.ts"),
  "utf8"
);
const uiSourceFiles = [
  ...listSourceFiles(join(process.cwd(), "src", "views")),
  ...listSourceFiles(join(process.cwd(), "src", "modals")),
  ...listSourceFiles(join(process.cwd(), "src", "diagnostics"))
];

assert.ok(!styles.includes("var(--color-orange"));
assert.ok(
  /\.contex-agent__auto-apply-toggle\.is-active\s*\{[^}]*var\(--mindo-accent\)/s.test(
    styles
  )
);
assert.ok(
  /\.contex-agent__auto-apply-toggle\.is-active \.contex-agent__auto-apply-knob\s*\{[^}]*background:\s*var\(--mindo-accent\);/s.test(
    styles
  )
);
assert.ok(styles.includes(".contex-agent__action-menu-item-icon"));
assert.ok(styles.includes(".contex-agent__action-menu-item-label"));
assert.ok(sidebarView.includes("icon:"));
assert.ok(sidebarView.includes("contex-agent__action-menu-item-icon"));
assert.ok(sidebarView.includes("contex-agent__action-menu-item-label"));
assert.ok(sidebarView.includes("removeAttribute(\"title\")"));
assert.ok(!sidebarView.includes('title: this.t("startLiveDialogue")'));
assert.deepEqual(findNativeTooltipTitleAttributes(uiSourceFiles), []);
assert.ok(
  /private\s+async\s+renderLiveDialogueTranscript[\s\S]*MarkdownRenderer\.render/s.test(
    sidebarView
  ),
  "Expected live dialogue transcript to render assistant Markdown instead of showing raw markdown markers."
);
assert.ok(
  styles.includes("contex-agent__message--assistant") &&
    /\.contex-agent__message\s*\{[^}]*border:\s*2px solid var\(--mindo-ink\)/s.test(
      styles
    ),
  "Expected normal chat messages to use the same soft drawn bubble style as live dialogue."
);
assert.ok(
  /\.contex-agent__message-content\.markdown-rendered[\s\S]*color:\s*#16131c\s*!important/s.test(
    styles
  ) &&
    /\.contex-agent__live-transcript-text\.markdown-rendered[\s\S]*color:\s*#16131c\s*!important/s.test(
      styles
    ),
  "Expected rendered Markdown inside chat and live dialogue bubbles to stay dark on the light bubble background."
);
assert.ok(
  isDirectOpenCandidateCheckedBeforeRust(sidebarView),
  "Expected open-file routing to prefer exact vault filename/folder matches before Rust fallback."
);

console.log("mindoUiPolish tests passed");

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

function findNativeTooltipTitleAttributes(files: string[]): string[] {
  const failures: string[] = [];

  for (const file of files) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/u);
    let attrDepth = 0;

    lines.forEach((line, index) => {
      if (/setAttribute\(\s*["']title["']/u.test(line)) {
        failures.push(formatFailure(file, index, line));
      }

      if (/\battr\s*:\s*\{/u.test(line)) {
        attrDepth += countBraces(line.slice(line.indexOf("attr")));
      } else if (attrDepth > 0) {
        attrDepth += countBraces(line);
      }

      if (attrDepth > 0 && /^\s*title\s*:/u.test(line)) {
        failures.push(formatFailure(file, index, line));
      }

      if (attrDepth < 0) {
        attrDepth = 0;
      }
    });
  }

  return failures;
}

function countBraces(line: string): number {
  return [...line].reduce((depth, char) => {
    if (char === "{") {
      return depth + 1;
    }

    if (char === "}") {
      return depth - 1;
    }

    return depth;
  }, 0);
}

function formatFailure(file: string, index: number, line: string): string {
  return `${file}:${index + 1}: ${line.trim()}`;
}

function isDirectOpenCandidateCheckedBeforeRust(source: string): boolean {
  const method = source.match(
    /private async openFileByVaultQuery[\s\S]*?private resolveOpenFileCandidate/u
  )?.[0];

  if (!method) {
    return false;
  }

  const directIndex = method.indexOf("const directFile = this.resolveOpenFileCandidate(query)");
  const rustIndex = method.indexOf("resolvePathsWithRustCore");

  return directIndex >= 0 && rustIndex >= 0 && directIndex < rustIndex;
}
