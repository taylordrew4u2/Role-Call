import { db } from "@/lib/db";
import { scripts, projectMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";
import { parseCharactersFromScript } from "@/lib/parse-characters";

type Params = Promise<{ projectId: string }>;

// POST /api/projects/[projectId]/cast/from-script
// Reads the project's saved script, detects the speaking characters, and adds a
// cast entry for each one with the character set but the actor left blank, so
// the owner can fill in who plays each role. Characters already in the cast are
// skipped, so it's safe to run more than once.
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  let content: string = (body?.content ?? "").toString();
  if (!content.trim()) {
    const [script] = await db
      .select()
      .from(scripts)
      .where(eq(scripts.projectId, access.id));
    content = script?.content ?? "";
  }
  if (!content.trim()) {
    return Response.json(
      { error: "No script text found. Add a script on the Script tab first." },
      { status: 400 }
    );
  }

  const characters = parseCharactersFromScript(content);
  if (characters.length === 0) {
    return Response.json(
      {
        error:
          "No characters detected. Put each speaker's name on its own line in CAPS, the way screenplay dialogue cues are written.",
      },
      { status: 400 }
    );
  }

  // Skip characters already present in the cast (match on character name).
  const existing = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, access.id));
  const existingChars = new Set(
    existing
      .filter((m) => m.kind === "cast")
      .map((m) => (m.character ?? "").trim().toUpperCase())
  );

  const toCreate = characters.filter(
    (c) => !existingChars.has(c.name.toUpperCase())
  );
  if (toCreate.length === 0) {
    return Response.json(
      { created: [], skipped: characters.length },
      { status: 200 }
    );
  }

  const rows = toCreate.map((c) => ({
    projectId: access.id,
    kind: "cast" as const,
    character: c.name,
    displayName: "", // actor not yet assigned — owner fills this in
    status: "invited" as const,
  }));

  const created = await db.insert(projectMembers).values(rows).returning();
  return Response.json(
    { created, skipped: characters.length - toCreate.length },
    { status: 201 }
  );
}
