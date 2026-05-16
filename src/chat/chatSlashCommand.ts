export type ChatSlashCommand =
  | { kind: "vault-search"; query: string }
  | { kind: "web-research"; query: string }
  | { kind: "semantic-vault"; query: string };

const SLASH_COMMANDS: Array<{
  prefix: string;
  kind: ChatSlashCommand["kind"];
}> = [
  { prefix: "/search ", kind: "vault-search" },
  { prefix: "/web ", kind: "web-research" },
  { prefix: "/rag ", kind: "semantic-vault" }
];

export function parseChatSlashCommand(
  content: string,
  hasPendingContexCodeInterview: boolean
): ChatSlashCommand | null {
  if (hasPendingContexCodeInterview) {
    return null;
  }

  for (const command of SLASH_COMMANDS) {
    if (!content.startsWith(command.prefix)) {
      continue;
    }

    const query = content.slice(command.prefix.length).trim();

    if (!query) {
      return null;
    }

    return {
      kind: command.kind,
      query
    };
  }

  return null;
}
