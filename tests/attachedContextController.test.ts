import assert from "node:assert/strict";

import { AttachedContextController } from "../src/views/controllers/AttachedContextController";
import type { LlmFileAttachment, VaultSearchResult } from "../src/types";

const vaultResult: VaultSearchResult = {
  path: "Test/Test.md",
  title: "Test",
  score: 10,
  snippet: "Test snippet"
};

function createHarness() {
  let vaultResults: VaultSearchResult[] | null = null;
  let files: LlmFileAttachment[] = [];
  let useVaultSearch = false;
  let checked = false;
  const calls: string[] = [];
  const preparedAttachment: LlmFileAttachment = {
    name: "brief.pdf",
    type: "application/pdf",
    size: 12,
    text: "Brief text"
  };
  let prepareShouldFail = false;

  const controller = new AttachedContextController({
    extractClipboardFiles: () => [new File(["clip"], "clip.txt", { type: "text/plain" })],
    prepareAttachedFiles: async () => {
      if (prepareShouldFail) {
        throw new Error("cannot read file");
      }

      return {
        newAttachments: [preparedAttachment],
        attachedFiles: [preparedAttachment]
      };
    },
    getAttachedVaultResults: () => vaultResults,
    setAttachedVaultResults: (next) => {
      vaultResults = next;
    },
    getAttachedFiles: () => files,
    setAttachedFiles: (next) => {
      files = next;
    },
    setUseVaultSearch: (next) => {
      useVaultSearch = next;
    },
    setUseVaultSearchChecked: (next) => {
      checked = next;
    },
    rememberVaultSearch: (query, results) =>
      calls.push(`remember:${query}:${results.length}`),
    renderAttachedContext: () => calls.push("render"),
    setContextDetail: (message, isWarning) =>
      calls.push(`context:${message}:${isWarning}`),
    setError: (message) => calls.push(`error:${message ?? "clear"}`),
    setStatus: (status) => calls.push(`status:${status}`),
    focusInput: () => calls.push("focus"),
    getErrorMessage: (error) =>
      error instanceof Error ? error.message : String(error)
  });

  return {
    controller,
    calls,
    get vaultResults() {
      return vaultResults;
    },
    get files() {
      return files;
    },
    get useVaultSearch() {
      return useVaultSearch;
    },
    get checked() {
      return checked;
    },
    failPrepare() {
      prepareShouldFail = true;
    }
  };
}

{
  const state = createHarness();

  state.controller.attachVaultResults([vaultResult], "test query");

  assert.deepEqual(state.vaultResults, [vaultResult]);
  assert.equal(state.useVaultSearch, true);
  assert.equal(state.checked, true);
  assert.deepEqual(state.calls, [
    "remember:test query:1",
    "context:Attached 1 vault search result to the next message.:false",
    "render",
    "focus"
  ]);
}

{
  const state = createHarness();

  await state.controller.attachFiles([
    new File(["pdf"], "brief.pdf", { type: "application/pdf" })
  ]);

  assert.equal(state.files[0].name, "brief.pdf");
  assert.deepEqual(state.calls, [
    "error:clear",
    "status:Status: Attaching files",
    "render",
    "context:Attached 1 file to the next message.:false",
    "status:Status: Ready",
    "focus"
  ]);
}

{
  const state = createHarness();
  state.failPrepare();

  await state.controller.attachFiles([
    new File(["bad"], "bad.bin", { type: "application/octet-stream" })
  ]);

  assert.deepEqual(state.calls, [
    "error:clear",
    "status:Status: Attaching files",
    "error:cannot read file",
    "status:Status: Attach failed"
  ]);
}

{
  const state = createHarness();
  let prevented = false;

  await state.controller.handlePaste({
    clipboardData: {},
    preventDefault: () => {
      prevented = true;
    }
  });

  assert.equal(prevented, true);
  assert.equal(state.files[0].name, "brief.pdf");
}

{
  const state = createHarness();
  state.controller.attachVaultResults([vaultResult]);
  await state.controller.attachFiles([
    new File(["pdf"], "brief.pdf", { type: "application/pdf" })
  ]);

  state.controller.clearAttachedContext();

  assert.equal(state.vaultResults, null);
  assert.deepEqual(state.files, []);
  assert.equal(state.calls.at(-2), "render");
  assert.equal(state.calls.at(-1), "context:Attached context cleared.:false");
}

console.log("attachedContextController tests passed");
