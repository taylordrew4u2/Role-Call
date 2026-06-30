import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

let ensured: Promise<void> | undefined;

export function ensureLocationsSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await db.execute(sql`ALTER TABLE shoot_days ADD COLUMN IF NOT EXISTS lat double precision`);
      await db.execute(sql`ALTER TABLE shoot_days ADD COLUMN IF NOT EXISTS lng double precision`);
    })().catch((err) => {
      ensured = undefined;
      throw err;
    });
  }
  return ensured;
}
