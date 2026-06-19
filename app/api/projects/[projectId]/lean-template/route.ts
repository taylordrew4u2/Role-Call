import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { projects, assignments, roles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type Params = Promise<{ projectId: string }>;

// Lean 8-person template mapping:
// Person 1 (owner): Director, Producer, 1st AD, Script Supervisor,
//                   Location Manager, Releases/Legal, Safety, Editor
// Person 2: DP, Gaffer, Props Master
// Person 3: Sound Mixer, Data Wrangler, HMU, Wardrobe, Food
const TEMPLATE: Record<string, number> = {
  Director: 1,
  Producer: 1,
  "1st Assistant Director": 1,
  "Script Supervisor": 1,
  "Location Manager": 1,
  "Releases / Legal": 1,
  "Safety Person": 1,
  "Editor / Post Handoff": 1,
  "Director of Photography": 2,
  Gaffer: 2,
  "Props Master": 2,
  "Sound Mixer": 3,
  "Data Wrangler / DIT": 3,
  "Hair & Makeup Artist": 3,
  "Wardrobe Stylist": 3,
  "Food & Craft Services": 3,
};

// POST /api/projects/[projectId]/lean-template
export async function POST(
  request: Request,
  { params }: { params: Params }
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) return Response.json({ error: "Invalid ID" }, { status: 400 });

  // Only owner can apply template
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  if (project.ownerId !== userId)
    return Response.json({ error: "Forbidden" }, { status: 403 });

  const { member1Id, member2Id, member3Id } = await request.json();
  if (!member1Id || !member2Id || !member3Id) {
    return Response.json(
      { error: "member1Id, member2Id, member3Id are required" },
      { status: 400 }
    );
  }

  const personMap: Record<number, number> = {
    1: member1Id,
    2: member2Id,
    3: member3Id,
  };

  // Load all roles
  const allRoles = await db.select().from(roles);

  // Delete existing assignments for this project
  await db.delete(assignments).where(eq(assignments.projectId, id));

  // Build new assignment rows
  const newAssignments = allRoles.map((role) => {
    const personNumber = TEMPLATE[role.name];
    const memberId = personNumber ? personMap[personNumber] : null;
    return {
      projectId: id,
      roleId: role.id,
      assignedMemberId: memberId ?? null,
      backupMemberId: null,
      notes: null,
    };
  });

  const inserted = await db
    .insert(assignments)
    .values(newAssignments)
    .returning();

  return Response.json({ assignments: inserted });
}
