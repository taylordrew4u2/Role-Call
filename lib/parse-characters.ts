export interface ParsedCharacter {
  /** The character's name as it appears in the script's dialogue cues. */
  name: string;
  /** How many times they're cued to speak — a rough measure of prominence. */
  lines: number;
}

// Parenthetical extensions that follow a name on a cue line: JOHN (V.O.),
// MARY (CONT'D), SAM (O.S.), etc. Stripped before we read the name.
const EXTENSION_WORDS =
  "V\\.?O\\.?|O\\.?S\\.?|O\\.?C\\.?|CONT'?D|CONTINUED|CONT|SUBTITLED?|FILTERED|" +
  "INTO PHONE|ON PHONE|ON RADIO|OVER RADIO|PRE-?LAP|VOICE|OFF|SOTTO|" +
  "WHISPER(?:S|ING)?|TO [A-Z]+|READING|SINGING|V\\.?O|MORE";

// All-caps lines that look like cues but are really headings, transitions, or
// editorial labels. These must never be treated as characters.
const NOT_A_CHARACTER = new Set([
  "INT", "EXT", "EST", "INT/EXT", "EXT/INT", "I/E",
  "FADE IN", "FADE OUT", "FADE TO", "FADE TO BLACK", "FADE UP",
  "CUT TO", "CUT TO BLACK", "SMASH CUT", "MATCH CUT", "HARD CUT", "QUICK CUT",
  "JUMP CUT", "TIME CUT", "DISSOLVE TO", "DISSOLVE", "WIPE TO",
  "BACK TO", "BACK TO SCENE", "INTERCUT", "INTERCUT WITH",
  "MONTAGE", "END MONTAGE", "SERIES OF SHOTS", "INSERT", "END INSERT",
  "SUPER", "SUPERIMPOSE", "TITLE", "TITLE CARD", "MAIN TITLES", "END TITLES",
  "ANGLE", "ANGLE ON", "NEW ANGLE", "REVERSE ANGLE", "WIDER ANGLE",
  "CLOSE ON", "CLOSE UP", "CLOSEUP", "WIDE", "WIDE SHOT", "ON",
  "POV", "P.O.V.", "FLASHBACK", "END FLASHBACK", "FLASH CUT", "PRELAP",
  "CONTINUED", "CONTINUOUS", "OMITTED", "BEAT", "THE END", "END",
  "LATER", "MOMENTS LATER", "PRESENT DAY", "MEANWHILE", "ESTABLISHING",
  "DAY", "NIGHT", "DAWN", "DUSK", "MORNING", "EVENING", "AFTERNOON",
]);

// A scene heading: a slug line beginning with INT/EXT/EST (optionally numbered).
const HEADING_RE =
  /^\s*(?:[0-9]+[A-Za-z]?[.)]?\s*)?(?:INT|EXT|EST|INT\.?\/EXT|EXT\.?\/INT|I\/E)\.?[\s.]/i;

// Time-of-day suffix ("... - DAY", "... — NIGHT"), another heading signal.
const TIME_SUFFIX_RE =
  /[-–—]\s*(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|AFTERNOON|CONTINUOUS|LATER|MOMENTS LATER|SUNSET|SUNRISE|MAGIC HOUR)\b/i;

function stripExtensions(line: string): string {
  const ext = new RegExp(`\\((?:\\s*(?:${EXTENSION_WORDS})\\s*)\\)`, "gi");
  return line
    .replace(ext, " ") // named extensions: (V.O.), (CONT'D)
    .replace(/\([^)]*\)/g, " ") // any other trailing parenthetical wryly
    .replace(/\*+/g, " ") // Fountain emphasis markers
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeHeading(line: string): boolean {
  return HEADING_RE.test(line) || TIME_SUFFIX_RE.test(line);
}

/**
 * Extract the cleaned character name from a line if (and only if) the line is a
 * character cue. Returns null when the line isn't a cue.
 *
 * A cue is a short, (essentially) all-caps name on its own line — tolerant of
 * dialogue extensions, scene numbers, and mixed-case particles like "McKAY" —
 * that is not a scene heading, transition, or editorial label.
 */
function cueName(rawLine: string): string | null {
  let line = rawLine.trim();
  if (!line) return null;

  // Cues never end with sentence punctuation or a colon (that's a transition or
  // an action sentence), and never contain a colon at all ("SUPER: 1985").
  if (/[.!?,;]$/.test(line) && !/\b[A-Z]\.$/.test(line)) return null;
  if (line.includes(":")) return null;

  if (looksLikeHeading(line)) return null;

  // Drop a leading dual-dialogue / list marker and any trailing speaker number.
  line = line.replace(/^[-•*\s]+/, "");

  const name = stripExtensions(line);
  if (!name) return null;

  const key = name.toUpperCase();
  if (NOT_A_CHARACTER.has(key)) return null;
  if (looksLikeHeading(name)) return null;

  // Must contain letters and be (almost) entirely upper-case. A couple of
  // lower-case letters are allowed for names like "McKAY" or "DeWITT".
  const letters = name.replace(/[^A-Za-z]/g, "");
  if (letters.length < 2) return null;
  const lower = (name.match(/[a-z]/g) ?? []).length;
  const upper = (name.match(/[A-Z]/g) ?? []).length;
  if (upper === 0) return null;
  if (lower > 2 || lower >= upper) return null;

  // Reasonable name shape: not a whole sentence.
  const words = name.split(/\s+/);
  if (words.length > 5 || name.length > 40) return null;

  // Reject lines that are mostly digits/symbols (e.g. "10." or "- - -").
  if (letters.length / name.replace(/\s/g, "").length < 0.4) return null;

  return name;
}

function isParenthetical(line: string): boolean {
  const t = line.trim();
  return t.startsWith("(") && t.endsWith(")");
}

/**
 * Detect the speaking characters in screenplay text.
 *
 * Scans the whole document (it does not require scene headings) and treats a
 * line as a character cue when it has the shape of a name AND is followed by
 * dialogue. Handles (V.O.)/(CONT'D)-style extensions, mixed-case names, scene
 * numbers, and Fountain "@" forced cues. Names are merged case-insensitively
 * and returned most-prominent first.
 */
export function parseCharactersFromScript(text: string): ParsedCharacter[] {
  const lines = text.split(/\r?\n/);
  const counts = new Map<string, number>();
  const display = new Map<string, string>();

  const record = (name: string) => {
    const key = name.toUpperCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!display.has(key)) display.set(key, name);
  };

  // Index of the next non-blank line at or after i.
  const nextNonBlank = (from: number): number => {
    for (let j = from; j < lines.length; j++) {
      if (lines[j].trim()) return j;
    }
    return -1;
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Fountain forces a character cue with a leading "@": "@McKAY".
    const forced = trimmed.startsWith("@");
    const candidate = forced ? trimmed.slice(1).trim() : trimmed;

    const name = forced
      ? candidate.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim() || null
      : cueName(candidate);
    if (!name) continue;

    // Confirm it's a cue by checking what follows: dialogue or a parenthetical,
    // not a blank line, a scene heading, or another cue. (Forced @cues skip the
    // check — the author marked them explicitly.)
    if (!forced) {
      const j = nextNonBlank(i + 1);
      if (j === -1) continue;
      const following = lines[j].trim();
      if (looksLikeHeading(following)) continue;
      // The next line being another cue means this was a stray caps line
      // (e.g. a stacked title), not a speaker — unless it's a parenthetical.
      if (!isParenthetical(following) && cueName(following)) continue;
    }

    record(name);
  }

  // Fallback: if the strict pass found nothing (e.g. a loosely-formatted
  // transcript), make a lenient second pass that accepts any name-shaped cue
  // without requiring a following dialogue line.
  if (counts.size === 0) {
    for (const raw of lines) {
      const name = cueName(raw);
      if (name) record(name);
    }
  }

  return [...counts.keys()]
    .map((key) => ({ name: display.get(key) as string, lines: counts.get(key) as number }))
    .sort((a, b) => b.lines - a.lines || a.name.localeCompare(b.name));
}
