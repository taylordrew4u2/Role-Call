import { db } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getProjectAccess, requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/script — fetch the script (or empty default)
export async function GET(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await getProjectAccess(projectId);
  if (!access.ok) return access.response;

  const [script] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, access.id));

  return Response.json(
    script ?? { projectId: access.id, content: "", fileUrl: null, fileName: null }
  );
}

// PUT /api/projects/[projectId]/script — save the script text (upsert)
export async function PUT(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  const { content } = await request.json();

  const [existing] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, access.id));

  if (existing) {
    const [updated] = await db
      .update(scripts)
      .set({ content: content ?? "", updatedAt: new Date() })
      .where(eq(scripts.projectId, access.id))
      .returning();
    return Response.json(updated);
  }

  const [created] = await db
    .insert(scripts)
    .values({ projectId: access.id, content: content ?? "" })
    .returning();
  return Response.json(created, { status: 201 });
}
