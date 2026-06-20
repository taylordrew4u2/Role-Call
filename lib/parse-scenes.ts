export interface ParsedScene {
  sceneNumber: string;
  heading: string;
  intExt: string;
  location: string;
  timeOfDay: string;
  synopsis: string;
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
];

// A slug line: optional scene number, then INT/EXT, then the rest.
const SLUG =
  /^\s*([0-9]+[A-Za-z]?)?[.)]?\s*(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT\.?|EXT\.?|I\/E)\s+(.+)$/;

function normalizeIntExt(raw: string): string {
  const v = raw.toUpperCase().replace(/\./g, "");
  if (v === "INT/EXT" || v === "EXT/INT" || v === "I/E") return "INT/EXT";
  if (v === "EXT") return "EXT";
  return "INT";
}

/**
 * Parse screenplay text into scenes by detecting slug lines like
 * "INT. KITCHEN - DAY". Pure text parsing — no external services.
 */
export function parseScenesFromScript(text: string): ParsedScene[] {
  const lines = text.split(/\r?\n/);
  const scenes: ParsedScene[] = [];
  let auto = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const m = line.match(SLUG);
    if (!m) continue;

    const [, num, ie, rest] = m;
    // Split "LOCATION - TIME" on the last dash.
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

    // First following non-empty, non-slug line becomes the synopsis.
    let synopsis = "";
    for (let j = i + 1; j < lines.length; j++) {
      const next = lines[j].trim();
      if (!next) continue;
      if (next.match(SLUG)) break;
      synopsis = next.slice(0, 200);
      break;
    }

    auto += 1;
    scenes.push({
      sceneNumber: (num ?? String(auto)).trim(),
      heading: line.replace(/\s+/g, " "),
      intExt: normalizeIntExt(ie),
      location,
      timeOfDay: timeOfDay.replace(/[.)]$/, ""),
      synopsis,
    });
  }

  return scenes;
}
