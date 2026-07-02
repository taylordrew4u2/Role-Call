import { db } from "@/lib/db";
import { scripts, shootDays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectDirector } from "@/lib/project-access";
import { parseScenesFromScript } from "@/lib/parse-scenes";
import { ensureCallSheetSchema } from "@/lib/db/ensure-call-sheet-schema";

type Params = Promise<{ projectId: string }>;

// POST /api/projects/[projectId]/locations/from-script — reads the saved
// script, pulls unique scene locations, and creates a shoot day placeholder
// for each one not already represented (matched case-insensitively).
export async function POST(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectDirector(projectId);
  if (!access.ok) return access.response;
  const { id } = access;

  await ensureCallSheetSchema();

  const [script] = await db.select().from(scripts).where(eq(scripts.projectId, id));
  const content = script?.content ?? "";
  if (!content.trim()) {
    return Response.json(
      { error: "No script text found. Add a script on the Script tab first." },
      { status: 400 }
    );
  }

  const parsed = parseScenesFromScript(content);
  const uniqueLocations = new Map<string, string>(); // lowercase -> display
  for (const scene of parsed) {
    const loc = scene.location?.trim();
    if (loc && !uniqueLocations.has(loc.toLowerCase())) {
      uniqueLocations.set(loc.toLowerCase(), loc);
    }
  }

  if (uniqueLocations.size === 0) {
    return Response.json(
      { error: "No scene locations found in the script." },
      { status: 400 }
    );
  }

  const existing = await db.select().from(shootDays).where(eq(shootDays.projectId, id));
  const existingLocations = new Set(
    existing.map((d) => (d.location ?? "").trim().toLowerCase()).filter(Boolean)
  );

  const toCreate = [...uniqueLocations.values()].filter(
    (loc) => !existingLocations.has(loc.toLowerCase())
  );

  if (toCreate.length === 0) {
    return Response.json({ created: [], skipped: uniqueLocations.size });
  }

  let sortOrder = existing.length;
  let dayNumber = existing.length + 1;
  const rows = toCreate.map((location) => ({
    projectId: id,
    dayNumber: dayNumber++,
    location,
    sortOrder: sortOrder++,
  }));

  const created = await db.insert(shootDays).values(rows).returning();
  return Response.json(
    { created, skipped: uniqueLocations.size - toCreate.length },
    { status: 201 }
  );
}
