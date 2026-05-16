import assert from "node:assert/strict";
import { readOpenAIStream } from "../src/llm/openAiStream";

const streamed: string[] = [];
const encoder = new TextEncoder();
const stream = new ReadableStream<Uint8Array>({
  start(controller) {
    controller.enqueue(
      encoder.encode(
        [
          "data: {\"choices\":[{\"delta\":{\"content\":\"Hello \"}}]}",
          "",
          "data: {\"choices\":[{\"delta\":{\"content\":\"vault\"}}]}",
          "",
          "data: [DONE]",
          ""
        ].join("\n")
      )
    );
    controller.close();
  }
});

const result = await readOpenAIStream(
  stream,
  (token) => streamed.push(token)
);

assert.equal(result, "Hello vault");
assert.deepEqual(streamed, ["Hello ", "vault"]);

const aborted = new AbortController();
const neverEndingStream = new ReadableStream<Uint8Array>({
  start(controller) {
    controller.enqueue(
      encoder.encode("data: {\"choices\":[{\"delta\":{\"content\":\"Slow\"}}]}\n\n")
    );
    aborted.abort();
  }
});

await assert.rejects(
  () =>
    readOpenAIStream(
      neverEndingStream,
      () => undefined,
      aborted.signal
    ),
  /canceled/
);

console.log("fakeLlmStreamingServer tests passed");
