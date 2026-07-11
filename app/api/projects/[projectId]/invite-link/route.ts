import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getAppUrl } from "@/lib/get-app-url";
import { requireProjectManager } from "@/lib/project-access";
import { ensureInviteSchema } from "@/lib/db/ensure-invite-schema";

type Params = Promise<{ projectId: string }>;

function newToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

function joinUrlFor(token: string, request: Request) {
  const url = new URL("/api/join", getAppUrl(request));
  url.searchParams.set("token", token);
  return url.toString();
}

// GET /api/projects/[projectId]/invite-link — the project's shareable join
// link, minting the token on first use.
export async function GET(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectManager(projectId);
  if (!access.ok) return access.response;

  await ensureInviteSchema();
  // COALESCE keeps the first token if two requests race to mint it.
  const { rows } = await db.execute<{ invite_token: string }>(sql`
    UPDATE projects
    SET invite_token = COALESCE(invite_token, ${newToken()})
    WHERE id = ${access.id}
    RETURNING invite_token
  `);
  const token = rows[0]?.invite_token;
  if (!token) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  return Response.json({ joinUrl: joinUrlFor(token, request) });
}

// POST /api/projects/[projectId]/invite-link — rotate the token, invalidating
// every previously shared copy of the link.
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectManager(projectId);
  if (!access.ok) return access.response;

  await ensureInviteSchema();
  const { rows } = await db.execute<{ invite_token: string }>(sql`
    UPDATE projects
    SET invite_token = ${newToken()}
    WHERE id = ${access.id}
    RETURNING invite_token
  `);
  const token = rows[0]?.invite_token;
  if (!token) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  return Response.json({ joinUrl: joinUrlFor(token, request) });
}
