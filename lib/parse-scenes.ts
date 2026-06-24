export interface DialogueBeat {
  character: string;
  text: string;
}

export interface ParsedScene {
  sceneNumber: string;
  heading: string;
  intExt: string;
  location: string;
  timeOfDay: string;
  synopsis: string;
  /** Action / description lines that belong to this scene, used to infer shots. */
  action: string[];
  /** Dialogue beats (character + line) for per-character coverage shots. */
  dialogue: DialogueBeat[];
}

const TIME_WORDS = [
  "DAY",
  "NIGHT",
  "DAWN",
  "DUSK",
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "CONTINUOUS",
  "LATER",
  "MOMENTS LATER",
  "SAME",
  "SUNSET",
  "SUNRISE",
  "NOON",
  "MIDNIGHT",
  "MAGIC HOUR",
];

// Words that strongly imply an exterior even without an INT/EXT prefix.
const EXTERIOR_HINTS =
  /\b(STREET|ROAD|HIGHWAY|PARK|FOREST|WOODS|BEACH|FIELD|MOUNTAIN|ROOFTOP|ALLEY|YARD|GARDEN|PARKING|SIDEWALK|BRIDGE|RIVER|LAKE|OCEAN|DESERT|CITY|TOWN|EXTERIOR|OUTSIDE|OUTDOOR)\b/;
const INTERIOR_HINTS =
  /\b(ROOM|KITCHEN|OFFICE|HOUSE|APARTMENT|BEDROOM|BATHROOM|HALLWAY|LOBBY|BAR|RESTAURANT|CAR|INTERIOR|INSIDE|INDOOR|HOSPITAL|CLASSROOM|STORE|SHOP|BASEMENT|ATTIC|GARAGE)\b/;

// A slug line: optional scene number, then INT/EXT, then the rest.
const SLUG =
  /^\s*([0-9]+[A-Za-z]?)?[.)]?\s*(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|I\/E)\s+(.+)$/;

// "SCENE 1", "SCENE 1 - ...", "SC 1" style numbered headings without INT/EXT.
const SCENE_MARKER = /^\s*(?:SCENE|SC\.?)\s+([0-9]+[A-Za-z]?)\b[.):-]?\s*(.*)$/i;

function normalizeIntExt(raw: string): string {
  const v = raw.toUpperCase().replace(/\./g, "");
  if (v === "INT/EXT" || v === "EXT/INT" || v === "I/E") return "INT/EXT";
  if (v === "EXT") return "EXT";
  return "INT";
}

/** Split "LOCATION - TIME" on the last dash, inferring the time-of-day. */
function splitLocationTime(rest: string): { location: string; timeOfDay: string } {
  let location = rest.trim();
  let timeOfDay = "";
  const dash = Math.max(
    rest.lastIndexOf(" - "),
    rest.lastIndexOf(" – "),
    rest.lastIndexOf(" — ")
  );
  if (dash !== -1) {
    const tail = rest.slice(dash + 3).trim();
    const tailUpper = tail.toUpperCase();
    if (TIME_WORDS.some((t) => tailUpper.startsWith(t)) || tail.length <= 18) {
      location = rest.slice(0, dash).trim();
      timeOfDay = tail;
    }
  }
  return { location, timeOfDay: timeOfDay.replace(/[.)]$/, "") };
}

/** Guess INT vs EXT from the location text when there's no explicit prefix. */
function inferIntExt(text: string): string {
  const u = text.toUpperCase();
  if (EXTERIOR_HINTS.test(u)) return "EXT";
  if (INTERIOR_HINTS.test(u)) return "INT";
  return "";
}

interface HeadingMatch {
  sceneNumber: string;
  heading: string;
  intExt: string;
  location: string;
  timeOfDay: string;
}

/**
 * Try to read a single line as a scene heading using progressively looser
 * rules. Returns null only when the line clearly isn't a heading (so the
 * caller can treat it as action).
 */
function matchHeading(line: string): HeadingMatch | null {
  // 1) Proper slug line: "INT. KITCHEN - DAY"
  const slug = line.match(SLUG);
  if (slug) {
    const [, num, ie, rest] = slug;
    const { location, timeOfDay } = splitLocationTime(rest);
    return {
      sceneNumber: (num ?? "").trim(),
      heading: line.replace(/\s+/g, " "),
      intExt: normalizeIntExt(ie),
      location,
      timeOfDay,
    };
  }

  // 2) "SCENE 1 - LOCATION" marker without INT/EXT.
  const marker = line.match(SCENE_MARKER);
  if (marker) {
    const [, num] = marker;
    // Strip any leading separator left after the scene number ("- ", ": ", …).
    const rest = marker[2].replace(/^[\s\-–—:.]+/, "");
    const { location, timeOfDay } = splitLocationTime(rest);
    return {
      sceneNumber: num.trim(),
      heading: line.replace(/\s+/g, " "),
      intExt: inferIntExt(rest),
      location: location || rest.trim(),
      timeOfDay,
    };
  }

  // 3) Loose ALL-CAPS heading like "KITCHEN - DAY" or "ROOFTOP - NIGHT".
  //    Require a time word or a dash so we don't mistake a character cue
  //    ("JOHN") for a scene heading.
  const letters = line.replace(/[^A-Za-z]/g, "");
  const isUpper = letters.length > 0 && line === line.toUpperCase();
  const hasDash = /\s[-–—]\s/.test(line);
  const upper = line.toUpperCase();
  const endsWithTime = TIME_WORDS.some((t) => upper.endsWith(t));
  if (isUpper && line.length <= 60 && (hasDash || endsWithTime)) {
    const { location, timeOfDay } = splitLocationTime(line);
    return {
      sceneNumber: "",
      heading: line.replace(/\s+/g, " "),
      intExt: inferIntExt(line),
      location,
      timeOfDay,
    };
  }

  return null;
}

/** Build scenes by chunking on blank lines when no headings can be detected. */
function chunkFallback(lines: string[]): ParsedScene[] {
  const paragraphs: string[][] = [];
  let current: string[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (current.length) paragraphs.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) paragraphs.push(current);

  if (paragraphs.length === 0) return [];

  return paragraphs.map((para, i) => {
    const first = para[0];
    const { location, timeOfDay } = splitLocationTime(first);
    return {
      sceneNumber: String(i + 1),
      heading: first.slice(0, 80),
      intExt: inferIntExt(para.join(" ")),
      location: location.slice(0, 80),
      timeOfDay,
      synopsis: para.join(" ").slice(0, 200),
      action: para,
      dialogue: [],
    };
  });
}

// A character cue is a short ALL-CAPS line introducing dialogue, e.g. "JOHN"
// or "MARY (CONT'D)". It never ends with sentence punctuation, which keeps
// action shouts like "BANG!" or labels like "SUPER:" from being mistaken for
// a speaker.
function isCharacterCue(line: string): boolean {
  const compact = line.replace(/\(.*?\)/g, "").trim();
  if (!compact) return false;
  if (compact !== compact.toUpperCase()) return false;
  if (!/[A-Z]/.test(compact)) return false;
  if (/[.!?:,]$/.test(compact)) return false;
  return compact.split(/\s+/).length <= 4 && compact.length <= 30;
}

function cueName(line: string): string {
  return line.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
}

// Strip leading/trailing parenthetical wrylies from a dialogue line.
function stripWrylies(line: string): string {
  return line
    .replace(/^\(.*?\)\s*/, "")
    .replace(/\s*\(.*?\)$/, "")
    .trim();
}

// Transitions in a slug-less script — ignored rather than turned into scenes.
const FALLBACK_TRANSITION =
  /^(?:CUT|SMASH CUT|MATCH CUT|HARD CUT|QUICK CUT|JUMP CUT|TIME CUT|DISSOLVE|FADE (?:IN|OUT|TO)|WIPE|BACK TO)\b.*:?$/i;

// A section header in a slug-less script: a non-cue line ending with ":" that
// introduces a block, e.g. "GREGGO GETS ON ZOOM:".
function isSectionHeader(line: string): boolean {
  if (!line.endsWith(":")) return false;
  if (isCharacterCue(line)) return false;
  if (FALLBACK_TRANSITION.test(line)) return false;
  return line.length <= 80;
}

/**
 * Fallback for scripts with no INT/EXT slug lines (e.g. Zoom-call or
 * stage-style scripts). Unlike plain paragraph chunking, this recognises
 * character cues and captures their dialogue, and treats "LABEL:" lines as
 * section headers — so a dialogue-only script still yields cast-tagged coverage
 * instead of a pile of empty establishing shots.
 *
 * Returns null when there's nothing dialogue-like to find, so the caller can
 * fall back to paragraph chunking for pure prose.
 */
function dialogueAwareFallback(lines: string[]): ParsedScene[] | null {
  const scenes: ParsedScene[] = [];
  let current: ParsedScene | null = null;
  let speaker: string | null = null;
  let auto = 0;
  let sawDialogue = false;
  let sawSection = false;

  const startScene = (heading: string) => {
    auto += 1;
    const { location, timeOfDay } = splitLocationTime(heading);
    current = {
      sceneNumber: String(auto),
      heading: heading.slice(0, 80),
      intExt: inferIntExt(heading),
      location: (location || heading).slice(0, 80),
      timeOfDay,
      synopsis: "",
      action: [],
      dialogue: [],
    };
    scenes.push(current);
    speaker = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      speaker = null;
      continue;
    }

    if (FALLBACK_TRANSITION.test(line)) {
      speaker = null;
      continue;
    }

    if (isSectionHeader(line)) {
      sawSection = true;
      startScene(line);
      continue;
    }

    if (!current) startScene("Scene 1");

    if (isCharacterCue(line)) {
      speaker = cueName(line);
      continue;
    }

    if (speaker) {
      const spoken = stripWrylies(line);
      if (spoken) {
        current!.dialogue.push({ character: speaker, text: spoken });
        sawDialogue = true;
      }
      continue;
    }

    if (!current!.synopsis) current!.synopsis = line.slice(0, 200);
    current!.action.push(line);
  }

  if (!sawDialogue && !sawSection) return null;
  return scenes;
}

/**
 * Parse screenplay text into scenes. Designed to always return at least one
 * scene whenever the input contains any text — it falls back from strict
 * slug lines to looser headings to plain paragraph chunking, inferring as much
 * structure as it can rather than refusing to parse.
 */
export function parseScenesFromScript(text: string): ParsedScene[] {
  const lines = text.split(/\r?\n/);
  const scenes: ParsedScene[] = [];
  let auto = 0;
  let current: ParsedScene | null = null;
  // Tracks the speaker while we're inside a dialogue block; a blank line, a new
  // heading, or a new cue ends the block.
  let speaker: string | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      speaker = null;
      continue;
    }

    const head = matchHeading(line);
    if (head) {
      auto += 1;
      speaker = null;
      current = {
        sceneNumber: head.sceneNumber || String(auto),
        heading: head.heading,
        intExt: head.intExt,
        location: head.location,
        timeOfDay: head.timeOfDay,
        synopsis: "",
        action: [],
        dialogue: [],
      };
      scenes.push(current);
      continue;
    }

    if (!current) continue;

    // A new character cue starts (or switches) a dialogue block.
    if (isCharacterCue(line)) {
      speaker = cueName(line);
      continue;
    }

    // Lines under an active speaker are that character's dialogue.
    if (speaker) {
      const spoken = stripWrylies(line);
      if (spoken) current.dialogue.push({ character: speaker, text: spoken });
      continue;
    }

    // Otherwise it's plain action / description.
    if (!current.synopsis) current.synopsis = line.slice(0, 200);
    current.action.push(line);
  }

  if (scenes.length > 0) return scenes;

  // No slug headings. Try a dialogue-aware pass first (captures speakers and
  // dialogue from Zoom/stage-style scripts), then fall back to paragraph
  // chunking for pure prose.
  return dialogueAwareFallback(lines) ?? chunkFallback(lines);
}
