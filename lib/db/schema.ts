import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  date,
} from "drizzle-orm/pg-core";

// Film projects created by owners
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(), // Clerk user ID
  title: text("title").notNull(),
  shootDate: date("shoot_date"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Members invited to a project
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id"), // Null until they accept
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  status: text("status").notNull().default("invited"), // invited | active
});

// Film production roles (seeded once, shared across projects)
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  duties: jsonb("duties").$type<string[]>().notNull().default([]),
  isCritical: boolean("is_critical").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Role assignments per project
export const assignments = pgTable("assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
  assignedMemberId: integer("assigned_member_id").references(
    () => projectMembers.id,
    { onDelete: "set null" }
  ),
  backupMemberId: integer("backup_member_id").references(
    () => projectMembers.id,
    { onDelete: "set null" }
  ),
  notes: text("notes"),
});

// The screenplay for a project — one per project. Either typed/pasted text,
// an uploaded file (Vercel Blob URL), or both.
export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Scenes broken out of the script (e.g. "1A — INT. KITCHEN — DAY")
export const scenes = pgTable("scenes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sceneNumber: text("scene_number").notNull().default(""),
  heading: text("heading").notNull(),
  intExt: text("int_ext"), // INT | EXT | INT/EXT
  location: text("location"),
  timeOfDay: text("time_of_day"), // DAY | NIGHT | etc.
  synopsis: text("synopsis"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Shooting days for scheduling
export const shootDays = pgTable("shoot_days", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull().default(1),
  shootDate: date("shoot_date"),
  location: text("location"),
  callTime: text("call_time"),
  notes: text("notes"),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Individual shots in the shot list, optionally tied to a scene and a shoot day
export const shots = pgTable("shots", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  sceneId: integer("scene_id").references(() => scenes.id, {
    onDelete: "set null",
  }),
  shootDayId: integer("shoot_day_id").references(() => shootDays.id, {
    onDelete: "set null",
  }),
  shotNumber: text("shot_number").notNull().default(""),
  description: text("description").notNull().default(""),
  shotSize: text("shot_size"), // WS, MS, CU, etc.
  angle: text("angle"), // eye-level, high, low, etc.
  movement: text("movement"), // static, pan, dolly, handheld, etc.
  lens: text("lens"),
  equipment: text("equipment"),
  castNotes: text("cast_notes"),
  status: text("status").notNull().default("planned"), // planned | shot | omitted
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes"),
});

// TypeScript types derived from schema
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type Script = typeof scripts.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type NewScene = typeof scenes.$inferInsert;
export type ShootDay = typeof shootDays.$inferSelect;
export type NewShootDay = typeof shootDays.$inferInsert;
export type Shot = typeof shots.$inferSelect;
export type NewShot = typeof shots.$inferInsert;
