import { normalizePath, TFile, type App } from "obsidian";

const HISTORY_DIR = ".contex-history";
const HISTORY_FILE = `${HISTORY_DIR}/operations.jsonl`;

export type AiChangeOperationStatus = "recorded" | "applied" | "rolled_back";

export interface AiChangeOperation {
  id: string;
  timestamp: string;
  operationType: string;
  filePath: string;
  beforeContent: string;
  afterContent: string;
  selectedBefore: string;
  selectedAfter: string;
  model: string;
  userPrompt: string;
  status: AiChangeOperationStatus;
  rolledBackAt?: string;
}

export interface RecordAiChangeOperationParams {
  operationType: string;
  filePath: string;
  beforeContent: string;
  afterContent: string;
  selectedBefore: string;
  selectedAfter: string;
  model: string;
  userPrompt: string;
}

export async function recordAiChangeOperation(
  app: App,
  params: RecordAiChangeOperationParams
): Promise<AiChangeOperation> {
  assertWritableVaultPath(params.filePath);
  await ensureHistoryFile(app);

  const operation: AiChangeOperation = {
    id: createOperationId(),
    timestamp: new Date().toISOString(),
    status: "recorded",
    ...params
  };

  await app.vault.adapter.append(
    HISTORY_FILE,
    `${JSON.stringify(operation)}\n`
  );

  return operation;
}

export async function markAiChangeOperationApplied(
  app: App,
  operationId: string
): Promise<void> {
  await updateOperation(app, operationId, (operation) => ({
    ...operation,
    status: "applied"
  }));
}

export async function rollbackLastAiChangeOperation(
  app: App
): Promise<AiChangeOperation> {
  const operations = await readAiChangeOperations(app);
  const operation = [...operations]
    .reverse()
    .find((candidate) => candidate.status === "applied");

  if (!operation) {
    throw new Error("No applied AI change was found in history.");
  }

  return rollbackAiChangeOperation(app, operation.id);
}

export async function rollbackAiChangeOperation(
  app: App,
  operationId: string
): Promise<AiChangeOperation> {
  const operations = await readAiChangeOperations(app);
  const operation = operations.find((candidate) => candidate.id === operationId);

  if (!operation) {
    throw new Error("AI change operation was not found in history.");
  }

  if (operation.status !== "applied") {
    throw new Error("AI change operation is not currently applied.");
  }

  assertWritableVaultPath(operation.filePath);

  const file = getHistoryOperationFile(app, operation.filePath);
  const currentContent = await app.vault.read(file);

  if (currentContent !== operation.afterContent) {
    throw new Error(
      "Source note changed after this AI operation. Rollback was blocked to avoid losing later edits."
    );
  }

  if (operation.operationType === "create-note" && operation.beforeContent === "") {
    await app.vault.delete(file);
  } else {
    await app.vault.modify(file, operation.beforeContent);
  }

  const rolledBackAt = new Date().toISOString();
  const updatedOperation: AiChangeOperation = {
    ...operation,
    status: "rolled_back",
    rolledBackAt
  };

  await updateOperation(app, operationId, () => updatedOperation);
  return updatedOperation;
}

export function assertWritableVaultPath(path: string): void {
  const normalizedPath = normalizePath(path).toLowerCase();

  if (
    normalizedPath === ".obsidian" ||
    normalizedPath.startsWith(".obsidian/") ||
    normalizedPath === ".git" ||
    normalizedPath.startsWith(".git/") ||
    normalizedPath === HISTORY_DIR ||
    normalizedPath.startsWith(`${HISTORY_DIR}/`)
  ) {
    throw new Error(`Protected path cannot be modified: ${path}`);
  }
}

export async function readAiChangeOperations(
  app: App
): Promise<AiChangeOperation[]> {
  if (!(await app.vault.adapter.exists(HISTORY_FILE))) {
    return [];
  }

  const content = await app.vault.adapter.read(HISTORY_FILE);
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AiChangeOperation);
}

async function ensureHistoryFile(app: App): Promise<void> {
  if (!(await app.vault.adapter.exists(HISTORY_DIR))) {
    await app.vault.adapter.mkdir(HISTORY_DIR);
  }

  if (!(await app.vault.adapter.exists(HISTORY_FILE))) {
    await app.vault.adapter.write(HISTORY_FILE, "");
  }
}

async function writeAiChangeOperations(
  app: App,
  operations: AiChangeOperation[]
): Promise<void> {
  await ensureHistoryFile(app);
  await app.vault.adapter.write(
    HISTORY_FILE,
    operations.map((operation) => JSON.stringify(operation)).join("\n") + "\n"
  );
}

async function updateOperation(
  app: App,
  operationId: string,
  updater: (operation: AiChangeOperation) => AiChangeOperation
): Promise<void> {
  const operations = await readAiChangeOperations(app);
  const index = operations.findIndex((operation) => operation.id === operationId);

  if (index === -1) {
    throw new Error("AI change operation was not found in history.");
  }

  operations[index] = updater(operations[index]);
  await writeAiChangeOperations(app, operations);
}

function getHistoryOperationFile(app: App, filePath: string): TFile {
  const abstractFile = app.vault.getAbstractFileByPath(filePath);

  if (!(abstractFile instanceof TFile)) {
    throw new Error(`Could not find source note: ${filePath}`);
  }

  return abstractFile;
}

function createOperationId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
