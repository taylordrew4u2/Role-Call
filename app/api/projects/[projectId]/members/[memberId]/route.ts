import { db } from "@/lib/db";
import { projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string; memberId: string }>;

// DELETE /api/projects/[projectId]/members/[memberId]
export async function DELETE(_request: Request, { params }: { params: Params }) {
  const { projectId, memberId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const mid = parseInt(memberId, 10);
  if (isNaN(mid)) return Response.json({ error: "Invalid member ID" }, { status: 400 });

  await db
    .delete(projectMembers)
    .where(
      and(eq(projectMembers.id, mid), eq(projectMembers.projectId, access.id))
    );
  return Response.json({ ok: true });
}
