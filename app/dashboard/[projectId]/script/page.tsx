import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { ScriptEditor } from "@/components/ScriptEditor";

type Params = Promise<{ projectId: string }>;

export default async function ScriptPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const [script] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, id));

  return (
    <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6">
      <ScriptEditor
        projectId={id}
        isOwner={project.ownerId === userId}
        initialContent={script?.content ?? ""}
        initialFileUrl={script?.fileUrl ?? null}
        initialFileName={script?.fileName ?? null}
      />
    </main>
  );
}
