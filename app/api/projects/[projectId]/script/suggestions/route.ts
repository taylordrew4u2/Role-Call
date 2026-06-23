import { auth } from "@clerk/nextjs/server";
import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scriptSuggestions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getCollaboratorAccess } from "@/lib/script-access";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/script/suggestions — list suggestions
export async function GET(_request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  await ensureScriptSchema();
  const access = await getCollaboratorAccess(projectId);
  if (!access.ok) return access.response;

  const rows = await db
    .select()
    .from(scriptSuggestions)
    .where(eq(scriptSuggestions.projectId, access.id))
    .orderBy(desc(scriptSuggestions.createdAt));

  return Response.json(rows);
}

// POST /api/projects/[projectId]/script/suggestions — create a suggestion.
// Any collaborator may suggest an edit.
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  await ensureScriptSchema();
  const access = await getCollaboratorAccess(projectId);
  if (!access.ok) return access.response;

  const { anchorText, suggestedText, comment } = await request.json();
  if (!suggestedText?.trim() && !comment?.trim()) {
    return Response.json(
      { error: "Add a suggested replacement or a comment." },
      { status: 400 }
    );
  }

  // Resolve a friendly author name from Clerk.
  const { userId } = await auth();
  let authorName = "A collaborator";
  try {
    const user = await currentUser();
    authorName =
      user?.fullName ||
      user?.firstName ||
      user?.username ||
      user?.primaryEmailAddress?.emailAddress ||
      authorName;
  } catch {
    // Fall back to the default name if Clerk lookup fails.
  }

  const [created] = await db
    .insert(scriptSuggestions)
    .values({
      projectId: access.id,
      authorId: userId!,
      authorName,
      anchorText: anchorText ?? "",
      suggestedText: suggestedText ?? "",
      comment: comment?.trim() || null,
      status: "pending",
    })
    .returning();

  return Response.json(created, { status: 201 });
}
