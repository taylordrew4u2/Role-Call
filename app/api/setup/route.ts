import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { seedRoles } from "@/lib/db/seed";

/**
 * One-time database bootstrap.
 *
 * Creates every table the app needs (if they don't already exist) and seeds
 * the 20 production roles. Safe to run multiple times — `CREATE TABLE IF NOT
 * EXISTS` is a no-op when tables exist, and `seedRoles()` skips when roles are
 * already present.
 *
 * Visit this URL once in your browser after the first deploy:
 *   https://<your-app>.vercel.app/api/setup
 */
async function bootstrap() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "projects" (
      "id" serial PRIMARY KEY,
      "owner_id" text NOT NULL,
      "title" text NOT NULL,
      "shoot_date" date,
      "description" text,
      "created_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  // Added after initial release — safe no-op if the column already exists.
  await db.execute(sql`
    ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "project_type" text
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "project_members" (
      "id" serial PRIMARY KEY,
      "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
      "clerk_user_id" text,
      "email" text NOT NULL,
      "display_name" text NOT NULL,
      "status" text DEFAULT 'invited' NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "roles" (
      "id" serial PRIMARY KEY,
      "name" text NOT NULL UNIQUE,
      "category" text NOT NULL,
      "duties" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "is_critical" boolean DEFAULT false NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "assignments" (
      "id" serial PRIMARY KEY,
      "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
      "role_id" integer NOT NULL REFERENCES "roles"("id") ON DELETE cascade,
      "assigned_member_id" integer REFERENCES "project_members"("id") ON DELETE set null,
      "backup_member_id" integer REFERENCES "project_members"("id") ON DELETE set null,
      "notes" text
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "scripts" (
      "id" serial PRIMARY KEY,
      "project_id" integer NOT NULL UNIQUE REFERENCES "projects"("id") ON DELETE cascade,
      "content" text DEFAULT '' NOT NULL,
      "file_url" text,
      "file_name" text,
      "updated_at" timestamp DEFAULT now() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "scenes" (
      "id" serial PRIMARY KEY,
      "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
      "scene_number" text DEFAULT '' NOT NULL,
      "heading" text NOT NULL,
      "int_ext" text,
      "location" text,
      "time_of_day" text,
      "synopsis" text,
      "sort_order" integer DEFAULT 0 NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "shoot_days" (
      "id" serial PRIMARY KEY,
      "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
      "day_number" integer DEFAULT 1 NOT NULL,
      "shoot_date" date,
      "location" text,
      "call_time" text,
      "notes" text,
      "sort_order" integer DEFAULT 0 NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "shots" (
      "id" serial PRIMARY KEY,
      "project_id" integer NOT NULL REFERENCES "projects"("id") ON DELETE cascade,
      "scene_id" integer REFERENCES "scenes"("id") ON DELETE set null,
      "shoot_day_id" integer REFERENCES "shoot_days"("id") ON DELETE set null,
      "shot_number" text DEFAULT '' NOT NULL,
      "description" text DEFAULT '' NOT NULL,
      "shot_size" text,
      "angle" text,
      "movement" text,
      "lens" text,
      "equipment" text,
      "cast_notes" text,
      "status" text DEFAULT 'planned' NOT NULL,
      "sort_order" integer DEFAULT 0 NOT NULL,
      "notes" text
    )
  `);

  await seedRoles();
}

async function run() {
  try {
    await bootstrap();
    return Response.json({
      ok: true,
      message: "Database ready — tables created and roles seeded.",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return Response.json(
      { error: "Setup failed", detail: String(error) },
      { status: 500 }
    );
  }
}

// GET so it can be triggered by simply opening the link in a browser.
export async function GET() {
  return run();
}

// POST for programmatic/CLI use.
export async function POST() {
  return run();
}
