export interface ParsedShot {
  shotNumber: string;
  description: string;
  shotSize?: string;
  angle?: string;
  movement?: string;
  character?: string;
}

/**
 * Parse free-text into shots, one per non-empty line.
 *
 * If a line uses "|" (or tabs) it's split into columns in this order:
 *   number | size | angle | movement | character | description
 * Otherwise the whole line becomes the description and the shot is auto-numbered.
 */
export function parseShotLines(text: string): ParsedShot[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line, i) => {
    const delimiter = line.includes("|") ? "|" : line.includes("\t") ? "\t" : null;

    if (delimiter) {
      const parts = line.split(delimiter).map((p) => p.trim());
      const [shotNumber, shotSize, angle, movement, character, ...descRest] = parts;
      return {
        shotNumber: shotNumber || String(i + 1),
        shotSize: shotSize || undefined,
        angle: angle || undefined,
        movement: movement || undefined,
        character: character || undefined,
        description: descRest.join(" ").trim(),
      };
    }

    return { shotNumber: String(i + 1), description: line };
  });
}
