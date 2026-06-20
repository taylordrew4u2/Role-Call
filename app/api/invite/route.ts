import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/get-app-url";
import { projectMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/invite?projectId=X&memberId=Y — accept invite landing
export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = parseInt(url.searchParams.get("projectId") ?? "", 10);
  const memberId = parseInt(url.searchParams.get("memberId") ?? "", 10);

  if (isNaN(projectId) || isNaN(memberId)) {
    return Response.json({ error: "Invalid invite link" }, { status: 400 });
  }

  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.id, memberId),
        eq(projectMembers.projectId, projectId)
      )
    );

  if (!member) {
    return Response.json({ error: "Invite not found" }, { status: 404 });
  }

  // Mark as active
  await db
    .update(projectMembers)
    .set({ status: "active" })
    .where(eq(projectMembers.id, memberId));

  // Redirect to the project page (user must sign in to view)
  return Response.redirect(new URL(`/dashboard/${projectId}`, getAppUrl(request)));
}
