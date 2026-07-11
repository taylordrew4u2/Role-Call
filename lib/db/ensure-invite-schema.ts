import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Shareable join links: a per-project random token lets anyone with the link
// add themselves to the project. The column is intentionally NOT declared in
// schema.ts — many code paths select every projects column without running
// this migration first, and drizzle lists columns by name, so declaring it
// there would break those paths on databases provisioned before this feature.
// The two join-link routes read/write it with raw SQL instead.
let ensured: Promise<void> | undefined;

export function ensureInviteSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await db.execute(
        sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS invite_token text`
      );
      await db.execute(
        sql`CREATE UNIQUE INDEX IF NOT EXISTS projects_invite_token_idx ON projects (invite_token)`
      );
    })().catch((err) => {
      // Reset so a later request can retry if the first attempt failed.
      ensured = undefined;
      throw err;
    });
  }
  return ensured;
}
