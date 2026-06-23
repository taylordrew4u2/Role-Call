import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, projectMembers } from "@/lib/db/schema";
import { getAppUrl } from "@/lib/get-app-url";
import { eq } from "drizzle-orm";

type Params = Promise<{ projectId: string }>;

// GET /api/projects/[projectId]/members
export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const id = parseInt(projectId, 10);

  const members = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));

  return Response.json(members);
}

// POST /api/projects/[projectId]/members — invite a member
export async function POST(
  request: Request,
  { params }: { params: Params }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });

  // Verify requester is the project owner
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { email, displayName, kind, character } = await request.json();
  if (!displayName?.trim()) {
    return Response.json({ error: "A name is required" }, { status: 400 });
  }

  // Create member record. Email is optional (e.g. cast added without one);
  // members with no email are recorded as active rather than "invited".
  const [member] = await db
    .insert(projectMembers)
    .values({
      projectId: id,
      email: email?.trim() || null,
      displayName: displayName.trim(),
      kind: kind === "cast" ? "cast" : "crew",
      character: character?.trim() || null,
      status: email?.trim() ? "invited" : "active",
    })
    .returning();

  // Send invitation email via Resend (lazily imported to avoid build-time errors)
  const joinUrl = new URL(
    `/api/invite?projectId=${id}&memberId=${member.id}`,
    getAppUrl(request)
  ).toString();

  // emailStatus tells the client what actually happened so it can give honest
  // feedback (and fall back to a copyable invite link):
  //   "sent"       — Resend accepted the message
  //   "skipped"    — no API key configured, or no email address given
  //   "failed"     — Resend rejected the send (e.g. unverified from-domain)
  let emailStatus: "sent" | "skipped" | "failed" = "skipped";
  let emailError: string | undefined;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && email?.trim()) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(apiKey);
      const { error } = await resend.emails.send({
        from: `RoleCall <noreply@${process.env.RESEND_FROM_DOMAIN ?? "rolecall.space"}>`,
        to: email,
        subject: `You've been invited to "${project.title}" on RoleCall`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h1 style="font-size:22px;color:#0f172a;">You're invited to join a film project!</h1>
            <p style="color:#475569;">Hi ${displayName},</p>
            <p style="color:#475569;">
              You've been invited to collaborate on <strong>${project.title}</strong> on RoleCall —
              the all-in-one production responsibility tracker.
            </p>
            <a href="${joinUrl}"
               style="display:inline-block;margin:16px 0;background:#0f172a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
              Join the Project →
            </a>
            <p style="color:#94a3b8;font-size:12px;">
              If you weren't expecting this, you can safely ignore this email.
            </p>
          </div>
        `,
      });
      // Resend returns { data, error } and does NOT throw on a rejected send,
      // so the error field must be checked explicitly.
      if (error) {
        emailStatus = "failed";
        emailError = error.message;
        console.error("Resend send error:", error);
      } else {
        emailStatus = "sent";
      }
    } catch (err) {
      // Email failure must not block member creation.
      emailStatus = "failed";
      emailError = err instanceof Error ? err.message : "Unknown email error";
      console.error("Resend error:", err);
    }
  }

  return Response.json(
    { ...member, inviteUrl: joinUrl, emailStatus, emailError },
    { status: 201 }
  );
}
