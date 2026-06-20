import { db } from "@/lib/db";
import { scripts, scenes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";
import { parseScenesFromScript } from "@/lib/parse-scenes";

type Params = Promise<{ projectId: string }>;

// POST /api/projects/[projectId]/scenes/from-script
// Reads the project's saved script and creates scenes from its slug lines.
// Pure text parsing — no external service, no cost.
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

  const parsed = parseScenesFromScript(content);
  if (parsed.length === 0) {
    return Response.json(
      {
        error:
          "No scene headings found. Scenes are detected from slug lines like “INT. KITCHEN - DAY”.",
      },
      { status: 422 }
    );
  }

  const existing = await db.select().from(scenes).where(eq(scenes.projectId, access.id));
  let order = existing.length;

  const rows = parsed.map((s) => ({
    projectId: access.id,
    sceneNumber: s.sceneNumber,
    heading: s.heading,
    intExt: s.intExt || null,
    location: s.location || null,
    timeOfDay: s.timeOfDay || null,
    synopsis: s.synopsis || null,
    sortOrder: order++,
  }));

  const created = await db.insert(scenes).values(rows).returning();
  return Response.json({ scenes: created }, { status: 201 });
}
