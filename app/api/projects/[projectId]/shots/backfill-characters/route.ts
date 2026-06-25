import { db } from "@/lib/db";
import { shots, scripts, projectMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectManager } from "@/lib/project-access";
import { parseCharactersFromScript } from "@/lib/parse-characters";
import { namesInText } from "@/lib/match-names";

type Params = Promise<{ projectId: string }>;

// POST /api/projects/[projectId]/shots/backfill-characters
// Fills the Character field on existing shots that don't have one yet, by
// matching each shot's description against the project's known character names
// (parsed from the script + any cast characters). Lets shot lists built before
// the Character field still get tagged without deleting and regenerating.
export async function POST(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectManager(projectId);
  if (!access.ok) return access.response;
  const { id } = access;

  // Candidate names: speakers from the script + any cast member characters.
  const names = new Map<string, string>(); // UPPERCASE key -> display name
  const [script] = await db.select().from(scripts).where(eq(scripts.projectId, id));
  for (const c of parseCharactersFromScript(script?.content ?? "")) {
    const key = c.name.toUpperCase();
    if (c.name.length >= 2 && !names.has(key)) names.set(key, c.name);
  }
  const members = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));
  for (const m of members) {
    const ch = (m.character ?? "").trim();
    if (ch.length >= 2 && !names.has(ch.toUpperCase())) names.set(ch.toUpperCase(), ch);
  }
  const candidates = [...names.values()];

  const allShots = await db.select().from(shots).where(eq(shots.projectId, id));

  let updated = 0;
  if (candidates.length > 0) {
    for (const shot of allShots) {
      if ((shot.castNotes ?? "").trim()) continue; // don't overwrite existing
      const found = namesInText(shot.description ?? "", candidates);
      if (found.length) {
        await db.update(shots).set({ castNotes: found.join(", ") }).where(eq(shots.id, shot.id));
        updated += 1;
      }
    }
  }

  const refreshed = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, id))
    .orderBy(shots.sortOrder);
  return Response.json({ updated, shots: refreshed });
}
