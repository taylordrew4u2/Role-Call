// Plain-text screenplay formatting used by the editing toolbar. Storage equals
// display (a monospace textarea), and the scene/shot parser trims leading
// whitespace, so light indentation here is purely visual and safe to parse.

export type ScreenplayElement =
  | "scene"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition";

const CHARACTER_INDENT = " ".repeat(20);
const PARENTHETICAL_INDENT = " ".repeat(15);
const DIALOGUE_INDENT = " ".repeat(10);

/** Transform a single line into the chosen screenplay element. */
export function formatLine(line: string, element: ScreenplayElement): string {
  const bare = line.trim();
  switch (element) {
    case "scene":
      return bare.toUpperCase();
    case "action":
      return bare; // left-aligned, original case
    case "character":
      return bare ? CHARACTER_INDENT + bare.toUpperCase() : bare;
    case "parenthetical": {
      const inner = bare.replace(/^\(+/, "").replace(/\)+$/, "").trim();
      return inner ? `${PARENTHETICAL_INDENT}(${inner})` : `${PARENTHETICAL_INDENT}()`;
    }
    case "dialogue":
      return bare ? DIALOGUE_INDENT + bare : bare;
    case "transition": {
      const up = bare.toUpperCase();
      return up;
    }
  }
}

export const ELEMENT_LABELS: Record<ScreenplayElement, string> = {
  scene: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
};

/**
 * Apply an element format to every line that the selection touches.
 * Returns the new text plus the selection range to restore afterward.
 */
export function applyElement(
  text: string,
  selStart: number,
  selEnd: number,
  element: ScreenplayElement
): { text: string; selStart: number; selEnd: number } {
  // Expand the selection to whole lines.
  const lineStart = text.lastIndexOf("\n", selStart - 1) + 1;
  let lineEnd = text.indexOf("\n", selEnd);
  if (lineEnd === -1) lineEnd = text.length;

  const before = text.slice(0, lineStart);
  const target = text.slice(lineStart, lineEnd);
  const after = text.slice(lineEnd);

  const formatted = target
    .split("\n")
    .map((l) => formatLine(l, element))
    .join("\n");

  const nextText = before + formatted + after;
  return {
    text: nextText,
    selStart: lineStart,
    selEnd: lineStart + formatted.length,
  };
}

/** Insert a blank scene-heading template at the cursor on its own line. */
export function insertSceneTemplate(
  text: string,
  cursor: number
): { text: string; selStart: number; selEnd: number } {
  const atLineStart = cursor === 0 || text[cursor - 1] === "\n";
  const template = "INT. LOCATION - DAY";
  const prefix = atLineStart ? "" : "\n";
  const insert = `${prefix}${template}\n`;
  const nextText = text.slice(0, cursor) + insert + text.slice(cursor);
  // Select the word "LOCATION" so the writer can type over it.
  const locStart = cursor + prefix.length + "INT. ".length;
  return {
    text: nextText,
    selStart: locStart,
    selEnd: locStart + "LOCATION".length,
  };
}
