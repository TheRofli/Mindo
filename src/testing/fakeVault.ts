export interface FakeVaultFile {
  path: string;
  content: string;
}

export function createFakeVault(paths: string[]): FakeVaultFile[] {
  return paths.map((path) => ({
    path,
    content: `# ${path.split("/").pop()?.replace(/\.md$/i, "") ?? path}`
  }));
}
