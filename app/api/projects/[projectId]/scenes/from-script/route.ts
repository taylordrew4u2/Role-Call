import { db } from "@/lib/db";
import { scripts, scenes, shots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectDirector } from "@/lib/project-access";
import { parseScenesFromScript } from "@/lib/parse-scenes";
import { buildShotsForScene, type ShotMode } from "@/lib/script-to-shots";

type Params = Promise<{ projectId: string }>;

// POST /api/projects/[projectId]/scenes/from-script
// Reads the project's saved script, infers scenes, and generates a starter
// shot list for each scene. Pure text parsing — no external service, no cost.
// It always produces something usable when a script exists rather than
// refusing on imperfectly formatted text.
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectDirector(projectId);
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => ({}));
  const mode: ShotMode =
    body?.mode === "dialogue" || body?.mode === "both" ? body.mode : "action";
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

  // parseScenesFromScript always returns at least one scene for any non-empty
  // text, so there's no "couldn't read it" path here.
  const parsed = parseScenesFromScript(content);

  const existingScenes = await db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, access.id));
  let sceneOrder = existingScenes.length;

  const sceneRows = parsed.map((s) => ({
    projectId: access.id,
    sceneNumber: s.sceneNumber,
    heading: s.heading,
    intExt: s.intExt || null,
    location: s.location || null,
    timeOfDay: s.timeOfDay || null,
    synopsis: s.synopsis || null,
    sortOrder: sceneOrder++,
  }));

  const createdScenes = await db.insert(scenes).values(sceneRows).returning();

  // Generate an inferred shot list per scene and link it to the new scenes.
  const existingShots = await db
    .select()
    .from(shots)
    .where(eq(shots.projectId, access.id));
  let shotOrder = existingShots.length;

  const shotRows = createdScenes.flatMap((scene, i) =>
    buildShotsForScene(parsed[i], { mode }).map((shot) => ({
      projectId: access.id,
      sceneId: scene.id,
      shotNumber: shot.shotNumber,
      description: shot.description,
      shotSize: shot.shotSize || null,
      angle: shot.angle || null,
      movement: shot.movement || null,
      castNotes: shot.castNotes || null,
      status: "planned",
      sortOrder: shotOrder++,
    }))
  );

  const createdShots = shotRows.length
    ? await db.insert(shots).values(shotRows).returning()
    : [];

  return Response.json(
    { scenes: createdScenes, shots: createdShots },
    { status: 201 }
  );
}
