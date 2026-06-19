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

// TypeScript types derived from schema
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ProjectMember = typeof projectMembers.$inferSelect;
export type NewProjectMember = typeof projectMembers.$inferInsert;
export type Role = typeof roles.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
