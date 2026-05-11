import { normalizeVoiceCommandNoise } from "../voice/speechNoise";

export interface OpenFileQueryParts {
  fileQuery: string;
  folderQuery?: string;
}

export interface OpenFilePathCandidate {
  path: string;
  basename: string;
  folder: string;
  score: number;
}

export function rankOpenFilePathCandidates(
  paths: string[],
  query: string
): OpenFilePathCandidate[] {
  const queryParts = parseOpenFileQueryParts(query);

  return paths
    .map((path) => ({
      path,
      basename: getBasename(path),
      folder: getFolderPath(path),
      score: scoreOpenFilePathCandidate(
        path,
        queryParts.fileQuery,
        queryParts.folderQuery
      )
    }))
    .filter((candidate) => candidate.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        compareOpenFilePathSpecificity(left, right) ||
        left.path.localeCompare(right.path)
    );
}

export function parseOpenFileQueryParts(query: string): OpenFileQueryParts {
  const normalizedQuery = normalizeVoiceCommandNoise(query);
  const folderQuery = extractRequestedFolderName(normalizedQuery) ?? undefined;
  const fileQuery = folderQuery
    ? stripRequestedFolderClause(normalizedQuery, folderQuery)
    : normalizedQuery;

  return {
    fileQuery: cleanLooseOpenFileQuery(fileQuery) || normalizedQuery || query,
    folderQuery: folderQuery ? cleanLooseOpenFileQuery(folderQuery) : undefined
  };
}

export function scoreOpenFilePathCandidate(
  path: string,
  query: string,
  folderQuery?: string
): number {
  const normalizedQuery = normalizeOpenFileValue(query);
  const normalizedFolderQuery = folderQuery
    ? normalizeOpenFileValue(folderQuery)
    : "";
  const tokens = tokenizeOpenFileQuery(query);

  if (!normalizedQuery || !tokens.length) {
    return 0;
  }

  const folderPath = getFolderPath(path);
  const normalizedBasename = normalizeOpenFileValue(getBasename(path));
  const normalizedPath = normalizeOpenFileValue(path);
  const normalizedFolder = normalizeOpenFileValue(folderPath);
  const compactQuery = compactOpenFileValue(normalizedQuery);
  const compactBasename = compactOpenFileValue(normalizedBasename);
  const firstToken = tokens[0];
  let score = 0;

  if (normalizedFolderQuery) {
    const folderScore = scoreVaultFolderCandidate(
      folderPath,
      normalizedFolderQuery
    );

    if (folderScore <= 0) {
      return 0;
    }

    score += folderScore * 3;
  }

  if (normalizedPath === normalizedQuery) {
    score += 500;
  } else if (normalizedPath.includes(normalizedQuery)) {
    score += 260;
  }

  if (normalizedBasename === normalizedQuery) {
    score += 300;
  } else if (normalizedBasename.includes(normalizedQuery)) {
    score += 170;
  }

  const basenameSimilarity = getOpenFileSimilarity(
    normalizedQuery,
    normalizedBasename
  );
  const bestTokenBasenameSimilarity = tokens.reduce(
    (best, token) =>
      Math.max(best, getOpenFileSimilarity(token, normalizedBasename)),
    0
  );
  const compactBasenameSimilarity =
    compactQuery && compactBasename
      ? getOpenFileSimilarity(compactQuery, compactBasename)
      : 0;
  const bestBasenameSimilarity = Math.max(
    basenameSimilarity,
    bestTokenBasenameSimilarity,
    compactBasenameSimilarity
  );

  if (bestBasenameSimilarity >= 0.72) {
    score += Math.round(bestBasenameSimilarity * 420);
  } else if (bestBasenameSimilarity >= 0.58) {
    score += Math.round(bestBasenameSimilarity * 160);
  }

  if (normalizedFolderQuery && bestBasenameSimilarity >= 0.72) {
    score += Math.round(bestBasenameSimilarity * 520);
  }

  if (firstToken) {
    if (normalizedBasename === firstToken) {
      score += 260;
    } else if (normalizedBasename.includes(firstToken)) {
      score += 150;
    } else if (!normalizedPath.includes(firstToken)) {
      score -= 80;
    }
  }

  tokens.forEach((token, index) => {
    const isFirstToken = index === 0;

    if (normalizedBasename === token) {
      score += isFirstToken ? 220 : 90;
    } else if (normalizedBasename.includes(token)) {
      score += isFirstToken ? 140 : 45;
    }

    if (normalizedFolder.split(" ").includes(token)) {
      score += 45;
    } else if (normalizedFolder.includes(token)) {
      score += 25;
    }

    if (normalizedPath.includes(token)) {
      score += 25;
    }
  });

  const coveredTokens = tokens.filter((token) =>
    normalizedPath.includes(token)
  ).length;

  if (coveredTokens < tokens.length) {
    score -= (tokens.length - coveredTokens) * 25;
  }

  return Math.max(0, score);
}

export function scoreVaultFolderCandidate(
  folder: string,
  normalizedQuery: string
): number {
  const normalizedFolder = normalizeOpenFileValue(folder);
  const folderName = normalizeOpenFileValue(folder.split("/").pop() ?? folder);
  const normalizedFolderQuery = normalizeOpenFileValue(normalizedQuery);
  const tokens = normalizedFolderQuery.split(/\s+/).filter(Boolean);
  let score = 0;

  if (folderName === normalizedFolderQuery) {
    score += 500;
  } else if (normalizedFolder === normalizedFolderQuery) {
    score += 420;
  } else if (normalizedFolder.endsWith(` ${normalizedFolderQuery}`)) {
    score += 260;
  } else if (normalizedFolder.includes(normalizedFolderQuery)) {
    score += 160;
  }

  tokens.forEach((token) => {
    if (folderName === token) {
      score += 140;
    } else if (folderName.includes(token)) {
      score += 70;
    } else if (normalizedFolder.includes(token)) {
      score += 35;
    } else {
      const bestTokenSimilarity = getBestTokenSimilarity(
        token,
        normalizedFolder
      );

      if (bestTokenSimilarity >= 0.62) {
        score += Math.round(bestTokenSimilarity * 55);
      }
    }
  });

  const folderNameSimilarity = getOpenFileSimilarity(
    normalizedFolderQuery,
    folderName
  );
  const folderPathSimilarity = getOpenFileSimilarity(
    normalizedFolderQuery,
    normalizedFolder
  );
  const bestSimilarity = Math.max(folderNameSimilarity, folderPathSimilarity);

  if (bestSimilarity >= 0.56) {
    score += Math.round(bestSimilarity * 140);
  }

  return score;
}

export function normalizeOpenFileValue(value: string): string {
  return transliterateCyrillicToLatin(value.toLowerCase())
    .replace(/\.md\b/g, " ")
    .replace(/[\\/]+/g, " ")
    .replace(/(?:^|[^\p{L}\p{N}_-])stat\s*(\d+)(?=$|[^\p{L}\p{N}_-])/giu, " stat$1")
    .replace(/\bstat\s+(\d+)\b/gi, "stat$1")
    .replace(/[^\p{L}\p{N}_-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRequestedFolderName(commandText: string): string | null {
  const normalizedCommandText = normalizeVoiceCommandNoise(commandText);
  const patterns = [
    /(?:^|[\s,;:])(?:\u0432|\u0438\u0437)\s+(?:\u043f\u0430\u043f\u043a|\u043f\u0430\u0440\u043a)[\u0435\u0438]\s+([\p{L}\p{N}_ -]+?)(?=\s+(?:\u0441\u043e\u0437\u0434\u0430|\u0441\u0434\u0435\u043b\u0430|\u0437\u0430\u0432\u0435\u0434|\u043f\u043b\u0430\u043d|\u0437\u0430\u043c\u0435\u0442\u043a|note|file|create|make|draft|new|plan)\b|[,.!?;:]|$)/iu,
    /(?:^|[\s,;:])(?:in|inside)\s+(?:the\s+)?folder\s+([\p{L}\p{N}_ -]+?)(?=\s+(?:create|make|draft|new|note|file|plan)\b|[,.!?;:]|$)/iu
  ];

  for (const pattern of patterns) {
    const match = normalizedCommandText.match(pattern);
    const folder = match?.[1]?.replace(/\b(?:\u0438|and)\b.*$/i, "").trim();

    if (folder) {
      return folder;
    }
  }

  return null;
}

function stripRequestedFolderClause(query: string, folderQuery: string): string {
  const escapedFolder = escapeRegExp(folderQuery);

  return query
    .replace(
      new RegExp(
        `(?:^|[\\s,;:])(?:\\u0432|\\u0438\\u0437)\\s+(?:\\u043f\\u0430\\u043f\\u043a|\\u043f\\u0430\\u0440\\u043a)[\\u0435\\u0438]\\s+${escapedFolder}(?=\\s|[,.!?;:]|$)`,
        "iu"
      ),
      " "
    )
    .replace(
      new RegExp(
        `(?:^|[\\s,;:])(?:in|inside)\\s+(?:the\\s+)?folder\\s+${escapedFolder}(?=\\s|[,.!?;:]|$)`,
        "iu"
      ),
      " "
    );
}

function cleanLooseOpenFileQuery(query: string): string {
  return normalizeVoiceCommandNoise(query)
    .replace(/(?:^|[\s,;:])(?:\u043e\u0442\u043a\u0440\u043e\u0439|\u043e\u0442\u043a\u0440\u043e\u044e|\u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0439|\u043e\u0442\u043a\u0440\u044b\u0432\u0430\u0435\u043c|\u043e\u0442\u043a\u0440\u044b\u0442\u044c|\u043f\u043e\u043a\u0430\u0436\u0438|open|show)(?=$|[\s,;:.!?])/giu, " ")
    .replace(/(?:^|[\s,;:])(?:\u043c\u043d\u0435|\u043d\u0435|\u043f\u043e\u0436\u0430\u043b\u0443\u0439\u0441\u0442\u0430|please)(?=$|[\s,;:.!?])/giu, " ")
    .replace(/(?:^|[\s,;:])(?:\u0432|\u0438\u0437)\s+(?:\u043f\u0430\u043f\u043a|\u043f\u0430\u0440\u043a)[\u0435\u0438](?=$|[\s,;:.!?])/giu, " ")
    .replace(/(?:^|[\s,;:])(?:(?:\u043f\u0430\u043f\u043a|\u043f\u0430\u0440\u043a)[\u0430\u0435\u0443\u044b]?|folder)(?=$|[\s,;:.!?])/giu, " ")
    .replace(/(?:^|[\s,;:])(?:\u0444\u0430\u0439\u043b|\u0437\u0430\u043c\u0435\u0442\u043a[\u0430\u0443\u0438]?|\u043d\u043e\u0443\u0441|note)(?=$|[\s,;:.!?])/giu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactOpenFileValue(value: string): string {
  return value.replace(/[\s_-]+/g, "");
}

function tokenizeOpenFileQuery(query: string): string[] {
  return Array.from(
    new Set(
      normalizeOpenFileValue(query)
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2)
    )
  );
}

function compareOpenFilePathSpecificity(
  left: OpenFilePathCandidate,
  right: OpenFilePathCandidate
): number {
  const leftFolderName = left.folder.split("/").pop()?.toLowerCase() ?? "";
  const rightFolderName = right.folder.split("/").pop()?.toLowerCase() ?? "";

  if (left.basename.toLowerCase() === leftFolderName &&
      right.basename.toLowerCase() !== rightFolderName) {
    return -1;
  }

  if (right.basename.toLowerCase() === rightFolderName &&
      left.basename.toLowerCase() !== leftFolderName) {
    return 1;
  }

  return left.path.length - right.path.length;
}

function getBasename(path: string): string {
  const filename = path.split("/").pop() ?? path;
  return filename.replace(/\.md$/i, "");
}

function getFolderPath(path: string): string {
  return path.split("/").slice(0, -1).join("/");
}

function transliterateCyrillicToLatin(value: string): string {
  const map: Record<string, string> = {
    "\u0430": "a",
    "\u0431": "b",
    "\u0432": "v",
    "\u0433": "g",
    "\u0434": "d",
    "\u0435": "e",
    "\u0451": "e",
    "\u0436": "zh",
    "\u0437": "z",
    "\u0438": "i",
    "\u0439": "y",
    "\u043a": "k",
    "\u043b": "l",
    "\u043c": "m",
    "\u043d": "n",
    "\u043e": "o",
    "\u043f": "p",
    "\u0440": "r",
    "\u0441": "s",
    "\u0442": "t",
    "\u0443": "u",
    "\u0444": "f",
    "\u0445": "h",
    "\u0446": "ts",
    "\u0447": "ch",
    "\u0448": "sh",
    "\u0449": "sch",
    "\u044a": "",
    "\u044b": "y",
    "\u044c": "",
    "\u044d": "e",
    "\u044e": "yu",
    "\u044f": "ya"
  };

  return value.replace(/[\u0430-\u044f\u0451]/gi, (char) => map[char.toLowerCase()] ?? char);
}

function getBestTokenSimilarity(queryToken: string, target: string): number {
  return target
    .split(/\s+/)
    .filter(Boolean)
    .reduce(
      (best, targetToken) =>
        Math.max(best, getOpenFileSimilarity(queryToken, targetToken)),
      0
    );
}

function getOpenFileSimilarity(left: string, right: string): number {
  const first = left.trim();
  const second = right.trim();

  if (!first || !second) {
    return 0;
  }

  if (first === second) {
    return 1;
  }

  const direct = getNormalizedLevenshteinSimilarity(first, second);
  const firstSkeleton = getConsonantSkeleton(first);
  const secondSkeleton = getConsonantSkeleton(second);
  const skeleton =
    firstSkeleton.length >= 2 && secondSkeleton.length >= 2
      ? getNormalizedLevenshteinSimilarity(firstSkeleton, secondSkeleton)
      : 0;

  return Math.max(direct, skeleton);
}

function getConsonantSkeleton(value: string): string {
  return value.replace(/[aeiouy\u0430\u0435\u0451\u0438\u043e\u0443\u044b\u044d\u044e\u044f\s_-]+/giu, "");
}

function getNormalizedLevenshteinSimilarity(left: string, right: string): number {
  const maxLength = Math.max(left.length, right.length);

  if (!maxLength) {
    return 1;
  }

  return 1 - levenshteinDistance(left, right) / maxLength;
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array.from({ length: right.length + 1 }, () => 0);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost
      );
    }

    for (let index = 0; index < previous.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[right.length] ?? 0;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
