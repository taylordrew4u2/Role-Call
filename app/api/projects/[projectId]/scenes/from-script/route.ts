import { db } from "@/lib/db";
import { scripts, scenes, shots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectDirector } from "@/lib/project-access";
import { parseScenesFromScript, parseDialogueBeats } from "@/lib/parse-scenes";
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
    body?.mode === "dialogue" || body?.mode === "both" || body?.mode === "line"
      ? body.mode
      : "action";
  // Single-camera (iPhone) shoots one person per shot; two cameras can hold
  // characters together. Body can override the project's saved setting.
  const setup = body?.cameraSetup ?? access.project.cameraSetup ?? "single";
  const singleCamera = setup !== "dual";
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

  // Regenerating replaces the previous auto-generated scenes/shots so running
  // it again doesn't pile up duplicates. Default true.
  const replace = body?.replace !== false;
  if (replace) {
    await db.delete(shots).where(eq(shots.projectId, access.id));
    await db.delete(scenes).where(eq(scenes.projectId, access.id));
  }

  // "By line" mode with no scene headings: extract dialogue beats directly and
  // create shots without scene rows (sceneId: null). Scenes are only created
  // when the script has explicit headings.
  if (mode === "line" && parsed.length === 0) {
    const beats = parseDialogueBeats(content);
    if (beats.length === 0) {
      return Response.json(
        { error: "No dialogue found in the script." },
        { status: 400 }
      );
    }

    const existingShots = replace
      ? []
      : await db.select().from(shots).where(eq(shots.projectId, access.id));
    let shotOrder = existingShots.length;

    const shotRows = beats.map((beat, i) => ({
      projectId: access.id,
      sceneId: null,
      shotNumber: String(i + 1),
      description: beat.text || `${beat.character} — dialogue`,
      shotSize: "MS",
      angle: "Eye-level",
      movement: "Static",
      castNotes: beat.character || null,
      status: "planned",
      sortOrder: shotOrder++,
    }));

    const createdShots = await db.insert(shots).values(shotRows).returning();
    return Response.json({ scenes: [], shots: createdShots }, { status: 201 });
  }

  const existingScenes = replace
    ? []
    : await db.select().from(scenes).where(eq(scenes.projectId, access.id));
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

  const createdScenes = parsed.length
    ? await db.insert(scenes).values(sceneRows).returning()
    : [];

  // Generate an inferred shot list per scene and link it to the new scenes.
  const existingShots = replace
    ? []
    : await db.select().from(shots).where(eq(shots.projectId, access.id));
  let shotOrder = existingShots.length;

  const shotRows = createdScenes.flatMap((scene, i) =>
    buildShotsForScene(parsed[i], { mode, singleCamera }).map((shot) => ({
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
