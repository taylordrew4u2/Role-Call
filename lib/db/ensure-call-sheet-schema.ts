import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

let ensured: Promise<void> | undefined;

export function ensureCallSheetSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await db.execute(sql`ALTER TABLE shoot_days ADD COLUMN IF NOT EXISTS wrap_time text`);
      await db.execute(sql`ALTER TABLE shoot_days ADD COLUMN IF NOT EXISTS lunch_time text`);
      await db.execute(sql`ALTER TABLE shoot_days ADD COLUMN IF NOT EXISTS location_address text`);
      await db.execute(sql`ALTER TABLE shoot_days ADD COLUMN IF NOT EXISTS location_notes text`);
    })().catch((err) => {
      ensured = undefined;
      throw err;
    });
  }
  return ensured;
}
