import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { projects, scripts, scriptSuggestions, projectMembers, shots } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { ScriptWorkspace } from "@/components/ScriptWorkspace";
import { CharacterStatsPanel } from "@/components/CharacterStatsPanel";
import type { CharacterStat } from "@/components/CharacterStatsPanel";
import { writerIdOf } from "@/lib/script-access";
import { ensureScriptSchema } from "@/lib/db/ensure-script-schema";
import { isProjectManager, isProjectEditor } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

export default async function ScriptPage({ params }: { params: Params }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const { projectId } = await params;
  const id = parseInt(projectId, 10);
  if (isNaN(id)) redirect("/dashboard");

  await ensureScriptSchema();

  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) redirect("/dashboard");

  const [script] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, id));

  const suggestions = await db
    .select()
    .from(scriptSuggestions)
    .where(eq(scriptSuggestions.projectId, id))
    .orderBy(desc(scriptSuggestions.createdAt));

  const members = await db
    .select()
    .from(projectMembers)
    .where(eq(projectMembers.projectId, id));

  const canManage = await isProjectManager(project, userId);
  const writerId = writerIdOf(project);
  // Only owners, directors, and the writer see the editing tab.
  const canViewEditing = await isProjectEditor(project, userId);

  const eligibleWriters = members
    .filter((m) => m.clerkUserId)
    .map((m) => ({ clerkUserId: m.clerkUserId as string, displayName: m.displayName }));

  const cast = members
    .filter((m) => m.kind === "cast")
    .map((m) => ({ displayName: m.displayName, character: m.character ?? null }));

  // Compute character stats from shots + scenes
  const projectShots = await db.select().from(shots).where(eq(shots.projectId, id));

  const characterMap = new Map<string, { shots: number; sceneIds: Set<number | null> }>();

  function parseCharacters(notes: string): string[] {
    return notes
      .split(/,|&|\band\b|\/|\+/i)
      .map((n) => n.trim())
      .filter(Boolean);
  }

  for (const shot of projectShots) {
    if (!shot.castNotes) continue;
    const characters = parseCharacters(shot.castNotes);
    for (const char of characters) {
      const key = char.toLowerCase();
      if (!characterMap.has(key)) {
        characterMap.set(key, { shots: 0, sceneIds: new Set() });
      }
      const entry = characterMap.get(key)!;
      entry.shots += 1;
      entry.sceneIds.add(shot.sceneId ?? null);
    }
  }

  // Re-derive with proper display names (use first-seen casing)
  const displayNames = new Map<string, string>();
  for (const shot of projectShots) {
    if (!shot.castNotes) continue;
    for (const char of parseCharacters(shot.castNotes)) {
      const key = char.toLowerCase();
      if (!displayNames.has(key)) displayNames.set(key, char);
    }
  }

  const characterStats: CharacterStat[] = Array.from(characterMap.entries())
    .map(([key, val]) => ({
      character: displayNames.get(key) ?? key,
      shots: val.shots,
      scenes: val.sceneIds.size,
    }))
    .filter((s) => s.shots >= 1)
    .sort((a, b) => b.shots - a.shots);

  return (
    <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
      <ScriptWorkspace
        projectId={id}
        isOwner={canManage}
        userId={userId}
        canViewEditing={canViewEditing}
        ownerId={project.ownerId}
        writerId={writerId}
        eligibleWriters={eligibleWriters}
        cast={cast}
        initialContent={script?.content ?? ""}
        initialFinalContent={script?.finalContent ?? ""}
        initialFileUrl={script?.fileUrl ?? null}
        initialFileName={script?.fileName ?? null}
        initialSuggestions={suggestions}
      />
      <CharacterStatsPanel characterStats={characterStats} />
    </main>
  );
}
