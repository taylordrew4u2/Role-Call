import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  date,
  json,
} from "drizzle-orm/pg-core";

// A Series groups multiple projects that share one team. Anyone invited to the
// series works across every project in it.
export const series = pgTable("series", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(), // Clerk user ID
  title: text("title").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Film projects created by owners
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(), // Clerk user ID
  title: text("title").notNull(),
  projectType: text("project_type"), // social | music_video | commercial | short | feature
  shootDate: date("shoot_date"),
  description: text("description"),
  scriptWriterId: text("script_writer_id"),
  // What the project is shot on, which drives shot-list coverage:
  //   "single" — one camera (e.g. iPhone): one character per shot
  //   "dual"   — two cameras: also covers characters together (two-shots)
  cameraSetup: text("camera_setup"),
  // Optional parent series; null for standalone projects.
  seriesId: integer("series_id").references(() => series.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// People invited to a whole Series. Each series member is fanned out into a
// project_members row on every project in the series (linked via
// project_members.series_member_id) so all existing per-project machinery
// (roles, cast, assignments, invite links) works unchanged.
export const seriesMembers = pgTable("series_members", {
  id: serial("id").primaryKey(),
  seriesId: integer("series_id")
    .notNull()
    .references(() => series.id, { onDelete: "cascade" }),
  clerkUserId: text("clerk_user_id"), // Null until they accept
  email: text("email"),
  displayName: text("display_name").notNull(),
  kind: text("kind").notNull().default("crew"), // crew | cast
  position: text("position"), // legacy single-role field
  positions: json("positions").$type<string[]>(), // multi-role: ["owner","writer","director"]
  status: text("status").notNull().default("invited"), // invited | active
});

// Members invited to a project (cast & crew)
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  // Set when this row was created by fanning out a series member, so series
  // membership changes can be kept in sync.
  seriesMemberId: integer("series_member_id"),
  clerkUserId: text("clerk_user_id"), // Null until they accept
  email: text("email"), // optional — actors may be added without an email
  displayName: text("display_name").notNull(),
  kind: text("kind").notNull().default("crew"), // crew | cast
  // Legacy single-role field kept for back-compat. New code uses `positions`.
  position: text("position"), // writer | director | owner | null
  // Multi-role field: any combination of "owner" | "director" | "writer"
  positions: json("positions").$type<string[]>(),
  character: text("character"), // character played, for cast
  status: text("status").notNull().default("invited"), // invited | active
});

// Film production roles. Global templates have project_id = NULL and are shared
// across every project; rows with a project_id are custom roles for that project.
export const roles = pgTable("roles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  duties: jsonb("duties").$type<string[]>().notNull().default([]),
  isCritical: boolean("is_critical").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

// Global roles a given project has hidden/removed from its board.
export const projectHiddenRoles = pgTable("project_hidden_roles", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id, { onDelete: "cascade" }),
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
//   content      — the working/editing draft (what the editing tab shows)
//   finalContent — the published, approved final script (the "Final Script" tab)
export const scripts = pgTable("scripts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  finalContent: text("final_content").notNull().default(""),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Edits suggested against the editing draft. Any collaborator can create one;
// the appointed writer (or owner) approves or declines it.
export const scriptSuggestions = pgTable("script_suggestions", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull(), // Clerk user ID of suggester
  authorName: text("author_name").notNull(),
  anchorText: text("anchor_text").notNull().default(""), // the text they want changed
  suggestedText: text("suggested_text").notNull().default(""), // their replacement
  comment: text("comment"),
  status: text("status").notNull().default("pending"), // pending | approved | declined
  resolvedBy: text("resolved_by"), // Clerk user ID of the writer who decided
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
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
  locationAddress: text("location_address"),
  locationNotes: text("location_notes"),
  callTime: text("call_time"),
  wrapTime: text("wrap_time"),
  lunchTime: text("lunch_time"),
  lat: text("lat"),
  lng: text("lng"),
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

// TypeScript types derived from schema (row/select shapes used across the app).
export type Project = typeof projects.$inferSelect;
export type Series = typeof series.$inferSelect;
export type SeriesMember = typeof seriesMembers.$inferSelect;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type Role = typeof roles.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Script = typeof scripts.$inferSelect;
export type ScriptSuggestion = typeof scriptSuggestions.$inferSelect;
export type Scene = typeof scenes.$inferSelect;
export type ShootDay = typeof shootDays.$inferSelect;
export type Shot = typeof shots.$inferSelect;
