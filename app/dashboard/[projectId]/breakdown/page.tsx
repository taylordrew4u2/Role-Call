import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, scripts, scenes, shots, projectMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ShotListBoard } from "@/components/ShotListBoard";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";

type Params = Promise<{ projectId: string }>;

export default async function BreakdownPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  await ensureScriptSchema();

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const [script, sceneRows, shotRows, members] = await Promise.all([
    db.select().from(scripts).where(eq(scripts.projectId, id)).then((r) => r[0] ?? null),
    db.select().from(scenes).where(eq(scenes.projectId, id)).orderBy(scenes.sortOrder),
    db.select().from(shots).where(eq(shots.projectId, id)).orderBy(shots.sortOrder),
    db.select().from(projectMembers).where(eq(projectMembers.projectId, id)),
  ]);

  const me = members.find((m) => m.clerkUserId === userId);
  const canEdit = project.ownerId === userId || me?.position === "director";

  const cast = members
    .filter((m) => m.kind === "cast")
    .map((m) => ({ character: m.character, displayName: m.displayName }));

  const scriptContent = script?.finalContent?.trim() || script?.content?.trim() || "";

  return (
    <div className="flex flex-1" style={{ height: "calc(100vh - 145px)" }}>
      {/* Script pane */}
      <div className="w-1/2 border-r border-slate-200 flex flex-col overflow-hidden bg-white">
        <div className="px-6 py-3 border-b border-slate-100 bg-white shrink-0">
          <h2 className="text-sm font-semibold text-slate-700">Script</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {scriptContent ? (
            <pre className="px-8 py-6 font-mono text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
              {scriptContent}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              No script added yet. Add one on the Script tab.
            </div>
          )}
        </div>
      </div>

      {/* Shot list pane */}
      <div className="w-1/2 flex flex-col overflow-hidden bg-slate-50">
        <div className="px-6 py-3 border-b border-slate-100 bg-white shrink-0">
          <h2 className="text-sm font-semibold text-slate-700">Shot List</h2>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ShotListBoard
            projectId={id}
            canEdit={canEdit}
            initialScenes={sceneRows}
            initialShots={shotRows}
            cast={cast}
            initialCameraSetup={project.cameraSetup ?? "single"}
          />
        </div>
      </div>
    </div>
  );
}
