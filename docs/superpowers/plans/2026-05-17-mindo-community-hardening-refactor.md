# Mindo Community Hardening And Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Mindo safer for Community Plugin installs, easier to extend, and cleaner for future Talk to your Vault features.

**Architecture:** Treat this as a staged hardening pass, not a feature rewrite. First make runtime assets and release packaging deterministic, then split the biggest sidebar responsibilities into small tested units, then strengthen vault-aware file/action routing, and finally clean public docs/release metadata without breaking compatibility.

**Tech Stack:** TypeScript, Obsidian plugin API, Node test runner via `scripts/run-tests.mjs`, esbuild-wasm, Rust sidecar in `tools/contex_core`, PowerShell-based local STT/TTS launchers.

---

## Scope

This plan covers eight independently testable improvements:

1. Community install asset safety: no broken logo or font when only `manifest.json`, `main.js`, and `styles.css` are installed.
2. Sidebar refactor: move asset/font/home/open-file responsibilities out of `src/views/AgentSidebarView.ts`.
3. Vault-aware routing: improve fuzzy file/action resolution using real vault candidates, not hardcoded language dictionaries.
4. Release cleanup: remove generated or local-only baggage from Git, keep release artifacts reproducible.
5. Public docs cleanup: make the repo look like Mindo, while keeping compatible internal names where renaming is risky.
6. Targeted test execution: make focused test commands real so each task can be verified quickly.
7. Visual and release contracts: catch broken sidebar assets, font regressions, tooltip regressions, and package size drift before users see them.
8. Golden Talk to your Vault scenarios: protect fuzzy file opening, current-note analysis, and voice routing from regressions.

Recommended execution order:

`Task 0 -> Task 1 -> Task 6 -> Task 7 -> Task 8 -> Task 2 -> Task 3 -> Task 4 -> Task 5 -> Task 9`

This puts test infrastructure, Community install safety, visual contracts, and bundle budgets before riskier product refactors. `Task 5` is intentionally late because docs/artifact cleanup should not distract from runtime correctness. Each task should leave the repository green and be committed independently.

## File Structure

- Modify `scripts/run-tests.mjs`
  - Accepts optional test file arguments for focused task verification.
- Create `scripts/embed-runtime-assets.mjs`
  - Generates compact data-url modules for runtime assets from source assets.
- Create `src/views/mindoFontData.ts`
  - Generated Comfortaa font data URL. Source of truth remains `assets/fonts/comfortaa/Comfortaa-Regular.ttf`.
- Modify `src/views/mindoLogoData.ts`
  - Regenerate from `assets/logo.png` through the same script.
- Create `src/views/sidebarAssetResources.ts`
  - Owns logo data URL, font installation, and plugin resource fallback rules.
- Create `src/views/homeHeroRenderer.ts`
  - Renders the empty-chat whale hero and greeting.
- Create `src/views/controllers/OpenFileActionController.ts`
  - Owns open-file action execution, direct candidate priority, Rust fallback, receipts, and timeline events.
- Create `src/router/vaultActionDecision.ts`
  - Pure decision model for direct, ambiguous, and LLM-assisted vault actions.
- Create `docs/TESTING.md`
  - Documents fast, full, release, and visual contract checks.
- Create `tests/testRunnerScriptPolicy.test.ts`
  - Protects targeted test runner behavior.
- Create `tests/sidebarVisualContract.test.ts`
  - Protects UI/CSS contracts that previously regressed in screenshots.
- Create `tests/bundleBudget.test.ts`
  - Protects bundle size and embedded asset budgets.
- Create `tests/talkToVaultGoldenScenarios.test.ts`
  - Protects fuzzy vault action behavior with realistic user phrasing.
- Modify `src/views/AgentSidebarView.ts`
  - Remove copied asset/font/home/open-file code and delegate to the new files.
- Modify `styles.css`
  - Remove external `@font-face` URL dependency if font is installed at runtime through data URL.
- Modify `scripts/package-plugin.mjs`
  - Keep full zip support, but stop treating runtime font files as required for the Community Plugin path once embedded.
- Modify `docs/RELEASE.md`, `docs/GITHUB_RELEASE_AND_COMMUNITY_SUBMISSION.md`, `README.md`
  - Document Community install vs full local runtime zip clearly.
- Move legacy internal plans from `docs/superpowers/plans/*contex*` to `docs/internal/legacy-plans/`
  - Keep history available, but remove old Contex-heavy plans from the public-facing docs path.
- Untrack `bin/contex-core.exe`
  - Keep generated sidecar in release zip via CI, not in source control.

---

### Task 0: Add Targeted Test Runner Support

**Files:**
- Modify: `scripts/run-tests.mjs`
- Create: `tests/testRunnerScriptPolicy.test.ts`
- Create: `docs/TESTING.md`

- [ ] **Step 1: Write the failing script policy test**

Create `tests/testRunnerScriptPolicy.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("scripts/run-tests.mjs", "utf8");

assert.ok(source.includes("process.argv.slice(2)"));
assert.ok(source.includes("resolveRequestedTests"));
assert.ok(source.includes("No matching tests found"));
assert.ok(source.includes("requestedTests.length ? requestedTests : discoveredTests"));

console.log("testRunnerScriptPolicy tests passed");
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
npm run test
```

Expected: fail because `scripts/run-tests.mjs` does not support requested test files yet.

- [ ] **Step 3: Add requested-test filtering**

In `scripts/run-tests.mjs`, replace the current `tests` declaration with:

```js
const discoveredTests = discoverTests(join(pluginDir, "tests"))
  .map((path) => relative(pluginDir, path).replaceAll("\\", "/"))
  .sort();
const requestedTests = resolveRequestedTests(
  discoveredTests,
  process.argv.slice(2)
);
const tests = requestedTests.length ? requestedTests : discoveredTests;
```

Then add this function above `discoverTests`:

```js
function resolveRequestedTests(discoveredTests, requested) {
  if (!requested.length) {
    return [];
  }

  const normalizedRequests = requested.map((entry) =>
    entry.replaceAll("\\", "/").replace(/^\.\//, "")
  );
  const matches = discoveredTests.filter((test) =>
    normalizedRequests.some(
      (request) =>
        test === request ||
        test.endsWith(`/${request}`) ||
        test.endsWith(request)
    )
  );

  if (!matches.length) {
    console.error(`No matching tests found for: ${normalizedRequests.join(", ")}`);
    process.exit(1);
  }

  return matches;
}
```

- [ ] **Step 4: Create the testing guide**

Create `docs/TESTING.md`:

````md
# Testing Mindo

## Fast Focused Test

Run one or more focused tests while developing:

```bash
node scripts/run-tests.mjs tests/openFileResolver.test.ts
```

## Full TypeScript Test Suite

```bash
npm run test
```

## Full Release Check

```bash
npm run release:check
```

This runs TypeScript tests, Rust tests, production build, and release package policy checks.

## Community Install Smoke

Community Plugin installs must work with only:

- `manifest.json`
- `main.js`
- `styles.css`

The smoke tests must verify that logo and font assets are embedded into `main.js` and that `styles.css` does not depend on external `assets/*` paths.
````

- [ ] **Step 5: Verify Task 0**

Run:

```bash
node scripts/run-tests.mjs tests/testRunnerScriptPolicy.test.ts
node scripts/run-tests.mjs tests/openFileResolver.test.ts
npm run test
```

Expected: the first two commands run only the requested tests, and `npm run test` still runs the whole suite.

- [ ] **Step 6: Commit Task 0**

```bash
git add scripts/run-tests.mjs tests/testRunnerScriptPolicy.test.ts docs/TESTING.md
git commit -m "Support targeted test runs"
```

---

### Task 1: Embed Runtime Assets For Community Installs

**Files:**
- Create: `scripts/embed-runtime-assets.mjs`
- Create: `src/views/mindoFontData.ts`
- Modify: `src/views/mindoLogoData.ts`
- Modify: `src/views/sidebarAssetResources.ts`
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `styles.css`
- Modify: `tests/fontAssets.test.ts`
- Create: `tests/communityInstallAssets.test.ts`
- Modify: `package.json`
- Modify: `scripts/package-plugin.mjs`

- [ ] **Step 1: Write the failing community asset test**

Create `tests/communityInstallAssets.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const styles = readFileSync(join(process.cwd(), "styles.css"), "utf8");
const sidebarAssets = readFileSync(
  join(process.cwd(), "src", "views", "sidebarAssetResources.ts"),
  "utf8"
);
const fontData = readFileSync(
  join(process.cwd(), "src", "views", "mindoFontData.ts"),
  "utf8"
);
const packageScript = readFileSync(
  join(process.cwd(), "scripts", "package-plugin.mjs"),
  "utf8"
);

assert.ok(fontData.includes("data:font/ttf;base64,"));
assert.ok(sidebarAssets.includes("MINDO_FONT_DATA_URL"));
assert.ok(sidebarAssets.includes("MINDO_LOGO_DATA_URL"));
assert.ok(!styles.includes("./assets/fonts/comfortaa/Comfortaa-Regular.ttf"));
assert.ok(!packageScript.includes('"assets/fonts/comfortaa/Comfortaa-Regular.ttf",'));
assert.ok(!packageScript.includes('"assets/fonts/comfortaa/OFL.txt",'));
assert.ok(!packageScript.includes('"assets/fonts/comfortaa/SOURCE.md",'));

console.log("communityInstallAssets tests passed");
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
node scripts/run-tests.mjs tests/communityInstallAssets.test.ts
```

Expected: fail because `src/views/mindoFontData.ts` and `src/views/sidebarAssetResources.ts` do not exist yet.

- [ ] **Step 3: Add the asset embedding script**

Create `scripts/embed-runtime-assets.mjs`:

```js
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const pluginDir = dirname(dirname(fileURLToPath(import.meta.url)));

writeDataModule({
  sourcePath: join(pluginDir, "assets", "logo.png"),
  targetPath: join(pluginDir, "src", "views", "mindoLogoData.ts"),
  exportName: "MINDO_LOGO_DATA_URL",
  mediaType: "image/png",
  comment:
    "Generated from assets/logo.png so the Community Plugin install does not need runtime image assets."
});

writeDataModule({
  sourcePath: join(pluginDir, "assets", "fonts", "comfortaa", "Comfortaa-Regular.ttf"),
  targetPath: join(pluginDir, "src", "views", "mindoFontData.ts"),
  exportName: "MINDO_FONT_DATA_URL",
  mediaType: "font/ttf",
  comment:
    "Generated from assets/fonts/comfortaa/Comfortaa-Regular.ttf so the Community Plugin install does not need runtime font assets."
});

function writeDataModule({ sourcePath, targetPath, exportName, mediaType, comment }) {
  const base64 = readFileSync(sourcePath).toString("base64");
  const chunks = base64.match(/.{1,96}/g) ?? [];
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(
    targetPath,
    [
      `// ${comment}`,
      `export const ${exportName} =`,
      `  "data:${mediaType};base64," +`,
      ...chunks.map((chunk, index) =>
        index === chunks.length - 1 ? `  "${chunk}";` : `  "${chunk}" +`
      ),
      ""
    ].join("\n")
  );
}
```

- [ ] **Step 4: Wire generation into build/test lifecycle**

Modify `package.json` scripts:

```json
{
  "scripts": {
    "dev": "node scripts/embed-runtime-assets.mjs && node esbuild.config.mjs --watch",
    "build": "node scripts/embed-runtime-assets.mjs && tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
    "test": "node scripts/embed-runtime-assets.mjs && node scripts/run-tests.mjs",
    "verify": "npm run test && npm run core:test && npm run build"
  }
}
```

Keep the remaining scripts unchanged.

- [ ] **Step 5: Create the asset helper**

Create `src/views/sidebarAssetResources.ts`:

```ts
import { normalizePath } from "obsidian";
import { MINDO_FONT_DATA_URL } from "./mindoFontData";
import { MINDO_LOGO_DATA_URL } from "./mindoLogoData";

export interface PluginAssetAppLike {
  vault: {
    adapter: {
      getResourcePath(path: string): string;
    };
  };
}

export interface PluginAssetManifestLike {
  dir?: string;
}

export function getPluginAssetResourcePath(
  app: PluginAssetAppLike,
  manifest: PluginAssetManifestLike,
  fileName: string
): string {
  if (fileName === "assets/logo.png") {
    return MINDO_LOGO_DATA_URL;
  }

  if (fileName === "assets/fonts/comfortaa/Comfortaa-Regular.ttf") {
    return MINDO_FONT_DATA_URL;
  }

  const pluginDir = manifest.dir ?? ".obsidian/plugins/mindo";
  const vaultPath = normalizePath(`${pluginDir}/${fileName}`);
  return app.vault.adapter.getResourcePath(vaultPath);
}

export function installRuntimeComfortaaFont(root: HTMLElement): void {
  root.style.setProperty(
    "--mindo-font-family",
    '"Mindo Runtime Comfortaa", "Mindo Comfortaa", var(--font-interface)'
  );

  const styleEl = root.createEl("style", {
    attr: {
      type: "text/css"
    }
  });
  styleEl.setText(
    [
      "@font-face {",
      '  font-family: "Mindo Runtime Comfortaa";',
      `  src: url(${JSON.stringify(MINDO_FONT_DATA_URL)}) format("truetype");`,
      "  font-style: normal;",
      "  font-weight: 400 700;",
      "  font-display: swap;",
      "}"
    ].join("\n")
  );
}
```

- [ ] **Step 6: Replace inline asset methods in `AgentSidebarView.ts`**

In `src/views/AgentSidebarView.ts`, remove the direct `MINDO_LOGO_DATA_URL` import and add:

```ts
import {
  getPluginAssetResourcePath,
  installRuntimeComfortaaFont
} from "./sidebarAssetResources";
```

Replace the existing private methods with:

```ts
  private getPluginAssetResourcePath(fileName: string): string {
    return getPluginAssetResourcePath(this.app, this.plugin.manifest, fileName);
  }

  private installRuntimeComfortaaFont(root: HTMLElement): void {
    installRuntimeComfortaaFont(root);
  }
```

- [ ] **Step 7: Remove the stylesheet external font dependency**

In `styles.css`, replace:

```css
@font-face {
  font-family: "Mindo Comfortaa";
  src: url("./assets/fonts/comfortaa/Comfortaa-Regular.ttf") format("truetype");
  font-style: normal;
  font-weight: 400 700;
  font-display: swap;
}
```

with:

```css
.contex-agent {
  --mindo-accent: #7b6cf6;
  --mindo-font-family: "Mindo Runtime Comfortaa", "Mindo Comfortaa", var(--font-interface);
}
```

Keep the existing `.contex-agent` variables by merging this into the current block, not by creating a duplicate `.contex-agent` block.

- [ ] **Step 8: Update package policy**

In `scripts/package-plugin.mjs`, remove these entries from `requiredFiles`:

```js
"assets/fonts/comfortaa/Comfortaa-Regular.ttf",
"assets/fonts/comfortaa/OFL.txt",
"assets/fonts/comfortaa/SOURCE.md"
```

Add `assets/fonts/comfortaa` to `optionalDirectories`:

```js
const optionalDirectories = [
  "assets/fonts/comfortaa",
  "bin",
  "tools/stt_server",
  "tools/tts_server"
];
```

- [ ] **Step 9: Update font asset tests**

In `tests/fontAssets.test.ts`, replace the assertions that require the font URL in `styles.css` and the direct sidebar font resource lookup with:

```ts
const fontDataPath = join(process.cwd(), "src", "views", "mindoFontData.ts");
const fontData = readFileSync(fontDataPath, "utf8");

assert.ok(fontData.includes("data:font/ttf;base64"));
assert.ok(styles.includes('"Mindo Runtime Comfortaa"'));
assert.ok(!styles.includes("./assets/fonts/comfortaa/Comfortaa-Regular.ttf"));
assert.ok(sidebarView.includes("installRuntimeComfortaaFont(root)"));
assert.ok(!sidebarView.includes('getPluginAssetResourcePath("assets/fonts/comfortaa/Comfortaa-Regular.ttf")'));
```

- [ ] **Step 10: Verify Task 1**

Run:

```bash
npm run test
npm run build
node scripts/package-plugin.mjs --check
```

Expected: all pass. `main.js` will grow by the embedded font size; confirm the built file stays comfortably below 1 MB. If the embedded font pushes `main.js` beyond the budget in Task 8, stop and switch the plan to this safer fallback: keep Comfortaa for full zip installs, but use Obsidian's interface font as the Community Plugin default.

- [ ] **Step 11: Commit Task 1**

```bash
git add package.json scripts/embed-runtime-assets.mjs scripts/package-plugin.mjs styles.css src/views/mindoLogoData.ts src/views/mindoFontData.ts src/views/sidebarAssetResources.ts src/views/AgentSidebarView.ts tests/fontAssets.test.ts tests/communityInstallAssets.test.ts
git commit -m "Harden runtime assets for community installs"
```

---

### Task 2: Extract Home Hero Rendering From The Sidebar

**Files:**
- Create: `src/views/homeHeroRenderer.ts`
- Create: `tests/homeHeroRenderer.test.ts`
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `tests/fontAssets.test.ts`

- [ ] **Step 1: Write the failing home hero renderer test**

Create `tests/homeHeroRenderer.test.ts`:

```ts
import assert from "node:assert/strict";
import { renderHomeHero } from "../src/views/homeHeroRenderer";
import { createFakeElement } from "./obsidianStub";

const root = createFakeElement("div");
const logoCalls: string[] = [];

renderHomeHero({
  parentEl: root as unknown as HTMLElement,
  greeting: "Hi, what should we explore today?",
  createLogo: (parentEl, className) => {
    logoCalls.push(className);
    return parentEl.createEl("img", {
      cls: className,
      attr: { src: "data:image/png;base64,abc", alt: "" }
    }) as HTMLImageElement;
  }
});

assert.equal(root.classes.has("contex-agent__home-hero"), true);
assert.equal(logoCalls[0], "contex-agent__home-logo");
assert.equal(
  root.children.some((child) =>
    child.classes.has("contex-agent__home-greeting") &&
    child.textContent === "Hi, what should we explore today?"
  ),
  true
);

console.log("homeHeroRenderer tests passed");
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
node scripts/run-tests.mjs tests/homeHeroRenderer.test.ts
```

Expected: fail because `src/views/homeHeroRenderer.ts` does not exist.

- [ ] **Step 3: Create `homeHeroRenderer.ts`**

Create `src/views/homeHeroRenderer.ts`:

```ts
export interface RenderHomeHeroOptions {
  parentEl: HTMLElement;
  greeting: string;
  createLogo: (parentEl: HTMLElement, className: string) => HTMLImageElement;
}

export function renderHomeHero(options: RenderHomeHeroOptions): HTMLElement {
  const heroEl = options.parentEl.createDiv({
    cls: "contex-agent__home-hero"
  });
  const logoWrapEl = heroEl.createDiv({
    cls: "contex-agent__home-logo-wrap"
  });

  options.createLogo(logoWrapEl, "contex-agent__home-logo");
  heroEl.createEl("div", {
    cls: "contex-agent__home-greeting",
    text: options.greeting
  });

  return heroEl;
}
```

- [ ] **Step 4: Replace the inline home hero code**

In `src/views/AgentSidebarView.ts`, import:

```ts
import { renderHomeHero } from "./homeHeroRenderer";
```

Find the code that manually creates `contex-agent__home-hero`, `contex-agent__home-logo-wrap`, `contex-agent__home-logo`, and `contex-agent__home-greeting`. Replace that block with:

```ts
renderHomeHero({
  parentEl: suggestionsEl,
  greeting: this.t("homeGreeting"),
  createLogo: (parentEl, className) =>
    this.createMindoLogoImage(parentEl, className)
});
```

- [ ] **Step 5: Verify Task 2**

Run:

```bash
node scripts/run-tests.mjs tests/homeHeroRenderer.test.ts tests/fontAssets.test.ts
npm run build
```

Expected: pass with no visual behavior change.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/views/homeHeroRenderer.ts src/views/AgentSidebarView.ts tests/homeHeroRenderer.test.ts tests/fontAssets.test.ts
git commit -m "Extract Mindo home hero renderer"
```

---

### Task 3: Extract Open File Action Execution

**Files:**
- Create: `src/views/controllers/OpenFileActionController.ts`
- Create: `tests/openFileActionController.test.ts`
- Modify: `src/views/AgentSidebarView.ts`
- Modify: `tests/mindoUiPolish.test.ts`

- [ ] **Step 1: Write the failing controller test**

Create `tests/openFileActionController.test.ts`:

```ts
import assert from "node:assert/strict";
import { OpenFileActionController } from "../src/views/controllers/OpenFileActionController";

const calls: string[] = [];

const controller = new OpenFileActionController({
  getMarkdownPaths: () => [
    "Proton/Qore Systems Cases.md",
    "Proton/Qore Systems Strategy.md",
    "Proton/qquark-app.md"
  ],
  resolveDirectFile: (query) =>
    query.includes("strategy")
      ? { path: "Proton/Qore Systems Strategy.md", basename: "Qore Systems Strategy" }
      : null,
  resolveWithRustCore: async () => [
    { path: "Proton/Qore Systems Cases.md", score: 10 }
  ],
  openVaultPath: async (path, detail) => {
    calls.push(`open:${path}:${detail}`);
  },
  rememberVaultSearch: (query, results) => {
    calls.push(`remember:${query}:${results[0]?.path}`);
  },
  appendActionReceipt: (receipt, commandText) => {
    calls.push(`receipt:${receipt.path}:${commandText}`);
  },
  pushActionTimeline: (type, label, detail) => {
    calls.push(`timeline:${type}:${label}:${detail}`);
  },
  setError: (message) => {
    calls.push(`error:${message}`);
  },
  setStatus: (status) => {
    calls.push(`status:${status}`);
  }
});

const opened = await controller.openFileByVaultQuery(
  "qore systems strategy",
  "open qore systems strategy"
);

assert.equal(opened, "Proton/Qore Systems Strategy.md");
assert.ok(calls.includes("remember:qore systems strategy:Proton/Qore Systems Strategy.md"));
assert.ok(calls.some((call) => call.startsWith("receipt:Proton/Qore Systems Strategy.md")));
assert.equal(calls.some((call) => call.includes("Proton/Qore Systems Cases.md")), false);

console.log("openFileActionController tests passed");
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
node scripts/run-tests.mjs tests/openFileActionController.test.ts
```

Expected: fail because the controller file does not exist.

- [ ] **Step 3: Create the controller**

Create `src/views/controllers/OpenFileActionController.ts`:

```ts
import type { VaultSearchResult } from "../../types";

export interface OpenFileDirectCandidate {
  path: string;
  basename: string;
}

export interface OpenFileRustCandidate {
  path: string;
  score: number;
}

export interface OpenFileActionControllerDeps {
  getMarkdownPaths: () => string[];
  resolveDirectFile: (query: string) => OpenFileDirectCandidate | null;
  resolveWithRustCore: (
    query: string,
    paths: string[]
  ) => Promise<OpenFileRustCandidate[] | null>;
  openVaultPath: (path: string, contextDetail: string) => Promise<void>;
  rememberVaultSearch: (query: string, results: VaultSearchResult[]) => void;
  appendActionReceipt: (
    receipt: {
      status: "opened";
      label: string;
      detail: string;
      path: string;
    },
    commandText: string
  ) => void;
  pushActionTimeline: (
    type: "opening" | "done" | "failed",
    label: string,
    detail?: string,
    path?: string
  ) => void;
  setError: (message: string) => void;
  setStatus: (status: string) => void;
}

export class OpenFileActionController {
  constructor(private readonly deps: OpenFileActionControllerDeps) {}

  async openFileByVaultQuery(
    query: string,
    commandText: string
  ): Promise<string | null> {
    this.deps.pushActionTimeline("opening", "Opening note", query);

    const directFile = this.deps.resolveDirectFile(query);
    const results = directFile
      ? [this.directCandidateToResult(directFile)]
      : await this.resolveRustResults(query);

    if (!results.length) {
      this.deps.setError(`Could not find a Markdown note for: ${query}`);
      this.deps.setStatus("Status: Open failed");
      this.deps.pushActionTimeline("failed", "Open failed", query);
      return null;
    }

    const path = results[0].path;
    this.deps.rememberVaultSearch(query, results);
    await this.deps.openVaultPath(path, `Opened file: ${path}`);
    this.deps.appendActionReceipt(
      {
        status: "opened",
        label: "Opened note",
        detail: `File: ${path} | query: ${query}`,
        path
      },
      commandText
    );
    this.deps.pushActionTimeline("done", "Opened note", path, path);
    return path;
  }

  private directCandidateToResult(candidate: OpenFileDirectCandidate): VaultSearchResult {
    return {
      path: candidate.path,
      title: candidate.basename,
      score: 999,
      snippet: "Matched by file name and folder.",
      matches: ["filename", "path"]
    };
  }

  private async resolveRustResults(query: string): Promise<VaultSearchResult[]> {
    const resolved = await this.deps.resolveWithRustCore(
      query,
      this.deps.getMarkdownPaths()
    );

    return resolved?.length
      ? resolved.map((result) => ({
          path: result.path,
          title: result.path.split("/").pop()?.replace(/\.md$/i, "") ?? result.path,
          score: result.score,
          snippet: "Matched by Rust path resolver.",
          matches: ["rust-core", "path"]
        }))
      : [];
  }
}
```

- [ ] **Step 4: Delegate from `AgentSidebarView.ts`**

Import the controller:

```ts
import { OpenFileActionController } from "./controllers/OpenFileActionController";
```

Replace the body of `openFileByVaultQuery` with:

```ts
    const controller = new OpenFileActionController({
      getMarkdownPaths: () => this.app.vault.getMarkdownFiles().map((file) => file.path),
      resolveDirectFile: (candidateQuery) => {
        const file = this.resolveOpenFileCandidate(candidateQuery);
        return file ? { path: file.path, basename: file.basename } : null;
      },
      resolveWithRustCore: (candidateQuery, paths) =>
        resolvePathsWithRustCore({
          query: candidateQuery,
          paths,
          limit: 3,
          pluginDir: __dirname
        }),
      openVaultPath: (path, detail) => this.openVaultPath(path, detail),
      rememberVaultSearch: (candidateQuery, results) =>
        this.rememberVaultSearch(candidateQuery, results),
      appendActionReceipt: (receipt, originalCommandText) =>
        this.appendActionReceipt(receipt, originalCommandText),
      pushActionTimeline: (type, label, detail, path) =>
        this.pushActionTimeline(type, label, detail, path),
      setError: (message) => this.setError(message),
      setStatus: (status) => this.statusEl?.setText(status)
    });

    return controller.openFileByVaultQuery(query, commandText);
```

- [ ] **Step 5: Update static polish test**

In `tests/mindoUiPolish.test.ts`, replace the direct source-order check with a controller import check:

```ts
assert.ok(
  sidebarView.includes("OpenFileActionController"),
  "Expected open-file routing to be delegated out of AgentSidebarView."
);
```

Keep the behavioral priority covered by `tests/openFileActionController.test.ts`.

- [ ] **Step 6: Verify Task 3**

Run:

```bash
node scripts/run-tests.mjs tests/openFileActionController.test.ts tests/openFileResolver.test.ts tests/mindoUiPolish.test.ts
npm run build
```

Expected: all pass.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/views/controllers/OpenFileActionController.ts src/views/AgentSidebarView.ts tests/openFileActionController.test.ts tests/mindoUiPolish.test.ts
git commit -m "Extract open file action controller"
```

---

### Task 4: Add Vault-Aware Action Decision Layer

**Files:**
- Create: `src/router/vaultActionDecision.ts`
- Create: `tests/vaultActionDecision.test.ts`
- Modify: `src/views/controllers/SemanticLocalCommandClassifier.ts`
- Modify: `src/router/semanticLocalCommandPrompt.ts`
- Modify: `tests/semanticLocalCommandClassifier.test.ts`
- Modify: `tests/vaultCandidatePromptContext.test.ts`

- [ ] **Step 1: Write the failing decision tests**

Create `tests/vaultActionDecision.test.ts`:

```ts
import assert from "node:assert/strict";
import { decideVaultActionCandidate } from "../src/router/vaultActionDecision";

const candidates = [
  { path: "Proton/Qore Systems Cases.md", score: 420 },
  { path: "Proton/Qore Systems Strategy.md", score: 980 },
  { path: "Proton/qquark-app.md", score: 210 }
];

assert.deepEqual(
  decideVaultActionCandidate({
    candidates,
    llmCandidatePath: null,
    ambiguityGap: 160
  }),
  {
    kind: "direct",
    path: "Proton/Qore Systems Strategy.md",
    reason: "Top vault candidate is clearly ahead."
  }
);

assert.deepEqual(
  decideVaultActionCandidate({
    candidates: [
      { path: "A/Core System.md", score: 700 },
      { path: "A/Qore System.md", score: 690 }
    ],
    llmCandidatePath: null,
    ambiguityGap: 160
  }),
  {
    kind: "clarify",
    paths: ["A/Core System.md", "A/Qore System.md"],
    reason: "Top vault candidates are too close."
  }
);

assert.deepEqual(
  decideVaultActionCandidate({
    candidates,
    llmCandidatePath: "Proton/qquark-app.md",
    ambiguityGap: 160
  }),
  {
    kind: "direct",
    path: "Proton/qquark-app.md",
    reason: "LLM selected an exact path from the provided vault candidates."
  }
);

console.log("vaultActionDecision tests passed");
```

- [ ] **Step 2: Run the new test and verify it fails**

Run:

```bash
node scripts/run-tests.mjs tests/vaultActionDecision.test.ts
```

Expected: fail because `src/router/vaultActionDecision.ts` does not exist.

- [ ] **Step 3: Create the pure decision module**

Create `src/router/vaultActionDecision.ts`:

```ts
export interface VaultActionCandidate {
  path: string;
  score: number;
}

export type VaultActionDecision =
  | {
      kind: "direct";
      path: string;
      reason: string;
    }
  | {
      kind: "clarify";
      paths: string[];
      reason: string;
    }
  | {
      kind: "none";
      reason: string;
    };

export interface DecideVaultActionCandidateOptions {
  candidates: VaultActionCandidate[];
  llmCandidatePath?: string | null;
  ambiguityGap?: number;
}

export function decideVaultActionCandidate(
  options: DecideVaultActionCandidateOptions
): VaultActionDecision {
  const candidates = [...options.candidates].sort(
    (left, right) => right.score - left.score || left.path.localeCompare(right.path)
  );
  const candidatePaths = new Set(candidates.map((candidate) => candidate.path));
  const llmCandidatePath = options.llmCandidatePath?.trim() ?? "";

  if (llmCandidatePath && candidatePaths.has(llmCandidatePath)) {
    return {
      kind: "direct",
      path: llmCandidatePath,
      reason: "LLM selected an exact path from the provided vault candidates."
    };
  }

  if (!candidates.length) {
    return {
      kind: "none",
      reason: "No vault candidates matched the request."
    };
  }

  const top = candidates[0];
  const second = candidates[1];
  const ambiguityGap = options.ambiguityGap ?? 160;

  if (!second || top.score - second.score >= ambiguityGap) {
    return {
      kind: "direct",
      path: top.path,
      reason: "Top vault candidate is clearly ahead."
    };
  }

  return {
    kind: "clarify",
    paths: candidates.slice(0, 3).map((candidate) => candidate.path),
    reason: "Top vault candidates are too close."
  };
}
```

- [ ] **Step 4: Strengthen the semantic command prompt**

In `src/router/semanticLocalCommandPrompt.ts`, add these exact rules to the system/user prompt section that describes vault candidates:

```ts
[
  "When choosing a file or folder, only select an exact path that appears in the supplied vault candidates.",
  "If the user pronunciation is noisy, infer from the provided candidate paths and names instead of using a hardcoded language-specific dictionary.",
  "If two candidate paths are genuinely close, return a clarification action instead of opening the last active note.",
  "Never fall back to the current note when the user explicitly names another file."
]
```

- [ ] **Step 5: Use the decision layer in `SemanticLocalCommandClassifier`**

In `src/views/controllers/SemanticLocalCommandClassifier.ts`, after `routerCandidates` is computed and before returning parsed commands, normalize any parsed `open_file` command:

```ts
const commands = parseSemanticLocalCommandPlan(response);

return commands?.map((command) => {
  if (command.action !== "open_file") {
    return command;
  }

  const decision = decideVaultActionCandidate({
    candidates: routerCandidates,
    llmCandidatePath: command.candidatePath ?? command.query ?? null
  });

  if (decision.kind === "direct") {
    return {
      ...command,
      query: decision.path,
      candidatePath: decision.path
    };
  }

  return command;
}) ?? null;
```

Import `decideVaultActionCandidate` from `../../router/vaultActionDecision`.

- [ ] **Step 6: Verify Task 4**

Run:

```bash
node scripts/run-tests.mjs tests/vaultActionDecision.test.ts tests/semanticLocalCommandClassifier.test.ts tests/vaultCandidatePromptContext.test.ts tests/openFileResolver.test.ts
npm run build
```

Expected: all pass. The behavior should still support deterministic matching, but LLM-selected paths must be exact paths from the real vault candidate list.

- [ ] **Step 7: Commit Task 4**

```bash
git add src/router/vaultActionDecision.ts src/router/semanticLocalCommandPrompt.ts src/views/controllers/SemanticLocalCommandClassifier.ts tests/vaultActionDecision.test.ts tests/semanticLocalCommandClassifier.test.ts tests/vaultCandidatePromptContext.test.ts
git commit -m "Add vault-aware action decision layer"
```

---

### Task 5: Clean Release Artifacts And Public Docs

**Files:**
- Modify: `.gitignore`
- Remove from Git: `bin/contex-core.exe`
- Modify: `README.md`
- Modify: `docs/RELEASE.md`
- Modify: `docs/GITHUB_RELEASE_AND_COMMUNITY_SUBMISSION.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/ROADMAP.md`
- Move: `docs/superpowers/plans/2026-05-06-contex-operating-core.md`
- Move: `docs/superpowers/plans/2026-05-07-voice-command-stress.md`
- Move: `docs/superpowers/plans/2026-05-10-contex-code.md`
- Move: `docs/superpowers/plans/2026-05-12-contex-workflow-engine.md`
- Modify: `tests/releasePackagePolicy.test.ts`

- [ ] **Step 1: Write the failing release policy assertions**

In `tests/releasePackagePolicy.test.ts`, add:

```ts
const gitignore = readFileSync(".gitignore", "utf8");

assert.match(gitignore, /bin\/contex-core\.exe/);
assert.match(packageScript, /optionalDirectories/);
assert.doesNotMatch(packageScript, /"bin\/contex-core\.exe"/);
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node scripts/run-tests.mjs tests/releasePackagePolicy.test.ts
```

Expected: fail until `.gitignore` and packaging policy are updated.

- [ ] **Step 3: Ignore generated Rust sidecar binary**

Add to `.gitignore`:

```gitignore
bin/contex-core.exe
bin/contex-core
```

- [ ] **Step 4: Untrack the generated binary**

Run:

```bash
git rm --cached bin/contex-core.exe
```

Expected: removes the binary from Git tracking while leaving the local file on disk if present.

- [ ] **Step 5: Add public architecture doc**

Create `docs/ARCHITECTURE.md`:

```md
# Mindo Architecture

Mindo is a desktop-only Obsidian plugin for talking to the user's vault.

## Core Runtime

- `src/main.ts` registers the plugin view, commands, settings, and local helper process controls.
- `src/views/AgentSidebarView.ts` coordinates the sidebar UI and delegates focused behavior to renderers and controllers.
- `src/llm/llmClient.ts` sends OpenAI-compatible chat and streaming requests.
- `src/search`, `src/rag`, and `src/rustCore` provide vault search, semantic retrieval, and optional Rust acceleration.
- `src/voice` owns STT/TTS, live dialogue state, voice activity, and speech text cleanup.
- `src/wiki` owns Mindo Wiki memory files and maintenance helpers.

## Install Modes

Community Plugin installs are expected to work with `manifest.json`, `main.js`, and `styles.css`.
The full release zip can also include local helper scripts and optional sidecar binaries.
```

- [ ] **Step 6: Add public roadmap doc**

Create `docs/ROADMAP.md`:

```md
# Mindo Roadmap

## Near Term

- Harden Community Plugin installs.
- Continue splitting large sidebar responsibilities into focused controllers and renderers.
- Improve vault-aware voice and text routing for fuzzy file names.
- Make local STT/TTS setup clearer and more self-healing.

## Future Direction

- Improve Mindo Wiki memory quality.
- Add stronger visual regression coverage for the sidebar.
- Expand cross-vault synthesis workflows.
```

- [ ] **Step 7: Move legacy plan docs out of the public-facing plan folder**

Move historical plans instead of deleting them:

```bash
New-Item -ItemType Directory -Force docs/internal/legacy-plans
git mv docs/superpowers/plans/2026-05-06-contex-operating-core.md docs/internal/legacy-plans/2026-05-06-contex-operating-core.md
git mv docs/superpowers/plans/2026-05-07-voice-command-stress.md docs/internal/legacy-plans/2026-05-07-voice-command-stress.md
git mv docs/superpowers/plans/2026-05-10-contex-code.md docs/internal/legacy-plans/2026-05-10-contex-code.md
git mv docs/superpowers/plans/2026-05-12-contex-workflow-engine.md docs/internal/legacy-plans/2026-05-12-contex-workflow-engine.md
```

Deletion is intentionally not part of the first implementation pass. Keeping these files under `docs/internal/legacy-plans/` preserves context while making the public-facing docs cleaner.

- [ ] **Step 8: Update README install matrix**

In `README.md`, add:

```md
## Install Modes

### Community Plugin Install

The catalog install uses:

- `manifest.json`
- `main.js`
- `styles.css`

This path supports the main Mindo sidebar, chat UI, vault context, and remote/OpenAI-compatible LLM endpoints.

### Full Local Runtime Install

The GitHub release zip can also include:

- `tools/stt_server`
- `tools/tts_server`
- optional `bin/contex-core.exe`

Use the full zip when testing local STT/TTS helpers or Rust-accelerated search.
```

- [ ] **Step 9: Verify Task 5**

Run:

```bash
node scripts/run-tests.mjs tests/releasePackagePolicy.test.ts
npm run release:check
git status --short
```

Expected: release check passes and `git status` only shows the intentional docs, ignore, and binary untracking changes.

- [ ] **Step 10: Commit Task 5 in two small commits**

```bash
git add .gitignore tests/releasePackagePolicy.test.ts
git add -u
git commit -m "Stop tracking generated Rust sidecar binary"
git add README.md docs/RELEASE.md docs/GITHUB_RELEASE_AND_COMMUNITY_SUBMISSION.md docs/ARCHITECTURE.md docs/ROADMAP.md docs/internal/legacy-plans
git add -u docs/superpowers/plans
git commit -m "Clean public Mindo docs"
```

---

### Task 6: Add Final Community Smoke And Release Verification

**Files:**
- Create: `tests/communityReleaseSmoke.test.ts`
- Modify: `scripts/package-plugin.mjs`
- Modify: `.github/workflows/verify.yml`
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Write the community release smoke test**

Create `tests/communityReleaseSmoke.test.ts`:

```ts
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const requiredCommunityFiles = ["manifest.json", "main.js", "styles.css"];

for (const file of requiredCommunityFiles) {
  assert.equal(existsSync(join(process.cwd(), file)), true, `${file} must exist`);
}

const mainJs = readFileSync("main.js", "utf8");
const styles = readFileSync("styles.css", "utf8");
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));

assert.equal(manifest.id, "mindo");
assert.equal(manifest.name, "Mindo");
assert.ok(mainJs.includes("data:image/png;base64"));
assert.ok(mainJs.includes("data:font/ttf;base64"));
assert.ok(!styles.includes("./assets/"));
assert.ok(!styles.includes("url(\"assets/"));
assert.ok(!styles.includes("url('./assets/"));

console.log("communityReleaseSmoke tests passed");
```

- [ ] **Step 2: Run smoke test before build and verify it fails if `main.js` is stale**

Run:

```bash
node scripts/run-tests.mjs tests/communityReleaseSmoke.test.ts
```

Expected: pass only after Task 1 has embedded both logo and font into `main.js`. If it fails, run `npm run build` and rerun it.

- [ ] **Step 3: Add package check mode for community assets**

In `scripts/package-plugin.mjs`, after the version checks, add:

```js
const mainJs = readFileSync(join(pluginDir, "main.js"), "utf8");
const stylesCss = readFileSync(join(pluginDir, "styles.css"), "utf8");

if (!mainJs.includes("data:image/png;base64")) {
  console.error("main.js must embed the Mindo logo for Community Plugin installs.");
  process.exit(1);
}

if (!mainJs.includes("data:font/ttf;base64")) {
  console.error("main.js must embed the Mindo font for Community Plugin installs.");
  process.exit(1);
}

if (/url\((['"])?\.?\/?assets\//.test(stylesCss)) {
  console.error("styles.css must not depend on external assets for Community Plugin installs.");
  process.exit(1);
}
```

- [ ] **Step 4: Add smoke test to workflows**

In `.github/workflows/verify.yml`, after `Verify plugin`, add:

```yaml
      - name: Smoke community release assets
        run: node scripts/run-tests.mjs tests/communityReleaseSmoke.test.ts
```

In `.github/workflows/release.yml`, after `Package plugin`, add:

```yaml
      - name: Smoke community release assets
        run: node scripts/run-tests.mjs tests/communityReleaseSmoke.test.ts
```

- [ ] **Step 5: Verify Task 6**

Run:

```bash
npm run release:check
node scripts/run-tests.mjs tests/communityReleaseSmoke.test.ts
```

Expected: all pass.

- [ ] **Step 6: Commit Task 6**

```bash
git add scripts/package-plugin.mjs .github/workflows/verify.yml .github/workflows/release.yml tests/communityReleaseSmoke.test.ts
git commit -m "Add community release smoke checks"
```

---

### Task 7: Add Sidebar Visual Contract Tests

**Files:**
- Create: `tests/sidebarVisualContract.test.ts`
- Modify: `docs/TESTING.md`

- [ ] **Step 1: Write the visual contract test**

Create `tests/sidebarVisualContract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const styles = readFileSync("styles.css", "utf8");
const sidebarView = readFileSync("src/views/AgentSidebarView.ts", "utf8");
const viewFiles = listSourceFiles(join(process.cwd(), "src", "views"));

assert.ok(styles.includes("--mindo-accent: #7b6cf6"));
assert.ok(styles.includes(".contex-agent__home-hero"));
assert.ok(styles.includes(".contex-agent__home-logo"));
assert.ok(styles.includes(".contex-agent__home-greeting"));
assert.ok(styles.includes(".contex-agent__message--assistant"));
assert.ok(styles.includes(".contex-agent__live-transcript-bubble"));
assert.ok(/\.contex-agent__message-content\.markdown-rendered[\s\S]*color:\s*#16131c;/s.test(styles));
assert.ok(/\.contex-agent__live-transcript-text\.markdown-rendered[\s\S]*color:\s*#16131c;/s.test(styles));
assert.ok(!styles.includes("!important"));
assert.ok(!styles.includes("text-decoration"));
assert.ok(!styles.includes("url(\"./assets/"));
assert.ok(!styles.includes("url('./assets/"));
assert.ok(!styles.includes("url(./assets/"));
assert.ok(sidebarView.includes("removeAttribute(\"title\")"));
assert.deepEqual(findNativeTooltipTitleAttributes(viewFiles), []);

console.log("sidebarVisualContract tests passed");

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir)
    .flatMap((entry) => {
      const path = join(dir, entry);
      const stat = statSync(path);
      return stat.isDirectory()
        ? listSourceFiles(path)
        : entry.endsWith(".ts")
          ? [path]
          : [];
    })
    .sort();
}

function findNativeTooltipTitleAttributes(files: string[]): string[] {
  const failures: string[] = [];

  for (const file of files) {
    readFileSync(file, "utf8")
      .split(/\r?\n/u)
      .forEach((line, index) => {
        if (/setAttribute\(\s*["']title["']/u.test(line)) {
          failures.push(`${file}:${index + 1}:${line.trim()}`);
        }

        if (/\btitle\s*:/u.test(line) && /\battr\s*:/u.test(line)) {
          failures.push(`${file}:${index + 1}:${line.trim()}`);
        }
      });
  }

  return failures;
}
```

- [ ] **Step 2: Run the visual contract test**

Run:

```bash
node scripts/run-tests.mjs tests/sidebarVisualContract.test.ts
```

Expected: pass after the embedded asset and tooltip cleanup tasks.

- [ ] **Step 3: Document visual contracts**

Append to `docs/TESTING.md`:

````md
## Sidebar Visual Contract

Run:

```bash
node scripts/run-tests.mjs tests/sidebarVisualContract.test.ts
```

This protects the core Mindo visual language:

- purple accent stays `#7b6cf6`;
- Markdown text stays readable inside light bubbles;
- native browser tooltips are not reintroduced;
- stylesheet does not depend on optional runtime asset paths;
- Obsidian review warnings such as `!important` and `text-decoration` do not come back.
````

- [ ] **Step 4: Verify Task 7**

Run:

```bash
node scripts/run-tests.mjs tests/sidebarVisualContract.test.ts
npm run build
```

Expected: pass.

- [ ] **Step 5: Commit Task 7**

```bash
git add tests/sidebarVisualContract.test.ts docs/TESTING.md
git commit -m "Add sidebar visual contract checks"
```

---

### Task 8: Add Bundle And Asset Budget Tests

**Files:**
- Create: `tests/bundleBudget.test.ts`
- Modify: `docs/TESTING.md`

- [ ] **Step 1: Write the bundle budget test**

Create `tests/bundleBudget.test.ts`:

```ts
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";

const budgets = [
  { path: "main.js", maxBytes: 1_100_000 },
  { path: "styles.css", maxBytes: 90_000 },
  { path: "src/views/mindoLogoData.ts", maxBytes: 140_000 },
  { path: "src/views/mindoFontData.ts", maxBytes: 360_000 },
  { path: "assets/logo.png", maxBytes: 850_000 },
  { path: "assets/fonts/comfortaa/Comfortaa-Regular.ttf", maxBytes: 260_000 }
];

for (const budget of budgets) {
  assert.equal(existsSync(budget.path), true, `${budget.path} must exist`);
  const bytes = statSync(budget.path).size;
  assert.ok(
    bytes <= budget.maxBytes,
    `${budget.path} is ${bytes} bytes, expected <= ${budget.maxBytes}`
  );
}

console.log("bundleBudget tests passed");
```

- [ ] **Step 2: Run the budget test**

Run:

```bash
node scripts/run-tests.mjs tests/bundleBudget.test.ts
```

Expected: pass. If it fails after embedding the font, either raise the `main.js` cap with a comment in this test or compress/replace the asset source.

- [ ] **Step 3: Document bundle budgets**

Append to `docs/TESTING.md`:

````md
## Bundle Budgets

Run:

```bash
node scripts/run-tests.mjs tests/bundleBudget.test.ts
```

Budgets are intentionally generous. They are not optimization theater; they catch accidental huge assets, stale binaries, and uncompressed generated modules before release.
````

- [ ] **Step 4: Verify Task 8**

Run:

```bash
npm run build
node scripts/run-tests.mjs tests/bundleBudget.test.ts
```

Expected: pass.

- [ ] **Step 5: Commit Task 8**

```bash
git add tests/bundleBudget.test.ts docs/TESTING.md
git commit -m "Add bundle budget checks"
```

---

### Task 9: Add Talk To Your Vault Golden Scenarios

**Files:**
- Create: `tests/talkToVaultGoldenScenarios.test.ts`
- Modify: `docs/TESTING.md`

- [ ] **Step 1: Write golden scenarios for fuzzy vault file requests**

Create `tests/talkToVaultGoldenScenarios.test.ts`:

```ts
import assert from "node:assert/strict";
import { rankOpenFilePathCandidates } from "../src/resolver/openFileResolver";
import { decideVaultActionCandidate } from "../src/router/vaultActionDecision";

const vaultPaths = [
  "Proton/Qore Systems Cases.md",
  "Proton/Qore Systems Strategy.md",
  "Proton/qquark-app.md",
  "Obsidian/Core System Overview.md",
  "Daily/2026-05-17.md"
];

const scenarios = [
  {
    spoken: "открой кор систем стратеги",
    expected: "Proton/Qore Systems Strategy.md"
  },
  {
    spoken: "open qore systems strategy",
    expected: "Proton/Qore Systems Strategy.md"
  },
  {
    spoken: "открой мне файл кварк один",
    expected: "Proton/qquark-app.md"
  },
  {
    spoken: "кварк app",
    expected: "Proton/qquark-app.md"
  }
];

for (const scenario of scenarios) {
  const ranked = rankOpenFilePathCandidates(vaultPaths, scenario.spoken);
  const decision = decideVaultActionCandidate({
    candidates: ranked.map((candidate) => ({
      path: candidate.path,
      score: candidate.score
    })),
    llmCandidatePath: null,
    ambiguityGap: 120
  });

  assert.equal(
    decision.kind === "direct" ? decision.path : "",
    scenario.expected,
    scenario.spoken
  );
}

console.log("talkToVaultGoldenScenarios tests passed");
```

- [ ] **Step 2: Run the golden scenarios and verify current behavior**

Run:

```bash
node scripts/run-tests.mjs tests/talkToVaultGoldenScenarios.test.ts
```

Expected: pass after Task 4. If a scenario fails, improve `openFileResolver.ts` scoring or `vaultActionDecision.ts`, not by adding a global dictionary of user-specific words.

- [ ] **Step 3: Document golden scenarios**

Append to `docs/TESTING.md`:

````md
## Talk To Your Vault Golden Scenarios

Run:

```bash
node scripts/run-tests.mjs tests/talkToVaultGoldenScenarios.test.ts
```

These tests protect the product idea: Mindo should resolve fuzzy spoken file requests from the user's real vault candidates instead of opening the current note or relying on hardcoded language-specific replacement tables.
````

- [ ] **Step 4: Verify Task 9**

Run:

```bash
node scripts/run-tests.mjs tests/talkToVaultGoldenScenarios.test.ts tests/openFileResolver.test.ts tests/vaultActionDecision.test.ts
npm run release:check
```

Expected: all pass.

- [ ] **Step 5: Commit Task 9**

```bash
git add tests/talkToVaultGoldenScenarios.test.ts docs/TESTING.md
git commit -m "Add Talk to your Vault golden scenarios"
```

---

## Final Verification

Run:

```bash
npm run release:check
npm run package
node scripts/run-tests.mjs tests/communityReleaseSmoke.test.ts tests/sidebarVisualContract.test.ts tests/bundleBudget.test.ts tests/talkToVaultGoldenScenarios.test.ts
git status --short
```

Expected:

- `npm run release:check` passes.
- `npm run package` creates `dist/mindo`.
- Focused smoke, visual, budget, and golden scenario tests pass.
- `dist/mindo-release.json` lists the expected full zip files and excludes caches.
- `git status --short` contains only intentional generated `main.js` and source/doc changes before final commit.

If all tasks are committed, create a release commit/tag only after the user approves the final diff:

```bash
git log --oneline -6
git status --short
```

Do not bump the version until the user says this should become the next release.

## Self-Review

- Spec coverage: covers targeted test execution, Community install asset failures, `AgentSidebarView.ts` refactor, vault-aware file routing, release cleanup, public docs cleanup, visual contracts, bundle budgets, golden vault scenarios, and final verification.
- Placeholder scan: no task relies on unspecified future code. Each created file has concrete code or exact content.
- Type consistency: new controller and decision types use existing `VaultSearchResult` and current sidebar patterns. New data modules follow existing `mindoLogoData.ts` style.

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-05-17-mindo-community-hardening-refactor.md`.

Two execution options:

1. Subagent-Driven (recommended): dispatch a fresh subagent per task, review between tasks, fast iteration.
2. Inline Execution: execute tasks in this session using executing-plans, batch execution with checkpoints.
