import assert from "node:assert/strict";

import {
  buildProjectMemoryContext,
  selectRecentProjectMemoryFiles
} from "../src/chat/projectMemoryContext";

const file = (path: string, mtime: number) => ({
  path,
  stat: {
    mtime
  }
});

{
  const selected = selectRecentProjectMemoryFiles([
    file("Contex Wiki/Raw/Chat/a.md", 1),
    file("Notes/ordinary.md", 10),
    file("Contex Wiki/Wiki/Projects/project.md", 2),
    file("Contex Wiki/Raw/Web/web.md", 3)
  ]);

  assert.deepEqual(
    selected.map((item) => item.path),
    [
      "Contex Wiki/Raw/Web/web.md",
      "Contex Wiki/Wiki/Projects/project.md",
      "Contex Wiki/Raw/Chat/a.md"
    ]
  );
}

{
  const files = [
    file("Contex Wiki/Raw/Chat/recent.md", 20),
    file("Contex Wiki/Raw/Chat/older.md", 10)
  ];

  const context = await buildProjectMemoryContext({
    files,
    maxChars: 200,
    readFile: async (item) => `Content for ${item.path}`
  });

  assert.ok(context?.includes("Memory source: Contex Wiki/Raw/Chat/recent.md"));
  assert.ok(context?.includes("Memory source: Contex Wiki/Raw/Chat/older.md"));
  assert.ok(context?.includes("\n\n---\n\n"));
}

{
  const context = await buildProjectMemoryContext({
    files: [
      file("Contex Wiki/Raw/Chat/empty.md", 2),
      file("Contex Wiki/Raw/Chat/fails.md", 1)
    ],
    readFile: async (item) => {
      if (item.path.includes("fails")) {
        throw new Error("cannot read");
      }

      return "   ";
    },
    onReadError: () => undefined
  });

  assert.equal(context, null);
}

console.log("projectMemoryContext tests passed");
