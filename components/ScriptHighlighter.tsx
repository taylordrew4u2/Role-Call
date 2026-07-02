"use client";

import { useState, useMemo } from "react";
import { parseCharactersFromScript } from "@/lib/parse-characters";
import { cn } from "@/lib/utils";

interface CastMember {
  displayName: string;
  character: string | null;
}

const EXTENSION_RE =
  /\s*\((?:V\.?O\.?|O\.?S\.?|O\.?C\.?|CONT'?D|CONTINUED|FILTERED|INTO PHONE|ON PHONE|OFF|VOICE|MORE)\)/gi;

function normalizeCue(line: string): string {
  return line.trim().replace(EXTENSION_RE, "").trim().toUpperCase();
}

const HEADING_RE =
  /^\s*(?:[0-9]+[A-Za-z]?[.)]?\s*)?(?:INT|EXT|EST|INT\.?\/EXT|EXT\.?\/INT|I\/E)\.?[\s.]/i;
const TRANSITION_RE =
  /^(?:CUT|SMASH CUT|DISSOLVE|FADE (?:IN|OUT|TO)|WIPE|BACK TO|MATCH CUT)\b.*:?\s*$/i;

type ElementType = "scene" | "transition" | "character" | "parenthetical" | "dialogue" | "action" | "blank";

function detectElementType(raw: string, knownNames: Set<string>): ElementType {
  if (!raw.trim()) return "blank";
  const trimmed = raw.trim();
  if (HEADING_RE.test(trimmed)) return "scene";
  if (TRANSITION_RE.test(trimmed)) return "transition";
  // Character cue: heavily indented or known speaker name
  const norm = normalizeCue(trimmed);
  if (knownNames.has(norm)) return "character";
  // Parenthetical only when indented — standalone (beat) in action stays as action
  const leadingSpaces = raw.length - raw.trimStart().length;
  if (leadingSpaces >= 4 && trimmed.startsWith("(") && trimmed.endsWith(")")) return "parenthetical";
  // Dialogue: moderately indented (8+ leading spaces) but not a character cue
  if (leadingSpaces >= 8) return "dialogue";
  return "action";
}

interface ScriptLine {
  raw: string;
  speaker: string | null;
  inBlock: boolean;
  elementType: ElementType;
}

function parseLines(text: string, knownNames: Set<string>): ScriptLine[] {
  const rawLines = text.split(/\r?\n/);
  const result: ScriptLine[] = [];
  let currentSpeaker: string | null = null;
  let afterCue = false;

  for (const raw of rawLines) {
    const trimmed = raw.trim();

    if (!trimmed) {
      currentSpeaker = null;
      afterCue = false;
      result.push({ raw, speaker: null, inBlock: false, elementType: "blank" });
      continue;
    }

    if (HEADING_RE.test(trimmed) || TRANSITION_RE.test(trimmed)) {
      currentSpeaker = null;
      afterCue = false;
      const elementType = HEADING_RE.test(trimmed) ? "scene" : "transition";
      result.push({ raw, speaker: null, inBlock: false, elementType });
      continue;
    }

    const norm = normalizeCue(trimmed);
    const isCue = knownNames.has(norm);

    if (isCue) {
      currentSpeaker = norm;
      afterCue = true;
      result.push({ raw, speaker: norm, inBlock: true, elementType: "character" });
      continue;
    }

    const isParen = trimmed.startsWith("(") && trimmed.endsWith(")");
    if (currentSpeaker && (afterCue || isParen)) {
      afterCue = false;
      result.push({ raw, speaker: null, inBlock: true, elementType: isParen ? "parenthetical" : "dialogue" });
      continue;
    }

    if (currentSpeaker) {
      afterCue = false;
      result.push({ raw, speaker: null, inBlock: true, elementType: "dialogue" });
      continue;
    }

    result.push({ raw, speaker: null, inBlock: false, elementType: detectElementType(raw, knownNames) });
  }

  return result;
}

const HIGHLIGHT_COLORS = [
  "bg-yellow-100 border-l-4 border-yellow-400",
  "bg-sky-100 border-l-4 border-sky-400",
  "bg-emerald-100 border-l-4 border-emerald-400",
  "bg-pink-100 border-l-4 border-pink-400",
  "bg-violet-100 border-l-4 border-violet-400",
  "bg-orange-100 border-l-4 border-orange-400",
  "bg-teal-100 border-l-4 border-teal-400",
  "bg-rose-100 border-l-4 border-rose-400",
];

// The raw text already carries the screenplay layout (indentation for cues,
// dialogue, parentheticals; right offset for transitions) — render it as-is,
// exactly like the editor page, and only add emphasis where it helps.
function elementClass(type: ElementType): string {
  switch (type) {
    case "scene":
      return "font-bold text-slate-900";
    case "transition":
      return "text-slate-700";
    case "character":
      return "font-medium text-slate-900";
    case "parenthetical":
      return "text-slate-600";
    case "dialogue":
      return "text-slate-900";
    case "action":
      return "text-slate-800";
    case "blank":
      return "";
  }
}

export function ScriptHighlighter({
  content,
  cast,
}: {
  content: string;
  cast: CastMember[];
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const detected = useMemo(
    () => parseCharactersFromScript(content),
    [content]
  );

  const knownNames = useMemo(
    () => new Set(detected.map((c) => c.name.toUpperCase())),
    [detected]
  );

  const colorMap = useMemo(() => {
    const m = new Map<string, number>();
    detected.forEach((c, i) => m.set(c.name.toUpperCase(), i % HIGHLIGHT_COLORS.length));
    return m;
  }, [detected]);

  const realNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cast) {
      if (c.character) {
        m.set(c.character.toUpperCase(), c.displayName);
      }
    }
    return m;
  }, [cast]);

  const lines = useMemo(
    () => parseLines(content, knownNames),
    [content, knownNames]
  );

  if (!content.trim()) {
    return (
      <p className="text-sm text-slate-400 italic text-center py-16">
        No script yet.
      </p>
    );
  }

  const selectedNorm = selected?.toUpperCase() ?? null;
  const selectedColor = selectedNorm != null ? colorMap.get(selectedNorm) ?? 0 : 0;

  return (
    <div className="space-y-4">
      {/* Character pills */}
      {detected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {detected.map((char, i) => {
            const norm = char.name.toUpperCase();
            const isActive = selectedNorm === norm;
            const colorIdx = i % HIGHLIGHT_COLORS.length;
            const realName = realNames.get(norm);
            return (
              <button
                key={char.name}
                onClick={() => setSelected(isActive ? null : char.name)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium border transition-all",
                  isActive
                    ? cn(
                        "shadow-sm",
                        colorIdx === 0 && "bg-yellow-200 border-yellow-500 text-yellow-900",
                        colorIdx === 1 && "bg-sky-200 border-sky-500 text-sky-900",
                        colorIdx === 2 && "bg-emerald-200 border-emerald-500 text-emerald-900",
                        colorIdx === 3 && "bg-pink-200 border-pink-500 text-pink-900",
                        colorIdx === 4 && "bg-violet-200 border-violet-500 text-violet-900",
                        colorIdx === 5 && "bg-orange-200 border-orange-500 text-orange-900",
                        colorIdx === 6 && "bg-teal-200 border-teal-500 text-teal-900",
                        colorIdx === 7 && "bg-rose-200 border-rose-500 text-rose-900"
                      )
                    : "bg-white border-slate-300 text-slate-600 hover:border-slate-500 hover:text-slate-900"
                )}
              >
                {realName ? (
                  <>
                    <span>{realName}</span>
                    <span className="opacity-60 ml-1">({char.name})</span>
                  </>
                ) : (
                  char.name
                )}
              </button>
            );
          })}
          {selected && (
            <button
              onClick={() => setSelected(null)}
              className="rounded-full px-3 py-1 text-xs font-medium border border-dashed border-slate-300 text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Script page — same size and page style as the editor */}
      <div className="rounded-lg bg-slate-300 py-6 px-4 min-h-[70vh]">
        <div
          className="bg-white shadow-md mx-auto max-w-[680px] min-h-[64vh]"
          style={{
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: "12pt",
            lineHeight: "1.7",
            padding: "72px 64px",
          }}
        >
          {lines.map((line, idx) => {
            const isHighlighted =
              selectedNorm !== null &&
              line.inBlock &&
              (line.speaker === selectedNorm ||
                (line.speaker === null && isInSelectedBlock(lines, idx, selectedNorm)));

            return (
              <div
                key={idx}
                className={cn(
                  "whitespace-pre-wrap break-words",
                  elementClass(line.elementType),
                  isHighlighted && HIGHLIGHT_COLORS[selectedColor]
                )}
              >
                {line.raw || " "}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function isInSelectedBlock(
  lines: ScriptLine[],
  idx: number,
  selectedNorm: string
): boolean {
  for (let i = idx - 1; i >= 0; i--) {
    const l = lines[i];
    if (!l.inBlock) return false;
    if (l.speaker !== null) return l.speaker === selectedNorm;
    if (l.raw.trim() === "") return false;
  }
  return false;
}
