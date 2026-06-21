import type { ParsedScene } from "./parse-scenes";
import { suggestShotFields } from "./suggest-shot";

export interface GeneratedShot {
  shotNumber: string;
  description: string;
  shotSize?: string;
  angle?: string;
  movement?: string;
}

// Letters used to number shots within a scene: A, B, C … Z, AA, AB …
function shotLetter(index: number): string {
  let n = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
}

// Lines that are clearly not action beats (character cues, parentheticals,
// transitions). We still keep dialogue as coverage but skip pure cues.
const TRANSITION = /\b(CUT TO|FADE (IN|OUT)|DISSOLVE TO|SMASH CUT|MATCH CUT)\b[:.]?/i;
const PARENTHETICAL = /^\(.*\)$/;

// A short ALL-CAPS line on its own is usually a character cue (e.g. "JOHN").
function isCharacterCue(line: string): boolean {
  const compact = line.replace(/\(.*\)/, "").trim();
  if (!compact) return false;
  if (compact !== compact.toUpperCase()) return false;
  return compact.split(/\s+/).length <= 3 && compact.length <= 24;
}

// Break a block of action text into individual beats (sentences), so each
// distinct piece of action becomes its own shot.
function beats(action: string[]): string[] {
  const out: string[] = [];
  for (const raw of action) {
    const line = raw.trim();
    if (!line) continue;
    if (TRANSITION.test(line)) continue;
    if (PARENTHETICAL.test(line)) continue;
    if (isCharacterCue(line)) continue;

    // Split on sentence boundaries but keep it readable.
    const parts = line
      .split(/(?<=[.!?])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    for (const p of parts) out.push(p);
  }
  return out;
}

/** A sensible establishing shot for a scene based on INT/EXT. */
function establishingSize(intExt: string): string {
  if (intExt === "EXT") return "EWS";
  return "WS";
}

/**
 * Infer a shot list for a single scene. Always returns at least one shot (an
 * establishing shot), so converting a script never produces an empty scene —
 * it makes a best-effort guess rather than refusing.
 */
export function buildShotsForScene(
  scene: ParsedScene,
  opts: { maxShots?: number } = {}
): GeneratedShot[] {
  const max = opts.maxShots ?? 24;
  const shots: GeneratedShot[] = [];
  const numFor = (i: number) => `${scene.sceneNumber || ""}${shotLetter(i)}`;

  // 1) Establishing shot of the location.
  const place = scene.location || scene.heading;
  shots.push({
    shotNumber: numFor(0),
    description: `Establishing — ${place}`.slice(0, 200),
    shotSize: establishingSize(scene.intExt),
    angle: scene.intExt === "EXT" ? "High" : "Eye-level",
    movement: "Static",
  });

  // 2) One coverage shot per action beat, with inferred camera fields.
  const list = beats(scene.action);
  for (let i = 0; i < list.length && shots.length < max; i++) {
    const description = list[i];
    const guess = suggestShotFields(description);
    shots.push({
      shotNumber: numFor(shots.length),
      description: description.slice(0, 200),
      // Fall back to a medium shot when nothing specific is implied.
      shotSize: guess.shotSize ?? "MS",
      angle: guess.angle ?? "Eye-level",
      movement: guess.movement ?? "Static",
    });
  }

  return shots;
}

/** Infer a full shot list across every parsed scene, grouped by scene index. */
export function buildShotsForScenes(
  scenes: ParsedScene[],
  opts: { maxShotsPerScene?: number } = {}
): GeneratedShot[][] {
  return scenes.map((s) =>
    buildShotsForScene(s, { maxShots: opts.maxShotsPerScene })
  );
}
