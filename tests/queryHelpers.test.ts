import assert from "node:assert/strict";
import { cleanJsonLikeResponse } from "../src/llm/jsonResponse";
import {
  fallbackWebResearchQuery,
  normalizeWebResearchQuery,
  parseSemanticQueryVariants,
  parseWebResearchQueryRewrite
} from "../src/search/queryHelpers";

assert.equal(cleanJsonLikeResponse('```json\n{"ok":true}\n```'), '{"ok":true}');
assert.equal(cleanJsonLikeResponse('text before {"ok":true} text after'), '{"ok":true}');

assert.deepEqual(parseSemanticQueryVariants('{"queries":["one"," two ",""]}'), [
  "one",
  "two"
]);
assert.deepEqual(parseSemanticQueryVariants("one, two\n- three"), [
  "one",
  "two",
  "three"
]);

assert.equal(
  parseWebResearchQueryRewrite('{"query":" latest local LLM news "}', "fallback"),
  "latest local LLM news"
);
assert.equal(parseWebResearchQueryRewrite("   ", "fallback"), "fallback");
assert.equal(normalizeWebResearchQuery('"hello   world"'), "hello world");
assert.match(fallbackWebResearchQuery("latest local LLM news"), /local LLM/);

console.log("queryHelpers tests passed");
