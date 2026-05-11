export interface TextOccurrenceMatch {
  original: string;
  occurrenceIndex?: number;
}

export function countOccurrences(content: string, search: string): number {
  if (!search) {
    return 0;
  }

  let count = 0;
  let index = 0;

  while (index !== -1) {
    index = content.indexOf(search, index);

    if (index !== -1) {
      count += 1;
      index += search.length;
    }
  }

  return count;
}

export function getUniqueOccurrenceIndex(
  content: string,
  search: string
): number | undefined {
  return countOccurrences(content, search) === 1 ? 0 : undefined;
}

export function findUniqueTextOccurrence(
  content: string,
  requestedText: string
): { match: TextOccurrenceMatch; error: null } | { match: null; error: string } {
  const search = requestedText.trim();

  if (!search) {
    return {
      match: null,
      error: "Text to replace is empty."
    };
  }

  const exactMatches = findExactMatchIndexes(content, search);
  const safeExactMatches = exactMatches.filter((match) =>
    hasSafeTextBoundaries(content, match.index, search.length)
  );

  if (safeExactMatches.length === 1) {
    return {
      match: {
        original: search,
        occurrenceIndex: safeExactMatches[0].occurrenceIndex
      },
      error: null
    };
  }

  if (safeExactMatches.length > 1) {
    return {
      match: null,
      error:
        "Text was found more than once in the current note. Select the exact passage before replacing it."
    };
  }

  if (exactMatches.length > 1) {
    return {
      match: null,
      error:
        "Text was found more than once in the current note. Select the exact passage before replacing it."
    };
  }

  const flexibleMatches = findFlexibleSeparatorMatches(content, search);

  if (flexibleMatches.length === 1) {
    const original = flexibleMatches[0];

    return {
      match: {
        original,
        occurrenceIndex: getUniqueOccurrenceIndex(content, original)
      },
      error: null
    };
  }

  if (flexibleMatches.length > 1) {
    return {
      match: null,
      error:
        "Similar text was found more than once in the current note. Select the exact passage before replacing it."
    };
  }

  const fuzzyLineMatches = findFuzzyLineMatches(content, search);

  if (fuzzyLineMatches.length === 1) {
    const original = fuzzyLineMatches[0];

    return {
      match: {
        original,
        occurrenceIndex: getUniqueOccurrenceIndex(content, original)
      },
      error: null
    };
  }

  if (fuzzyLineMatches.length > 1) {
    return {
      match: null,
      error:
        "Similar text was found more than once in the current note. Select the exact passage before replacing it."
    };
  }

  return {
    match: null,
    error: `Text was not found in the current note: ${search}`
  };
}

function findExactMatchIndexes(
  content: string,
  search: string
): Array<{ index: number; occurrenceIndex: number }> {
  const matches: Array<{ index: number; occurrenceIndex: number }> = [];
  let index = 0;
  let occurrenceIndex = 0;

  while (index !== -1) {
    index = content.indexOf(search, index);

    if (index !== -1) {
      matches.push({ index, occurrenceIndex });
      occurrenceIndex += 1;
      index += search.length;
    }
  }

  return matches;
}

function hasSafeTextBoundaries(
  content: string,
  index: number,
  length: number
): boolean {
  const before = index > 0 ? content[index - 1] : "";
  const after = index + length < content.length ? content[index + length] : "";

  return !isWordCharacter(before) && !isWordCharacter(after);
}

export function replaceSelectedOccurrence(
  content: string,
  search: string,
  replacement: string,
  occurrenceIndex?: number
): string {
  if (occurrenceIndex !== undefined) {
    return replaceNthOccurrence(content, search, replacement, occurrenceIndex);
  }

  const occurrenceCount = countOccurrences(content, search);

  if (occurrenceCount === 0) {
    throw new Error(
      "Original selected text was not found in the source note. The note may have changed."
    );
  }

  if (occurrenceCount > 1) {
    throw new Error(
      "Original selected text appears more than once. Select a more specific passage before applying."
    );
  }

  return content.replace(search, replacement);
}

function findFlexibleSeparatorMatches(
  content: string,
  requestedText: string
): string[] {
  const tokens = requestedText
    .trim()
    .split(/[\s\p{Pd}_]+/u)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length < 2) {
    return [];
  }

  const pattern = tokens.map(escapeRegExp).join("[\\s\\p{Pd}_]+");
  const matches: string[] = [];
  const regex = new RegExp(pattern, "giu");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    if (
      match[0] &&
      hasSafeTextBoundaries(content, match.index, match[0].length)
    ) {
      matches.push(match[0]);
    }
  }

  return Array.from(new Set(matches));
}

function findFuzzyLineMatches(content: string, requestedText: string): string[] {
  const requested = normalizeLooseTextForMatch(requestedText);

  if (requested.length < 4) {
    return [];
  }

  return Array.from(
    new Set(
      content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line.length <= 220)
        .filter((line) => {
          const normalizedLine = normalizeLooseTextForMatch(line);

          if (!normalizedLine) {
            return false;
          }

          if (normalizedLine === requested) {
            return true;
          }

          if (
            normalizedLine.includes(requested) &&
            hasSafeTextBoundaries(
              normalizedLine,
              normalizedLine.indexOf(requested),
              requested.length
            )
          ) {
            return true;
          }

          return getTextSimilarity(normalizedLine, requested) >= 0.84;
        })
    )
  );
}

function normalizeLooseTextForMatch(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/\u0451/g, "\u0435")
    .replace(/[\s\p{Pd}_]+/gu, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getTextSimilarity(left: string, right: string): number {
  if (left === right) {
    return 1;
  }

  if (!left || !right) {
    return 0;
  }

  const distance = getLevenshteinDistance(left, right);

  return 1 - distance / Math.max(left.length, right.length);
}

function getLevenshteinDistance(left: string, right: string): number {
  const rows = left.length + 1;
  const columns = right.length + 1;
  const table = Array.from({ length: rows }, () => Array(columns).fill(0));

  for (let row = 0; row < rows; row += 1) {
    table[row][0] = row;
  }

  for (let column = 0; column < columns; column += 1) {
    table[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      table[row][column] = Math.min(
        table[row - 1][column] + 1,
        table[row][column - 1] + 1,
        table[row - 1][column - 1] + cost
      );
    }
  }

  return table[left.length][right.length];
}

function isWordCharacter(value: string): boolean {
  return Boolean(value && /[\p{L}\p{N}_]/u.test(value));
}

function replaceNthOccurrence(
  content: string,
  search: string,
  replacement: string,
  occurrenceIndex: number
): string {
  if (!search) {
    throw new Error("Original selected text is empty.");
  }

  let found = -1;
  let cursor = 0;

  for (let index = 0; index <= occurrenceIndex; index += 1) {
    found = content.indexOf(search, cursor);

    if (found === -1) {
      throw new Error(
        "Original selected text was not found at its recorded position. The note may have changed."
      );
    }

    cursor = found + search.length;
  }

  return `${content.slice(0, found)}${replacement}${content.slice(
    found + search.length
  )}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
