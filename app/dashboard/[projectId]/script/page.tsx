import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, scripts, scriptSuggestions, projectMembers } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { ScriptWorkspace } from "@/components/ScriptWorkspace";
import { writerIdOf } from "@/lib/script-access";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";
import { isProjectManager } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

export default async function ScriptPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  await ensureScriptSchema();

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const [script] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, id));

  const suggestions = await db
    .select()
    .from(scriptSuggestions)
    .where(eq(scriptSuggestions.projectId, id))
    .orderBy(desc(scriptSuggestions.createdAt));

  const members = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));

  // Directors manage the script (appoint writer, etc.) like the owner.
  const canManage = await isProjectManager(project, userId);
  const writerId = writerIdOf(project);
  const isWriter = writerId === userId;

  // People who could be appointed as writer: members who have actually joined.
  const eligibleWriters = members
    .filter((m) => m.clerkUserId)
    .map((m) => ({ clerkUserId: m.clerkUserId as string, displayName: m.displayName }));

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
      <ScriptWorkspace
        projectId={id}
        isOwner={canManage}
        isWriter={isWriter}
        ownerId={project.ownerId}
        writerId={writerId}
        eligibleWriters={eligibleWriters}
        initialContent={script?.content ?? ""}
        initialFinalContent={script?.finalContent ?? ""}
        initialFileUrl={script?.fileUrl ?? null}
        initialFileName={script?.fileName ?? null}
        initialSuggestions={suggestions}
      />
    </main>
  );
}
