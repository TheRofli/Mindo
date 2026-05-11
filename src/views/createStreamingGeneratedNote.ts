import { App, Notice, normalizePath, TFile } from "obsidian";
import {
  assertWritableVaultPath,
  markAiChangeOperationApplied,
  recordAiChangeOperation
} from "../history/changeHistory";
import {
  requestLlmChatCompletion,
  streamLlmChatCompletion
} from "../llm/llmClient";
import type {
  ActionReceipt,
  ContexSettings,
  LlmFileAttachment,
  LlmRequestContext,
  SelectedTextContext,
  VaultSearchResult,
  WebSearchResult
} from "../types";
import { stripHiddenTtsHints } from "../voice/speechText";
import {
  buildGeneratedNoteMarkdownContent,
  chooseGeneratedNoteTitle
} from "./createNoteContent";
import { sanitizeCreateNoteTitle } from "./createNoteProposal";
import { slugifyTitle } from "./createNotePathUtils";
import { ensureFolderForPath, getUniqueNotePath } from "./vaultNoteFiles";

export interface CreateStreamingGeneratedNoteOptions {
  title: string;
  targetFolder: string;
  prompt: string;
  selectedContext: SelectedTextContext;
  userPrompt: string;
  userContent?: string;
  userAttachments?: LlmFileAttachment[] | null;
  requestContext?: LlmRequestContext | null;
  vaultSources?: VaultSearchResult[];
  webSources?: WebSearchResult[];
  draftLabel?: string;
  savedLabel?: string;
}

export interface CreateStreamingGeneratedNoteDeps {
  app: App;
  settings: ContexSettings;
  setStatus: (text: string) => void;
  openVaultPath: (path: string, noticeMessage: string) => Promise<void>;
  appendActionReceipt: (
    receipt: ActionReceipt,
    userContent?: string,
    userAttachments?: LlmFileAttachment[] | null
  ) => void;
  pushActionTimeline: (
    type: "running" | "done",
    label: string,
    detail?: string,
    path?: string
  ) => void;
}

export async function createStreamingGeneratedNote(
  deps: CreateStreamingGeneratedNoteDeps,
  options: CreateStreamingGeneratedNoteOptions
): Promise<string> {
  const normalizedFolder = normalizePath(options.targetFolder).replace(/^\/+/, "");
  let title = sanitizeCreateNoteTitle(options.title) || "Contex Note";
  let path = await getUniqueNotePath(
    deps.app,
    `${normalizedFolder}/${slugifyTitle(title)}.md`
  );

  assertWritableVaultPath(path);
  await ensureFolderForPath(deps.app, path);
  deps.pushActionTimeline("running", "Creating note", path, path);
  deps.setStatus("Status: Creating note");

  let file = await deps.app.vault.create(path, "");
  await deps.openVaultPath(path, `Creating note: ${path}`);
  deps.appendActionReceipt(
    {
      status: "preview",
      label: options.draftLabel ?? "Streaming note draft",
      detail: path,
      path
    },
    options.userContent,
    options.userAttachments
  );

  let rawContent = "";
  let lastWriteAt = 0;
  let writeChain = Promise.resolve();
  const queueWrite = (content: string): void => {
    writeChain = writeChain
      .then(() => deps.app.vault.modify(file, content))
      .catch((error) => {
        console.warn("[Contex Agent] Streaming note write failed", error);
      });
  };
  const writeDraft = (force = false): void => {
    const now = Date.now();

    if (!force && now - lastWriteAt < 280) {
      return;
    }

    lastWriteAt = now;
    queueWrite(
      buildStreamingNoteMarkdown(path, title, rawContent, {
        includeSources: false
      })
    );
  };

  deps.setStatus("Status: Writing note");
  let streamedContent = "";

  try {
    streamedContent = await streamLlmChatCompletion(
      deps.settings,
      [
        {
          id: `${Date.now()}-stream-note`,
          role: "user",
          content: options.prompt,
          createdAt: Date.now()
        }
      ],
      options.requestContext ?? null,
      (token) => {
        rawContent += token;
        writeDraft(false);
      }
    );
  } catch (streamError) {
    if (!rawContent.trim()) {
      deps.setStatus("Status: Waiting for LLM");
      rawContent = await requestLlmChatCompletion(
        deps.settings,
        [
          {
            id: `${Date.now()}-fallback-note`,
            role: "user",
            content: options.prompt,
            createdAt: Date.now()
          }
        ],
        options.requestContext ?? null
      );
    } else {
      console.warn("[Contex Agent] Note stream ended early", streamError);
    }
  }

  if (streamedContent.trim()) {
    rawContent = streamedContent;
  }

  const generatedTitle = chooseGeneratedNoteTitle({
    currentTitle: title,
    rawContent,
    userPrompt: options.userPrompt
  });

  if (generatedTitle !== title) {
    const nextPath = await getUniqueNotePath(
      deps.app,
      `${normalizedFolder}/${slugifyTitle(generatedTitle)}.md`
    );

    if (nextPath !== path) {
      await ensureFolderForPath(deps.app, nextPath);
      await deps.app.vault.rename(file, nextPath);
      path = nextPath;
      const renamedFile = deps.app.vault.getAbstractFileByPath(path);
      if (renamedFile instanceof TFile) {
        file = renamedFile;
      }
      await deps.openVaultPath(path, `Renamed note: ${path}`);
    }

    title = generatedTitle;
  }

  writeDraft(true);
  await writeChain;

  deps.setStatus("Status: Checking note");
  const finalContent = buildStreamingNoteMarkdown(path, title, rawContent, {
    includeSources: true,
    vaultSources: options.vaultSources,
    webSources: options.webSources
  });
  await deps.app.vault.modify(file, finalContent);

  const operation = await recordAiChangeOperation(deps.app, {
    operationType: "create-note",
    filePath: path,
    beforeContent: "",
    afterContent: finalContent,
    selectedBefore: options.selectedContext.text,
    selectedAfter: finalContent,
    model: deps.settings.model,
    userPrompt: options.userPrompt
  });
  await markAiChangeOperationApplied(deps.app, operation.id);
  deps.appendActionReceipt(
    {
      status: "saved",
      label: options.savedLabel ?? "Created note",
      detail: path,
      path
    }
  );
  new Notice(`Created note: ${path}`);
  deps.pushActionTimeline("done", "Created note", path, path);

  return path;
}

function buildStreamingNoteMarkdown(
  path: string,
  title: string,
  rawContent: string,
  options: {
    includeSources: boolean;
    vaultSources?: VaultSearchResult[];
    webSources?: WebSearchResult[];
  }
): string {
  return buildGeneratedNoteMarkdownContent(
    stripHiddenTtsHints(rawContent),
    title,
    path,
    options
  );
}
