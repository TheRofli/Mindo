export function normalizeVoiceCommandNoise(text: string): string {
  let normalized = text.replace(/\s+/g, " ");

  const replacements: Array<[RegExp, string]> = [
    [
      /(^|[\s,;:])\u0432\s*\u0430\s*\u043f\u043a[\u0430\u0435\u0438\u0443\u044b](?=$|[^\p{L}\p{N}_-])/giu,
      "$1\u0432 \u043f\u0430\u043f\u043a\u0435"
    ],
    [
      /(^|[\s,;:])\u0432\u0430\u043f\u043a[\u0430\u0435\u0438\u0443\u044b](?=$|[^\p{L}\p{N}_-])/giu,
      "$1\u0432 \u043f\u0430\u043f\u043a\u0435"
    ],
    [
      /(^|[\s,;:])\u0432\u043f\u0430\u043f\u043a[\u0430\u0435\u0438\u0443\u044b](?=$|[^\p{L}\p{N}_-])/giu,
      "$1\u0432 \u043f\u0430\u043f\u043a\u0435"
    ],
    [
      /(^|[\s,;:])\u0432\s+\u043f\u0430\u0434\u043a[\u0430\u0435\u0438\u0443\u044b](?=$|[^\p{L}\p{N}_-])/giu,
      "$1\u0432 \u043f\u0430\u043f\u043a\u0435"
    ],
    [
      /(^|[\s,;:])\u0432\s+\u043f\u0430\u0440\u043a[\u0430\u0435\u0438\u0443\u044b](?=$|[^\p{L}\p{N}_-])/giu,
      "$1\u0432 \u043f\u0430\u043f\u043a\u0435"
    ],
    [
      /(^|[\s,;:])\u0432\s+\u043f\u0430\u043f\u043a[\u0430\u0438\u0443\u044b](?=$|[^\p{L}\p{N}_-])/giu,
      "$1\u0432 \u043f\u0430\u043f\u043a\u0435"
    ]
  ];

  for (const [pattern, replacement] of replacements) {
    normalized = normalized.replace(pattern, replacement);
  }

  return normalized.replace(/\s+/g, " ").trim();
}
