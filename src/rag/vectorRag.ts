import type { VaultSearchResult } from "../types";

export interface VectorRagDocument {
  path: string;
  title: string;
  content: string;
  mtime?: number;
  size?: number;
}

export interface VectorRagChunk {
  id: string;
  path: string;
  title: string;
  heading?: string;
  content: string;
  startOffset: number;
  endOffset: number;
}

export interface VectorRagIndexedChunk extends VectorRagChunk {
  vector: number[];
  terms: string[];
  termSet: Set<string>;
  titleTerms: string[];
  headingTerms: string[];
  pathTerms: string[];
  titlePhrase: string;
  headingPhrase: string;
  pathPhrase: string;
}

export interface VectorRagIndex {
  version: 2;
  dimensions: number;
  documents: number;
  chunks: VectorRagIndexedChunk[];
}

export interface VectorRagSearchResult extends VaultSearchResult {
  chunkId: string;
}

export interface VectorRagOptions {
  maxChunkChars?: number;
  overlapChars?: number;
  dimensions?: number;
}

const DEFAULT_MAX_CHUNK_CHARS = 1600;
const DEFAULT_OVERLAP_CHARS = 160;
const DEFAULT_DIMENSIONS = 384;
const MAX_QUERY_TERMS = 48;
const RAG_V2_MATCH = "rag-v2";

const ENGLISH_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "this",
  "that",
  "what",
  "where",
  "which",
  "about",
  "into",
  "your",
  "you",
  "are",
  "how"
]);
const RUSSIAN_STOP_WORDS = new Set([
  "что",
  "как",
  "это",
  "для",
  "или",
  "при",
  "где",
  "мне",
  "мой",
  "моя",
  "мои",
  "про",
  "об",
  "все"
]);
const QUERY_ALIASES: Record<string, string[]> = {
  speech: ["voice", "audio", "stt"],
  text: ["stt", "transcription"],
  transcription: ["stt", "speech"],
  transcribe: ["stt", "speech"],
  output: ["tts", "speech"],
  speak: ["tts", "voice"],
  read: ["tts", "voice"],
  llm: ["model", "language"],
  rag: ["retrieval", "search", "vault"],
  markdown: ["md", "note"],
  замет: ["note", "vault"],
  голос: ["voice", "speech", "audio"]
};

export function chunkMarkdownDocument(
  document: VectorRagDocument,
  options: VectorRagOptions = {}
): VectorRagChunk[] {
  const maxChunkChars = Math.max(
    80,
    options.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS
  );
  const overlapChars = Math.max(
    0,
    Math.min(
      options.overlapChars ?? DEFAULT_OVERLAP_CHARS,
      Math.floor(maxChunkChars / 2)
    )
  );
  const lines = document.content.split(/\r?\n/);
  const chunks: VectorRagChunk[] = [];
  let heading: string | undefined;
  let bufferText = "";
  let bufferStart = 0;
  let cursor = 0;

  const flush = () => {
    const rawContent = bufferText;
    const content = rawContent.trim();

    if (!content) {
      bufferText = "";
      bufferStart = cursor;
      return;
    }

    const endOffset = bufferStart + rawContent.length;
    chunks.push({
      id: `${document.path}#${chunks.length}`,
      path: document.path,
      title: document.title,
      heading,
      content,
      startOffset: bufferStart,
      endOffset
    });

    const overlap = overlapChars
      ? content.slice(Math.max(0, content.length - overlapChars))
      : "";
    bufferText = overlap;
    bufferStart = Math.max(bufferStart, endOffset - overlap.length);
  };

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)$/);

    if (headingMatch?.[1] && bufferText.trim()) {
      flush();
    }

    if (headingMatch?.[1]) {
      heading = headingMatch[1].trim();
    }

    if (!bufferText) {
      bufferStart = cursor;
    } else {
      bufferText += "\n";
    }

    bufferText += line;

    while (bufferText.length >= maxChunkChars) {
      flush();

      if (bufferText.length >= maxChunkChars) {
        bufferText = bufferText.slice(-overlapChars || -maxChunkChars);
      }
    }

    cursor += line.length + 1;
  }

  flush();

  if (!chunks.length && document.content.trim()) {
    return [
      {
        id: `${document.path}#0`,
        path: document.path,
        title: document.title,
        content: document.content.trim().slice(0, maxChunkChars),
        startOffset: 0,
        endOffset: Math.min(document.content.length, maxChunkChars)
      }
    ];
  }

  return chunks;
}

export function buildVectorRagIndexFromDocuments(
  documents: VectorRagDocument[],
  options: VectorRagOptions = {}
): VectorRagIndex {
  const dimensions = Math.max(32, options.dimensions ?? DEFAULT_DIMENSIONS);
  const chunks = documents.flatMap((document) =>
    chunkMarkdownDocument(document, options).map((chunk) => ({
      ...chunk,
      ...indexVectorChunk(chunk, dimensions)
    }))
  );

  return {
    version: 2,
    dimensions,
    documents: documents.length,
    chunks
  };
}

export function searchVectorRagIndex(
  index: VectorRagIndex,
  query: string,
  limit = 8
): VectorRagSearchResult[] {
  const normalizedLimit = Math.max(1, limit);
  const queryVector = embedTextForVectorRag(query, index.dimensions);
  const queryTerms = expandQueryTerms(tokenizeVectorRagText(query)).slice(
    0,
    MAX_QUERY_TERMS
  );
  const queryPhrase = normalizeSearchText(query);

  const scoredResults = index.chunks
    .map((chunk) => {
      const vectorScore = dotProduct(queryVector, chunk.vector);
      const lexicalScore = scoreLexicalOverlap(chunk, queryTerms);
      const metadataScore = scoreMetadata(chunk, queryTerms, queryPhrase);
      const phraseScore = scorePhrase(chunk, queryPhrase);
      const score = vectorScore * 85 + lexicalScore + metadataScore + phraseScore;
      const matches = Array.from(
        new Set(
          [
            RAG_V2_MATCH,
            "vector",
            lexicalScore > 0 ? "lexical" : "",
            metadataScore > 0 ? "metadata" : "",
            phraseScore > 0 ? "phrase" : ""
          ].filter(Boolean)
        )
      );

      return {
        path: chunk.path,
        title: chunk.title,
        score: Math.round(score * 1000) / 1000,
        snippet: createVectorSnippet(chunk.content, queryTerms),
        heading: chunk.heading,
        matches,
        chunkId: chunk.id
      };
    })
    .filter((result) => result.score > 0);

  return aggregateVectorRagResults(scoredResults)
    .sort((left, right) => right.score - left.score)
    .slice(0, normalizedLimit);
}

export function formatVectorRagContext(
  results: VectorRagSearchResult[]
): string {
  return results
    .map((result, index) =>
      [
        `Vector Source ${index + 1}`,
        `Path: ${result.path}`,
        `Title: ${result.title}`,
        result.heading ? `Heading: ${result.heading}` : "",
        `Score: ${result.score}`,
        `Snippet: ${result.snippet}`
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");
}

function indexVectorChunk(
  chunk: VectorRagChunk,
  dimensions: number
): Pick<
  VectorRagIndexedChunk,
  | "terms"
  | "termSet"
  | "titleTerms"
  | "headingTerms"
  | "pathTerms"
  | "titlePhrase"
  | "headingPhrase"
  | "pathPhrase"
  | "vector"
> {
  const embeddingText = [
    chunk.title,
    chunk.heading ?? "",
    chunk.path,
    chunk.content
  ].join("\n");

  const terms = tokenizeVectorRagText(embeddingText);

  return {
    terms,
    termSet: new Set(terms),
    titleTerms: tokenizeVectorRagText(chunk.title),
    headingTerms: tokenizeVectorRagText(chunk.heading ?? ""),
    pathTerms: tokenizeVectorRagText(chunk.path),
    titlePhrase: normalizeSearchText(chunk.title),
    headingPhrase: normalizeSearchText(chunk.heading ?? ""),
    pathPhrase: normalizeSearchText(chunk.path),
    vector: embedTextForVectorRag(embeddingText, dimensions)
  };
}

function embedTextForVectorRag(text: string, dimensions: number): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  const terms = tokenizeVectorRagText(text);

  for (const term of terms) {
    const index = positiveHash(term) % dimensions;
    vector[index] += 1;

    if (term.length >= 6) {
      const prefixIndex = positiveHash(term.slice(0, 5)) % dimensions;
      vector[prefixIndex] += 0.35;
    }
  }

  const magnitude = Math.sqrt(
    vector.reduce((sum, value) => sum + value * value, 0)
  );

  if (!magnitude) {
    return vector;
  }

  return vector.map((value) => value / magnitude);
}

function tokenizeVectorRagText(text: string): string[] {
  const rawTerms = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^\p{L}\p{N}_+-]+/u)
    .map((term) => normalizeVectorTerm(term))
    .filter((term) => term.length >= 2);

  return Array.from(new Set(rawTerms));
}

function normalizeVectorTerm(term: string): string {
  let value = term.trim().replace(/ё/g, "е");

  if (!value || ENGLISH_STOP_WORDS.has(value) || RUSSIAN_STOP_WORDS.has(value)) {
    return "";
  }

  if (/^[a-z0-9_+-]+$/i.test(value)) {
    return stripSuffix(value, ["ing", "ed", "es", "s"]);
  }

  if (/[а-я]/i.test(value)) {
    value = stripSuffix(value, [
      "иями",
      "ями",
      "ами",
      "ого",
      "ему",
      "ыми",
      "ими",
      "овой",
      "евый",
      "ая",
      "ое",
      "ые",
      "ий",
      "ый",
      "ой",
      "ов",
      "ев",
      "ам",
      "ям",
      "ах",
      "ях",
      "ом",
      "ем",
      "ок",
      "а",
      "я",
      "ы",
      "и",
      "е",
      "у",
      "ю"
    ]);
  }

  return value;
}

function stripSuffix(value: string, suffixes: string[]): string {
  for (const suffix of suffixes) {
    if (value.length > suffix.length + 2 && value.endsWith(suffix)) {
      return value.slice(0, -suffix.length);
    }
  }

  return value;
}

function expandQueryTerms(terms: string[]): string[] {
  const expanded = new Set(terms);

  for (const term of terms) {
    QUERY_ALIASES[term]?.forEach((alias) => {
      const normalized = normalizeVectorTerm(alias);

      if (normalized) {
        expanded.add(normalized);
      }
    });
  }

  if (expanded.has("speech") && expanded.has("text")) {
    expanded.add("stt");
  }

  if (expanded.has("voice") && expanded.has("output")) {
    expanded.add("tts");
  }

  return Array.from(expanded);
}

function normalizeSearchText(value: string): string {
  return tokenizeVectorRagText(value).join(" ");
}

function scoreLexicalOverlap(
  chunk: VectorRagIndexedChunk,
  queryTerms: string[]
): number {
  if (!queryTerms.length) {
    return 0;
  }

  const coveredTerms = queryTerms.filter(
    (term) =>
      chunk.termSet.has(term) ||
      chunk.terms.some(
        (chunkTerm) =>
          (term.length >= 4 && chunkTerm.startsWith(term)) ||
          (chunkTerm.length >= 4 && term.startsWith(chunkTerm))
      )
  );

  return (coveredTerms.length / queryTerms.length) * 34;
}

function scoreMetadata(
  chunk: VectorRagIndexedChunk,
  queryTerms: string[],
  queryPhrase: string
): number {
  let score = 0;

  if (queryPhrase && chunk.titlePhrase.includes(queryPhrase)) {
    score += 28;
  }

  if (queryPhrase && chunk.headingPhrase.includes(queryPhrase)) {
    score += 24;
  }

  for (const term of queryTerms) {
    if (chunk.titleTerms.includes(term)) {
      score += 8;
    }

    if (chunk.headingTerms.includes(term)) {
      score += 7;
    }

    if (chunk.pathTerms.includes(term)) {
      score += 5;
    }
  }

  return score;
}

function scorePhrase(chunk: VectorRagIndexedChunk, queryPhrase: string): number {
  if (!queryPhrase) {
    return 0;
  }

  const contentPhrase = normalizeSearchText(chunk.content);
  let score = 0;

  if (chunk.titlePhrase === queryPhrase) {
    score += 86;
  } else if (chunk.titlePhrase.includes(queryPhrase)) {
    score += 52;
  }

  if (chunk.headingPhrase === queryPhrase) {
    score += 68;
  } else if (chunk.headingPhrase.includes(queryPhrase)) {
    score += 42;
  }

  if (chunk.pathPhrase.includes(queryPhrase)) {
    score += 30;
  }

  if (contentPhrase.includes(queryPhrase)) {
    score += 18;
  }

  return score;
}

function aggregateVectorRagResults(
  results: VectorRagSearchResult[]
): VectorRagSearchResult[] {
  const byPath = new Map<
    string,
    { result: VectorRagSearchResult; totalScore: number; chunks: number }
  >();

  for (const result of results) {
    const existing = byPath.get(result.path);

    if (!existing) {
      byPath.set(result.path, {
        result,
        totalScore: result.score,
        chunks: 1
      });
      continue;
    }

    const best = result.score > existing.result.score ? result : existing.result;
    existing.result = {
      ...best,
      matches: Array.from(
        new Set([...(existing.result.matches ?? []), ...(result.matches ?? [])])
      )
    };
    existing.totalScore += result.score;
    existing.chunks += 1;
  }

  return Array.from(byPath.values()).map(({ result, totalScore, chunks }) => {
    const evidenceBonus = Math.min(18, Math.max(0, totalScore - result.score) * 0.18);
    const matches =
      chunks > 1
        ? Array.from(new Set([...(result.matches ?? []), "multi-chunk"]))
        : result.matches;

    return {
      ...result,
      score: Math.round((result.score + evidenceBonus) * 1000) / 1000,
      matches
    };
  });
}

function createVectorSnippet(content: string, terms: string[]): string {
  const lowerContent = content.normalize("NFKC").toLowerCase().replace(/ё/g, "е");
  const firstIndex = terms
    .map((term) => lowerContent.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const start = Math.max(0, (firstIndex ?? 0) - 120);
  const snippet = content.slice(start, start + 520).trim();

  return `${start > 0 ? "... " : ""}${snippet}${
    start + 520 < content.length ? " ..." : ""
  }`;
}

function dotProduct(left: number[], right: number[]): number {
  let sum = 0;
  const length = Math.min(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    sum += left[index] * right[index];
  }

  return sum;
}

function positiveHash(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
