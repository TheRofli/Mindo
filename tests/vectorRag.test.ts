import assert from "node:assert/strict";
import {
  buildVectorRagIndexFromDocuments,
  chunkMarkdownDocument,
  formatVectorRagContext,
  searchVectorRagIndex
} from "../src/rag/vectorRag";

const docs = [
  {
    path: "Obsidian/Voice Flow.md",
    title: "Voice Flow",
    content: [
      "# Voice Flow",
      "",
      "The Contex voice pipeline uses microphone recording, local STT, tool routing, diff previews, and TTS output.",
      "",
      "## Safety",
      "Every voice edit must create a preview before applying changes."
    ].join("\n")
  },
  {
    path: "Proton/LLM Engineering.md",
    title: "LLM Engineering",
    content: [
      "# LLM Engineering",
      "",
      "Quantization, pretraining, fine tuning, and benchmark evaluation are model engineering topics."
    ].join("\n")
  }
];

const chunks = chunkMarkdownDocument(docs[0], {
  maxChunkChars: 90,
  overlapChars: 20
});

assert.ok(chunks.length >= 2, "long markdown documents are split into chunks");
assert.equal(chunks[0]?.path, "Obsidian/Voice Flow.md");
assert.ok(
  chunks.some((chunk) => chunk.heading === "Safety"),
  "chunk headings are preserved"
);

const index = buildVectorRagIndexFromDocuments(docs, {
  maxChunkChars: 180,
  overlapChars: 30,
  dimensions: 128
});

const voiceResults = searchVectorRagIndex(
  index,
  "как работает голосовой pipeline stt tts diff",
  3
);

assert.equal(voiceResults[0]?.path, "Obsidian/Voice Flow.md");
assert.ok(voiceResults[0]?.score > 0.15);
assert.ok(voiceResults[0]?.snippet.includes("local STT"));

const engineeringResults = searchVectorRagIndex(
  index,
  "quantization fine tuning benchmark",
  3
);

assert.equal(engineeringResults[0]?.path, "Proton/LLM Engineering.md");

const speechAliasResults = searchVectorRagIndex(
  index,
  "speech to text voice output command routing",
  3
);

assert.equal(speechAliasResults[0]?.path, "Obsidian/Voice Flow.md");
assert.ok(
  speechAliasResults[0]?.matches?.includes("rag-v2"),
  "v2 RAG results expose the improved scorer"
);

const exactTitleResults = searchVectorRagIndex(index, "Voice Flow", 3);
assert.equal(exactTitleResults[0]?.path, "Obsidian/Voice Flow.md");
assert.ok(
  exactTitleResults[0]?.matches?.includes("phrase"),
  "exact title and heading matches expose phrase evidence"
);

const duplicateChunkIndex = buildVectorRagIndexFromDocuments(
  [
    {
      path: "Obsidian/Voice Flow.md",
      title: "Voice Flow",
      content: [
        "# Voice Flow",
        "Local STT and TTS control live dialogue.",
        "This paragraph keeps voice routing details together.",
        "",
        "## Runtime",
        "Local STT and TTS should stay responsive for voice commands.",
        "The runtime keeps dialogue quick and grounded in the vault."
      ].join("\n")
    },
    {
      path: "Obsidian/Other.md",
      title: "Other",
      content: "# Other\n\nLocal STT is mentioned once."
    }
  ],
  {
    maxChunkChars: 120,
    overlapChars: 10,
    dimensions: 128
  }
);
const duplicateChunkResults = searchVectorRagIndex(
  duplicateChunkIndex,
  "local stt tts voice",
  4
);

assert.equal(
  duplicateChunkResults.filter((result) => result.path === "Obsidian/Voice Flow.md")
    .length,
  1,
  "RAG returns one aggregated result per vault note instead of duplicate chunks"
);
assert.equal(duplicateChunkResults[0]?.path, "Obsidian/Voice Flow.md");
assert.ok(
  duplicateChunkResults[0]?.matches?.includes("multi-chunk"),
  "aggregated notes expose that several chunks matched"
);

const russianMorphologyIndex = buildVectorRagIndexFromDocuments(
  [
    {
      path: "Obsidian/Голос.md",
      title: "Голос",
      content: "# Голосовой режим\n\nГолосовой режим Contex управляет заметками голосом."
    },
    {
      path: "Proton/Model Training.md",
      title: "Model Training",
      content: "# Model Training\n\nSTT benchmark and dataset notes."
    }
  ],
  {
    maxChunkChars: 180,
    overlapChars: 30,
    dimensions: 128
  }
);
const russianMorphologyResults = searchVectorRagIndex(
  russianMorphologyIndex,
  "голосом режимы заметок",
  3
);

assert.equal(russianMorphologyResults[0]?.path, "Obsidian/Голос.md");

const context = formatVectorRagContext(voiceResults.slice(0, 1));
assert.ok(context.includes("Vector Source 1"));
assert.ok(context.includes("Obsidian/Voice Flow.md"));

console.log("vectorRag tests passed");
