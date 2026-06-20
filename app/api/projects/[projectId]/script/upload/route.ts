import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireProjectOwner } from "@/lib/project-access";

type Params = Promise<{ projectId: string }>;

// POST /api/projects/[projectId]/script/upload — upload a script file to Vercel Blob
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireProjectOwner(projectId);
  if (!access.ok) return access.response;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return Response.json(
      {
        error:
          "File upload isn't set up yet. Add Vercel Blob storage (Storage → Create → Blob) to enable uploads, or paste the script text instead.",
      },
      { status: 501 }
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }

  const blob = await put(`scripts/${access.id}/${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  // Persist the file URL on the script row (creating it if needed)
  const [existing] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, access.id));

  if (existing) {
    await db
      .update(scripts)
      .set({ fileUrl: blob.url, fileName: file.name, updatedAt: new Date() })
      .where(eq(scripts.projectId, access.id));
  } else {
    await db
      .insert(scripts)
      .values({ projectId: access.id, fileUrl: blob.url, fileName: file.name });
  }

  return Response.json({ url: blob.url, name: file.name }, { status: 201 });
}
