import { App } from "obsidian";
import { normalizeCreateNotePath } from "./createNotePathUtils";

export async function getUniqueNotePath(app: App, path: string): Promise<string> {
  const normalizedPath = normalizeCreateNotePath(path);
  const extensionlessPath = normalizedPath.replace(/\.md$/i, "");
  let candidate = `${extensionlessPath}.md`;
  let index = 2;

  while (await app.vault.adapter.exists(candidate)) {
    candidate = `${extensionlessPath} ${index}.md`;
    index += 1;
  }

  return candidate;
}

export async function ensureFolderForPath(app: App, path: string): Promise<void> {
  const folderPath = path.split("/").slice(0, -1).join("/");

  if (!folderPath || (await app.vault.adapter.exists(folderPath))) {
    return;
  }

  const segments = folderPath.split("/");
  let currentPath = "";

  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;

    if (!(await app.vault.adapter.exists(currentPath))) {
      await app.vault.adapter.mkdir(currentPath);
    }
  }
}
