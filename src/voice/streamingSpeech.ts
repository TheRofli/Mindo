export interface StreamingSpeechChunkOptions {
  firstChunkWords?: number;
  nextChunkWords?: number;
  maxChunkChars?: number;
}

export interface StreamingSpeechQueueOptions
  extends StreamingSpeechChunkOptions {
  synthesize: (text: string) => Promise<Blob>;
  prepareText?: (text: string) => string;
  onChunkStart?: (text: string) => void;
  onChunkEnd?: (text: string) => void;
  onError?: (error: unknown) => void;
}

const DEFAULT_FIRST_CHUNK_WORDS = 12;
const DEFAULT_NEXT_CHUNK_WORDS = 18;
const DEFAULT_MAX_CHUNK_CHARS = 260;
let sharedAudioContext: AudioContext | null = null;

export class StreamingSpeechChunker {
  private buffer = "";
  private emittedChunks = 0;
  private readonly firstChunkWords: number;
  private readonly nextChunkWords: number;
  private readonly maxChunkChars: number;

  constructor(options: StreamingSpeechChunkOptions = {}) {
    this.firstChunkWords = Math.max(
      4,
      options.firstChunkWords ?? DEFAULT_FIRST_CHUNK_WORDS
    );
    this.nextChunkWords = Math.max(
      this.firstChunkWords,
      options.nextChunkWords ?? DEFAULT_NEXT_CHUNK_WORDS
    );
    this.maxChunkChars = Math.max(
      80,
      options.maxChunkChars ?? DEFAULT_MAX_CHUNK_CHARS
    );
  }

  push(token: string): string[] {
    if (!token) {
      return [];
    }

    this.buffer += token;
    const chunks: string[] = [];

    while (true) {
      const targetWords =
        this.emittedChunks === 0 ? this.firstChunkWords : this.nextChunkWords;
      const boundary = findSpeechChunkBoundary(
        this.buffer,
        targetWords,
        this.maxChunkChars
      );

      if (boundary <= 0) {
        break;
      }

      const chunk = this.buffer.slice(0, boundary).trim();
      this.buffer = this.buffer.slice(boundary).replace(/^\s+/, "");

      if (chunk) {
        chunks.push(chunk);
        this.emittedChunks += 1;
      }
    }

    return chunks;
  }

  flush(): string[] {
    const chunk = this.buffer.trim();
    this.buffer = "";

    if (!chunk) {
      return [];
    }

    this.emittedChunks += 1;
    return [chunk];
  }

  reset(): void {
    this.buffer = "";
    this.emittedChunks = 0;
  }
}

export function splitSpeechIntoChunks(
  text: string,
  options: StreamingSpeechChunkOptions = {}
): string[] {
  const chunker = new StreamingSpeechChunker(options);

  return [...chunker.push(text), ...chunker.flush()];
}

export class StreamingSpeechQueue {
  private readonly chunker: StreamingSpeechChunker;
  private readonly synthesize: (text: string) => Promise<Blob>;
  private readonly prepareText: (text: string) => string;
  private readonly onChunkStart?: (text: string) => void;
  private readonly onChunkEnd?: (text: string) => void;
  private readonly onError?: (error: unknown) => void;
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private canceled = false;
  private readonly activeSources = new Set<AudioBufferSourceNode>();
  private pending = Promise.resolve();

  constructor(options: StreamingSpeechQueueOptions) {
    this.chunker = new StreamingSpeechChunker(options);
    this.synthesize = options.synthesize;
    this.prepareText = options.prepareText ?? ((text) => text);
    this.onChunkStart = options.onChunkStart;
    this.onChunkEnd = options.onChunkEnd;
    this.onError = options.onError;
  }

  async warm(): Promise<void> {
    const context = this.ensureAudioContext();

    if (context.state === "suspended") {
      await context.resume();
    }
  }

  pushToken(token: string): void {
    for (const chunk of this.chunker.push(token)) {
      this.enqueue(chunk);
    }
  }

  async finish(): Promise<void> {
    for (const chunk of this.chunker.flush()) {
      this.enqueue(chunk);
    }

    await this.pending;
  }

  cancel(): void {
    this.canceled = true;
    this.chunker.reset();

    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Source may already have ended.
      }
    }

    this.activeSources.clear();
    this.nextStartTime = 0;
  }

  close(): void {
    this.cancel();
    this.audioContext = null;
  }

  private enqueue(text: string): void {
    const preparedText = this.prepareText(text).trim();

    if (!preparedText) {
      return;
    }

    const task = this.pending.then(() => this.playChunk(preparedText));
    this.pending = task.catch((error) => {
      this.onError?.(error);
    });
  }

  private async playChunk(text: string): Promise<void> {
    if (this.canceled) {
      return;
    }

    const context = this.ensureAudioContext();

    if (context.state === "suspended") {
      await context.resume();
    }

    this.onChunkStart?.(text);
    const blob = await this.synthesize(text);

    if (this.canceled) {
      return;
    }

    const audioBuffer = await context.decodeAudioData(await blob.arrayBuffer());

    if (this.canceled) {
      return;
    }

    await new Promise<void>((resolve) => {
      const source = context.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(context.destination);
      this.activeSources.add(source);

      const startAt = Math.max(context.currentTime + 0.015, this.nextStartTime);
      this.nextStartTime = startAt + audioBuffer.duration;
      source.onended = () => {
        this.activeSources.delete(source);
        this.onChunkEnd?.(text);
        resolve();
      };
      source.start(startAt);
    });
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = getSharedAudioContext();
      this.nextStartTime = this.audioContext.currentTime;
    }

    return this.audioContext;
  }
}

export async function warmStreamingSpeechAudioContext(): Promise<void> {
  const context = getSharedAudioContext();

  if (context.state === "suspended") {
    await context.resume();
  }
}

function getSharedAudioContext(): AudioContext {
  if (sharedAudioContext) {
    return sharedAudioContext;
  }

  const audioGlobal = globalThis as typeof globalThis & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor =
    audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext;

  if (!AudioContextConstructor) {
    throw new Error("WebAudio is not available in this Obsidian window.");
  }

  const context = new AudioContextConstructor();
  sharedAudioContext = context;
  return context;
}

function findSpeechChunkBoundary(
  text: string,
  minWords: number,
  maxChars: number
): number {
  const trimmed = text.trimStart();

  if (!trimmed) {
    return -1;
  }

  const leadingOffset = text.length - trimmed.length;
  let words = 0;
  let previousWasWord = false;
  let lastWhitespaceAfterTarget = -1;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const isWord = /[\p{L}\p{N}_]/u.test(char);

    if (isWord && !previousWasWord) {
      words += 1;
    }

    previousWasWord = isWord;

    if (!isWord && words >= minWords && /\s/.test(char)) {
      lastWhitespaceAfterTarget = leadingOffset + index + 1;
    }

    if (words >= minWords && /[.!?…。！？]\s*$/u.test(trimmed.slice(0, index + 1))) {
      return leadingOffset + index + 1;
    }

    if (leadingOffset + index + 1 >= maxChars && lastWhitespaceAfterTarget > 0) {
      return lastWhitespaceAfterTarget;
    }

    if (words >= minWords + 6 && lastWhitespaceAfterTarget > 0) {
      return lastWhitespaceAfterTarget;
    }
  }

  return -1;
}
