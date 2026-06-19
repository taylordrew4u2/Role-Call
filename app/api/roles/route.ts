import { db } from "@/lib/db";
import { roles } from "@/lib/db/schema";

// GET /api/roles — returns all roles (public, no auth needed for read)
export async function GET() {
  const allRoles = await db.select().from(roles).orderBy(roles.sortOrder);
  return Response.json(allRoles);
}
