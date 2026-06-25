// Shared helpers for matching character names inside free text (shot
// descriptions, action lines). Used by both shot generation and the
// character-backfill route so the matching logic stays in one place.

/** Escape a string for safe use inside a RegExp. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Return the subset of `names` that appear as whole words in `text` (case-insensitive). */
export function namesInText(text: string, names: string[]): string[] {
  return names.filter((name) =>
    new RegExp(`\\b${escapeRegExp(name)}\\b`, "i").test(text)
  );
}
