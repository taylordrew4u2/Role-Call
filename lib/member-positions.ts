const VALID_POSITIONS = ["owner", "director", "writer"] as const;
export type CrewPosition = (typeof VALID_POSITIONS)[number];

export function memberEffectivePositions(m: {
  positions?: string[] | null;
  position?: string | null;
}): CrewPosition[] {
  const arr = (m.positions as string[] | null) ?? [];
  const valid = arr.filter((p): p is CrewPosition =>
    (VALID_POSITIONS as readonly string[]).includes(p)
  );
  if (valid.length) return valid;
  if (m.position && (VALID_POSITIONS as readonly string[]).includes(m.position))
    return [m.position as CrewPosition];
  return [];
}
