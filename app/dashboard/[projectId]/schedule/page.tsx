import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, scenes, shots, shootDays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ScheduleBoard } from "@/components/ScheduleBoard";
import { isProjectManager } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

export default async function SchedulePage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const canManage = await isProjectManager(project, userId);

  const [dayRows, shotRows, sceneRows] = await Promise.all([
    db.select().from(shootDays).where(eq(shootDays.projectId, id)).orderBy(shootDays.sortOrder),
    db.select().from(shots).where(eq(shots.projectId, id)).orderBy(shots.sortOrder),
    db.select().from(scenes).where(eq(scenes.projectId, id)).orderBy(scenes.sortOrder),
  ]);

  return (
    <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
      <ScheduleBoard
        projectId={id}
        isOwner={canManage}
        initialDays={dayRows}
        initialShots={shotRows}
        scenes={sceneRows}
      />
    </main>
  );
}
