import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { CastBoard } from "@/components/CastBoard";
import { isProjectManager, isProjectAdmin } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

export default async function CastPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const canManage = await isProjectManager(project, userId);
  const isAdmin = await isProjectAdmin(project, userId);

  const members = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
      <CastBoard
        projectId={id}
        isOwner={canManage}
        isAdmin={isAdmin}
        initialMembers={members}
      />
    </main>
  );
}
