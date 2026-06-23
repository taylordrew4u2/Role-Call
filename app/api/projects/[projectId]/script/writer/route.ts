import { db } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getProjectAccess } from "@/lib/project-access";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";

type Params = Promise<{ projectId: string }>;

// PUT /api/projects/[projectId]/script/writer — appoint the script writer.
// Owner-only. Body: { writerId: string | null }. A null/empty value resets the
// writer back to the owner.
export async function PUT(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  await ensureScriptSchema();
  const access = await getProjectAccess(projectId);
  if (!access.ok) return access.response;
  if (access.project.ownerId !== access.userId) {
    return Response.json({ error: "Only the owner can appoint a writer." }, { status: 403 });
  }

  const { writerId } = await request.json();
  const next: string | null =
    !writerId || writerId === access.project.ownerId ? null : String(writerId);

  // If a member was named, make sure they've actually joined this project.
  if (next) {
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, access.id),
          eq(projectMembers.clerkUserId, next)
        )
      );
    if (!member) {
      return Response.json(
        { error: "That person hasn't joined the project yet." },
        { status: 400 }
      );
    }
  }

  const [updated] = await db
    .update(projects)
    .set({ scriptWriterId: next })
    .where(eq(projects.id, access.id))
    .returning();

  return Response.json(updated);
}
