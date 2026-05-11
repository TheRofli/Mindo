import assert from "node:assert/strict";
import {
  StreamingSpeechChunker,
  splitSpeechIntoChunks
} from "../src/voice/streamingSpeech";

const chunker = new StreamingSpeechChunker({
  firstChunkWords: 10,
  nextChunkWords: 14,
  maxChunkChars: 180
});

const emitted: string[] = [];
for (const token of [
  "Привет, ",
  "я быстро посмотрела текущую заметку и ",
  "сейчас расскажу главное простыми словами. ",
  "Первое: голосовой режим должен отвечать коротко."
]) {
  emitted.push(...chunker.push(token));
}

assert.equal(emitted.length, 1);
assert.ok(emitted[0].split(/\s+/).length >= 10);
assert.ok(emitted[0].endsWith("."));

const tail = chunker.flush();
assert.equal(tail.length, 1);
assert.match(tail[0], /голосовой режим/);

assert.deepEqual(
  splitSpeechIntoChunks(
    "One two three four five six seven eight nine ten eleven twelve. Tail.",
    { firstChunkWords: 8, nextChunkWords: 8, maxChunkChars: 120 }
  ),
  ["One two three four five six seven eight nine ten eleven twelve.", "Tail."]
);

console.log("streamingSpeech tests passed");
