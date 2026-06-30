import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, shootDays } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isProjectManager } from "@/lib/project-access";
import { LocationsBoard } from "@/components/LocationsBoard";

type Params = Promise<{ projectId: string }>;

export default async function LocationsPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const canManage = await isProjectManager(project, userId);

  const days = await db
    .select({
      id: shootDays.id,
      dayNumber: shootDays.dayNumber,
      shootDate: shootDays.shootDate,
      location: shootDays.location,
      locationAddress: shootDays.locationAddress,
      locationNotes: shootDays.locationNotes,
      lat: shootDays.lat,
      lng: shootDays.lng,
    })
    .from(shootDays)
    .where(eq(shootDays.projectId, id))
    .orderBy(shootDays.sortOrder);

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
      <LocationsBoard
        projectId={id}
        days={days}
        canManage={canManage}
      />
    </main>
  );
}
