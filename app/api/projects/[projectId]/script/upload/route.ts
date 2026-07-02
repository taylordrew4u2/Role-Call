import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireScriptWriter } from "@/lib/script-access";

type Params = Promise<{ projectId: string }>;

// POST /api/projects/[projectId]/script/upload — upload a script file to Vercel Blob
export async function POST(request: Request, { params }: { params: Params }) {
  const { projectId } = await params;
  const access = await requireScriptWriter(projectId);
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

  // For plain-text-ish formats, extract the text so it shows in the editor below.
  const content = await extractText(file);

  // Persist the file URL (and extracted content, if any) on the script row.
  const [existing] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, access.id));

  const fileFields = { fileUrl: blob.url, fileName: file.name, updatedAt: new Date() };
  const contentFields = content !== null ? { content } : {};

  if (existing) {
    await db
      .update(scripts)
      .set({ ...fileFields, ...contentFields })
      .where(eq(scripts.projectId, access.id));
  } else {
    await db
      .insert(scripts)
      .values({ projectId: access.id, ...fileFields, ...contentFields });
  }

  return Response.json({ url: blob.url, name: file.name, content }, { status: 201 });
}

/** Extracts plain text from text-based screenplay formats. Returns null for
 * formats we can't parse (PDF, Word) — those stay as a download-only link. */
async function extractText(file: File): Promise<string | null> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".fountain")) {
    return await file.text();
  }
  if (name.endsWith(".fdx")) {
    // Final Draft XML — pull text out of <Text> nodes, one paragraph per line.
    const xml = await file.text();
    const paragraphs = xml.match(/<Paragraph[^>]*>[\s\S]*?<\/Paragraph>/g) ?? [];
    const lines = paragraphs.map((p) => {
      const texts = [...p.matchAll(/<Text[^>]*>([\s\S]*?)<\/Text>/g)].map((m) => m[1]);
      return texts.join("").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    });
    return lines.join("\n");
  }
  return null;
}
