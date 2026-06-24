import type { ParsedScene } from "./parse-scenes";
import { suggestShotFields } from "./suggest-shot";

export interface GeneratedShot {
  shotNumber: string;
  description: string;
  shotSize?: string;
  angle?: string;
  movement?: string;
  castNotes?: string;
}

// How shots are inferred from a scene:
//   "action"   — an establishing shot + one shot per action beat (default)
//   "dialogue" — an establishing shot + one coverage shot per line of dialogue
//   "both"     — establishing + action beats + dialogue coverage
export type ShotMode = "action" | "dialogue" | "both";

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

/** Trim a quoted line to a readable length for a shot description. */
function snippet(text: string, n = 60): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

/**
 * Build proper dialogue coverage for a scene instead of one repetitive shot per
 * line. Mirrors how a scene is really covered:
 *   • a master/two-shot establishing the exchange,
 *   • an over-the-shoulder single favoring each speaker,
 *   • a clean CU on each principal (anyone with more than one line).
 * Consecutive lines by the same person collapse into that person's coverage, so
 * a 20-line two-hander yields ~5 purposeful shots rather than 20 near-duplicates.
 */
function dialogueCoverage(scene: ParsedScene): Omit<GeneratedShot, "shotNumber">[] {
  const beats = scene.dialogue;
  if (!beats.length) return [];

  // Distinct speakers in order of first appearance, with line counts and a
  // representative (longest, most substantive) line each.
  const order: string[] = [];
  const count = new Map<string, number>();
  const rep = new Map<string, string>();
  for (const { character, text } of beats) {
    const c = character.replace(/\s+/g, " ").trim();
    if (!c) continue;
    if (!count.has(c)) order.push(c);
    count.set(c, (count.get(c) ?? 0) + 1);
    if ((text?.length ?? 0) > (rep.get(c)?.length ?? 0)) rep.set(c, text);
  }
  if (!order.length) return [];

  const quote = (c: string) => {
    const line = rep.get(c);
    return line ? ` — “${snippet(line)}”` : "";
  };
  const out: Omit<GeneratedShot, "shotNumber">[] = [];

  // Single speaker (monologue, phone call, to-camera): MS then CU.
  if (order.length === 1) {
    const c = order[0];
    out.push({
      description: `${c} — dialogue${quote(c)}`,
      shotSize: "MS",
      angle: "Eye-level",
      movement: "Static",
      castNotes: c,
    });
    out.push({
      description: `CU — ${c}`,
      shotSize: "CU",
      angle: "Eye-level",
      movement: "Static",
      castNotes: c,
    });
    return out;
  }

  // Master establishing the exchange (two-shot for a pair, wider for a group).
  out.push({
    description: `Dialogue master — ${order.join(" / ")}`,
    shotSize: order.length === 2 ? "MWS" : "WS",
    angle: "Eye-level",
    movement: "Static",
    castNotes: order.join(", "),
  });

  // Per speaker: an OTS single, plus a CU for principals (more than one line).
  for (const c of order) {
    out.push({
      description: `OTS favoring ${c}${quote(c)}`,
      shotSize: "OTS",
      angle: "Eye-level",
      movement: "Static",
      castNotes: c,
    });
    if ((count.get(c) ?? 0) >= 2) {
      out.push({
        description: `CU — ${c}`,
        shotSize: "CU",
        angle: "Eye-level",
        movement: "Static",
        castNotes: c,
      });
    }
  }

  return out;
}

/** Distinct speaking characters in a scene, in order of first appearance. */
function sceneCharacters(scene: ParsedScene): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const d of scene.dialogue) {
    const c = d.character.replace(/\s+/g, " ").trim();
    if (!c) continue;
    const key = c.toUpperCase();
    if (!seen.has(key)) {
      seen.add(key);
      order.push(c);
    }
  }
  return order;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Which of the scene's characters are named in a piece of text. Falls back to
 * everyone in the scene when none are explicitly mentioned, so every shot still
 * lists who's in it.
 */
function castFor(text: string, chars: string[]): string {
  if (chars.length === 0) return "";
  const named = chars.filter((c) => new RegExp(`\\b${escapeRegExp(c)}\\b`, "i").test(text));
  return (named.length ? named : chars).join(", ");
}

/**
 * Infer a shot list for a single scene. Always returns at least one shot (an
 * establishing shot), so converting a script never produces an empty scene —
 * it makes a best-effort guess rather than refusing.
 *
 * `mode` controls coverage: action beats, per-character dialogue, or both.
 */
export function buildShotsForScene(
  scene: ParsedScene,
  opts: { maxShots?: number; mode?: ShotMode } = {}
): GeneratedShot[] {
  const max = opts.maxShots ?? 40;
  const mode = opts.mode ?? "action";
  const shots: GeneratedShot[] = [];
  const numFor = () => `${scene.sceneNumber || ""}${shotLetter(shots.length)}`;

  // Everyone who appears in this scene — used to tag every shot with its cast.
  const chars = sceneCharacters(scene);
  const allCast = chars.join(", ");

  // 1) Establishing shot of the location (tagged with everyone in the scene).
  const place = scene.location || scene.heading;
  shots.push({
    shotNumber: numFor(),
    description: `Establishing — ${place}`.slice(0, 200),
    shotSize: establishingSize(scene.intExt),
    angle: scene.intExt === "EXT" ? "High" : "Eye-level",
    movement: "Static",
    castNotes: allCast || undefined,
  });

  // 2) Coverage shots per action beat, with inferred camera fields.
  if (mode === "action" || mode === "both") {
    const list = beats(scene.action);
    for (let i = 0; i < list.length && shots.length < max; i++) {
      const description = list[i];
      const guess = suggestShotFields(description);
      shots.push({
        shotNumber: numFor(),
        description: description.slice(0, 200),
        // Fall back to a medium shot when nothing specific is implied.
        shotSize: guess.shotSize ?? "MS",
        angle: guess.angle ?? "Eye-level",
        movement: guess.movement ?? "Static",
        castNotes: castFor(description, chars) || undefined,
      });
    }
  }

  // 3) Proper dialogue coverage: master + OTS singles + CUs on principals.
  if (mode === "dialogue" || mode === "both") {
    for (const cov of dialogueCoverage(scene)) {
      if (shots.length >= max) break;
      shots.push({ shotNumber: numFor(), ...cov, description: cov.description.slice(0, 200) });
    }
  }

  return shots;
}

/** Infer a full shot list across every parsed scene, grouped by scene index. */
export function buildShotsForScenes(
  scenes: ParsedScene[],
  opts: { maxShotsPerScene?: number; mode?: ShotMode } = {}
): GeneratedShot[][] {
  return scenes.map((s) =>
    buildShotsForScene(s, { maxShots: opts.maxShotsPerScene, mode: opts.mode })
  );
}
