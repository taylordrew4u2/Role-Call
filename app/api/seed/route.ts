import { seedRoles } from "@/lib/db/seed";

// POST /api/seed — seed the roles table (run once after schema push)
export async function POST() {
  try {
    await seedRoles();
    return Response.json({ ok: true, message: "Roles seeded successfully." });
  } catch (error) {
    console.error("Seed error:", error);
    return Response.json(
      { error: "Seed failed", detail: String(error) },
      { status: 500 }
    );
  }
}
