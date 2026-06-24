import { parseScenesFromScript } from "./parse-scenes";

export interface ParsedCharacter {
  /** The character's name as it appears in the script's dialogue cues. */
  name: string;
  /** How many dialogue beats they speak — a rough measure of prominence. */
  lines: number;
}

/**
 * Extract the speaking characters from screenplay text. Reuses the scene parser,
 * which already distinguishes character cues ("MARA") from scene headings
 * ("INT. KITCHEN - DAY"), then aggregates the dialogue beats per character.
 *
 * Names are returned most-prominent first (by line count, then alphabetically).
 */
export function parseCharactersFromScript(text: string): ParsedCharacter[] {
  const scenes = parseScenesFromScript(text);
  const counts = new Map<string, number>();

  for (const scene of scenes) {
    for (const beat of scene.dialogue) {
      const name = beat.character.replace(/\s+/g, " ").trim();
      if (!name) continue;
      // Merge case variants ("MARA" / "Mara") under a single canonical key while
      // keeping the first-seen spelling for display.
      const key = name.toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines - a.lines || a.name.localeCompare(b.name));
}
