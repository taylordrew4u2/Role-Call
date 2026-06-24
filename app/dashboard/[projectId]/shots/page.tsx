import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, scenes, shots, projectMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ShotListBoard } from "@/components/ShotListBoard";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";

type Params = Promise<{ projectId: string }>;

export default async function ShotsPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  await ensureScriptSchema();
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const [sceneRows, shotRows, members] = await Promise.all([
    db.select().from(scenes).where(eq(scenes.projectId, id)).orderBy(scenes.sortOrder),
    db.select().from(shots).where(eq(shots.projectId, id)).orderBy(shots.sortOrder),
    db.select().from(projectMembers).where(eq(projectMembers.projectId, id)),
  ]);

  // Owner and directors can build and edit the shot list.
  const me = members.find((m) => m.clerkUserId === userId);
  const canEdit = project.ownerId === userId || me?.position === "director";

  // Cast used to resolve shot castNotes to real actors and characters.
  const cast = members
    .filter((m) => m.kind === "cast")
    .map((m) => ({ character: m.character, displayName: m.displayName }));

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
      <ShotListBoard
        projectId={id}
        canEdit={canEdit}
        initialScenes={sceneRows}
        initialShots={shotRows}
        cast={cast}
        initialCameraSetup={project.cameraSetup ?? "single"}
      />
    </main>
  );
}
