import { auth, currentUser } from "@clerk/nextjs/server";
import { sql, and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectMembers } from "@/lib/db/schema";
import { getAppUrl } from "@/lib/get-app-url";
import { ensureAllSchema } from "@/lib/db/ensure-all-schema";

// GET /api/join?token=X — self-serve join via the project's shareable link.
// Visitors sign in (or up) first, then get an active crew membership using
// their account's name and email — no per-person invite needed.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return Response.json({ error: "Invalid join link" }, { status: 400 });
  }

  await ensureAllSchema();

  const { rows } = await db.execute<{ id: number }>(
    sql`SELECT id FROM projects WHERE invite_token = ${token}`
  );
  const projectId = rows[0]?.id;
  if (!projectId) {
    return Response.json(
      { error: "This join link is no longer valid. Ask for a new one." },
      { status: 404 }
    );
  }

  // Joining requires an account; bounce through sign-in and come back here.
  const { userId } = await auth();
  const appUrl = getAppUrl(request);
  if (!userId) {
    const signIn = new URL("/sign-in", appUrl);
    const joinUrl = new URL("/api/join", appUrl);
    joinUrl.searchParams.set("token", token);
    signIn.searchParams.set("redirect_url", joinUrl.toString());
    return Response.redirect(signIn);
  }

  const [linked] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.clerkUserId, userId)
      )
    );

  if (linked) {
    // Already a member — just make sure they're active.
    if (linked.status !== "active") {
      await db
        .update(projectMembers)
        .set({ status: "active" })
        .where(eq(projectMembers.id, linked.id));
    }
  } else {
    const user = await currentUser();
    const email = user?.primaryEmailAddress?.emailAddress ?? null;
    const displayName = user?.fullName || user?.username || email || "New member";

    // A pending invite created for this email gets claimed (keeping its
    // position/character) rather than duplicated.
    const [emailMatch] = email
      ? await db
          .select()
          .from(projectMembers)
          .where(
            and(
              eq(projectMembers.projectId, projectId),
              eq(projectMembers.email, email),
              or(
                isNull(projectMembers.clerkUserId),
                eq(projectMembers.clerkUserId, "")
              )
            )
          )
      : [];

    if (emailMatch) {
      await db
        .update(projectMembers)
        .set({ clerkUserId: userId, status: "active" })
        .where(eq(projectMembers.id, emailMatch.id));
    } else {
      await db.insert(projectMembers).values({
        projectId,
        clerkUserId: userId,
        email,
        displayName,
        kind: "crew",
        status: "active",
      });
    }
  }

  return Response.redirect(new URL(`/dashboard/${projectId}`, appUrl));
}
