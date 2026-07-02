import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

let ensured: Promise<void> | undefined;

/** Existing projects keep seeing the global role template (default true);
 * new projects explicitly opt in via the "Load template" action. */
export function ensureRolesTemplateSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await db.execute(
        sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS roles_template_loaded boolean NOT NULL DEFAULT true`
      );
    })().catch((err) => {
      ensured = undefined;
      throw err;
    });
  }
  return ensured;
}
