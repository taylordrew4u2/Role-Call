import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// The script-editor feature adds columns and a table that may not exist yet in
// a database provisioned before this feature shipped. Rather than require a
// manual `drizzle-kit push`, we lazily run idempotent DDL the first time a
// script API route is hit. The promise is cached so the DDL runs at most once
// per server process.
let ensured: Promise<void> | undefined;

export function ensureScriptSchema(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      await db.execute(sql`
        ALTER TABLE projects
          ADD COLUMN IF NOT EXISTS script_writer_id text
      `);
      await db.execute(sql`
        ALTER TABLE scripts
          ADD COLUMN IF NOT EXISTS final_content text NOT NULL DEFAULT ''
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS script_suggestions (
          id serial PRIMARY KEY,
          project_id integer NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          author_id text NOT NULL,
          author_name text NOT NULL,
          anchor_text text NOT NULL DEFAULT '',
          suggested_text text NOT NULL DEFAULT '',
          comment text,
          status text NOT NULL DEFAULT 'pending',
          resolved_by text,
          created_at timestamp DEFAULT now() NOT NULL,
          resolved_at timestamp
        )
      `);
    })().catch((err) => {
      // Reset so a later request can retry if the first attempt failed.
      ensured = undefined;
      throw err;
    });
  }
  return ensured;
}
