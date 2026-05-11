import {
  ensureContexWikiStructure,
  getContexWikiPaths,
  type ContexWikiSettingsLike
} from "../wiki/wikiBootstrap";
import type { ContexCodeWikiEvent, ContexCodeWikiEventWriter } from "./wikiEvents";

interface VaultAdapterLike {
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
}

interface AppLike {
  vault: {
    adapter: VaultAdapterLike;
  };
}

export interface ContexCodeWikiEventWriterSettings extends ContexWikiSettingsLike {
  wikiEnabled?: boolean;
}

export function createContexCodeWikiEventWriter(
  app: AppLike,
  settings: ContexCodeWikiEventWriterSettings
): ContexCodeWikiEventWriter {
  return {
    writeContexCodeEvent: async (event) => {
      await appendContexCodeWikiEvent(app, settings, event);
    }
  };
}

export async function appendContexCodeWikiEvent(
  app: AppLike,
  settings: ContexCodeWikiEventWriterSettings,
  event: ContexCodeWikiEvent
): Promise<string | null> {
  if (settings.wikiEnabled === false) {
    return null;
  }

  await ensureContexWikiStructure(app, settings);

  const paths = getContexWikiPaths(settings.wikiRootFolder);
  const eventPath = paths.schema.contexCodeEvents;
  const current = await readTextIfExists(app.vault.adapter, eventPath);
  const line = JSON.stringify(event);
  const existingLines = current.split(/\r?\n/).filter(Boolean);

  if (existingLines.includes(line)) {
    return eventPath;
  }

  const separator = current && !current.endsWith("\n") ? "\n" : "";
  await app.vault.adapter.write(eventPath, `${current}${separator}${line}\n`);

  return eventPath;
}

async function readTextIfExists(
  adapter: VaultAdapterLike,
  path: string
): Promise<string> {
  if (!(await adapter.exists(path))) {
    return "";
  }

  return adapter.read(path);
}
