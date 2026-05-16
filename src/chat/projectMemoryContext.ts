import { trimTextForContext } from "../text/textUtils";

export const DEFAULT_PROJECT_MEMORY_CONTEXT_CHARS = 6000;
export const DEFAULT_PROJECT_MEMORY_FILE_LIMIT = 6;
export const DEFAULT_PROJECT_MEMORY_FILE_CHARS = 1600;

export interface ProjectMemoryFileLike {
  path: string;
  stat: {
    mtime: number;
  };
}

export interface BuildProjectMemoryContextOptions<TFile extends ProjectMemoryFileLike> {
  files: TFile[];
  maxChars?: number;
  fileLimit?: number;
  fileChars?: number;
  readFile: (file: TFile) => Promise<string>;
  onReadError?: (file: TFile, error: unknown) => void;
}

export function selectRecentProjectMemoryFiles<TFile extends ProjectMemoryFileLike>(
  files: TFile[],
  fileLimit = DEFAULT_PROJECT_MEMORY_FILE_LIMIT
): TFile[] {
  return files
    .filter((file) => isProjectMemoryContextFile(file.path))
    .sort((left, right) => right.stat.mtime - left.stat.mtime)
    .slice(0, fileLimit);
}

export async function buildProjectMemoryContext<TFile extends ProjectMemoryFileLike>({
  files,
  maxChars = DEFAULT_PROJECT_MEMORY_CONTEXT_CHARS,
  fileLimit = DEFAULT_PROJECT_MEMORY_FILE_LIMIT,
  fileChars = DEFAULT_PROJECT_MEMORY_FILE_CHARS,
  readFile,
  onReadError
}: BuildProjectMemoryContextOptions<TFile>): Promise<string | null> {
  const memoryFiles = selectRecentProjectMemoryFiles(files, fileLimit);

  if (!memoryFiles.length) {
    return null;
  }

  const chunks: string[] = [];
  let remainingChars = maxChars;

  for (const file of memoryFiles) {
    if (remainingChars <= 0) {
      break;
    }

    try {
      const content = await readFile(file);
      const excerpt = trimTextForContext(
        content,
        Math.min(fileChars, remainingChars)
      );

      if (!excerpt) {
        continue;
      }

      const chunk = [`Memory source: ${file.path}`, excerpt].join("\n");
      chunks.push(chunk);
      remainingChars -= chunk.length;
    } catch (error) {
      onReadError?.(file, error);
    }
  }

  return chunks.length ? chunks.join("\n\n---\n\n") : null;
}

export function isProjectMemoryContextFile(path: string): boolean {
  const normalized = normalizePathText(path);

  return (
    normalized.startsWith("contex memory/") ||
    normalized.startsWith("contex wiki/raw/") ||
    normalized.startsWith("contex wiki/wiki/") ||
    normalized.includes("contex memory") ||
    normalized.includes("project memory") ||
    normalized.includes("durable memory")
  );
}

function normalizePathText(path: string): string {
  return path
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
