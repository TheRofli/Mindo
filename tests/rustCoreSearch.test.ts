import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getRustCoreCandidatePaths,
  resolveRustCoreExecutablePath
} from "../src/rustCore/coreSearch";

const root = join(process.cwd(), ".cache", "rust-core-search-test");
rmSync(root, { recursive: true, force: true });
mkdirSync(join(root, "bin"), { recursive: true });

const binaryPath = join(root, "bin", "contex-core.exe");
writeFileSync(binaryPath, "");

assert.deepEqual(getRustCoreCandidatePaths(root, "win32"), [
  join(root, "bin", "contex-core.exe"),
  join(root, "tools", "contex_core", "target", "release", "contex-core.exe")
]);
assert.equal(resolveRustCoreExecutablePath(root, "win32"), binaryPath);
assert.equal(resolveRustCoreExecutablePath(join(root, "missing"), "win32"), null);

rmSync(root, { recursive: true, force: true });

console.log("rustCoreSearch tests passed");
