import assert from "node:assert/strict";
import { encodeRustCoreResolveWireRequest } from "../src/rustCore/indexProtocol";

const request = encodeRustCoreResolveWireRequest("open test", ["Test/Test.md"], 5);

assert.ok(request.startsWith("CTXCORE_RESOLVE_V1\n"));
assert.ok(request.includes("open test"));
assert.ok(request.includes("Test/Test.md"));

console.log("rustCoreResolverProtocol tests passed");
