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
  let content: string | null = null;
  let extractError: string | null = null;
  try {
    content = await extractText(file);
  } catch (err) {
    console.error("Script text extraction failed:", err);
    extractError = err instanceof Error ? err.message : String(err);
  }

  // Persist the file URL (and extracted content, if any) on the script row.
  const [existing] = await db
    .select()
    .from(scripts)
    .where(eq(scripts.projectId, access.id));

  const fileFields = { fileUrl: blob.url, fileName: file.name, updatedAt: new Date() };
  const contentFields = content !== null ? { content } : {};
  // First script for this project: also publish it as the final script so it
  // shows up on the Final tab immediately, without a separate publish step.
  const finalFields =
    content !== null && !existing?.finalContent?.trim()
      ? { finalContent: content }
      : {};

  let saved;
  if (existing) {
    [saved] = await db
      .update(scripts)
      .set({ ...fileFields, ...contentFields, ...finalFields })
      .where(eq(scripts.projectId, access.id))
      .returning();
  } else {
    [saved] = await db
      .insert(scripts)
      .values({ projectId: access.id, ...fileFields, ...contentFields, ...finalFields })
      .returning();
  }

  return Response.json(
    { url: blob.url, name: file.name, content, finalContent: saved.finalContent, extractError },
    { status: 201 }
  );
}

/** Extracts plain text from text-based screenplay formats and PDFs. Returns
 * null for formats we can't parse (Word) — those stay as a download-only link. */
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
  if (name.endsWith(".pdf")) {
    // Errors propagate to the caller, which reports them to the client —
    // a silent failure here reads as "PDF extraction doesn't work".
    // pdfjs (inside unpdf) needs Promise.withResolvers, missing on Node < 22.
    if (typeof Promise.withResolvers !== "function") {
      Promise.withResolvers = function <T>() {
        let resolve!: (value: T | PromiseLike<T>) => void;
        let reject!: (reason?: unknown) => void;
        const promise = new Promise<T>((res, rej) => {
          resolve = res;
          reject = rej;
        });
        return { promise, resolve, reject };
      };
    }
    const { getDocumentProxy } = await import("unpdf");
    const { extractPdfScreenplay } = await import("@/lib/pdf-screenplay");
    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    return await extractPdfScreenplay(pdf);
  }
  return null;
}
