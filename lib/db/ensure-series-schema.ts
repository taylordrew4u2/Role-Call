import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Idempotent DDL for the Series feature, run lazily on first use so production
// works without a manual `drizzle-kit push`. Runs at most once per process.
let ensured: Promise<void> | undefined;

export function ensureSeriesSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS series (
          id serial PRIMARY KEY,
          owner_id text NOT NULL,
          title text NOT NULL,
          description text,
          created_at timestamp DEFAULT now() NOT NULL
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS series_members (
          id serial PRIMARY KEY,
          series_id integer NOT NULL REFERENCES series(id) ON DELETE CASCADE,
          clerk_user_id text,
          email text,
          display_name text NOT NULL,
          kind text NOT NULL DEFAULT 'crew',
          status text NOT NULL DEFAULT 'invited'
        )
      `);
      await db.execute(sql`
        ALTER TABLE projects
          ADD COLUMN IF NOT EXISTS series_id integer REFERENCES series(id) ON DELETE SET NULL
      `);
      await db.execute(sql`
        ALTER TABLE project_members
          ADD COLUMN IF NOT EXISTS series_member_id integer
      `);
    })().catch((err) => {
      ensured = undefined;
      throw err;
    });
  }
  return ensured;
}
